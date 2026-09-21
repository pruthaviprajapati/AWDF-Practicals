require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Task = require('./models/Task');

const app = express();

app.use(cors());

// Middleware that rejects requests without Content-Type: application/json header on POST/PUT
app.use((req, res, next) => {
    if (['POST', 'PUT'].includes(req.method) && req.headers['content-type'] !== 'application/json') {
        return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
    next();
});

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// MongoDB Connection using process.env.MONGO_URI
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task_portfolio_db';
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected successfully:', MONGO_URI))
    .catch((err) => console.error('MongoDB connection error:', err));

// User Extraction Middleware
const extractUser = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        req.userId = userId;
    }
    next();
};

app.use(extractUser);

// Helper to format task object for client
const formatTask = (task) => ({
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    completed: task.completed,
    priority: task.priority,
    createdAt: task.createdAt,
    userId: task.userId ? task.userId.toString() : null,
    editTimestamps: task.editTimestamps
});

// --- AUTH ROUTES ---

// POST /api/register
app.post('/api/register', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existingUser = await User.findOne({ username: username.trim() });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password with bcrypt (salt rounds = 10)
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ username: username.trim(), password: hashedPassword });
        await newUser.save();

        res.status(201).json({
            user: { id: newUser._id.toString(), username: newUser.username },
            message: 'Registration successful'
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/login
app.post('/api/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username: username.trim() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Compare plain password with stored bcrypt hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        res.status(200).json({
            user: { id: user._id.toString(), username: user.username },
            message: 'Login successful'
        });
    } catch (err) {
        next(err);
    }
});

// --- TASK ROUTES ---

// GET /tasks - Fetch user tasks (Mongoose Task.find())
app.get('/tasks', async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(200).json([]);
        }

        const userTasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.status(200).json(userTasks.map(formatTask));
    } catch (err) {
        next(err);
    }
});

// GET /tasks/:id - Return a single task or 404 JSON if not found (Supplementary Problem #3)
app.get('/tasks/:id', async (req, res, next) => {
    try {
        const taskId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(404).json({ error: 'Task not found: Invalid task ID format' });
        }

        const query = req.userId ? { _id: taskId, userId: req.userId } : { _id: taskId };
        const task = await Task.findOne(query);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.status(200).json(formatTask(task));
    } catch (err) {
        next(err);
    }
});

// POST /tasks - Create task using Task.create() / new Task()
app.post('/tasks', async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'Unauthorized. Please log in to add tasks.' });
        }

        const { title, description, priority } = req.body;

        const newTask = new Task({
            title,
            description: description || '',
            priority: priority || 'medium',
            userId: req.userId,
            completed: false,
            editTimestamps: []
        });

        // Mongoose validation and pre-save hook run during save()
        await newTask.save();
        res.status(201).json(formatTask(newTask));
    } catch (err) {
        next(err);
    }
});

// PUT /tasks/:id - Update task using Mongoose methods with 24h edit limit check
app.put('/tasks/:id', async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        }

        const taskId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(404).json({ error: 'Task not found: Invalid task ID format' });
        }

        const task = await Task.findOne({ _id: taskId, userId: req.userId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const { title, description, completed, priority } = req.body;

        // Check 24-hour edit limit (max 3 edits)
        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        task.editTimestamps = task.editTimestamps.filter(timestamp => (now - new Date(timestamp)) < oneDayMs);

        if (task.editTimestamps.length >= 3) {
            const unlockTime = new Date(new Date(task.editTimestamps[0]).getTime() + oneDayMs).toISOString();
            return res.status(429).json({ error: `Task editing limit reached. You can edit again after ${unlockTime}.` });
        }

        task.editTimestamps.push(now);

        if (title !== undefined) task.title = title;
        if (description !== undefined) task.description = description;
        if (completed !== undefined) task.completed = completed;
        if (priority !== undefined) task.priority = priority;

        await task.save();
        res.status(200).json(formatTask(task));
    } catch (err) {
        next(err);
    }
});

// DELETE /tasks/:id - Delete task using Task.findOneAndDelete()
app.delete('/tasks/:id', async (req, res, next) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        }

        const taskId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(404).json({ error: 'Task not found: Invalid task ID format' });
        }

        const deletedTask = await Task.findOneAndDelete({ _id: taskId, userId: req.userId });
        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (err) {
        next(err);
    }
});

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global Error Handling Middleware - Formats validation errors into structured JSON
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const structuredErrors = {};
        for (let field in err.errors) {
            structuredErrors[field] = err.errors[field].message;
        }
        return res.status(400).json({
            error: 'Validation Error',
            details: structuredErrors
        });
    }

    // Cast Error (e.g. invalid ObjectId format)
    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid Data Format',
            message: `Invalid value '${err.value}' for field '${err.path}'`
        });
    }

    // Duplicate Key Error (e.g. unique username)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            error: 'Duplicate Key Error',
            message: `The ${field} '${err.keyValue[field]}' already exists.`
        });
    }

    res.status(500).json({ error: err.message || 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

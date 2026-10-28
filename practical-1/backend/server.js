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

// Helper to seed initial sample tasks if database is empty
async function seedDefaultTasks() {
    try {
        const count = await Task.countDocuments();
        if (count === 0) {
            console.log('Seeding initial Practical 6 sample tasks...');
            await Task.create([
                {
                    title: 'Learn React & Full Stack Integration',
                    description: 'Connect the React Task UI to the Node + MongoDB backend built in Practicals 4 and 5.',
                    status: 'INCOMPLETE',
                    completed: false,
                    priority: 'high'
                },
                {
                    title: 'Configure MongoDB Atlas Cloud Database',
                    description: 'Set up database cluster, schemas, validation, and secure cloud connectivity.',
                    status: 'COMPLETE',
                    completed: true,
                    priority: 'medium'
                },
                {
                    title: 'Build Task Manager with Tabs & PDF Export',
                    description: 'Build full-stack task UI with tabs, real-time audit logs, SweetAlert2 and PDF export.',
                    status: 'ONGOING',
                    completed: false,
                    priority: 'high'
                }
            ]);
            console.log('Sample tasks successfully seeded.');
        }
    } catch (err) {
        console.error('Error seeding sample tasks:', err);
    }
}

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('MongoDB connected successfully:', MONGO_URI);
        await seedDefaultTasks();
    })
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
    _id: task._id.toString(),
    title: task.title,
    description: task.description || '',
    status: task.status || (task.completed ? 'COMPLETE' : 'INCOMPLETE'),
    completed: !!task.completed,
    priority: task.priority || 'medium',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt || task.createdAt,
    userId: task.userId ? task.userId.toString() : null
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

// GET /tasks - Fetch tasks (supports both user-specific and global/guest tasks)
app.get('/tasks', async (req, res, next) => {
    try {
        const filter = req.userId 
            ? { $or: [{ userId: req.userId }, { userId: null }, { userId: { $exists: false } }] } 
            : {};
        const tasks = await Task.find(filter).sort({ createdAt: -1 });
        res.status(200).json(tasks.map(formatTask));
    } catch (err) {
        next(err);
    }
});

// GET /tasks/:id - Return a single task or 404
app.get('/tasks/:id', async (req, res, next) => {
    try {
        const taskId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(404).json({ error: 'Task not found: Invalid task ID format' });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.status(200).json(formatTask(task));
    } catch (err) {
        next(err);
    }
});

// POST /tasks - Create task in MongoDB
app.post('/tasks', async (req, res, next) => {
    try {
        const { title, description, priority, status } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const normalizedStatus = status ? status.toUpperCase() : 'INCOMPLETE';
        const validStatus = ['INCOMPLETE', 'ONGOING', 'COMPLETE'].includes(normalizedStatus)
            ? normalizedStatus
            : 'INCOMPLETE';

        const newTask = new Task({
            title: title.trim(),
            description: description || '',
            status: validStatus,
            completed: validStatus === 'COMPLETE',
            priority: priority || 'medium',
            userId: req.userId || null,
            editTimestamps: []
        });

        await newTask.save();
        res.status(201).json(formatTask(newTask));
    } catch (err) {
        next(err);
    }
});

// PUT /tasks/:id - Update task in MongoDB
app.put('/tasks/:id', async (req, res, next) => {
    try {
        const taskId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(404).json({ error: 'Task not found: Invalid task ID format' });
        }

        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const { title, description, completed, priority, status } = req.body;

        if (title !== undefined) task.title = title.trim();
        if (description !== undefined) task.description = description;
        if (priority !== undefined) task.priority = priority;
        
        if (status !== undefined) {
            const normStatus = status.toUpperCase();
            if (['INCOMPLETE', 'ONGOING', 'COMPLETE'].includes(normStatus)) {
                task.status = normStatus;
                task.completed = (normStatus === 'COMPLETE');
            }
        } else if (completed !== undefined) {
            task.completed = !!completed;
            task.status = completed ? 'COMPLETE' : 'INCOMPLETE';
        }

        await task.save();
        res.status(200).json(formatTask(task));
    } catch (err) {
        next(err);
    }
});

// DELETE /tasks/:id - Delete task from MongoDB
app.delete('/tasks/:id', async (req, res, next) => {
    try {
        const taskId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(404).json({ error: 'Task not found: Invalid task ID format' });
        }

        const deletedTask = await Task.findByIdAndDelete(taskId);
        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.status(200).json({ message: 'Task deleted successfully', id: taskId });
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

    if (err.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid Data Format',
            message: `Invalid value '${err.value}' for field '${err.path}'`
        });
    }

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

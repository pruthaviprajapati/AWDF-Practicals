require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

// Environment Configuration
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task_portfolio_db';
const JWT_SECRET = process.env.JWT_SECRET || 'awdf_practical_07_jwt_secret_key_2026';
const TOKEN_EXPIRY = '24h';

// Helper to seed initial sample tasks if database is empty
async function seedDefaultTasks() {
    try {
        const count = await Task.countDocuments();
        if (count === 0) {
            console.log('Seeding initial Practical 7 sample tasks...');
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

// --- JWT AUTHENTICATION MIDDLEWARE ---
// Verifies Bearer token. Matches Fig 4 error response verbatim.
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: "Access denied. No authentication token provided. Expected 'Authorization: Bearer <token>'"
        });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            error: "Access denied. No authentication token provided. Expected 'Authorization: Bearer <token>'"
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({
            error: 'Invalid or expired token. Please log in again.'
        });
    }
};

// --- SERVER-SIDE INPUT VALIDATION MIDDLEWARE ---
// Rejects requests with missing required fields before reaching the database (Fig 5)
const validateTaskInput = (req, res, next) => {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Task title is required' });
    }
    next();
};

// --- AUTH ROUTES ---

// POST /api/register - User Registration with bcrypt password hashing + JWT token generation (Fig 1)
app.post('/api/register', async (req, res, next) => {
    try {
        const { name, fullName, email, username, password } = req.body;
        const displayName = (name || fullName || username || '').trim();
        const userEmail = (email || '').trim().toLowerCase();
        const userPass = password;

        if (!displayName) {
            return res.status(400).json({ error: 'Full name is required' });
        }
        if (!userEmail) {
            return res.status(400).json({ error: 'Email address is required' });
        }
        if (!userPass || userPass.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check for existing user
        const existingUser = await User.findOne({
            $or: [{ email: userEmail }, { username: displayName }]
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password securely with bcrypt (10 salt rounds)
        const hashedPassword = await bcrypt.hash(userPass, 10);

        const newUser = new User({
            name: displayName,
            email: userEmail,
            username: displayName,
            password: hashedPassword
        });
        await newUser.save();

        // Generate JWT Token
        const token = jwt.sign(
            { id: newUser._id.toString(), email: newUser.email, name: newUser.name },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser._id.toString(),
                name: newUser.name,
                email: newUser.email
            },
            message: 'User registered successfully with bcrypt password hashing'
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/login - User Login with bcrypt password verification + JWT token generation (Fig 2)
app.post('/api/login', async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const identifier = (email || username || '').trim().toLowerCase();

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Email/username and password are required' });
        }

        // Search by email or username
        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare password using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email || user.username, name: user.name || user.username },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        res.status(200).json({
            token,
            user: {
                id: user._id.toString(),
                name: user.name || user.username,
                email: user.email || user.username
            },
            message: 'Login successful with JWT token generation'
        });
    } catch (err) {
        next(err);
    }
});

// --- PROTECTED TASK ROUTES (All protected using authMiddleware) ---

// GET /tasks - Protected: Fetch tasks (Fig 3)
app.get('/tasks', authMiddleware, async (req, res, next) => {
    try {
        // Return tasks associated with the authenticated user or common seeded tasks
        const filter = {
            $or: [
                { userId: req.userId },
                { userId: null },
                { userId: { $exists: false } }
            ]
        };
        const tasks = await Task.find(filter).sort({ createdAt: -1 });
        res.status(200).json(tasks.map(formatTask));
    } catch (err) {
        next(err);
    }
});

// GET /tasks/:id - Protected: Return single task
app.get('/tasks/:id', authMiddleware, async (req, res, next) => {
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

// POST /tasks - Protected + Server-Side Validation: Create task (Fig 5)
app.post('/tasks', authMiddleware, validateTaskInput, async (req, res, next) => {
    try {
        const { title, description, priority, status } = req.body;

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
            userId: req.userId,
            editTimestamps: []
        });

        await newTask.save();
        res.status(201).json(formatTask(newTask));
    } catch (err) {
        next(err);
    }
});

// PUT /tasks/:id - Protected: Update task
app.put('/tasks/:id', authMiddleware, async (req, res, next) => {
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

        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ error: 'Task title is required' });
            }
            task.title = title.trim();
        }
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

// DELETE /tasks/:id - Protected: Delete task
app.delete('/tasks/:id', authMiddleware, async (req, res, next) => {
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

// Global Error Handling Middleware
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

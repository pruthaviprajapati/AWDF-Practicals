const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Title is required'] 
    },
    description: { 
        type: String, 
        default: '' 
    },
    completed: { 
        type: Boolean, 
        default: false 
    },
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high'],
            message: '{VALUE} is not a valid priority. Must be low, medium, or high'
        },
        default: 'medium'
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'User ID is required'] 
    },
    editTimestamps: [{ 
        type: Date 
    }]
}, { timestamps: true });

// Pre-save hook: automatically trim whitespace from title (Supplementary Problem #2)
taskSchema.pre('save', async function () {
    if (this.title) {
        this.title = this.title.trim();
    }
});

module.exports = mongoose.model('Task', taskSchema);

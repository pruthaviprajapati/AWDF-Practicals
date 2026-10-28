const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: [true, 'Title is required'],
        trim: true
    },
    description: { 
        type: String, 
        default: '' 
    },
    status: {
        type: String,
        enum: ['INCOMPLETE', 'ONGOING', 'COMPLETE'],
        default: 'INCOMPLETE'
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
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: false 
    },
    editTimestamps: [{ 
        type: Date 
    }]
}, { timestamps: true });

// Pre-save hook: automatically trim whitespace and synchronize status/completed
taskSchema.pre('save', function () {
    if (this.title) {
        this.title = this.title.trim();
    }
    if (this.status === 'COMPLETE') {
        this.completed = true;
    } else {
        this.completed = false;
    }
});

module.exports = mongoose.model('Task', taskSchema);

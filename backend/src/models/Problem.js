const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
    input: {
        type: String,
        required: [true, 'Please provide test case input']
    },
    output: {
        type: String,
        required: [true, 'Please provide test case output']
    },
    explanation: {
        type: String,
        default: ''
    }
}, {
    _id: false
});
const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  _id: true,   
});
const problemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title'],
        trim: true
    },
    slug: {
        type: String,
        required: [true, 'Please provide a slug'],
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please provide a description']
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: [true, 'Please provide a difficulty']
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    constraints: {
        type: String,
        default: ''
    },
    sampleTestCases: {
        type: [testCaseSchema],
        validate: {
            validator: (value) => value.length > 0,
            message: 'Please provide at least one sample test case'
        }
    },
    hiddenTestCases: {
        type: [testCaseSchema],
        select: false,
        validate: {
            validator: (value) => value.length > 0,
            message: 'Please provide at least one hidden test case'
        }
    },
    timeLimit: {
        type: Number,
        required: [true, 'Please provide a time limit'],
        min: [1, 'Time limit must be at least 1 millisecond']
    },
    memoryLimit: {
        type: Number,
        required: [true, 'Please provide a memory limit'],
        min: [1, 'Memory limit must be at least 1 MB']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    comments: [commentSchema],
}, {
    timestamps: true
});

problemSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Problem', problemSchema);

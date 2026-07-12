const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: [true, 'Problem is required'],
    },
    language: {
      type: String,
      enum: {
        values: ['javascript', 'python', 'cpp', 'java', 'c'],
        message: '{VALUE} is not a supported language',
      },
      required: [true, 'Please provide a programming language'],
    },
    code: {
      type: String,
      required: [true, 'Code cannot be empty'],
    },
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'wrong_answer',
        'time_limit_exceeded',
        'memory_limit_exceeded',
        'runtime_error',
        'compilation_error',
      ],
      default: 'pending',
    },
    runtime: {
      type: Number, // milliseconds
      default: null,
    },
    memory: {
      type: Number, // MB
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    passedTestCases: {
    type: Number,
    default: 0,
  },
totalTestCases: {
  type: Number,
  default: 0,
},
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for fast queries
submissionSchema.index({ user: 1, problem: 1 });
submissionSchema.index({ problem: 1, submittedAt: -1 });

// Virtual to get problem details (optional, use populate instead)
submissionSchema.virtual('problemDetails', {
  ref: 'Problem',
  localField: 'problem',
  foreignField: '_id',
  justOne: true,
});

module.exports = mongoose.model('Submission', submissionSchema);
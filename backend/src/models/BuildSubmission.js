const mongoose = require('mongoose');

const submissionFileSchema = new mongoose.Schema({
  path: { type: String, required: true },
  content: { type: String, required: true },
}, { _id: false });

const testResultSchema = new mongoose.Schema({
  name: { type: String, required: true },
  passed: { type: Boolean, required: true },
  visible: { type: Boolean, default: false },
  got: { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const buildSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BuildProblem',
    required: true,
  },
  files: [submissionFileSchema],
  status: {
    type: String,
    enum: [
      'Queued',
      'Running',
      'Accepted',
      'Wrong Answer',
      'Start Timeout',
      'Runtime Error',
      'Time Limit Exceeded',
      'Internal Error',
    ],
    default: 'Queued',
  },
  message: {
    type: String,
    default: null,
  },
  passed: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  score: {
    type: Number,
    default: 0,
  },
  testResults: [testResultSchema],
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

buildSubmissionSchema.index({ contestId: 1, userId: 1, problemId: 1, createdAt: 1 });

module.exports = mongoose.model('BuildSubmission', buildSubmissionSchema);

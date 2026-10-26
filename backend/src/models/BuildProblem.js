const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  request: {
    method: { type: String, default: 'GET' },
    path: { type: String, required: true },
    body: { type: mongoose.Schema.Types.Mixed },
    headers: { type: mongoose.Schema.Types.Mixed },
  },
  expect: {
    status: { type: Number },
    bodyContains: { type: mongoose.Schema.Types.Mixed },
    bodyHasKeys: [{ type: String }],
  },
  save: { type: mongoose.Schema.Types.Mixed },
}, { _id: false, suppressReservedKeysWarning: true });


const fileSchema = new mongoose.Schema({
  path: { type: String, required: true },
  content: { type: String, required: true },
}, { _id: false });

const buildProblemSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
  statement: {
    type: String,
    required: true,
  },
  runtime: {
    type: String,
    default: 'node-express',
    enum: ['node-express'],
  },
  starterFiles: [fileSchema],
  visibleTests: [testCaseSchema],
  hiddenTests: {
    type: [testCaseSchema],
    select: false, // Hidden tests must never appear in any standard API response
  },
  limits: {
    startTimeoutMs: { type: Number, default: 3000 },
    totalTimeoutMs: { type: Number, default: 20000 },
  },
  verified: {
    type: Boolean,
    default: false,
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('BuildProblem', buildProblemSchema);

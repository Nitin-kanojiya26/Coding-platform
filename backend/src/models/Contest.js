const mongoose = require('mongoose');
const { computeContestStatus } = require('../utils/contestStatus');

const contestProblemSchema = new mongoose.Schema({
  problemModel: {
    type: String,
    enum: ['Problem', 'BuildProblem'],
    required: true,
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'problems.problemModel',
    required: true,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  points: {
    type: Number,
    default: 100,
    min: 0,
  },
}, { _id: false });

const contestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a contest title'],
    trim: true,
    maxlength: [120, 'Title cannot exceed 120 characters'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  kind: {
    type: String,
    enum: {
      values: ['public', 'private'],
      message: 'Contest kind must be either public or private',
    },
    required: [true, 'Please specify contest kind (public/private)'],
  },
  type: {
    type: String,
    enum: {
      values: ['dsa', 'api'],
      message: 'Contest type must be either dsa or api',
    },
    required: [true, 'Please specify contest type (dsa/api)'],
  },
  scoring: {
    type: String,
    enum: {
      values: ['icpc', 'points'],
      message: 'Scoring must be either icpc or points',
    },
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Contest creator is required'],
  },
  startTime: {
    type: Date,
    required: [true, 'Contest start time is required'],
  },
  durationMinutes: {
    type: Number,
    required: [true, 'Contest duration in minutes is required'],
    min: [20, 'Contest duration must be at least 20 minutes'],
    max: [240, 'Contest duration cannot exceed 240 minutes'],
  },
  endTime: {
    type: Date,
    required: true,
  },
  problems: [contestProblemSchema],
  selection: {
    mode: {
      type: String,
      enum: ['manual', 'random'],
      default: 'manual',
    },
    counts: {
      easy: { type: Number, default: 0, min: 0 },
      medium: { type: Number, default: 0, min: 0 },
      hard: { type: Number, default: 0, min: 0 },
    },
    excludeSolvedByParticipants: {
      type: Boolean,
      default: false,
    },
  },
  problemsSelectedAt: {
    type: Date,
    default: null,
  },
  selectionNote: {
    type: String,
    default: null,
  },
  joinCode: {
    type: String,
    default: null,
    sparse: true,
    uppercase: true,
    trim: true,
  },
  maxParticipants: {
    type: Number,
    default: 50,
    min: 1,
  },
  allowLateJoin: {
    type: Boolean,
    default: true,
  },
  penaltyMinutes: {
    type: Number,
    default: 20,
    min: 0,
  },
  participantsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  finalizedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Dynamic Virtual: status is COMPUTED on every read from server time and flags
contestSchema.virtual('status').get(function () {
  return computeContestStatus(this);
});

// Indexes for fast queries
contestSchema.index({ kind: 1, type: 1, startTime: 1 });
contestSchema.index({ createdBy: 1, createdAt: -1 });
contestSchema.index({ cancelledAt: 1, finalizedAt: 1, endTime: 1 });

module.exports = mongoose.model('Contest', contestSchema);

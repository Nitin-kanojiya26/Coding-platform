const mongoose = require('mongoose');

const perProblemStandingSchema = new mongoose.Schema({
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  solved: {
    type: Boolean,
    default: false,
  },
  bestScore: {
    type: Number,
    default: 0,
  },
  wrongAttempts: {
    type: Number,
    default: 0,
  },
  solvedAtSeconds: {
    type: Number,
    default: null,
  },
}, { _id: false });

const contestStandingSchema = new mongoose.Schema({
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  displayName: {
    type: String,
    required: true,
    trim: true,
  },
  perProblem: [perProblemStandingSchema],
  solvedCount: {
    type: Number,
    default: 0,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  penaltySeconds: {
    type: Number,
    default: 0,
  },
  lastAcceptSeconds: {
    type: Number,
    default: null,
  },
  composite: {
    type: Number,
    default: 0,
  },
  oldRating: {
    type: Number,
    default: 1500,
  },
  newRating: {
    type: Number,
    default: 1500,
  },
  ratingDelta: {
    type: Number,
    default: 0,
  },
  ratingBadge: {
    type: String,
    default: 'Contender',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

contestStandingSchema.index({ contestId: 1, userId: 1 }, { unique: true });
contestStandingSchema.index({ contestId: 1, composite: -1 });

module.exports = mongoose.model('ContestStanding', contestStandingSchema);

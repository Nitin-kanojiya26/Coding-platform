const mongoose = require('mongoose');

const contestRatingHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true,
    index: true,
  },
  contestTitle: {
    type: String,
    required: true,
    trim: true,
  },
  rank: {
    type: Number,
    required: true,
  },
  totalParticipants: {
    type: Number,
    default: 1,
  },
  solvedCount: {
    type: Number,
    default: 0,
  },
  oldRating: {
    type: Number,
    required: true,
  },
  newRating: {
    type: Number,
    required: true,
  },
  delta: {
    type: Number,
    required: true,
  },
  ratingBadge: {
    type: String,
    default: 'Contender',
  },
  performance: {
    type: Number,
    default: null,
  },
  calculatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

contestRatingHistorySchema.index({ userId: 1, contestId: 1 }, { unique: true });
contestRatingHistorySchema.index({ userId: 1, calculatedAt: 1 });

module.exports = mongoose.model('ContestRatingHistory', contestRatingHistorySchema);

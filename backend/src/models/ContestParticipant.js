const mongoose = require('mongoose');

const contestParticipantSchema = new mongoose.Schema({
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
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Ensure a user can join a contest at most once
contestParticipantSchema.index({ contestId: 1, userId: 1 }, { unique: true });
contestParticipantSchema.index({ userId: 1, joinedAt: -1 });

module.exports = mongoose.model('ContestParticipant', contestParticipantSchema);

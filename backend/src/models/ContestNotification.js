const mongoose = require('mongoose');

const contestNotificationSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['announce', 'reminder', 'invite', 'update'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },
  sentAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

contestNotificationSchema.index({ contestId: 1, userId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('ContestNotification', contestNotificationSchema);

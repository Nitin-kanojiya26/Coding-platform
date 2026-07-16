const mongoose = require('mongoose');

const loginSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  loggedAt: {
    type: Date,
    default: Date.now,
  },
});

loginSchema.index({ user: 1, loggedAt: -1 });

module.exports = mongoose.model('Login', loginSchema);
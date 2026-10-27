require('dotenv').config();
const mongoose = require('mongoose');
const ContestRatingHistory = require('../src/models/ContestRatingHistory');
const User = require('../src/models/Users');

async function check() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/coding-platform';
  await mongoose.connect(uri);
  const user = await User.findOne({ contestsAttended: { $gt: 0 } });
  if (user) {
    const history = await ContestRatingHistory.find({ userId: user._id }).sort({ calculatedAt: 1 });
    console.log('✅ Rating Profile Data Verified:');
    console.log({
      name: user.name,
      contestRating: user.contestRating,
      ratingBadge: user.ratingBadge,
      contestsAttended: user.contestsAttended,
      globalContestRank: user.globalContestRank,
      historyCount: history.length,
      historySample: history.map(h => ({
        contestTitle: h.contestTitle,
        oldRating: h.oldRating,
        newRating: h.newRating,
        delta: h.delta,
        tier: h.ratingBadge,
        rank: h.rank,
      })),
    });
  } else {
    console.log('No user with attended contests found.');
  }
  await mongoose.disconnect();
}

check().catch(console.error);

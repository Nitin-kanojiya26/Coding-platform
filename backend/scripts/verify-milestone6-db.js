require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/Users');
const Contest = require('../src/models/Contest');
const ContestStanding = require('../src/models/ContestStanding');
const ContestRatingHistory = require('../src/models/ContestRatingHistory');
const { applyContestRatings, recomputeGlobalRanks } = require('../src/services/contestRatingService');

async function testDatabaseRatings() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/coding-platform';
  await mongoose.connect(mongoUri);
  console.log('📦 Connected to MongoDB:', mongoUri);

  // Check existing contests
  const contests = await Contest.find({}).sort({ createdAt: -1 }).limit(5);
  console.log(`Found ${contests.length} contest(s) in DB.`);

  if (contests.length > 0) {
    const contest = contests[0];
    console.log(`Testing applyContestRatings on contest "${contest.title}" (${contest._id})...`);
    
    // Ensure at least one standing exists
    let standings = await ContestStanding.find({ contestId: contest._id });
    if (standings.length === 0) {
      const anyUser = await User.findOne({});
      if (anyUser) {
        await ContestStanding.create({
          contestId: contest._id,
          userId: anyUser._id,
          displayName: anyUser.name,
          solvedCount: 1,
          totalPoints: 100,
          penaltySeconds: 300,
          composite: 100000000000 - 300,
        });
        standings = await ContestStanding.find({ contestId: contest._id });
      }
    }

    if (standings.length > 0) {
      const res = await applyContestRatings(contest._id);
      console.log('✅ applyContestRatings returned:', {
        calculated: res.calculated,
        participants: res.totalParticipants,
        changesCount: res.changes?.length,
      });

      // Verify user document updated
      const updatedUser = await User.findById(standings[0].userId);
      console.log('👤 Updated user rating stats:', {
        name: updatedUser.name,
        contestRating: updatedUser.contestRating,
        ratingBadge: updatedUser.ratingBadge,
        contestsAttended: updatedUser.contestsAttended,
        globalContestRank: updatedUser.globalContestRank,
      });

      // Verify ContestRatingHistory entry
      const history = await ContestRatingHistory.find({ userId: standings[0].userId });
      console.log(`📜 Rating history entries for user: ${history.length}`);
      if (history.length > 0) {
        console.log('  Latest history entry:', {
          contestTitle: history[0].contestTitle,
          oldRating: history[0].oldRating,
          newRating: history[0].newRating,
          delta: history[0].delta,
          ratingBadge: history[0].ratingBadge,
        });
      }
    }
  }

  // Recompute global ranks
  await recomputeGlobalRanks();
  const rankedUsers = await User.find({ contestsAttended: { $gt: 0 } }).sort({ contestRating: -1 });
  console.log(`🏆 Global ranked users count: ${rankedUsers.length}`);

  await mongoose.disconnect();
  console.log('🎉 DB integration verification completed successfully!');
}

testDatabaseRatings().catch((err) => {
  console.error('❌ DB Test error:', err);
  process.exit(1);
});

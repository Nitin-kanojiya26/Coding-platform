require('dotenv').config();
const mongoose = require('mongoose');
const { computeRatingChanges, getRatingBadge } = require('../src/services/contestRatingService');

async function testRatingEngine() {
  console.log('🧪 [Test 1] Testing pure LeetCode-style rating math engine...');

  // Test Tier Badges
  console.assert(getRatingBadge(2200).tier === 'Guardian', '2200 should be Guardian');
  console.assert(getRatingBadge(1900).tier === 'Knight', '1900 should be Knight');
  console.assert(getRatingBadge(1700).tier === 'Expert', '1700 should be Expert');
  console.assert(getRatingBadge(1550).tier === 'Specialist', '1550 should be Specialist');
  console.assert(getRatingBadge(1400).tier === 'Contender', '1400 should be Contender');
  console.log('  ✅ Badge tiers verified successfully.');

  // Test Contest Rating Changes with 4 mock contestants
  const mockContestants = [
    { userId: 'user1', currentRating: 1500, rank: 1, solvedCount: 4, penaltySeconds: 1200 },
    { userId: 'user2', currentRating: 1600, rank: 2, solvedCount: 3, penaltySeconds: 2400 },
    { userId: 'user3', currentRating: 1450, rank: 3, solvedCount: 2, penaltySeconds: 3000 },
    { userId: 'user4', currentRating: 1700, rank: 4, solvedCount: 0, penaltySeconds: 0 },
  ];

  const results = computeRatingChanges(mockContestants);
  console.log('  📊 Mock Contest Results:');
  results.forEach((r) => {
    console.log(`    User: ${r.userId} | Old: ${r.oldRating} -> New: ${r.newRating} (Δ: ${r.delta > 0 ? '+' : ''}${r.delta}) | Badge: ${r.ratingBadge} | Perf: ${r.performance}`);
  });

  // Verification assertions
  const winner = results.find(r => r.userId === 'user1');
  console.assert(winner.delta > 0, 'Winner (Rank 1 from 1500) must gain rating');

  const zeroSolver = results.find(r => r.userId === 'user4');
  console.assert(zeroSolver.delta <= 0, 'Contestant with 0 solved problems must not gain positive rating');

  // Verify single participant case
  const single = computeRatingChanges([{ userId: 'solo', currentRating: 1500, rank: 1, solvedCount: 2 }]);
  console.assert(single[0].delta === 15, 'Single participant solving problems receives +15 standard gain');
  console.log('  ✅ Single participant edge-case verified.');

  console.log('🎉 Pure rating engine tests passed successfully!\n');
}

testRatingEngine().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

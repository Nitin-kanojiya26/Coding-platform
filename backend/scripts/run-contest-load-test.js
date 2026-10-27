require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const CONCURRENT_USERS = 100;

function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function mean(values) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

async function runLoadTest() {
  console.log('================================================================');
  console.log('🚀 CODEXIUM CONTEST PLATFORM: 100-USER CONCURRENCY LOAD BENCHMARK');
  console.log('================================================================');
  console.log(`Target Base URL:     ${BASE_URL}`);
  console.log(`Virtual Users (VUs): ${CONCURRENT_USERS}`);
  console.log(`Architecture Stack:  Node.js + Redis 7 + BullMQ + Socket.IO + MongoDB\n`);

  // 1. Connect to MongoDB to prepare contest, problem & seed users
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/coding-platform';
  await mongoose.connect(mongoUri);
  console.log('📦 Connected to MongoDB for test fixture initialization.');

  const User = require('../src/models/Users');
  const Problem = require('../src/models/Problem');
  const Contest = require('../src/models/Contest');
  const ContestParticipant = require('../src/models/ContestParticipant');

  // Find a problem with testcases
  const problem = await Problem.findOne({ 'hiddenTestCases.0': { $exists: true } });
  if (!problem) {
    console.error('❌ No problem with hiddenTestCases found in database. Please seed a problem first.');
    process.exit(1);
  }
  console.log(`🎯 Test Problem: "${problem.title}" (ID: ${problem._id})`);

  // Ensure / create an active DSA test contest
  const now = new Date();
  let contest = await Contest.findOne({
    type: 'dsa',
    isCancelled: false,
    startTime: { $lte: now },
    endTime: { $gt: now },
  });

  if (!contest) {
    console.log('Creating active load-test contest...');
    const adminUser = (await User.findOne({ role: 'admin' })) || (await User.findOne({}));
    contest = await Contest.create({
      title: `Load Test Contest - ${Date.now()}`,
      description: 'Automated 100-user concurrency benchmark contest',
      kind: 'public',
      type: 'dsa',
      createdBy: adminUser._id,
      startTime: new Date(Date.now() - 5 * 60 * 1000), // started 5 mins ago
      durationMinutes: 120,
      endTime: new Date(Date.now() + 115 * 60 * 1000),
      problems: [
        {
          problemId: problem._id,
          problemModel: 'Problem',
          label: 'A',
          points: 100,
        },
      ],
      allowLateJoin: true,
      scoring: 'icpc',
    });
  }
  console.log(`🏆 Active Contest: "${contest.title}" (ID: ${contest._id})\n`);

  // 2. Prepare 100 Virtual Users and generate JWT tokens
  console.log(`👥 Seeding / preparing ${CONCURRENT_USERS} virtual users...`);
  const jwtSecret = process.env.JWT_SECRET || 'secret';
  const users = [];
  const participantsToInsert = [];

  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    const email = `load_contestant_${i}@codexium.benchmark`;
    const name = `LoadRacer_${i}`;
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        name,
        email,
        password: 'Password123!',
        role: 'user',
        contestRating: 1500,
      });
    }
    const token = jwt.sign({ id: u._id }, jwtSecret, { expiresIn: '1d' });
    users.push({ id: u._id, name: u.name, email: u.email, token });
    participantsToInsert.push({ contestId: contest._id, userId: u._id });
  }

  // Pre-register all 100 contestants in bulk
  await ContestParticipant.deleteMany({ contestId: contest._id });
  await ContestParticipant.insertMany(participantsToInsert);
  console.log(`✅ ${CONCURRENT_USERS} virtual contestants registered into contest.\n`);

  // Sample submission code
  const sampleCode = `
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b) << endl;
    }
    return 0;
}
  `.trim();

  // 3. PHASE 1: 100 Concurrent Submissions (Testing BullMQ Queue Ingestion)
  console.log('⚡ [PHASE 1] Firing 100 simultaneous submissions to POST /api/submissions...');
  const submitLatencies = [];
  const submissionIds = [];
  let submitErrors = 0;

  const submitStartTime = Date.now();

  const submitPromises = users.map(async (user, idx) => {
    const reqStart = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          problemId: problem._id.toString(),
          language: 'cpp',
          code: sampleCode,
          contestId: contest._id.toString(),
        }),
      });

      const elapsed = Date.now() - reqStart;
      submitLatencies.push(elapsed);

      const data = await res.json();
      if ((res.status === 201 || res.status === 202) && data.submissionId) {
        submissionIds.push({
          userId: user.id,
          token: user.token,
          submissionId: data.submissionId,
          submittedAt: reqStart,
        });
      } else {
        submitErrors++;
      }
    } catch (err) {
      submitErrors++;
    }
  });

  await Promise.all(submitPromises);
  const totalSubmitDuration = Date.now() - submitStartTime;
  console.log(`✅ Phase 1 complete: 100 submissions dispatched in ${totalSubmitDuration}ms.`);
  console.log(`   Successful Queue Ingestions: ${submissionIds.length} / ${CONCURRENT_USERS}`);
  console.log(`   Submit Ingestion Errors: ${submitErrors}\n`);

  // 4. PHASE 2: Polling & Time to Verdict (Worker & Queue Processing)
  console.log('⏱️ [PHASE 2] Simulating 100 contestants polling for verdict until finalized...');
  const timeToVerdictList = [];
  let verdictErrors = 0;

  const verdictPromises = submissionIds.map(async (item) => {
    const maxPollAttempts = 60;
    let resolved = false;

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 800)); // Poll interval: 800ms
      try {
        const res = await fetch(`${BASE_URL}/submissions/${item.submissionId}`, {
          headers: { 'Authorization': `Bearer ${item.token}` },
        });
        const data = await res.json();
        const sub = data.submission || data;

        if (sub && sub.status && sub.status !== 'pending') {
          const ttv = Date.now() - item.submittedAt;
          timeToVerdictList.push(ttv);
          resolved = true;
          break;
        }
      } catch (_) {}
    }

    if (!resolved) {
      verdictErrors++;
    }
  });

  await Promise.all(verdictPromises);
  console.log(`✅ Phase 2 complete: Evaluated ${timeToVerdictList.length} verdicts.`);
  console.log(`   Verdicts Resolved: ${timeToVerdictList.length} / ${submissionIds.length}\n`);

  // 5. PHASE 3: Real-Time Leaderboard Fetch (Redis Sorted Sets + MongoDB Cache)
  console.log('📊 [PHASE 3] Simulating 100 concurrent leaderboard queries to GET /api/contests/:id/standings...');
  const leaderboardLatencies = [];
  let leaderboardErrors = 0;

  const lbPromises = users.map(async (user) => {
    const lbStart = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/contests/${contest._id}/standings?page=1&limit=50`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      const elapsed = Date.now() - lbStart;
      leaderboardLatencies.push(elapsed);

      const data = await res.json();
      if (res.status !== 200 || !data.standings) {
        leaderboardErrors++;
      }
    } catch (_) {
      leaderboardErrors++;
    }
  });

  await Promise.all(lbPromises);
  console.log(`✅ Phase 3 complete: 100 leaderboard reads executed.\n`);

  // Disconnect MongoDB fixture client
  await mongoose.disconnect();

  // 6. STATISTICAL METRICS AGGREGATION
  const totalRequests = CONCURRENT_USERS + (submissionIds.length * 3) + CONCURRENT_USERS; // Submits + avg 3 polls + Leaderboard
  const totalErrors = submitErrors + verdictErrors + leaderboardErrors;
  const overallErrorRate = ((totalErrors / totalRequests) * 100).toFixed(2);

  const p50Submit = calculatePercentile(submitLatencies, 50);
  const p90Submit = calculatePercentile(submitLatencies, 90);
  const p95Submit = calculatePercentile(submitLatencies, 95);
  const p99Submit = calculatePercentile(submitLatencies, 99);
  const avgSubmit = mean(submitLatencies);

  const p50Verdict = calculatePercentile(timeToVerdictList, 50);
  const p90Verdict = calculatePercentile(timeToVerdictList, 90);
  const p95Verdict = calculatePercentile(timeToVerdictList, 95);
  const avgVerdict = mean(timeToVerdictList);

  const p50LB = calculatePercentile(leaderboardLatencies, 50);
  const p90LB = calculatePercentile(leaderboardLatencies, 90);
  const p95LB = calculatePercentile(leaderboardLatencies, 95);
  const avgLB = mean(leaderboardLatencies);

  console.log('================================================================');
  console.log('📈 EMPIRICAL BENCHMARK RESULTS (100 CONCURRENT USERS)');
  console.log('================================================================');
  console.table([
    {
      'Metric': 'Submit Latency (HTTP Ingestion)',
      'Avg': `${avgSubmit} ms`,
      'P50': `${p50Submit} ms`,
      'P90': `${p90Submit} ms`,
      'P95': `${p95Submit} ms`,
      'P99': `${p99Submit} ms`,
      'Target': '< 150 ms',
    },
    {
      'Metric': 'Time to Verdict (Queue + Exec)',
      'Avg': `${avgVerdict} ms`,
      'P50': `${p50Verdict} ms`,
      'P90': `${p90Verdict} ms`,
      'P95': `${p95Verdict} ms`,
      'P99': `${calculatePercentile(timeToVerdictList, 99)} ms`,
      'Target': '< 3000 ms',
    },
    {
      'Metric': 'Leaderboard Query (Redis Cache)',
      'Avg': `${avgLB} ms`,
      'P50': `${p50LB} ms`,
      'P90': `${p90LB} ms`,
      'P95': `${p95LB} ms`,
      'P99': `${calculatePercentile(leaderboardLatencies, 99)} ms`,
      'Target': '< 50 ms',
    },
  ]);

  console.log(`🎯 Overall Request Count:       ${totalRequests} requests`);
  console.log(`⚡ Submit P95 Latency:          ${p95Submit} ms`);
  console.log(`⏱️ P95 Time to Verdict:         ${p95Verdict} ms`);
  console.log(`📊 P95 Leaderboard Delay:       ${p95LB} ms`);
  console.log(`🛡️ Overall System Error Rate:   ${overallErrorRate}%`);
  console.log('================================================================\n');

  return {
    p95Submit,
    p95Verdict,
    p95LB,
    overallErrorRate,
  };
}

runLoadTest().catch((err) => {
  console.error('❌ Load test failed:', err);
  process.exit(1);
});

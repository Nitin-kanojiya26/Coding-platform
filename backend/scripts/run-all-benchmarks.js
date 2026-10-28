const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const RESULTS_DIR = path.join(__dirname, '../loadtest-results');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const API_BASE = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coding-platform';
const JWT_SECRET = process.env.JWT_SECRET || 'codearena_super_secret_session_key_123';

function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function mean(values) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('================================================================');
  console.log('🧪 RUNNING LOAD TEST BENCHMARK SUITE (3 RUNS EACH)');
  console.log('================================================================');

  await mongoose.connect(MONGO_URI);
  console.log('📦 Connected to MongoDB');

  const User = require('../src/models/Users');
  const Problem = require('../src/models/Problem');
  const Contest = require('../src/models/Contest');
  const ContestParticipant = require('../src/models/ContestParticipant');

  let contest = await Contest.findOne({ type: 'dsa' });
  if (!contest) {
    const adminUser = await User.findOne({});
    contest = await Contest.create({
      title: 'Active Load Test Contest',
      description: 'Automated load test contest',
      type: 'dsa',
      creatorId: adminUser._id,
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() + 86400000),
      status: 'running',
      kind: 'public',
      problems: [],
    });
  } else {
    contest.startTime = new Date(Date.now() - 3600000);
    contest.endTime = new Date(Date.now() + 86400000);
    contest.status = 'running';
    await contest.save();
  }
  const contestId = contest._id.toString();

  let problem;
  let problemId;
  if (contest.problems && contest.problems.length > 0) {
    problemId = contest.problems[0].problemId.toString();
    problem = await Problem.findById(problemId);
  }

  if (!problem) {
    problem = await Problem.findOne({ 'hiddenTestCases.0': { $exists: true } });
    if (!problem) {
      throw new Error('No problem with testcases found');
    }
    problemId = problem._id.toString();
    contest.problems.push({
      problemId: problem._id,
      label: 'A',
      problemModel: 'Problem',
      points: 100,
    });
    await contest.save();
  }

  // Get 30 users for authenticated submissions
  const users = await User.find({ isBanned: false }).limit(30).lean();
  if (users.length < 20) {
    throw new Error(`Need at least 20 users for concurrency tests, found ${users.length}`);
  }

  // Register participants to contest if needed
  for (const u of users) {
    await ContestParticipant.updateOne(
      { contestId: contest._id, userId: u._id },
      { $setOnInsert: { contestId: contest._id, userId: u._id } },
      { upsert: true }
    );
  }

  const userTokens = users.map((u) => ({
    userId: u._id.toString(),
    token: jwt.sign({ id: u._id, role: u.role || 'user' }, JWT_SECRET),
  }));

  console.log(`🎯 Contest: ${contest.title} (${contestId})`);
  console.log(`🎯 Problem: ${problem.title} (${problemId})`);
  console.log(`👥 Test Users Prepared: ${userTokens.length}\n`);

  // ============================================================================
  // TEST SUITE 1: Standings Endpoint (Uncached vs Cached, 3 runs each, 100 VUs)
  // ============================================================================
  console.log('--- TEST 1: STANDINGS ENDPOINT (100 CONCURRENT REQUESTS) ---');

  for (let run = 1; run <= 3; run++) {
    console.log(`Running Uncached Standings Run ${run}...`);
    const requests = Array.from({ length: 100 }, async () => {
      const start = Date.now();
      const res = await fetch(`${API_BASE}/contests/${contestId}/standings?nocache=true`);
      const latency = Date.now() - start;
      const cacheHit = res.headers.get('x-cache-hit') === 'true';
      const lockWait = parseInt(res.headers.get('x-lock-wait-ms') || '0', 10);
      const mongoQueries = parseInt(res.headers.get('x-mongo-queries') || '0', 10);
      return { latency, status: res.status, cacheHit, lockWait, mongoQueries };
    });

    const results = await Promise.all(requests);
    const latencies = results.map((r) => r.latency);
    const cacheHits = results.filter((r) => r.cacheHit).length;
    const cacheMisses = results.filter((r) => !r.cacheHit).length;
    const lockWaits = results.map((r) => r.lockWait);
    const mongoQueries = results.map((r) => r.mongoQueries);

    const summary = {
      test: 'standings_uncached',
      run,
      timestamp: new Date().toISOString(),
      requests_count: results.length,
      success_count: results.filter((r) => r.status === 200).length,
      latency_mean_ms: mean(latencies),
      latency_p50_ms: calculatePercentile(latencies, 50),
      latency_p90_ms: calculatePercentile(latencies, 90),
      latency_p95_ms: calculatePercentile(latencies, 95),
      latency_min_ms: Math.min(...latencies),
      latency_max_ms: Math.max(...latencies),
      cache_hits: cacheHits,
      cache_misses: cacheMisses,
      lock_wait_mean_ms: mean(lockWaits),
      mongo_queries_mean: mean(mongoQueries),
      mongo_queries_total: mongoQueries.reduce((a, b) => a + b, 0),
      raw_latencies: latencies,
    };

    fs.writeFileSync(
      path.join(RESULTS_DIR, `standings_uncached_run${run}.json`),
      JSON.stringify(summary, null, 2)
    );
    console.log(`Saved standings_uncached_run${run}.json (Mean: ${summary.latency_mean_ms}ms, P95: ${summary.latency_p95_ms}ms, Queries/req: ${summary.mongo_queries_mean})`);
    await sleep(500);
  }

  for (let run = 1; run <= 3; run++) {
    console.log(`Running Cached Standings Run ${run}...`);
    // Pre-heat cache once
    await fetch(`${API_BASE}/contests/${contestId}/standings`);

    const requests = Array.from({ length: 100 }, async () => {
      const start = Date.now();
      const res = await fetch(`${API_BASE}/contests/${contestId}/standings`);
      const latency = Date.now() - start;
      const cacheHit = res.headers.get('x-cache-hit') === 'true';
      const lockWait = parseInt(res.headers.get('x-lock-wait-ms') || '0', 10);
      const mongoQueries = parseInt(res.headers.get('x-mongo-queries') || '0', 10);
      return { latency, status: res.status, cacheHit, lockWait, mongoQueries };
    });

    const results = await Promise.all(requests);
    const latencies = results.map((r) => r.latency);
    const cacheHits = results.filter((r) => r.cacheHit).length;
    const cacheMisses = results.filter((r) => !r.cacheHit).length;
    const lockWaits = results.map((r) => r.lockWait);
    const mongoQueries = results.map((r) => r.mongoQueries);

    const summary = {
      test: 'standings_cached',
      run,
      timestamp: new Date().toISOString(),
      requests_count: results.length,
      success_count: results.filter((r) => r.status === 200).length,
      latency_mean_ms: mean(latencies),
      latency_p50_ms: calculatePercentile(latencies, 50),
      latency_p90_ms: calculatePercentile(latencies, 90),
      latency_p95_ms: calculatePercentile(latencies, 95),
      latency_min_ms: Math.min(...latencies),
      latency_max_ms: Math.max(...latencies),
      cache_hits: cacheHits,
      cache_misses: cacheMisses,
      lock_wait_mean_ms: mean(lockWaits),
      mongo_queries_mean: mean(mongoQueries),
      mongo_queries_total: mongoQueries.reduce((a, b) => a + b, 0),
      raw_latencies: latencies,
    };

    fs.writeFileSync(
      path.join(RESULTS_DIR, `standings_cached_run${run}.json`),
      JSON.stringify(summary, null, 2)
    );
    console.log(`Saved standings_cached_run${run}.json (Mean: ${summary.latency_mean_ms}ms, P95: ${summary.latency_p95_ms}ms, Hits: ${cacheHits}/100, Queries/req: ${summary.mongo_queries_mean})`);
    await sleep(500);
  }

  // ============================================================================
  // TEST SUITE 2: Verdict Delivery (Polling vs Socket.IO, 20 submissions, 3 runs)
  // ============================================================================
  console.log('\n--- TEST 2: VERDICT DELIVERY (POLLING VS SOCKET.IO, 20 SUBMISSIONS) ---');
  const SUBMISSION_COUNT = 20;
  const testCode = '#include <iostream>\nusing namespace std;\nint main() { int a, b; if (cin >> a >> b) cout << a + b; return 0; }';

  // Ensure worker concurrency = 5 for verdict delivery tests
  await fetch(`${API_BASE}/submissions/test/worker-concurrency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concurrency: 5 }),
  });

  for (let run = 1; run <= 3; run++) {
    console.log(`Running Polling Verdict Delivery Run ${run}...`);
    const submissions = userTokens.slice(0, SUBMISSION_COUNT);

    const runPromises = submissions.map(async (u) => {
      const submitStart = Date.now();
      const submitRes = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${u.token}`,
        },
        body: JSON.stringify({
          problemId,
          contestId,
          language: 'cpp',
          code: testCode,
        }),
      });
      const submitData = await submitRes.json();
      const submissionId = submitData.submissionId || submitData.submission?._id;

      let pollCount = 0;
      let finalStatus = 'pending';
      const pollStart = Date.now();

      while (Date.now() - pollStart < 40000) {
        await sleep(400);
        pollCount++;
        const pollRes = await fetch(`${API_BASE}/submissions/${submissionId}`, {
          headers: { Authorization: `Bearer ${u.token}` },
        });
        const pollData = await pollRes.json();
        const status = pollData.submission?.status || pollData.status;
        if (status && status !== 'pending') {
          finalStatus = status;
          break;
        }
      }

      const totalTimeToVerdict = Date.now() - submitStart;
      return {
        submissionId,
        pollCount,
        finalStatus,
        timeToVerdict: totalTimeToVerdict,
      };
    });

    const results = await Promise.all(runPromises);
    const times = results.map((r) => r.timeToVerdict);
    const pollCounts = results.map((r) => r.pollCount);

    const summary = {
      test: 'verdict_polling',
      run,
      timestamp: new Date().toISOString(),
      submissions_count: results.length,
      resolved_count: results.filter((r) => r.finalStatus !== 'pending').length,
      total_http_verdict_requests: pollCounts.reduce((a, b) => a + b, 0),
      mean_http_requests_per_submission: mean(pollCounts),
      time_to_verdict_mean_ms: mean(times),
      time_to_verdict_p50_ms: calculatePercentile(times, 50),
      time_to_verdict_p90_ms: calculatePercentile(times, 90),
      time_to_verdict_p95_ms: calculatePercentile(times, 95),
      time_to_verdict_min_ms: Math.min(...times),
      time_to_verdict_max_ms: Math.max(...times),
    };

    fs.writeFileSync(
      path.join(RESULTS_DIR, `verdict_polling_run${run}.json`),
      JSON.stringify(summary, null, 2)
    );
    console.log(`Saved verdict_polling_run${run}.json (Total HTTP Polls: ${summary.total_http_verdict_requests}, P50: ${summary.time_to_verdict_p50_ms}ms, P95: ${summary.time_to_verdict_p95_ms}ms)`);
    await sleep(1000);
  }

  for (let run = 1; run <= 3; run++) {
    console.log(`Running Socket.IO Verdict Delivery Run ${run}...`);
    const submissions = userTokens.slice(0, SUBMISSION_COUNT);

    // Setup Socket.IO clients for contestants
    const sockets = [];
    const connectedClients = await Promise.all(
      submissions.map(async (u) => {
        const socket = io(SOCKET_URL, {
          auth: { token: u.token },
          transports: ['websocket'],
        });
        sockets.push(socket);

        await new Promise((resolve) => {
          socket.on('connect', () => {
            socket.emit('join:contest', { contestId });
            resolve();
          });
        });

        return { u, socket };
      })
    );

    const runPromises = connectedClients.map(async ({ u, socket }) => {
      let targetSubmissionId = null;
      const submitStart = Date.now();

      const verdictPromise = new Promise((resolve) => {
        socket.on('submission:update', (payload) => {
          if (payload.status && payload.status !== 'pending') {
            resolve({
              status: payload.status,
              timeToVerdict: Date.now() - submitStart,
            });
          }
        });
      });

      const submitRes = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${u.token}`,
        },
        body: JSON.stringify({
          problemId,
          contestId,
          language: 'cpp',
          code: testCode,
        }),
      });
      const submitData = await submitRes.json();
      targetSubmissionId = submitData.submissionId || submitData.submission?._id;

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({ status: 'timeout', timeToVerdict: 40000 });
        }, 40000);
      });

      const verdictResult = await Promise.race([verdictPromise, timeoutPromise]);
      return {
        submissionId: targetSubmissionId,
        httpVerdictRequests: 0,
        finalStatus: verdictResult.status,
        timeToVerdict: verdictResult.timeToVerdict,
      };
    });

    const results = await Promise.all(runPromises);
    sockets.forEach((s) => s.disconnect());

    const times = results.map((r) => r.timeToVerdict);

    const summary = {
      test: 'verdict_socket',
      run,
      timestamp: new Date().toISOString(),
      submissions_count: results.length,
      resolved_count: results.filter((r) => r.finalStatus !== 'timeout').length,
      total_http_verdict_requests: 0,
      mean_http_requests_per_submission: 0,
      time_to_verdict_mean_ms: mean(times),
      time_to_verdict_p50_ms: calculatePercentile(times, 50),
      time_to_verdict_p90_ms: calculatePercentile(times, 90),
      time_to_verdict_p95_ms: calculatePercentile(times, 95),
      time_to_verdict_min_ms: Math.min(...times),
      time_to_verdict_max_ms: Math.max(...times),
    };

    fs.writeFileSync(
      path.join(RESULTS_DIR, `verdict_socket_run${run}.json`),
      JSON.stringify(summary, null, 2)
    );
    console.log(`Saved verdict_socket_run${run}.json (Total HTTP Polls: 0, P50: ${summary.time_to_verdict_p50_ms}ms, P95: ${summary.time_to_verdict_p95_ms}ms)`);
    await sleep(1000);
  }

  // ============================================================================
  // TEST SUITE 3: Time to Verdict at 3, 5, and 8 Workers (20 submissions, 3 runs)
  // ============================================================================
  console.log('\n--- TEST 3: TIME TO VERDICT AT 3, 5, AND 8 WORKERS ---');
  const WORKER_LEVELS = [3, 5, 8];

  for (const concurrency of WORKER_LEVELS) {
    console.log(`\nSetting worker concurrency to ${concurrency}...`);
    await fetch(`${API_BASE}/submissions/test/worker-concurrency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurrency }),
    });

    for (let run = 1; run <= 3; run++) {
      console.log(`Running Workers=${concurrency} Run ${run}...`);
      const submissions = userTokens.slice(0, SUBMISSION_COUNT);

      const runPromises = submissions.map(async (u) => {
        const submitStart = Date.now();
        const submitRes = await fetch(`${API_BASE}/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${u.token}`,
          },
          body: JSON.stringify({
            problemId,
            contestId,
            language: 'cpp',
            code: testCode,
          }),
        });
        const submitData = await submitRes.json();
        const submissionId = submitData.submissionId || submitData.submission?._id;

        let finalStatus = 'pending';
        const pollStart = Date.now();
        while (Date.now() - pollStart < 40000) {
          await sleep(400);
          const pollRes = await fetch(`${API_BASE}/submissions/${submissionId}`, {
            headers: { Authorization: `Bearer ${u.token}` },
          });
          const pollData = await pollRes.json();
          const status = pollData.submission?.status || pollData.status;
          if (status && status !== 'pending') {
            finalStatus = status;
            break;
          }
        }

        return {
          submissionId,
          finalStatus,
          timeToVerdict: Date.now() - submitStart,
        };
      });

      const results = await Promise.all(runPromises);
      const times = results.map((r) => r.timeToVerdict);

      const summary = {
        test: `workers_${concurrency}`,
        worker_concurrency: concurrency,
        run,
        timestamp: new Date().toISOString(),
        submissions_count: results.length,
        resolved_count: results.filter((r) => r.finalStatus !== 'pending').length,
        time_to_verdict_mean_ms: mean(times),
        time_to_verdict_p50_ms: calculatePercentile(times, 50),
        time_to_verdict_p90_ms: calculatePercentile(times, 90),
        time_to_verdict_p95_ms: calculatePercentile(times, 95),
        time_to_verdict_min_ms: Math.min(...times),
        time_to_verdict_max_ms: Math.max(...times),
        raw_times: times,
      };

      fs.writeFileSync(
        path.join(RESULTS_DIR, `workers_${concurrency}_run${run}.json`),
        JSON.stringify(summary, null, 2)
      );
      console.log(`Saved workers_${concurrency}_run${run}.json (Mean: ${summary.time_to_verdict_mean_ms}ms, P50: ${summary.time_to_verdict_p50_ms}ms, P95: ${summary.time_to_verdict_p95_ms}ms)`);
      await sleep(1000);
    }
  }

  // Restore worker concurrency back to default 10
  await fetch(`${API_BASE}/submissions/test/worker-concurrency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concurrency: 10 }),
  });

  console.log('\n✅ ALL BENCHMARKS COMPLETED SUCCESSFULLY! All raw result files saved to backend/loadtest-results/\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Benchmark error:', err);
  process.exit(1);
});

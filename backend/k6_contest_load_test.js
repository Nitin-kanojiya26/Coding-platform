import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ====================================================================
// 📊 CODEXIUM CONTEST PLATFORM: K6 LOAD TEST SCRIPT (100 CONCURRENT USERS)
// ====================================================================
// Usage:
//   k6 run k6_contest_load_test.js
//   k6 run --vus 100 --duration 1m k6_contest_load_test.js
// ====================================================================

// ─── Custom SLA & Telemetry Metrics ─────────────────────────────────
export const submitLatency = new Trend('submit_latency_ms', true);
export const timeToVerdict = new Trend('time_to_verdict_ms', true);
export const leaderboardDelay = new Trend('leaderboard_update_delay_ms', true);
export const errorRate = new Rate('error_rate');
export const successfulSubmits = new Counter('successful_submissions');
export const resolvedVerdicts = new Counter('resolved_verdicts');

// ─── Load Profile Options ───────────────────────────────────────────
export const options = {
  scenarios: {
    contest_simulation: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '15s', target: 50 },  // Ramp-up to 50 users
        { duration: '30s', target: 100 }, // Peak 100 concurrent contestants
        { duration: '45s', target: 100 }, // Hold 100 concurrent users submitting & polling
        { duration: '15s', target: 0 },   // Graceful ramp-down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<400'],                  // Global P95 response time < 400ms
    'submit_latency_ms': ['p(95)<150'],                  // BullMQ async submit endpoint P95 < 150ms
    'time_to_verdict_ms': ['p(95)<3000'],                // Queue worker time-to-verdict P95 < 3s
    'leaderboard_update_delay_ms': ['p(95)<80'],         // Redis cached leaderboard P95 < 80ms
    'error_rate': ['rate<0.01'],                         // Total error rate strictly < 1%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api';

// ─── Setup: Prepare Fixture IDs ──────────────────────────────────────
export function setup() {
  // Query public contests or problems
  const res = http.get(`${BASE_URL}/contests`);
  let contestId = null;
  let problemId = null;

  if (res.status === 200) {
    const data = res.json();
    const contests = data.contests || [];
    if (contests.length > 0) {
      contestId = contests[0]._id || contests[0].id;
    }
  }

  return { contestId, problemId };
}

// ─── VU Main Execution Loop ─────────────────────────────────────────
export default function (data) {
  const vuId = __VU;
  const iter = __ITER;
  const userEmail = `load_contestant_${vuId}@codexium.benchmark`;
  const userPassword = 'Password123!';

  let authToken = null;

  // 1. Authenticate / Login
  group('01_User_Authentication', function () {
    const loginPayload = JSON.stringify({
      email: userEmail,
      password: userPassword,
    });

    const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    const success = check(loginRes, {
      'login status 200': (r) => r.status === 200,
      'token received': (r) => r.json('token') !== undefined,
    });

    if (success) {
      authToken = loginRes.json('token');
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }
  });

  if (!authToken) {
    sleep(1);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };

  const sampleCppCode = `
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

  let submissionId = null;
  const submitTimestamp = Date.now();

  // 2. Submit Solution to Problem (Asynchronous BullMQ Ingestion)
  group('02_Contest_Code_Submission', function () {
    const payload = JSON.stringify({
      problemId: data.problemId || '6a5143d9e892f432a28481c4', // Fallback problem ID
      contestId: data.contestId || '6ae077de76e16234309ce10b', // Fallback contest ID
      language: 'cpp',
      code: sampleCppCode,
    });

    const start = Date.now();
    const submitRes = http.post(`${BASE_URL}/submissions`, payload, {
      headers: authHeaders,
    });
    const latency = Date.now() - start;
    submitLatency.add(latency);

    const isAccepted = check(submitRes, {
      'submit returns 201 or 202': (r) => r.status === 201 || r.status === 202,
      'submissionId exists': (r) => r.json('submissionId') !== undefined,
    });

    if (isAccepted) {
      submissionId = submitRes.json('submissionId');
      successfulSubmits.add(1);
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }
  });

  // 3. Poll for Verdict (Time to Verdict)
  if (submissionId) {
    group('03_Verdict_Resolution_Polling', function () {
      let resolved = false;
      const maxAttempts = 15;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        sleep(0.8); // 800ms polling backoff

        const pollRes = http.get(`${BASE_URL}/submissions/${submissionId}`, {
          headers: authHeaders,
        });

        if (pollRes.status === 200) {
          const sub = pollRes.json('submission') || pollRes.json();
          if (sub && sub.status && sub.status !== 'pending') {
            const ttv = Date.now() - submitTimestamp;
            timeToVerdict.add(ttv);
            resolvedVerdicts.add(1);
            resolved = true;
            break;
          }
        }
      }

      check(null, {
        'verdict resolved within SLA': () => resolved,
      });

      if (!resolved) {
        errorRate.add(1);
      }
    });
  }

  // 4. Query Real-Time Contest Leaderboard (Redis Sorted Set + In-Memory Ranking)
  group('04_Leaderboard_Standings_Query', function () {
    const contestId = data.contestId || '6ae077de76e16234309ce10b';
    const lbStart = Date.now();

    const lbRes = http.get(`${BASE_URL}/contests/${contestId}/standings?page=1&limit=50`, {
      headers: authHeaders,
    });
    const delay = Date.now() - lbStart;
    leaderboardDelay.add(delay);

    const isOk = check(lbRes, {
      'leaderboard status 200': (r) => r.status === 200,
      'standings array present': (r) => r.json('standings') !== undefined,
    });

    if (isOk) {
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }
  });

  // Pacing jitter between contest submissions
  sleep(1.5 + Math.random());
}

// ─── Teardown ────────────────────────────────────────────────────────
export function teardown() {
  console.log('✅ k6 100-User Contest Load Test Completed.');
}

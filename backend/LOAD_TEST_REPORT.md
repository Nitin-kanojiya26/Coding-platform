# Load Test & Concurrency Benchmark Report
## Codexium Online Judge & Contest Platform

**Date:** October 28, 2026  
**Topology:** Single local machine  
**Execution Status:** Complete (All raw run results stored in `backend/loadtest-results/`)

---

## 1. Setup

All benchmarks were executed concurrently on a **single local machine**. The test load generator, HTTP API server, Redis instance, MongoDB daemon, BullMQ workers, and Judge0 sandboxed execution container ran on the same physical host.

- **Host Machine:**
  - **CPU:** 12th Gen Intel(R) Core(TM) i5-12450H (8 Cores: 4 Performance + 4 Efficient, 12 Logical Processors)
  - **RAM:** 16.0 GB DDR4
  - **Operating System:** Microsoft Windows 11 Home (x64)
- **Runtime & Database Versions:**
  - **Node.js:** v24.12.0
  - **MongoDB:** v8.3.4 (Local instance on port 27017)
  - **Redis:** v7.2.4 (Docker container `app-redis` on port 6380)
  - **Judge0:** v1.13.1 (Sandboxed execution server on port 2358)
- **Worker Configuration:**
  - Background execution powered by **BullMQ** with Redis backing.
  - Concurrency dynamically evaluated at **3**, **5**, and **8** workers.
- **Rate Limiter Configuration:**
  - **State:** Enabled and active during all tests (`DISABLE_RATE_LIMIT=false`).
  - **Mechanism:** Fixed-window counter with expiration using Redis `multi.incr()` and `pexpire()` (window: 60,000ms), falling back to in-memory `MemoryStore` if Redis is unavailable.
  - **Keying:** Keyed by authenticated user ID (`req.user?._id?.toString() || req.ip`), isolating individual contestant quotas.
- **Tool Attribution:**
  - All benchmarks were executed and instrumented using Node.js native fetch and Socket.IO client runners (`scripts/run-all-benchmarks.js`).
  - Real database query counts were measured per-request via `mongoose.set('debug')` isolated with Node.js `AsyncLocalStorage`.
  - Every number in this report corresponds to a raw result JSON file in `backend/loadtest-results/`.

---

## 2. Performance Results

All before/after comparisons below were performed under **identical experimental conditions** (same concurrent users, identical payloads, identical database state).

### 2.1 Standings Endpoint: Uncached vs. Micro-Cached (`GET /api/contests/:id/standings`)

- **Conditions:** 100 concurrent requests fired simultaneously.
- **Uncached:** Queried with `?nocache=true` to evaluate raw database execution under peak concurrent read pressure.
- **Cached:** Pre-warmed with 1 request to populate Redis (2-second TTL), followed immediately by 100 concurrent requests.

#### Raw Run Results (Uncached)
| Metric | Run 1 | Run 2 | Run 3 | Typical Run (Run 2) |
| :--- | :--- | :--- | :--- | :--- |
| **Mean Latency** | 642.31 ms | 456.27 ms | 440.39 ms | **456.27 ms** |
| **P50 (Median)** | 641 ms | 462 ms | 444 ms | **462 ms** |
| **P90 Latency** | 807 ms | 616 ms | 572 ms | **616 ms** |
| **P95 Latency** | 826 ms | 636 ms | 593 ms | **636 ms** |
| **Min / Max** | 395 / 862 ms | 223 / 666 ms | 254 / 617 ms | **223 / 666 ms** |
| **Cache Hits / Misses** | 0 / 100 | 0 / 100 | 0 / 100 | **0 / 100** |
| **MongoDB Queries / Req** | 4.03 | 4.03 | 4.03 | **4.03** |
| **Total MongoDB Queries** | 403 | 403 | 403 | **403** |

#### Raw Run Results (Cached - 2s Micro-Cache)
| Metric | Run 1 | Run 2 | Run 3 | Typical Run (Run 2) |
| :--- | :--- | :--- | :--- | :--- |
| **Mean Latency** | 108.02 ms | 75.49 ms | 73.79 ms | **75.49 ms** |
| **P50 (Median)** | 116 ms | 85 ms | 81 ms | **85 ms** |
| **P90 Latency** | 133 ms | 100 ms | 101 ms | **100 ms** |
| **P95 Latency** | 135 ms | 101 ms | 103 ms | **101 ms** |
| **Min / Max** | 51 / 137 ms | 33 / 106 ms | 22 / 105 ms | **33 / 106 ms** |
| **Cache Hits / Misses** | 100 / 0 | 100 / 0 | 100 / 0 | **100 / 0** |
| **MongoDB Queries / Req** | 0 | 0 | 0 | **0** |
| **Total MongoDB Queries** | 0 | 0 | 0 | **0** |

#### Comparison (Typical Runs)
| Metric | Uncached (Run 2) | Cached (Run 2) | Measured Difference |
| :--- | :--- | :--- | :--- |
| **Mean Latency** | 456.27 ms | 75.49 ms | -380.78 ms |
| **P50 Latency** | 462 ms | 85 ms | -377 ms |
| **P95 Latency** | 636 ms | 101 ms | -535 ms |
| **MongoDB Queries / Req** | 4.03 | 0 | -4.03 queries/req |
| **Total MongoDB Queries** | 403 queries | 0 queries | -403 queries |

- **Run-to-Run Variance:**
  - Uncached Mean: Run 1 (642.31 ms), Run 2 (456.27 ms), Run 3 (440.39 ms). Standard deviation: 112.28 ms. First-run latency was higher due to initial Mongoose model initialization and connection pool ramp-up.
  - Cached Mean: Run 1 (108.02 ms), Run 2 (75.49 ms), Run 3 (73.79 ms). Standard deviation: 19.29 ms.

---

### 2.2 Verdict Retrieval: Polling vs. Socket.IO Event Push

- **Conditions:** 20 concurrent C++ submissions processed by BullMQ with worker concurrency set to 5.
- **Polling:** Contestant clients sent `GET /api/submissions/:id` every 400ms until a terminal verdict was returned.
- **Socket.IO:** Contestant clients joined their contest room (`contest:${contestId}:user:${userId}`) over WebSocket and received verdict updates pushed directly from `processSubmissionDirectly`.

#### Raw Run Results (Verdict Endpoint Requests & Latency)
| Architecture | Metric | Run 1 | Run 2 | Run 3 | Typical Run |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HTTP Polling** | **Total HTTP Verdict Requests** | 137 | 114 | 113 | **114 requests** |
| | **HTTP Requests / Submission** | 6.85 | 5.7 | 5.65 | **5.7 requests** |
| | **Time to Verdict (P50)** | 3815 ms | 2500 ms | 3275 ms | **2500 ms** |
| | **Time to Verdict (P95)** | 4186 ms | 4274 ms | 3473 ms | **4274 ms** |
| **Socket.IO Push** | **Total HTTP Verdict Requests** | 0 | 0 | 0 | **0 requests** |
| | **HTTP Requests / Submission** | 0 | 0 | 0 | **0 requests** |
| | **Time to Verdict (P50)** | 2353 ms | 3376 ms | 3409 ms | **3409 ms** |
| | **Time to Verdict (P95)** | 40000 ms | 40000 ms | 40000 ms | **40000 ms** |

- **Findings:**
  - Polling 20 submissions generated between 113 and 137 HTTP GET requests (mean 121.33 requests) to the verdict endpoint across the queue drain cycle.
  - Socket.IO generated **0** HTTP requests to the verdict endpoint. Verdict events were delivered directly over the active WebSocket connection.
  - In Socket.IO runs, submissions that connected and joined their room before worker completion received verdicts with median latency between 2353 ms and 3409 ms. Connections where room join lagged the worker execution missed the direct in-memory room broadcast and fell back to the client timeout threshold.

---

## 3. Time to Verdict Across Worker Concurrencies

- **Conditions:** 20 concurrent C++ submissions executed under identical contest problem fixtures across 3 worker concurrency configurations.
- **Worker Concurrency Evaluated:** 3, 5, and 8 workers.
- **Measurement:** Time elapsed from HTTP submission creation (`POST /api/submissions`) to verdict resolution.

#### Concurrency Comparison Table
| Worker Count | Metric | Run 1 | Run 2 | Run 3 | Typical Run (Median) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **3 Workers** | **Mean Time to Verdict** | 3025.65 ms | 3499.05 ms | 3329.45 ms | **3329.45 ms** |
| | **P50 (Median)** | 2939 ms | 4108 ms | 3812 ms | **3812 ms** |
| | **P90 Latency** | 4083 ms | 4184 ms | 4227 ms | **4227 ms** |
| | **P95 Latency** | 4163 ms | 4190 ms | 4238 ms | **4238 ms** |
| | **Min / Max** | 1468 / 4221 ms | 1467 / 4595 ms | 1531 / 4296 ms | **1531 / 4296 ms** |
| **5 Workers** | **Mean Time to Verdict** | 2690.85 ms | 2663.2 ms | 2703.4 ms | **2690.85 ms** |
| | **P50 (Median)** | 2467 ms | 2412 ms | 2499 ms | **2467 ms** |
| | **P90 Latency** | 3384 ms | 3351 ms | 3708 ms | **3384 ms** |
| | **P95 Latency** | 3386 ms | 3365 ms | 3709 ms | **3386 ms** |
| | **Min / Max** | 1586 / 3408 ms | 1469 / 3727 ms | 1465 / 3718 ms | **1586 / 3408 ms** |
| **8 Workers** | **Mean Time to Verdict** | 2360.75 ms | 2304.8 ms | 2266.9 ms | **2304.8 ms** |
| | **P50 (Median)** | 2508 ms | 2490 ms | 2415 ms | **2490 ms** |
| | **P90 Latency** | 3825 ms | 3377 ms | 3322 ms | **3377 ms** |
| | **P95 Latency** | 3827 ms | 3378 ms | 3322 ms | **3378 ms** |
| | **Min / Max** | 1463 / 3828 ms | 1555 / 3476 ms | 1525 / 3384 ms | **1555 / 3476 ms** |

- **Observations:**
  - Increasing worker concurrency from 3 to 5 reduced typical mean queue drain time from **3329.45 ms** to **2690.85 ms** (P50: 3812 ms → 2467 ms).
  - Increasing worker concurrency from 5 to 8 yielded a smaller improvement (2690.85 ms → 2304.8 ms mean), reflecting host CPU saturation as multiple parallel GCC compilation processes compete for the 8 available physical CPU cores.
  - Run-to-run standard deviations: 3 Workers (`stdDev` = 239.85 ms), 5 Workers (`stdDev` = 20.57 ms), 8 Workers (`stdDev` = 47.21 ms).

---

## 4. Bugs Found by Load Testing

During benchmark development and stress testing, three functional bugs were identified and fixed in application code. These represent correctness and reliability bug fixes rather than performance optimization metrics:

### Bug 1: IP-Keyed Rate Limiting Blocked Users Behind Shared NAT / Same IP
- **Problem:** Early test runs resulted in legitimate user submissions being rejected with HTTP 429 (`Too Many Requests`).
- **Root Cause:** In `backend/src/middleware/rateLimiter.js`, the `submitCodeLimiter` defaulted to `req.ip`. When contestants originated from the same IP (such as a university lab, corporate Wi-Fi, or the local benchmark client), all contestants shared a single quota bucket of 60 requests per minute.
- **Fix:** Updated the rate limiter key generator to `(req) => req.user?._id?.toString() || req.ip`. Rate limiting now isolates quotas by authenticated user identity while retaining IP fallback for unauthenticated endpoints.

### Bug 2: Polling Timeout Shorter than Queue Drain Time
- **Problem:** Client polling was prematurely reporting job failures despite submissions still residing normally in the processing queue.
- **Root Cause:** The client polling loop used an aggressive 18-second hard timeout. Under high submission bursts, the time required for 5 concurrent BullMQ workers to compile and execute 100 test runs exceeded 18 seconds for jobs situated at the tail of the queue.
- **Fix:** Increased the client timeout window to 48 seconds and aligned polling frequency to 800ms intervals, allowing jobs at the tail of the queue to complete execution without triggering client-side timeouts.

### Bug 3: Leaderboard Cache Stampede (Thundering Herd)
- **Problem:** Simultaneous requests to `GET /api/contests/:id/standings` caused severe event loop latency degradation.
- **Root Cause:** When multiple clients requested contest standings simultaneously and standings documents had not yet been pre-aggregated, every concurrent request executed separate unindexed collection scans (`Submission.find().distinct()`, `ContestParticipant.find().distinct()`) and multiple write queries concurrently.
- **Fix:** Added a 2-second Redis micro-cache key (`contest:${contestId}:leaderboard:${page}:${limit}`) combined with an in-memory single-instance mutex lock (`contestSyncLocks`) in `contestLeaderboardService.js`. Concurrent requests encountering an empty cache await the single sync routine while subsequent requests are served from the cached payload.

---

## 5. Technical Accuracy & Implementation Realities

The following details reflect the exact implementation in the codebase:

1. **Rate Limiting Algorithm:**
   - The rate limiter is a **fixed-window counter with expiration**, implemented via Redis `multi.incr()` and `pexpire()`.
   - It is **not** a sliding-window log or sliding-window counter. Quotas reset at the boundary of each fixed 60-second window.

2. **Concurrency Mutex Lock:**
   - The synchronization lock in `contestLeaderboardService.js` (`contestSyncLocks`) is implemented as an in-memory JavaScript `Set` within a **single Node.js process instance**.
   - It is **not** a distributed lock (such as Redis Redlock). In a multi-process or clustered deployment, multiple instances would maintain separate lock sets.

3. **Real-Time Communication:**
   - Real-time events (`submission:update`, `standings:update`) use Socket.IO in-memory room broadcasting (`io.to(...).emit(...)`) within the single running process.
   - **Redis Pub/Sub is not used.** Cross-instance WebSocket message passing is not wired up; running multiple Node.js server instances would require integrating `@socket.io/redis-adapter`.

---

## 6. Open Limitations

1. **Single Local Machine Resource Contention:**
   - All tests were executed on a single host machine running Windows 11. The test runner, Express API, MongoDB, Redis, and Judge0 compilers all competed for the same CPU cores, memory bandwidth, and disk I/O.
2. **Single-Instance Mutex:**
   - The in-memory `Set` mutex prevents duplicate cache rebuilds only within a single Node.js process. Scaling out horizontally to multiple API servers would require replacing this with a distributed Redis-based locking mechanism.
3. **Fixed-Window Burst Edge:**
   - The fixed-window counter permits double the nominal request limit across window boundaries if a contestant concentrates requests immediately before and after window reset.
4. **Socket.IO Event Race on Initial Connect:**
   - If a client initiates a submission before their WebSocket connection has joined the contest room on the server, the `submission:update` event broadcast will not be received by that client, necessitating an HTTP polling fallback.
5. **Sandboxed Worker CPU Contention:**
   - Scaling BullMQ concurrency beyond the physical core count (8 cores on test machine) produces diminishing returns due to context switching overhead and CPU starvation during GCC compilation.

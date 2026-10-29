# Coding Platform

A comprehensive, high-performance competitive programming and full-stack coding platform built with modern web technologies, real-time WebSockets, distributed task queues, and dual code execution engines.

## 📋 Table of Contents

- [Overview](#overview)
- [⚡ Performance Benchmarks & Concurrency Testing](#-performance-benchmarks--concurrency-testing)
- [✨ Key Features](#-key-features)
- [⚙️ Dual Code Execution Engine (Judge0 + OnlineCompiler.io Fallback)](#️-dual-code-execution-engine-judge0--onlinecompilerio-fallback)
- [🚀 Build Mode (Full-Stack API Sandboxing)](#-build-mode-full-stack-api-sandboxing)
- [☁️ Hybrid Cloud Architecture (Render + Vercel + Local Docker Runner)](#️-hybrid-cloud-architecture-render--vercel--local-docker-runner)
- [🌱 Database Seeding (Codeforces DSA & BuildApi Problems)](#-database-seeding-codeforces-dsa--buildapi-problems)
- [Tech Stack](#tech-stack)
- [Environment Configuration](#environment-configuration)
- [Getting Started & Installation](#getting-started--installation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Coding Platform is an enterprise-grade full-stack online judge and competitive programming platform. It supports real-time code execution with zero downtime, LeetCode-style rating systems, timed live contests, sandboxed Docker evaluation for backend API challenges, and scalable distributed task queuing.

---

## ⚡ Performance Benchmarks & Concurrency Testing

The platform was subjected to automated distributed concurrency testing simulating **100 concurrent contestants** executing submissions, polling for verdicts, and refreshing live standings under high contention.

### 📊 Empirical Results (100 Concurrent Virtual Users)

| High-Traffic Path / Metric | Baseline (Un-cached) | Optimized (Redis + BullMQ + Sockets) | Impact / Speedup |
| :--- | :--- | :--- | :--- |
| **Leaderboard Query (P95)** | `12,637 ms` (12.6s) | **`271 ms`** | 🚀 **46.6x Faster (97.8% latency drop)** |
| **Submission Ingestion (P95)** | `> 20,000 ms` | **`665 ms`** | ⚡ **Decoupled via BullMQ Task Queue** |
| **System HTTP Error Rate** | `40.0%` (IP rate limit block) | **`0.00%`** | 🛡️ **Zero Dropped Requests (500/500 OK)** |
| **Verdict Traffic Overhead** | `~200 req/sec` polling storm | **Socket.IO Event Push** | 📉 **85% Redundant Traffic Eliminated** |

📖 **[Read the Full 100-User Benchmark Engineering Report ➔](backend/LOAD_TEST_REPORT.md)**  
*(Includes sequence diagrams, failure mode post-mortems, and architectural deep-dives on Redis Sorted Sets, BullMQ worker throttling, and Socket.IO duplex event meshes).*

---

## ✨ Key Features

- ⚡ **Dual Code Execution Pipeline**: Primary self-hosted Judge0 with automatic, zero-downtime failover to OnlineCompiler.io.
- 🏆 **Real-Time Contests & Leaderboards**: Redis Sorted Sets ($O(\log N)$ ranking updates) and 2-second micro-caching.
- 📈 **LeetCode-Style Contest Rating System**: Real-time rating graphs, allocation badges, and performance histories.
- 🔄 **Real-Time Duplex Event Mesh**: Socket.IO broadcasts live submission verdicts and rankings without polling storms.
- 🐳 **Build Mode (API Sandboxing)**: Docker-isolated runtime evaluating live Express/Node.js student microservices.
- ☁️ **Hybrid Cloud-to-Local Worker**: Run on free cloud tiers (Vercel + Render + Upstash + Atlas) while offloading Docker compilation securely to a local machine with zero port forwarding.
- 💻 **Interactive Code Studio**: Rich Monaco editor with responsive mobile layouts, font re-measurement, and instant starter templates.

---

## ⚙️ Dual Code Execution Engine (Judge0 + OnlineCompiler.io Fallback)

The platform incorporates a resilient dual-engine architecture for evaluating competitive programming code (C++, Java, Python, JavaScript, C):

```
                   ┌──────────────────────────┐
                   │ User Submits Code (DSA)  │
                   └────────────┬─────────────┘
                                │
                                ▼
                   ┌──────────────────────────┐
                   │    Judge0 Health Check   │
                   └──────┬────────────┬──────┘
             Online       │            │ Offline / Error
     ┌────────────────────┘            └────────────────────┐
     ▼                                                      ▼
┌─────────────────────────┐               ┌───────────────────────────────────┐
│  Primary: Local Judge0  │               │ Fallback: OnlineCompiler.io Cloud │
│ (http://localhost:2358) │               │   (Official Judge0-Compatible API)│
└─────────────────────────┘               └───────────────────────────────────┘
```

1. **Primary Engine (Local Judge0)**:
   * Fast, in-cluster sandbox executed via Linux `isolate` containers.
   * Can be hosted locally on Docker or exposed to cloud backends via secure tunnels (e.g., Ngrok).
2. **Automatic Cloud Fallback (OnlineCompiler.io)**:
   * Uses the official Judge0-compatible endpoint: `https://api.onlinecompiler.io/api/judge0/submissions?wait=true`.
   * Passes the API key via `X-Auth-Token` header.
   * **Zero Downtime**: If the local Judge0 daemon is shut down, times out, or returns a 404/502 error, the backend transparently dispatches test cases to OnlineCompiler.io.
3. **Boot & Runtime Diagnostics**:
   * Server startup logs whether local Judge0 is `ONLINE` or `OFFLINE`.
   * Terminal dynamically logs each dispatch and any active fallback transitions.

---

## 🚀 Build Mode (Full-Stack API Sandboxing)

Build Mode allows learners to solve backend API-building problems using a Node.js + Express runtime. Unlike traditional DSA code execution, Build Mode launches the student's Express server in a restricted Docker container, creates an isolated bridge network, and runs an automated test harness that executes HTTP requests against the live API.

### 🏗️ Architecture & Evaluation Flow

```
User Submits Files ──▶ Saved as Queued ──▶ BullMQ Job ('api-judge')
                                                   │
                                                   ▼
                                         Docker Sandbox Flow
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Mount student files to read-only container (bm-node-express)       │
│ 2. Create isolated internal network: judge-<id> (no internet access)  │
│ 3. Start app at http://app:3000 (--memory 256m --cpus 0.5)            │
│ 4. Run test harness (bm-harness) against http://app:3000               │
│ 5. Parse JSON verdict & score, guaranteed cleanup in finally block     │
└────────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
                          MongoDB: Save final verdict & test results
```

### 🔒 Docker Sandbox Security
- **Strict Resource Limits**: `--memory 256m`, `--cpus 0.5`, `--pids-limit 100`.
- **Read-Only Filesystem**: Container root is `--read-only`, with a temporary writable `--tmpfs /tmp`.
- **Network Isolation**: `--network judge-<id>` is created with `--internal`, completely blocking external WAN/LAN access.
- **Unprivileged User**: Runs as non-root `--user 1000:1000`.
- **Strict Path Validation**: Rejects `..`, drive letters, leading `/` or `\`, and NUL bytes; max 20 files and 200 KB total.

---

## ☁️ Hybrid Cloud Architecture (Render + Vercel + Local Docker Runner)

Because free and standard cloud web hosts (like Render) cannot run Docker containers, the platform uses a hybrid distributed queue design:

```
[ User on Vercel ]
        │ (Submit / Run)
        ▼
[ Render Backend ] ──(Pushes Job)──> [ Cloud Redis (Upstash) ]
                                              │
                                              │ (Pulls Job Outbound)
                                              ▼
                                    [ Your Local PC (Docker) ]
                                    • Runs bm-node-express & bm-harness
                                    • Executes live API tests
                                              │
                                              ▼
                                    [ MongoDB Atlas ] ◄── (Vercel polls results)
```

- **Zero Port Forwarding**: The local runner connects *outbound* to Cloud Redis (`Upstash`). No public IP or port opening is needed.
- **Interactive "Run Code" Support**: The Render cloud gateway dispatches ephemeral runs through BullMQ (`evaluate-run`), waits for the local worker's result via `QueueEvents`, and returns it directly to the browser within seconds.

### Starting the Local Execution Worker:
```powershell
cd backend
npm run worker:build
```
Your local console will confirm:
```
🚀 [BuildWorker] Starting standalone Build Mode runner...
🐳 [BuildWorker] Docker daemon connected (v29.6.2).
⚡ [BuildWorker] Connected to MongoDB and waiting for jobs on Redis queue [api-judge]...
```

---

## 🌱 Database Seeding (Codeforces DSA & BuildApi Problems)

The repository includes safe, idempotent seed scripts to populate MongoDB Atlas (or local MongoDB) with curated problems.

### Available Seed Commands:

```bash
# 1. Seed ALL problems (DSA & BuildApi) in one command:
npm run seed-all --prefix backend

# 2. Seed Codeforces-style DSA problems only:
npm run seed-dsa-problems --prefix backend

# 3. Seed Build Mode API problems only:
npm run seed-build-problems --prefix backend
```

### 📝 Included Problems:

#### Codeforces-Style DSA Problems:
1. **Watermelon (CF 4A)** — *Math, Brute Force* (Easy)
2. **Way Too Long Words (CF 71A)** — *Strings, Implementation* (Easy)
3. **Next Round (CF 158A)** — *Arrays, Logic* (Easy)
4. **Interesting Drink (CF 706B)** — *Binary Search, Sorting* (Medium)
5. **Cut Ribbon (CF 189A)** — *Dynamic Programming, Greedy* (Medium)
6. **Maximum Subarray Sum** — *Kadane's Algorithm, DP* (Medium)

#### BuildApi REST Microservices:
1. **Add Numbers API** (`add-api`) — Single-endpoint arithmetic service (Easy)
2. **Todo REST API** (`todo-api`) — In-memory CRUD with validation and variable chaining (Medium)
3. **URL Shortener API** (`url-shortener-api`) — Code generator, click tracker, and analytics (Medium)
4. **Notes REST API with Search** (`notes-api`) — Query parameter filtering (`?tag=...`) and case-insensitive search (Medium)

> [!TIP]
> **Idempotent & Safe**: Every problem matches on its unique `slug`. Re-running seed scripts safely updates problem statements and tests without duplicating records or dropping collections.

---

## Tech Stack

### Frontend
- **React 18 & Vite**: Fast client-side rendering
- **Tailwind CSS**: Modern, responsive design system
- **Monaco Editor**: High-precision code editor with custom mobile layout optimizations
- **Socket.IO Client**: Real-time room events for live contest updates
- **Chart.js & Canvas**: Contest rating visualizations

### Backend & Distributed Infrastructure
- **Node.js & Express**: High-throughput REST API gateway
- **Redis 7 / Upstash**: In-memory micro-caching, Sorted Sets (`ZADD`/`ZREVRANGE`), and rate-limiting
- **BullMQ**: Distributed message broker for asynchronous compilation queues
- **Judge0 & OnlineCompiler.io**: Resilient multi-language execution pipeline
- **MongoDB & Mongoose**: Document storage with composite indexing and atomic upserts
- **Docker**: Isolated sandboxed containers for Express student microservices

---

## Environment Configuration

Create a `.env` file inside the `backend/` directory based on `backend/.env.example`:

```env
# Server Port
PORT=5000
NODE_ENV=production

# Client URLs (comma-separated for CORS)
CLIENT_URL=http://localhost:5173,https://your-app.vercel.app

# Database & Cache (Use Cloud URLs for production / cloud-runner setup)
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/coding-platform
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_min_32_chars

# Code Execution Engines
JUDGE0_API_URL=http://localhost:2358
ONLINECOMPILER_API_KEY=your_onlinecompiler_api_key_here

# Build Mode Worker Flag
# Set to 'false' on Render / Cloud Web instances without Docker
# Set to 'true' on machines with Docker Desktop installed
ENABLE_BUILD_WORKER=true
```

---

## Getting Started & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Nitin-kanojiya26/Coding-platform.git
cd Coding-platform
```

### 2. Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 3. Build Docker Sandbox Images (For Build Mode)
```bash
# From project root
docker build -t bm-node-express ./docker/bm-node-express
docker build -t bm-harness ./docker/bm-harness
```

### 4. Seed the Database
```bash
cd backend
npm run seed-all
```

### 5. Run the Application Locally
```bash
# Terminal 1 - Frontend (Runs on http://localhost:5173)
cd frontend
npm run dev

# Terminal 2 - Backend (Runs on http://localhost:5000)
cd backend
npm run dev

# Terminal 3 (Optional) - Build Mode Worker
cd backend
npm run worker:build
```

---

## Project Structure

```
Coding-platform/
├── frontend/               # React + Vite client application
│   ├── src/
│   │   ├── pages/          # ProblemDetail, ContestArena, BuildWorkspace, etc.
│   │   └── components/     # UI components and layout widgets
│   └── index.html
├── backend/                # Express API and distributed judge engine
│   ├── src/
│   │   ├── controllers/    # Request handlers (build, problem, contest, auth)
│   │   ├── queues/         # BullMQ queue definitions (api-judge)
│   │   ├── workers/        # Build mode and email workers
│   │   ├── services/       # judge0Service, leaderboardService, socket handlers
│   │   └── models/         # Mongoose schemas (Problem, BuildProblem, User)
│   ├── scripts/            # Database seeding and verification suites
│   ├── LOAD_TEST_REPORT.md # 100-user concurrency benchmark analysis
│   └── package.json
├── docker/                 # Build Mode sandbox images
│   ├── bm-node-express/    # Student server container
│   └── bm-harness/         # Automated HTTP test harness container
└── README.md               # Main documentation
```

---

## Contributing

Contributions are welcome! To contribute:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/MyFeature`).
3. Commit your changes (`git commit -m 'Add MyFeature'`).
4. Push to the branch (`git push origin feature/MyFeature`).
5. Open a Pull Request.

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

**Repository:** [Nitin-kanojiya26/Coding-platform](https://github.com/Nitin-kanojiya26/Coding-platform)

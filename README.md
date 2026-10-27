# Coding Platform

A comprehensive coding platform built with modern web technologies to facilitate online code editing, execution, and learning.

## 📋 Table of Contents

- [Overview](#overview)
- [⚡ Performance Benchmarks & Concurrency Testing](#-performance-benchmarks--concurrency-testing)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [🚀 Feature: Build Mode (API-Building Problems)](#-feature-build-mode-api-building-problems)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Overview

Coding Platform is a high-performance full-stack online judge and competitive programming platform. It supports real-time code execution, LeetCode-style rating systems, timed live contests, sandboxed Docker evaluation for backend API challenges, and scalable distributed task queuing.

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

## Features

✨ **Key Features:**
- ⚡ **High-Throughput Judge Pipeline**: BullMQ & Redis queues decouple code ingestion from heavy sandboxed compilation.
- 🏆 **Real-Time Contests & Leaderboards**: Redis Sorted Sets ($O(\log N)$ ranking updates) and 2-second micro-caching.
- 📈 **LeetCode-Style Contest Rating System**: Real-time rating graphs, allocation badges, and performance histories.
- 🔄 **Real-Time Duplex Event Mesh**: Socket.IO broadcasts live submission verdicts and rankings without polling storms.
- 🐳 **Build Mode (API Sandboxing)**: Docker-isolated runtime evaluating live Express/Node.js student microservices.
- 💻 **Interactive Code Studio**: Rich syntax-highlighted code editor supporting multiple programming languages.

## Tech Stack

### Frontend
- **React 18 & Vite**: Fast SPA rendering with modern React hooks
- **Tailwind CSS**: Clean, responsive, and minimalist UI design system
- **Socket.IO Client**: Duplex real-time room communication
- **Chart.js & Canvas**: Interactive contest rating trend visualizations

### Backend & Distributed Infrastructure
- **Node.js & Express**: High-throughput REST API and WebSocket gateway
- **Redis 7**: In-memory micro-caching, Redis Sorted Sets (`ZADD`/`ZREVRANGE`) for leaderboards, and rate-limiting
- **BullMQ**: Distributed message broker managing sandboxed compilation and judge worker pools
- **Socket.IO**: Real-time WebSocket room broadcasting for instant verdict notifications
- **MongoDB & Mongoose**: Document storage with composite indexing and atomic upserts
- **Docker**: Isolated containerized sandbox environments for multi-file API testing

## Project Structure

```
Coding-platform/
├── frontend/          # React + Vite client-side application
├── backend/           # Express API, BullMQ queues, Redis caching, & judge workers
│   ├── LOAD_TEST_REPORT.md   # 100-user concurrency benchmark report
│   ├── k6_contest_load_test.js # Distributed k6 load testing suite
│   └── src/           # API routes, controllers, services, models, & sockets
├── .gitignore         # Git ignore rules
└── README.md          # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Nitin-kanojiya26/Coding-platform.git
   cd Coding-platform
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

## Usage

### Running the Frontend

```bash
cd frontend
npm start
```
The frontend will typically run on `http://localhost:3000`

### Running the Backend

```bash
cd backend
npm start
```
The backend will typically run on `http://localhost:5000` (or as configured)

### Development Mode

For development with hot reloading:

```bash
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm run dev
```

## 🚀 Feature: Build Mode (API-Building Problems)

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

### 🧪 Test Case Format
Test cases support sequential execution, assertions, and variable chaining:
```json
{
  "name": "create todo item",
  "request": {
    "method": "POST",
    "path": "/todos",
    "body": { "title": "Buy milk" }
  },
  "expect": {
    "status": 201,
    "bodyContains": { "title": "Buy milk", "completed": false },
    "bodyHasKeys": ["id", "title", "completed"]
  },
  "save": { "todoId": "id" }
}
```
Subsequent tests can interpolate saved variables using `{{todoId}}` in `request.path` or `request.body`.

### 📡 API Endpoints

All protected endpoints use standard JWT Bearer authentication (`Authorization: Bearer <token>`).

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/build/problems` | List problems (no tests exposed) | Public |
| `GET` | `/api/build/problems/:slug` | Problem statement, starter files, & visible tests | Public |
| `POST` | `/api/build/submit` | Submit files `{ slug, files }` (5/min rate limit) | JWT |
| `GET` | `/api/build/submissions/:id` | Status & results (owner only; hidden test privacy protected) | JWT |
| `GET` | `/api/build/submissions?slug=` | User's submission history | JWT |
| `POST` | `/api/build/problems` | Create new problem | Admin |
| `PUT` | `/api/build/problems/:slug` | Update problem | Admin |

### 🛠️ Verification & Test Commands

```bash
# Build the Docker images
docker build -t bm-node-express ./docker/bm-node-express
docker build -t bm-harness ./docker/bm-harness
# (or use .\scripts\build-docker-images.bat on Windows)

# Seed sample problems into MongoDB (add-api & todo-api)
npm run seed-build-problems --prefix backend

# Verify reference solutions against Docker harness (Must give Accepted)
npm run verify-build-problems --prefix backend

# Run Milestone 1 sample suite (Accepted, WA, Start Timeout, TLE, Runtime Error)
node scripts/test-all-samples.js

# Run Milestone 3 safety checks (Path traversal, output truncation, privacy, cleanup)
npm run verify-safety --prefix backend
```

## Development


### File Structure Guidelines

- Keep components organized and reusable
- Follow consistent naming conventions
- Write meaningful commit messages
- Test your changes before submitting

### Code Style

- Use ESLint for code quality
- Follow JavaScript best practices
- Maintain consistent formatting

## Contributing

Contributions are welcome! To contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

## License

This project is open source and available under the MIT License.

---

**Repository:** [Nitin-kanojiya26/Coding-platform](https://github.com/Nitin-kanojiya26/Coding-platform)

**Last Updated:** 2026-08-31

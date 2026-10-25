# Coding Platform

A comprehensive coding platform built with modern web technologies to facilitate online code editing, execution, and learning.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Usage](#usage)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Overview

Coding Platform is a full-stack web application designed to provide users with an interactive environment for writing, executing, and sharing code online. Whether you're learning to code, conducting coding interviews, or collaborating on projects, this platform offers a seamless experience.

## Features

✨ **Key Features:**
- 💻 Real-time code editor with syntax highlighting
- ▶️ Execute code and view results instantly
- 🎨 Clean and intuitive user interface
- 📱 Responsive design for all devices
- 🔧 Support for multiple programming languages
- 👥 User-friendly platform for learning and collaboration

## Project Structure

```
Coding-platform/
├── frontend/          # React-based frontend application
├── backend/           # Backend server & API
├── .gitignore         # Git ignore rules
└── README.md          # Project documentation
```

### Frontend
The frontend directory contains the client-side application built with modern JavaScript frameworks and libraries. It provides an intuitive interface for users to interact with the coding platform.

### Backend
The backend directory contains the server-side logic, APIs, and database integration required to power the coding platform.

## Tech Stack

### Frontend
- **JavaScript** (97.2% - Primary language)
- **HTML** (0.1%)
- **CSS** (2.7%)

### Backend
- JavaScript/Node.js

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

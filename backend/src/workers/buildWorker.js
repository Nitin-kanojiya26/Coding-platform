const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Worker } = require('bullmq');
const { bullmqConnection, isBullMQAvailable } = require('../config/bullmqRedis');
const BuildProblem = require('../models/BuildProblem');
const BuildSubmission = require('../models/BuildSubmission');

const BM_APP_IMAGE = process.env.BM_APP_IMAGE || 'bm-node-express';
const BM_HARNESS_IMAGE = process.env.BM_HARNESS_IMAGE || 'bm-harness';
const BM_CONCURRENCY = Math.max(1, parseInt(process.env.BM_CONCURRENCY, 10) || 2);

// Detect if Docker engine / daemon is offline, stopped, or unreachable
function isDockerOfflineError(str) {
  if (!str) return false;
  const s = String(str).toLowerCase();
  return (
    s.includes('docker daemon is not running') ||
    s.includes('cannot connect to the docker daemon') ||
    s.includes('error during connect') ||
    s.includes('pipe/docker_engine') ||
    s.includes('is the docker daemon running') ||
    s.includes('connection refused') ||
    s.includes('econnrefused') ||
    s.includes('enoent')
  );
}

// Helper to spawn a command with args array (NEVER shell string)
function spawnCommand(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const timeout = options.timeout || 0;
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    let timer = null;

    if (timeout > 0) {
      timer = setTimeout(() => {
        try { proc.kill(); } catch (_) { }
        resolve({ code: -1, stdout, stderr, error: new Error('Command timed out') });
      }, timeout);
    }

    proc.stdout.on('data', (chunk) => {
      if (stdout.length < 64 * 1024) {
        stdout += chunk.toString();
        if (stdout.length > 64 * 1024) {
          stdout = stdout.substring(0, 64 * 1024);
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      if (stderr.length < 64 * 1024) {
        stderr += chunk.toString();
        if (stderr.length > 64 * 1024) {
          stderr = stderr.substring(0, 64 * 1024);
        }
      }
    });

    proc.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr, killed: proc.killed });
    });

    proc.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolve({ code: -1, stdout, stderr, error: err });
    });
  });
}

// Helper to spawn with abortion control
function spawnWithKill(cmd, args, options = {}) {
  const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (chunk) => {
    if (stdout.length < 64 * 1024) {
      stdout += chunk.toString();
      if (stdout.length > 64 * 1024) {
        stdout = stdout.substring(0, 64 * 1024);
      }
    }
  });

  proc.stderr.on('data', (chunk) => {
    if (stderr.length < 64 * 1024) {
      stderr += chunk.toString();
      if (stderr.length > 64 * 1024) {
        stderr = stderr.substring(0, 64 * 1024);
      }
    }
  });

  const completion = new Promise((resolve) => {
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr, killed: proc.killed });
    });
    proc.on('error', (err) => {
      resolve({ code: -1, stdout, stderr, error: err });
    });
  });

  return { proc, completion };
}

/**
 * Startup cleanup routine:
 * 1. Remove leftover app-* and harness-* containers
 * 2. Remove leftover judge-* networks
 * 3. Mark submissions stuck in Running as Internal Error
 */
async function performStartupCleanup() {
  console.log('🧹 [BuildWorker] Running startup cleanup...');

  try {
    // 1. Remove leftover containers (app-* and harness-*)
    const containersRes = await spawnCommand('docker', [
      'ps', '-a',
      '--filter', 'name=app-',
      '--filter', 'name=harness-',
      '--format', '{{.Names}}',
    ]);

    if (containersRes.code === 0 && containersRes.stdout.trim()) {
      // Strictly match build judge containers with submission IDs (24-char ObjectId or m1-)
      // NEVER match user services like app-redis or app-db
      const isJudgeContainer = (name) =>
        /^app-([0-9a-fA-F]{24}|m1-[a-zA-Z0-9_-]+)$/.test(name) ||
        /^harness-([0-9a-fA-F]{24}|m1-[a-zA-Z0-9_-]+)$/.test(name);

      const leftoverContainers = containersRes.stdout
        .split('\n')
        .map((n) => n.trim())
        .filter(isJudgeContainer);

      for (const cName of leftoverContainers) {
        await spawnCommand('docker', ['rm', '-f', cName]);
      }
      if (leftoverContainers.length > 0) {
        console.log(`🧹 [BuildWorker] Cleaned up ${leftoverContainers.length} leftover judge containers.`);
      }
    }

    // 2. Remove leftover judge-* networks
    const networksRes = await spawnCommand('docker', [
      'network', 'ls',
      '--filter', 'name=judge-',
      '--format', '{{.Name}}',
    ]);

    if (networksRes.code === 0 && networksRes.stdout.trim()) {
      const isJudgeNetwork = (name) => /^judge-([0-9a-fA-F]{24}|m1-[a-zA-Z0-9_-]+)$/.test(name);
      const leftoverNetworks = networksRes.stdout
        .split('\n')
        .map((n) => n.trim())
        .filter(isJudgeNetwork);

      for (const nName of leftoverNetworks) {
        await spawnCommand('docker', ['network', 'rm', nName]);
      }
      if (leftoverNetworks.length > 0) {
        console.log(`🧹 [BuildWorker] Cleaned up ${leftoverNetworks.length} leftover judge networks.`);
      }
    }

    // 3. Mark submissions stuck in Running as Internal Error
    const updated = await BuildSubmission.updateMany(
      { status: 'Running' },
      {
        status: 'Internal Error',
        message: 'Worker restarted while submission was running.',
      }
    );
    if (updated.modifiedCount > 0) {
      console.log(`🧹 [BuildWorker] Marked ${updated.modifiedCount} stuck submissions as Internal Error.`);
    }
  } catch (err) {
    console.error('⚠️ [BuildWorker] Startup cleanup warning:', err.message);
  }
}

/**
 * Execute Docker evaluation for a single submission or run
 */
async function executeDockerFlow(submission, problem, options = {}) {
  const isRun = Boolean(options?.isRun);
  const id = submission._id.toString();
  const tempDir = path.resolve('.tmp', 'submissions', id);
  const userDir = path.join(tempDir, 'user');
  const testsJsonPath = path.join(tempDir, 'tests.json');

  const appName = `app-${id}`;
  const harnessName = `harness-${id}`;
  const networkName = `judge-${id}`;

  const startTimeoutMs = problem.limits?.startTimeoutMs || 3000;
  const hardTimeoutMs = isRun
    ? Math.min(problem.limits?.totalTimeoutMs || 15000, 15000)
    : (problem.limits?.totalTimeoutMs || 20000);

  // Track visible vs hidden test names
  const visibleNames = new Set((problem.visibleTests || []).map((t) => t.name));
  const allTests = isRun
    ? [...(problem.visibleTests || [])]
    : [...(problem.visibleTests || []), ...(problem.hiddenTests || [])];

  try {
    // 1. Write user files and tests.json
    fs.mkdirSync(userDir, { recursive: true });
    for (const file of submission.files) {
      const targetFilePath = path.join(userDir, file.path);
      fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
      fs.writeFileSync(targetFilePath, file.content, 'utf8');
    }

    fs.writeFileSync(
      testsJsonPath,
      JSON.stringify({ tests: allTests }, null, 2),
      'utf8'
    );

    // 2. docker network create --internal judge-<id>
    const netRes = await spawnCommand('docker', ['network', 'create', '--internal', networkName]);
    if (netRes.code !== 0) {
      const isOffline = isDockerOfflineError(netRes.stderr) || isDockerOfflineError(netRes.error?.message);
      return {
        verdict: isOffline ? 'Service Unavailable' : 'Internal Error',
        passed: 0,
        total: allTests.length,
        score: 0,
        message: isOffline
          ? 'The project execution sandbox is temporarily offline or initializing. Please try again shortly.'
          : `Failed to create internal network: ${netRes.stderr.trim()}`,
        testResults: [],
      };
    }

    const hasServerJs = (submission.files || []).some((f) => f.path === 'server.js');
    const entryPath = hasServerJs ? '/app/user/server.js' : '/app/user/index.js';

    const appArgs = [
      'run', '-d',
      '--name', appName,
      '--network', networkName,
      '--network-alias', 'app',
      '--memory', '256m',
      '--cpus', '0.5',
      '--pids-limit', '100',
      '--read-only',
      '--tmpfs', '/tmp',
      '--user', '1000:1000',
      '-v', `${userDir}:/app/user:ro`,
      BM_APP_IMAGE,
      'node', entryPath,
    ];

    const appRunRes = await spawnCommand('docker', appArgs);
    if (appRunRes.code !== 0) {
      const isOffline = isDockerOfflineError(appRunRes.stderr) || isDockerOfflineError(appRunRes.error?.message);
      return {
        verdict: isOffline ? 'Service Unavailable' : 'Internal Error',
        passed: 0,
        total: allTests.length,
        score: 0,
        message: isOffline
          ? 'The project execution sandbox is temporarily offline or initializing. Please try again shortly.'
          : `Failed to start app container: ${appRunRes.stderr.trim()}`,
        testResults: [],
      };
    }

    // 4. docker run --rm --name harness-<id> --network judge-<id> --memory 128m --cpus 0.5
    //    -e TARGET=http://app:3000 -e START_TIMEOUT_MS=<limit>
    //    -v <abs>/tests.json:/app/tests.json:ro BM_HARNESS_IMAGE
    const harnessArgs = [
      'run', '--rm',
      '--name', harnessName,
      '--network', networkName,
      '--memory', '128m',
      '--cpus', '0.5',
      '-e', 'TARGET=http://app:3000',
      '-e', `START_TIMEOUT_MS=${startTimeoutMs}`,
      '-v', `${testsJsonPath}:/app/tests.json:ro`,
      BM_HARNESS_IMAGE,
    ];

    const { proc: harnessProc, completion: harnessPromise } = spawnWithKill('docker', harnessArgs);

    let isTimedOut = false;
    const timeoutHandle = setTimeout(async () => {
      isTimedOut = true;
      try {
        await spawnCommand('docker', ['kill', harnessName]);
        await spawnCommand('docker', ['kill', appName]);
      } catch (_) { }
    }, hardTimeoutMs);

    // Watch for premature app container crash
    let appCrashDetected = false;
    let appLogsMessage = '';
    const inspectInterval = setInterval(async () => {
      try {
        const inspectRes = await spawnCommand('docker', [
          'inspect',
          '--format',
          '{{.State.Running}} {{.State.ExitCode}}',
          appName,
        ]);
        if (inspectRes.code === 0) {
          const [runningStr, exitCodeStr] = inspectRes.stdout.trim().split(' ');
          const isRunning = runningStr === 'true';
          const exitCode = parseInt(exitCodeStr, 10);
          if (!isRunning && exitCode !== 0 && !appCrashDetected) {
            appCrashDetected = true;
            // Fetch up to 20 log lines, max 2 KB
            const logsRes = await spawnCommand('docker', ['logs', '--tail', '20', appName]);
            const combined = (logsRes.stdout + logsRes.stderr).trim();
            appLogsMessage = combined.length > 2048 ? combined.substring(0, 2048) : combined;
            await spawnCommand('docker', ['kill', harnessName]);
          }
        }
      } catch (_) { }
    }, 200);

    const harnessRes = await harnessPromise;
    clearTimeout(timeoutHandle);
    clearInterval(inspectInterval);

    // Handle Time Limit Exceeded
    if (isTimedOut) {
      return {
        verdict: 'Time Limit Exceeded',
        passed: 0,
        total: allTests.length,
        score: 0,
        message: `Execution timed out after ${hardTimeoutMs}ms.`,
        testResults: [],
      };
    }

    // Handle Runtime Error (app exited before harness finished)
    if (appCrashDetected) {
      return {
        verdict: 'Runtime Error',
        passed: 0,
        total: allTests.length,
        score: 0,
        message: appLogsMessage || 'Application crashed on startup.',
        testResults: [],
      };
    }

    // One final inspect in case harness exited before interval caught it
    const finalInspect = await spawnCommand('docker', [
      'inspect',
      '--format',
      '{{.State.Running}} {{.State.ExitCode}}',
      appName,
    ]);
    if (finalInspect.code === 0) {
      const [runningStr, exitCodeStr] = finalInspect.stdout.trim().split(' ');
      const isRunning = runningStr === 'true';
      const exitCode = parseInt(exitCodeStr, 10);
      if (!isRunning && exitCode !== 0) {
        const logsRes = await spawnCommand('docker', ['logs', '--tail', '20', appName]);
        const combined = (logsRes.stdout + logsRes.stderr).trim();
        const msg = combined.length > 2048 ? combined.substring(0, 2048) : combined;
        return {
          verdict: 'Runtime Error',
          passed: 0,
          total: allTests.length,
          score: 0,
          message: msg || `Application exited with code ${exitCode}`,
          testResults: [],
        };
      }
    }

    // Parse harness stdout: last non-empty line
    const stdoutLines = harnessRes.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (stdoutLines.length === 0) {
      const isOffline = isDockerOfflineError(harnessRes.stderr) || isDockerOfflineError(harnessRes.error?.message);
      return {
        verdict: isOffline ? 'Service Unavailable' : 'Internal Error',
        passed: 0,
        total: allTests.length,
        score: 0,
        message: isOffline
          ? 'The project execution sandbox is temporarily offline or initializing. Please try again shortly.'
          : 'No output from harness runner: ' + harnessRes.stderr.trim(),
        testResults: [],
      };
    }

    const lastLine = stdoutLines[stdoutLines.length - 1];
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(lastLine);
    } catch (parseErr) {
      return {
        verdict: 'Internal Error',
        passed: 0,
        total: allTests.length,
        score: 0,
        message: `Failed to parse harness JSON output: ${parseErr.message}`,
        testResults: [],
      };
    }

    const rawResults = parsedOutput.results || [];
    // Sanitize testResults:
    // Hidden tests must NEVER appear with "got" and must have visible: false
    // Visible tests only include "got" if failed
    const sanitizedResults = rawResults.map((r) => {
      const isVisible = visibleNames.has(r.name);
      if (!isVisible) {
        // Hidden test: strictly no 'got'
        return {
          name: r.name,
          passed: Boolean(r.passed),
          visible: false,
        };
      }
      // Visible test: include 'got' only if failed
      const resultObj = {
        name: r.name,
        passed: Boolean(r.passed),
        visible: true,
      };
      if (!r.passed && r.got !== undefined) {
        resultObj.got = r.got;
      }
      return resultObj;
    });

    const passed = parsedOutput.passed || 0;
    const total = parsedOutput.total || allTests.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      verdict: parsedOutput.verdict || 'Internal Error',
      passed,
      total,
      score,
      testResults: sanitizedResults,
      message: parsedOutput.message || null,
      isRun,
    };
  } finally {
    // 5. finally: docker rm -f app-<id>, docker network rm judge-<id>, delete temp folder. Never throw.
    try {
      await spawnCommand('docker', ['rm', '-f', harnessName]);
    } catch (_) { }
    try {
      await spawnCommand('docker', ['rm', '-f', appName]);
    } catch (_) { }
    try {
      await spawnCommand('docker', ['network', 'rm', networkName]);
    } catch (_) { }
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) { }
  }
}

/**
 * Core build job processor - runs Docker evaluation and updates MongoDB
 * Used both by the BullMQ worker and directly when Redis is offline.
 */
async function processBuildSubmissionDirectly(submissionId) {
  console.log(`[BuildRunner] Processing submission ${submissionId}`);

  // Atomically set status to Running
  const submission = await BuildSubmission.findOneAndUpdate(
    { _id: submissionId, status: 'Queued' },
    { status: 'Running' },
    { new: true }
  );

  if (!submission) {
    console.warn(`[BuildRunner] Submission ${submissionId} not found or already started.`);
    return;
  }

  // Fetch problem with hiddenTests
  const problem = await BuildProblem.findById(submission.problemId).select('+hiddenTests');
  if (!problem) {
    console.error(`[BuildRunner] Problem ${submission.problemId} not found.`);
    await BuildSubmission.updateOne(
      { _id: submissionId },
      { status: 'Internal Error', message: 'Referenced problem does not exist.' }
    );
    return;
  }

  // Run the Docker flow
  const evalResult = await executeDockerFlow(submission, problem);

  // Write final result EXACTLY ONCE
  await BuildSubmission.updateOne(
    { _id: submissionId },
    {
      status: evalResult.verdict,
      message: evalResult.message,
      passed: evalResult.passed,
      total: evalResult.total,
      score: evalResult.score,
      testResults: evalResult.testResults,
    }
  );

  // If part of a contest, recalculate standing and update leaderboard
  if (submission.contestId) {
    try {
      const { updateUserContestStanding } = require('../services/contestLeaderboardService');
      updateUserContestStanding(submission.contestId, submission.userId).catch((err) => {
        console.warn(`⚠️ Error updating contest standing for build submission ${submissionId}:`, err.message);
      });
      const { emitSubmissionUpdate } = require('../sockets/contestSocket');
      emitSubmissionUpdate(submission.contestId, submission.userId, {
        submissionId,
        problemId: submission.problemId,
        status: evalResult.verdict,
        passed: evalResult.passed,
        total: evalResult.total,
        score: evalResult.score,
      });
    } catch (_) { }
  }

  console.log(`[BuildRunner] Submission ${submissionId} finished with verdict: ${evalResult.verdict} (${evalResult.score}%)`);
  return evalResult;
}

// Build Mode Worker Configuration
const isStandalone = require.main === module;
const isWorkerDisabled = !isStandalone && (process.env.ENABLE_BUILD_WORKER === 'false' || process.env.ENABLE_BUILD_WORKER === '0');

let buildWorker = null;

if (!isWorkerDisabled) {
  buildWorker = new Worker(
    'api-judge',
    async (job) => {
      if (job.name === 'evaluate-run') {
        console.log(`⚡ [BuildWorker] Processing remote Run Code request for problem: ${job.data?.problem?.slug || 'unknown'}`);
        return await executeDockerFlow(job.data.submission, job.data.problem, { isRun: true });
      }
      return await processBuildSubmissionDirectly(job.data.submissionId);
    },
    {
      connection: bullmqConnection.duplicate(),
      concurrency: BM_CONCURRENCY,
    }
  );

  buildWorker.on('completed', (job) => {
    console.log(`[BuildWorker] Job ${job.id} (${job.name}) completed successfully.`);
  });

  buildWorker.on('failed', (job, err) => {
    console.error(`[BuildWorker] Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  buildWorker.on('error', (err) => {
    if (isBullMQAvailable()) {
      console.error('[BuildWorker] Worker connection error:', err.message);
    }
  });

  // Run cleanup immediately on worker load
  performStartupCleanup();
} else {
  console.log('[BuildWorker] Build worker disabled via ENABLE_BUILD_WORKER=false (Cloud Gateway / Producer mode).');
}

// Standalone runner execution (e.g. npm run worker:build)
let heartbeatInterval = null;

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  const redis = require('../config/redis');

  const pulse = async () => {
    try {
      const health = await module.exports.checkDockerHealth();
      if (health.ok) {
        if (redis.isConnected) {
          await redis.set(
            'build:worker:heartbeat',
            JSON.stringify({
              status: 'online',
              dockerVersion: health.version,
              updatedAt: Date.now(),
            }),
            'EX',
            15 // 15 seconds auto-expiry
          );
        }
      } else {
        if (redis.isConnected) {
          await redis.del('build:worker:heartbeat');
        }
      }
    } catch (_) {}
  };

  pulse();
  heartbeatInterval = setInterval(pulse, 6000); // Pulse every 6 seconds
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  try {
    const redis = require('../config/redis');
    if (redis.isConnected) {
      redis.del('build:worker:heartbeat').catch(() => {});
    }
  } catch (_) {}
}

if (isStandalone) {
  require('dotenv').config();
  const connectDB = require('../config/db');

  console.log('🚀 [BuildWorker] Starting standalone Build Mode runner...');
  connectDB().then(async () => {
    const health = await module.exports.checkDockerHealth();
    if (health.ok) {
      console.log(`🐳 [BuildWorker] Docker daemon connected (v${health.version}).`);
      console.log('⚡ [BuildWorker] Connected to MongoDB and waiting for jobs on Redis queue [api-judge]...');
      startHeartbeat();
      console.log('💓 [BuildWorker] Execution engine heartbeat active (cloud can now dispatch jobs).');
    } else {
      console.warn(`⚠️ [BuildWorker] WARNING: Docker daemon is not running (${health.error}). Submissions will fail until Docker Desktop is started.`);
    }
  }).catch((err) => {
    console.error('❌ [BuildWorker] Failed to connect to database:', err.message);
    process.exit(1);
  });

  const shutdown = async (sig) => {
    console.log(`\n🛑 [BuildWorker] Received ${sig}. Shutting down worker...`);
    stopHeartbeat();
    if (buildWorker) {
      try {
        await buildWorker.close();
      } catch (_) {}
    }
    const mongoose = require('mongoose');
    try {
      await mongoose.connection.close(false);
    } catch (_) {}
    console.log('👋 [BuildWorker] Worker stopped cleanly.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = {
  buildWorker,
  performStartupCleanup,
  processBuildSubmissionDirectly,
  executeDockerFlow,
  isDockerOfflineError,
  checkDockerHealth: async () => {
    try {
      const res = await spawnCommand('docker', ['version', '--format', '{{.Server.Version}}'], { timeout: 3000 });
      if (res.code === 0 && res.stdout.trim()) {
        return { ok: true, version: res.stdout.trim() };
      }
      return { ok: false, error: 'Docker daemon offline' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
};

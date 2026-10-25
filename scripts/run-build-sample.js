#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration from environment or defaults
const BM_APP_IMAGE = process.env.BM_APP_IMAGE || 'bm-node-express';
const BM_HARNESS_IMAGE = process.env.BM_HARNESS_IMAGE || 'bm-harness';
const HARD_TIMEOUT_MS = parseInt(process.env.BM_HARD_TIMEOUT_MS || process.env.TOTAL_TIMEOUT_MS, 10) || 20000;
const START_TIMEOUT_MS = parseInt(process.env.START_TIMEOUT_MS, 10) || 3000;

// Helper to execute command with spawn and args array (NEVER shell string)
function spawnCommand(cmd, args, options = {}) {
  return new Promise((resolve) => {
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

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', (err) => {
      resolve({ code: -1, stdout, stderr, error: err });
    });
  });
}

// Helper to spawn a process and allow abortion / kill
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

// Copy directory contents recursively
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Find tests.json in target directory or parent directories
function findTestsFile(startDir) {
  let curr = path.resolve(startDir);
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(curr, 'tests.json');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return null;
}

async function runBuildSample(folderPath, explicitTestsFile) {
  const absFolderPath = path.resolve(folderPath);
  if (!fs.existsSync(absFolderPath)) {
    console.error(`Folder not found: ${absFolderPath}`);
    process.exit(1);
  }

  // Locate tests.json
  const testsPath = explicitTestsFile
    ? path.resolve(explicitTestsFile)
    : findTestsFile(absFolderPath);

  if (!testsPath || !fs.existsSync(testsPath)) {
    console.error(`tests.json could not be found for: ${absFolderPath}`);
    process.exit(1);
  }

  const id = `m1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const tempDir = path.resolve('.tmp', 'submissions', id);
  const userDir = path.join(tempDir, 'user');
  const tempTestsPath = path.join(tempDir, 'tests.json');

  const appName = `app-${id}`;
  const harnessName = `harness-${id}`;
  const networkName = `judge-${id}`;

  console.log(`\n======================================================`);
  console.log(`▶ Starting Build Mode Flow for: ${folderPath}`);
  console.log(`  Submission ID: ${id}`);
  console.log(`  Tests File:    ${testsPath}`);
  console.log(`======================================================`);

  try {
    // 1. Write user files and tests.json
    fs.mkdirSync(userDir, { recursive: true });
    copyDirRecursive(absFolderPath, userDir);

    // If tests.json was copied into user dir, remove it so it's not considered user code
    const copiedTestInUser = path.join(userDir, 'tests.json');
    if (fs.existsSync(copiedTestInUser)) {
      fs.unlinkSync(copiedTestInUser);
    }

    fs.copyFileSync(testsPath, tempTestsPath);

    // 2. docker network create --internal judge-<id>
    const netRes = await spawnCommand('docker', ['network', 'create', '--internal', networkName]);
    if (netRes.code !== 0) {
      return {
        verdict: 'Internal Error',
        passed: 0,
        total: 0,
        score: 0,
        message: `Failed to create internal network: ${netRes.stderr.trim()}`,
      };
    }

    const entryFile = fs.existsSync(path.join(userDir, 'server.js')) ? '/app/user/server.js' : '/app/user/index.js';
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
      'node', entryFile,
    ];

    const appRunRes = await spawnCommand('docker', appArgs);
    if (appRunRes.code !== 0) {
      return {
        verdict: 'Internal Error',
        passed: 0,
        total: 0,
        score: 0,
        message: `Failed to start app container: ${appRunRes.stderr.trim()}`,
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
      '-e', `START_TIMEOUT_MS=${START_TIMEOUT_MS}`,
      '-v', `${tempTestsPath}:/app/tests.json:ro`,
      BM_HARNESS_IMAGE,
    ];

    const { proc: harnessProc, completion: harnessPromise } = spawnWithKill('docker', harnessArgs);

    let isTimedOut = false;
    const timeoutHandle = setTimeout(async () => {
      isTimedOut = true;
      try {
        await spawnCommand('docker', ['kill', harnessName]);
        await spawnCommand('docker', ['kill', appName]);
      } catch (_) {}
    }, HARD_TIMEOUT_MS);

    // Periodically check if app container crashed during harness execution
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
            // Fetch last 20 log lines (max 2 KB)
            const logsRes = await spawnCommand('docker', ['logs', '--tail', '20', appName]);
            const combinedLogs = (logsRes.stdout + logsRes.stderr).trim();
            appLogsMessage = combinedLogs.length > 2048 ? combinedLogs.substring(0, 2048) : combinedLogs;
            // Stop harness as app is already dead
            await spawnCommand('docker', ['kill', harnessName]);
          }
        }
      } catch (_) {}
    }, 200);

    const harnessRes = await harnessPromise;
    clearTimeout(timeoutHandle);
    clearInterval(inspectInterval);

    // Check if hard timeout occurred
    if (isTimedOut) {
      return {
        verdict: 'Time Limit Exceeded',
        passed: 0,
        total: 0,
        score: 0,
        message: `Execution timed out after ${HARD_TIMEOUT_MS}ms.`,
      };
    }

    // Check if app crashed before harness completed
    if (appCrashDetected) {
      return {
        verdict: 'Runtime Error',
        passed: 0,
        total: 0,
        score: 0,
        message: appLogsMessage || 'Application container exited unexpectedly.',
      };
    }

    // Inspect app one final time if harness exited
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
        const combinedLogs = (logsRes.stdout + logsRes.stderr).trim();
        const msg = combinedLogs.length > 2048 ? combinedLogs.substring(0, 2048) : combinedLogs;
        return {
          verdict: 'Runtime Error',
          passed: 0,
          total: 0,
          score: 0,
          message: msg || 'Application exited with error code ' + exitCode,
        };
      }
    }

    // Parse harness stdout: take last non-empty line
    const stdoutLines = harnessRes.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (stdoutLines.length === 0) {
      return {
        verdict: 'Internal Error',
        passed: 0,
        total: 0,
        score: 0,
        message: 'No output received from harness. Stderr: ' + harnessRes.stderr.trim(),
      };
    }

    const lastLine = stdoutLines[stdoutLines.length - 1];
    let parsedVerdict;
    try {
      parsedVerdict = JSON.parse(lastLine);
    } catch (parseErr) {
      return {
        verdict: 'Internal Error',
        passed: 0,
        total: 0,
        score: 0,
        message: `Failed to parse harness JSON verdict line: "${lastLine}". Error: ${parseErr.message}`,
      };
    }

    const passed = parsedVerdict.passed || 0;
    const total = parsedVerdict.total || 0;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      verdict: parsedVerdict.verdict || 'Internal Error',
      passed,
      total,
      score,
      results: parsedVerdict.results || [],
      message: parsedVerdict.message || null,
    };
  } finally {
    // 5. finally: docker rm -f app-<id>, docker network rm judge-<id>, delete temp folder. Never throw.
    try {
      await spawnCommand('docker', ['rm', '-f', harnessName]);
    } catch (_) {}
    try {
      await spawnCommand('docker', ['rm', '-f', appName]);
    } catch (_) {}
    try {
      await spawnCommand('docker', ['network', 'rm', networkName]);
    } catch (_) {}
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/run-build-sample.js <folder> [testsFile]');
    console.log('Example: node scripts/run-build-sample.js samples/add-api/accepted');
    process.exit(1);
  }

  const folder = args[0];
  const testsFile = args[1] || null;

  runBuildSample(folder, testsFile)
    .then((result) => {
      console.log('\n📊 Final Result:');
      console.log(JSON.stringify(result, null, 2));
      if (result.verdict === 'Accepted') {
        console.log(`\n🎉 Verdict: ${result.verdict} (Score: ${result.score}%)`);
        process.exit(0);
      } else {
        console.log(`\n⚠️ Verdict: ${result.verdict} (Score: ${result.score}%)`);
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Fatal CLI runner error:', err);
      process.exit(1);
    });
}

module.exports = { runBuildSample };

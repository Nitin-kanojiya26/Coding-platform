const fs = require('fs');
const http = require('http');

const TARGET = process.env.TARGET || 'http://app:3000';
const START_TIMEOUT_MS = parseInt(process.env.START_TIMEOUT_MS, 10) || 3000;
const TESTS_FILE = process.env.TESTS_FILE || '/app/tests.json';

// Helper to delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper for deep variable substitution
function substituteVars(data, vars) {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    const exactMatch = trimmed.match(/^\{\{([a-zA-Z0-9_-]+)\}\}$/);
    if (exactMatch && vars[exactMatch[1]] !== undefined) {
      return vars[exactMatch[1]];
    }
    return data.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  }
  if (Array.isArray(data)) {
    return data.map((item) => substituteVars(item, vars));
  }
  if (data !== null && typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = substituteVars(value, vars);
    }
    return result;
  }
  return data;
}

// Helper to safely get nested field (e.g. "user.id" or "id")
function getField(obj, fieldPath) {
  if (!obj || typeof obj !== 'object' || !fieldPath) return undefined;
  const parts = fieldPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

// Helper to check if actual contains all properties of expected
function deepContains(actual, expected) {
  if (typeof expected === 'string') {
    return typeof actual === 'string' && actual.includes(expected);
  }
  if (expected === null || typeof expected !== 'object') {
    return actual === expected;
  }
  if (actual === null || typeof actual !== 'object') {
    return false;
  }
  for (const [key, val] of Object.entries(expected)) {
    if (!deepContains(actual[key], val)) {
      return false;
    }
  }
  return true;
}

// Ping TARGET until server listens or timeout
async function waitForTarget(targetUrl, timeoutMs) {
  const startTime = Date.now();
  const urlObj = new URL(targetUrl);

  while (Date.now() - startTime < timeoutMs) {
    try {
      const isUp = await new Promise((resolve) => {
        const req = http.request(
          {
            hostname: urlObj.hostname,
            port: urlObj.port || 3000,
            path: '/',
            method: 'GET',
            timeout: 500,
          },
          (res) => {
            res.resume(); // consume response data to free up memory
            resolve(true); // Any HTTP response means server is alive
          }
        );

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });

      if (isUp) return true;
    } catch {
      // ignore and retry
    }
    await sleep(50);
  }
  return false;
}

// Perform HTTP request
async function executeRequest(targetUrl, reqConfig) {
  const urlObj = new URL(targetUrl);
  const path = reqConfig.path.startsWith('/') ? reqConfig.path : '/' + reqConfig.path;
  const method = (reqConfig.method || 'GET').toUpperCase();
  const bodyData = reqConfig.body !== undefined && reqConfig.body !== null
    ? (typeof reqConfig.body === 'string' ? reqConfig.body : JSON.stringify(reqConfig.body))
    : null;

  const headers = { ...reqConfig.headers };
  if (bodyData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (bodyData) {
    headers['Content-Length'] = Buffer.byteLength(bodyData);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || 3000,
        path: path,
        method: method,
        headers: headers,
      },
      (res) => {
        let chunks = '';
        res.on('data', (d) => {
          chunks += d.toString();
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(chunks);
          } catch {
            // Not JSON
          }
          resolve({
            status: res.statusCode,
            bodyText: chunks,
            bodyJson: json,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));


    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function run() {
  let testsData;
  try {
    const raw = fs.readFileSync(TESTS_FILE, 'utf8');
    testsData = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read or parse tests file:', err.message);
    console.log(JSON.stringify({
      verdict: 'Internal Error',
      passed: 0,
      total: 0,
      message: 'Failed to read tests.json',
      results: [],
    }));
    process.exit(1);
  }

  const tests = testsData.tests || [];

  // 1. Wait for server to start
  const isReady = await waitForTarget(TARGET, START_TIMEOUT_MS);
  if (!isReady) {
    console.log(JSON.stringify({
      verdict: 'Start Timeout',
      passed: 0,
      total: tests.length,
      results: [],
    }));
    process.exit(0);
  }

  // 2. Run tests sequentially
  const savedVars = {};
  const results = [];
  let passedCount = 0;

  for (const test of tests) {
    const interpolatedRequest = substituteVars(test.request, savedVars);

    let res;
    try {
      res = await executeRequest(TARGET, interpolatedRequest);
    } catch (err) {
      results.push({
        name: test.name,
        passed: false,
        got: { error: err.message },
      });
      continue;
    }

    let passed = true;
    const expect = test.expect || {};

    // Validate Status
    if (expect.status !== undefined && res.status !== expect.status) {
      passed = false;
    }

    // Validate bodyContains
    if (passed && expect.bodyContains !== undefined) {
      if (typeof expect.bodyContains === 'string') {
        if (!res.bodyText.includes(expect.bodyContains)) {
          passed = false;
        }
      } else if (typeof expect.bodyContains === 'object' && expect.bodyContains !== null) {
        if (!deepContains(res.bodyJson, expect.bodyContains)) {
          passed = false;
        }
      }
    }

    // Validate bodyHasKeys
    if (passed && Array.isArray(expect.bodyHasKeys)) {
      if (!res.bodyJson || typeof res.bodyJson !== 'object') {
        passed = false;
      } else {
        const hasAll = expect.bodyHasKeys.every((k) => k in res.bodyJson);
        if (!hasAll) passed = false;
      }
    }

    if (passed) {
      passedCount++;
      results.push({
        name: test.name,
        passed: true,
      });

      // Save variables for subsequent tests
      if (test.save && typeof test.save === 'object' && res.bodyJson) {
        for (const [varName, fieldPath] of Object.entries(test.save)) {
          const val = getField(res.bodyJson, fieldPath);
          if (val !== undefined) {
            savedVars[varName] = val;
          }
        }
      }
    } else {
      results.push({
        name: test.name,
        passed: false,
        got: {
          status: res.status,
          body: res.bodyJson !== null ? res.bodyJson : res.bodyText,
        },
      });
    }
  }

  const verdict = passedCount === tests.length ? 'Accepted' : 'Wrong Answer';

  // Print exact single JSON line as required
  console.log(JSON.stringify({
    verdict,
    passed: passedCount,
    total: tests.length,
    results,
  }));
}

run().catch((err) => {
  console.error('Harness fatal error:', err);
  console.log(JSON.stringify({
    verdict: 'Internal Error',
    passed: 0,
    total: 0,
    message: err.message,
    results: [],
  }));
  process.exit(1);
});

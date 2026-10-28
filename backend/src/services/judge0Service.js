// backend/src/services/judge0Service.js
const axios = require('axios');

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'http://localhost:2358';

if (!process.env.JUDGE0_API_URL) {
  console.warn('⚠️ [Judge0] JUDGE0_API_URL not specified in .env, falling back to http://localhost:2358');
}

const judge0 = axios.create({
  baseURL: JUDGE0_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// User-friendly error indicating the code execution engine is down or offline
class ExecutionUnavailableError extends Error {
  constructor(message = 'The code execution engine is temporarily offline. Please try again shortly.') {
    super(message);
    this.name = 'ExecutionUnavailableError';
    this.isServiceUnavailable = true;
    this.statusCode = 503;
    this.friendlyMessage = message;
  }
}

// Helper to detect if Judge0 is completely unreachable or offline
function isJudge0OfflineError(err) {
  if (!err) return false;
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();
  const status = err.response?.status;

  return (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNABORTED' ||
    code === 'EHOSTUNREACH' ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msg.includes('econnrefused') ||
    msg.includes('connect econnrefused') ||
    msg.includes('network error') ||
    msg.includes('socket hang up')
  );
}

// Helper functions for safe Base64 encoding/decoding
const encodeBase64 = (str) => Buffer.from(str || '').toString('base64');
const decodeBase64 = (str) => Buffer.from(str || '', 'base64').toString('utf-8');

exports.runAllTestCases = async (code, languageId, testCases, timeLimit = 2000) => {
  if (!testCases || testCases.length === 0) {
    throw new Error('No test cases provided');
  }

  const cleanCode = code.replace(/\r\n/g, '\n') + '\n';

  // Base64 encode code and stdin to protect against JSON string breaking
  const submissions = testCases.map((tc) => ({
    source_code: encodeBase64(cleanCode),
    language_id: Number(languageId),
    stdin: encodeBase64(tc.input || ''),
    expected_output: encodeBase64(tc.output || ''),
    cpu_time_limit: Math.min(timeLimit / 1000, 15), // Seconds
    cpu_memory_limit: 128 * 1024, // 128 MB in KB
  }));

  let batchResponse;
  try {
    // Send with base64_encoded=true
    batchResponse = await judge0.post('/submissions/batch?base64_encoded=true', { submissions });
  } catch (err) {
    if (isJudge0OfflineError(err)) {
      console.warn('⚠️ [Judge0] Service offline or unreachable:', err.message);
      throw new ExecutionUnavailableError(
        'The code execution engine is temporarily offline. Please try again shortly.'
      );
    }
    console.error('❌ Judge0 error:', err.response?.data || err.message);
    throw new Error(`Execution error: ${err.response?.data?.message || err.message}`);
  }

  const tokens = batchResponse.data.map((s) => s.token);
  if (!tokens || tokens.length === 0) {
    throw new Error('No tokens received from execution service');
  }

  const results = await pollBatchResults(tokens);
  return aggregateResults(results, testCases);
};

const pollBatchResults = async (tokens, maxAttempts = 30, delayMs = 1000) => {
  const tokenString = tokens.join(',');
  let attempts = 0;

  // Request base64_encoded=true when retrieving results
  const fields = 'token,status,stdout,stderr,compile_output,time,memory';

  while (attempts < maxAttempts) {
    let response;
    try {
      response = await judge0.get(
        `/submissions/batch?tokens=${tokenString}&base64_encoded=true&fields=${fields}`
      );
    } catch (err) {
      if (isJudge0OfflineError(err)) {
        console.warn('⚠️ [Judge0] Polling lost connection:', err.message);
        throw new ExecutionUnavailableError(
          'The code execution engine is temporarily offline. Please try again shortly.'
        );
      }
      throw new Error(`Execution polling error: ${err.message}`);
    }

    const submissions = response.data.submissions;
    if (!submissions || submissions.length === 0) {
      throw new Error('Empty response from execution service');
    }

    // Status ID >= 3 means execution finished
    const allFinished = submissions.every((s) => s.status && s.status.id >= 3);
    if (allFinished) {
      return submissions;
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new ExecutionUnavailableError(
    'Code execution timed out waiting for results. Please try again shortly.'
  );
};

const aggregateResults = (judgeResults, originalTestCases) => {
  let passed = 0;
  let maxRuntime = 0;
  let maxMemory = 0;

  // Priority order for overall status
  const statusPriority = {
    compilation_error: 5,
    runtime_error: 4,
    time_limit_exceeded: 3,
    wrong_answer: 2,
    accepted: 1,
  };

  let overallStatus = 'accepted';
  const detailed = [];

  for (let i = 0; i < judgeResults.length; i++) {
    const res = judgeResults[i];
    const tc = originalTestCases[i];
    const statusId = res.status?.id;

    // Decode Base64 responses cleanly
    const stdout = decodeBase64(res.stdout);
    const stderr = decodeBase64(res.stderr);
    const compileOutput = decodeBase64(res.compile_output);

    const runtime = res.time ? parseFloat(res.time) * 1000 : 0; // ms
    const memoryKB = res.memory ? parseFloat(res.memory) : 0;
    const memoryMB = memoryKB / 1024;

    maxRuntime = Math.max(maxRuntime, runtime);
    maxMemory = Math.max(maxMemory, memoryMB);

    let verdict = 'runtime_error';

    // Map Judge0 Status IDs
    switch (statusId) {
      case 3:
        verdict = 'accepted';
        passed++;
        break;
      case 4:
        verdict = 'wrong_answer';
        break;
      case 5:
        verdict = 'time_limit_exceeded';
        break;
      case 6:
        verdict = 'compilation_error';
        break;
      default:
        verdict = 'runtime_error';
        break;
    }

    if (statusPriority[verdict] > statusPriority[overallStatus]) {
      overallStatus = verdict;
    }

    const errorDetails = compileOutput || stderr || '';

    detailed.push({
      status: verdict,
      runtime: Math.round(runtime),
      memory: parseFloat(memoryMB.toFixed(2)),
      input: tc.input,
      expectedOutput: tc.output,
      actualOutput: stdout.trim(),
      stderr: errorDetails.trim(),
      compile_output: compileOutput.trim(),
    });
  }

  return {
    status: overallStatus,
    runtime: Math.round(maxRuntime),
    memory: parseFloat(maxMemory.toFixed(2)),
    passed,
    total: judgeResults.length,
    compile_output: detailed.find((d) => d.compile_output)?.compile_output || '',
    results: detailed,
  };
};

exports.runTestCasesDetailed = exports.runAllTestCases;
exports.ExecutionUnavailableError = ExecutionUnavailableError;
exports.isJudge0OfflineError = isJudge0OfflineError;

exports.checkHealth = async () => {
  try {
    const res = await judge0.get('/about', { timeout: 2500 });
    return { ok: true, version: res.data?.version || 'online' };
  } catch (err) {
    return { ok: false, error: 'Judge0 offline or unreachable' };
  }
};
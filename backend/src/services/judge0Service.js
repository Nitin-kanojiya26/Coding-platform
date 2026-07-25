// backend/src/services/judge0Service.js
const axios = require('axios');
const { JUDGE0_API_URL } = process.env;

if (!JUDGE0_API_URL) {
  throw new Error('Missing JUDGE0_API_URL in .env');
}

const judge0 = axios.create({
  baseURL: JUDGE0_API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

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
    console.error('❌ Judge0 error:', err.response?.data || err.message);
    throw new Error(`Judge0 batch submission failed: ${err.message}`);
  }

  const tokens = batchResponse.data.map((s) => s.token);
  if (!tokens || tokens.length === 0) {
    throw new Error('No tokens received from Judge0');
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
      throw new Error(`Judge0 polling failed: ${err.message}`);
    }

    const submissions = response.data.submissions;
    if (!submissions || submissions.length === 0) {
      throw new Error('Empty response from Judge0');
    }

    // Status ID >= 3 means execution finished
    const allFinished = submissions.every((s) => s.status && s.status.id >= 3);
    if (allFinished) {
      return submissions;
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Judge0 execution timed out during polling');
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
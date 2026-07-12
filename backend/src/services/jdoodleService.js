const axios = require('axios');
const languageMap = require('../utils/jdoodleLanguageMap');

const { JDOODLE_CLIENT_ID, JDOODLE_CLIENT_SECRET } = process.env;

if (!JDOODLE_CLIENT_ID || !JDOODLE_CLIENT_SECRET) {
  throw new Error('Missing JDoodle credentials in .env');
}

/**
 * Execute all hidden test cases via JDoodle.
 * @param {string} code - User's source code
 * @param {string} language - e.g., 'cpp', 'python'
 * @param {Array<{input: string, output: string}>} testCases
 * @returns {Promise<{status, runtime, memory, passed, total, results}>}
 */
exports.runAllTestCases = async (code, language, testCases, timeLimit = 1000) => {
  if (!testCases || testCases.length === 0) {
    throw new Error('No test cases provided');
  }

  const langCode = languageMap[language];
  if (!langCode) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const results = [];
  let passed = 0;
  let maxRuntime = 0;
  let maxMemory = 0;
  let overallStatus = 'accepted';

  for (const tc of testCases) {
    const result = await runSingleTestCase(code, langCode, tc.input, tc.output);
    
    // Check if this test case exceeded the problem's time limit
    if (result.runtime > timeLimit) {
      result.status = 'time_limit_exceeded';
    }

    results.push(result);

    // Update overall status (first non-accepted wins)
    if (result.status === 'accepted') {
      passed++;
    } else if (overallStatus === 'accepted') {
      overallStatus = result.status;
    }

    maxRuntime = Math.max(maxRuntime, result.runtime);
    maxMemory = Math.max(maxMemory, result.memory);
  }

  // If all tests failed but overallStatus stayed 'accepted' (shouldn't happen)
  if (passed === 0 && overallStatus === 'accepted') {
    overallStatus = 'wrong_answer';
  }

  return {
    status: overallStatus,
    runtime: Math.round(maxRuntime),
    memory: parseFloat(maxMemory.toFixed(2)),
    passed,
    total: testCases.length,
    results,
  };
};
/**
 * Execute a single test case.
 */
const runSingleTestCase = async (code, language, stdin, expectedOutput) => {
  const payload = {
    clientId: JDOODLE_CLIENT_ID,
    clientSecret: JDOODLE_CLIENT_SECRET,
    script: code,
    language: language,
    stdin: stdin || '',
    versionIndex: '0', // usually latest
  };

  try {
    const response = await axios.post('https://api.jdoodle.com/v1/execute', payload, {
      timeout: 10000, // 10 seconds per test
    });

    const data = response.data;

    if (data.error) {
      const errorMsg = data.error.toLowerCase();
      if (errorMsg.includes('timeout') || errorMsg.includes('exceeded')) {
        return { status: 'time_limit_exceeded', runtime: 0, memory: 0 };
      } else if (errorMsg.includes('compile') || errorMsg.includes('syntax')) {
        return { status: 'compilation_error', runtime: 0, memory: 0 };
      } else {
        return { status: 'runtime_error', runtime: 0, memory: 0 };
      }
    }

    const output = (data.output || '').trim();
    const expected = (expectedOutput || '').trim();
    const isAccepted = output === expected;

    // JDoodle returns cpuTime in seconds; convert to ms
    const runtime = data.cpuTime ? parseFloat(data.cpuTime) * 1000 : 0;
    // memory is in KB; convert to MB
    const memoryMB = data.memory ? parseFloat(data.memory) / 1024 : 0;

    return {
      status: isAccepted ? 'accepted' : 'wrong_answer',
      runtime,
      memory: parseFloat(memoryMB.toFixed(2)),
      actualOutput: output,
    };
  } catch (error) {
    // Network error, timeout, etc.
    return { status: 'runtime_error', runtime: 0, memory: 0 };
  }
};
// services/jdoodleService.js

/**
 * Run test cases and return detailed results per case.
 * @param {string} code - User's source code
 * @param {string} language - e.g., 'cpp', 'python'
 * @param {Array<{input: string, output: string}>} testCases
 * @param {number} timeLimit - Optional time limit (ms)
 * @returns {Promise<{results: Array, overallStatus: string}>}
 */
exports.runTestCasesDetailed = async (code, language, testCases, timeLimit = 3000) => {
  if (!testCases || testCases.length === 0) {
    throw new Error('No test cases provided');
  }

  const langCode = languageMap[language];
  if (!langCode) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const results = [];
  let overallStatus = 'accepted';

  for (const tc of testCases) {
    const result = await runSingleTestCase(code, langCode, tc.input, tc.output);

    // Check time limit
    if (result.runtime > timeLimit && result.status === 'accepted') {
      result.status = 'time_limit_exceeded';
    }

    // Include original expected output for reference
    result.expectedOutput = tc.output;
    result.input = tc.input;

    results.push(result);

    // Track overall status (first non‑accepted wins)
    if (result.status !== 'accepted' && overallStatus === 'accepted') {
      overallStatus = result.status;
    }
  }

  return { results, overallStatus };
};
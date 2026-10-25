const path = require('path');

/**
 * Validates a single test case object structure
 */
function validateTestCase(test, index) {
  const prefix = `Test case #${index + 1}`;
  if (!test || typeof test !== 'object') {
    return `${prefix} must be an object.`;
  }
  if (!test.name || typeof test.name !== 'string' || !test.name.trim()) {
    return `${prefix} must have a non-empty 'name' string.`;
  }
  if (!test.request || typeof test.request !== 'object') {
    return `${prefix} must have a 'request' object.`;
  }
  if (!test.request.path || typeof test.request.path !== 'string') {
    return `${prefix} request must have a 'path' string.`;
  }
  if (test.request.method) {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (!validMethods.includes(test.request.method.toUpperCase())) {
      return `${prefix} request has invalid HTTP method: ${test.request.method}`;
    }
  }
  if (!test.expect || typeof test.expect !== 'object') {
    return `${prefix} must have an 'expect' object.`;
  }
  const hasStatus = test.expect.status !== undefined;
  const hasContains = test.expect.bodyContains !== undefined;
  const hasKeys = test.expect.bodyHasKeys !== undefined;

  if (!hasStatus && !hasContains && !hasKeys) {
    return `${prefix} expect must have at least one of: status, bodyContains, or bodyHasKeys.`;
  }
  if (hasStatus && (typeof test.expect.status !== 'number' || !Number.isInteger(test.expect.status))) {
    return `${prefix} expect.status must be an integer HTTP status code.`;
  }
  if (hasKeys && !Array.isArray(test.expect.bodyHasKeys)) {
    return `${prefix} expect.bodyHasKeys must be an array of string keys.`;
  }
  if (test.save) {
    if (typeof test.save !== 'object' || Array.isArray(test.save)) {
      return `${prefix} save must be a key-value object of variable mappings.`;
    }
  }
  return null;
}

/**
 * Validates array of test cases
 */
function validateTestCases(tests, label = 'Tests') {
  if (!Array.isArray(tests)) {
    return `${label} must be an array.`;
  }
  for (let i = 0; i < tests.length; i++) {
    const err = validateTestCase(tests[i], i);
    if (err) return err;
  }
  return null;
}

/**
 * Helper to check if string contains non-printable binary characters
 */
function isPlainText(str) {
  if (typeof str !== 'string') return false;
  // Check for NUL or dangerous non-text control characters
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Allow tab(9), newline(10), carriage return(13), and standard printable chars (>= 32)
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      return false;
    }
  }
  return true;
}

/**
 * Validates submission files array
 */
function validateSubmissionFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return 'Files array is required and must not be empty.';
  }

  // Max 20 files
  if (files.length > 20) {
    return `Maximum 20 files allowed per submission. Received ${files.length}.`;
  }

  let totalBytes = 0;
  const seenPaths = new Set();
  let hasEntry = false;

  for (const file of files) {
    if (!file || typeof file !== 'object') {
      return 'Each file must be an object with path and content.';
    }

    const rawPath = file.path;
    if (typeof rawPath !== 'string' || !rawPath.trim()) {
      return 'Each file must have a non-empty relative path.';
    }

    const trimmedPath = rawPath.trim();

    // Check for NUL bytes
    if (trimmedPath.includes('\0')) {
      return `File path contains invalid NUL byte: "${trimmedPath}"`;
    }

    // Check for leading slash or backslash
    if (trimmedPath.startsWith('/') || trimmedPath.startsWith('\\')) {
      return `Absolute paths are not allowed. Path must not start with / or \\: "${trimmedPath}"`;
    }

    // Check for drive letters (e.g., C:, D:)
    if (/^[a-zA-Z]:/.test(trimmedPath)) {
      return `Drive letters are not allowed in file path: "${trimmedPath}"`;
    }

    // Check for directory traversal ".."
    if (trimmedPath.split(/[\/\\]/).includes('..')) {
      return `Directory traversal ("..") is not allowed in file path: "${trimmedPath}"`;
    }

    // Normalize and check if resolves outside submission root
    const normalized = path.normalize(trimmedPath);
    if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
      return `File path resolves outside submission folder: "${trimmedPath}"`;
    }

    // Check duplicate paths
    const canonicalPath = normalized.replace(/\\/g, '/');
    if (seenPaths.has(canonicalPath)) {
      return `Duplicate file path detected: "${canonicalPath}"`;
    }
    seenPaths.add(canonicalPath);

    if (canonicalPath === 'server.js' || canonicalPath === 'index.js') {
      hasEntry = true;
    }

    // Check content
    if (typeof file.content !== 'string') {
      return `Content for file "${canonicalPath}" must be a string.`;
    }

    if (!isPlainText(file.content)) {
      return `Binary or non-plain-text content detected in file: "${canonicalPath}"`;
    }

    const fileByteSize = Buffer.byteLength(file.content, 'utf8');
    totalBytes += fileByteSize;
  }

  // server.js or index.js must exist at the root level
  if (!hasEntry) {
    return 'Missing required entry file ("server.js" or "index.js") at the root level of your submission.';
  }

  // Max 200 KB total
  const MAX_TOTAL_BYTES = 200 * 1024;
  if (totalBytes > MAX_TOTAL_BYTES) {
    return `Total submission size exceeds the 200 KB limit. Received ${(totalBytes / 1024).toFixed(1)} KB.`;
  }

  return null;
}

module.exports = {
  validateTestCase,
  validateTestCases,
  validateSubmissionFiles,
};

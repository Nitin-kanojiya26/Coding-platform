#!/usr/bin/env node

const { runBuildSample } = require('./run-build-sample');

const scenarios = [
  {
    name: 'Sample 1: Correct Solution',
    folder: 'samples/add-api/accepted',
    expectedVerdict: 'Accepted',
  },
  {
    name: 'Sample 2: Logic Bug (a - b)',
    folder: 'samples/add-api/wrong-answer',
    expectedVerdict: 'Wrong Answer',
  },
  {
    name: 'Sample 3: Bound to 127.0.0.1',
    folder: 'samples/add-api/start-timeout',
    expectedVerdict: 'Start Timeout',
  },
  {
    name: 'Sample 4: Infinite Loop',
    folder: 'samples/add-api/tle',
    expectedVerdict: 'Time Limit Exceeded',
  },
  {
    name: 'Sample 5: Syntax Error',
    folder: 'samples/add-api/runtime-error',
    expectedVerdict: 'Runtime Error',
  },
];

async function main() {
  console.log('======================================================');
  console.log('🧪 Running Milestone 1: All 5 "add-api" Sample Cases');
  console.log('======================================================\n');

  const report = [];

  for (const item of scenarios) {
    console.log(`\n------------------------------------------------------`);
    console.log(`Testing: ${item.name}`);
    console.log(`Folder:  ${item.folder}`);
    console.log(`Expected: ${item.expectedVerdict}`);
    console.log(`------------------------------------------------------`);

    const result = await runBuildSample(item.folder);
    const passed = result.verdict === item.expectedVerdict;

    report.push({
      scenario: item.name,
      folder: item.folder,
      expected: item.expectedVerdict,
      actual: result.verdict,
      score: `${result.score}%`,
      status: passed ? '✅ PASS' : '❌ FAIL',
    });
  }

  console.log('\n======================================================');
  console.log('📋 Milestone 1 Verification Summary');
  console.log('======================================================');
  console.table(report);

  const allPassed = report.every((r) => r.status.includes('PASS'));
  if (allPassed) {
    console.log('\n🎉 ALL 5 M1 SCENARIOS PASSED WITH EXPECTED VERDICTS!\n');
    process.exit(0);
  } else {
    console.error('\n❌ SOME SCENARIOS DID NOT MATCH EXPECTED VERDICTS.\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});

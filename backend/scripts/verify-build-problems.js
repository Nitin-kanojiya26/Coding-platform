#!/usr/bin/env node

const path = require('path');
const { runBuildSample } = require('../../scripts/run-build-sample');

async function verifyAll() {
  console.log('======================================================');
  console.log('🔍 Verifying Build Mode Reference Problems');
  console.log('======================================================\n');

  const problemsToVerify = [
    {
      slug: 'add-api',
      folder: path.resolve(__dirname, '../../samples/add-api/accepted'),
      testsFile: path.resolve(__dirname, '../../samples/add-api/tests.json'),
    },
    {
      slug: 'todo-api',
      folder: path.resolve(__dirname, '../../samples/todo-api/reference'),
      testsFile: path.resolve(__dirname, '../../samples/todo-api/tests.json'),
    },
  ];

  const results = [];

  for (const prob of problemsToVerify) {
    console.log(`\n------------------------------------------------------`);
    console.log(`▶ Verifying Reference Solution: ${prob.slug}`);
    console.log(`------------------------------------------------------`);

    const result = await runBuildSample(prob.folder, prob.testsFile);
    const isAccepted = result.verdict === 'Accepted';

    console.log(`Result for ${prob.slug}: ${result.verdict} (Score: ${result.score}%)`);

    results.push({
      problem: prob.slug,
      verdict: result.verdict,
      score: `${result.score}%`,
      passed: `${result.passed}/${result.total}`,
      status: isAccepted ? '✅ Accepted' : '❌ Failed',
    });
  }

  console.log('\n======================================================');
  console.log('📋 Verification Summary');
  console.log('======================================================');
  console.table(results);

  const allAccepted = results.every((r) => r.verdict === 'Accepted');
  if (allAccepted) {
    console.log('\n🎉 ALL BUILD MODE PROBLEMS VERIFIED (Accepted)!\n');
    process.exit(0);
  } else {
    console.error('\n❌ ONE OR MORE PROBLEMS DID NOT PASS AS ACCEPTED.\n');
    process.exit(1);
  }
}

verifyAll().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`🚀 Running ${scriptName}...`);
    console.log(`========================================`);
    const proc = spawn('node', [path.join(__dirname, scriptName)], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function seedAll() {
  console.log('⚡ Starting master database seeding for MongoDB Atlas...');
  await runScript('seed-dsa-problems.js');
  await runScript('seed-build-problems.js');
  console.log('========================================');
  console.log('🎉 ALL PROBLEMS (DSA & BuildApi) SEEDED SAFELY TO ATLAS!');
  console.log('========================================\n');
}

seedAll().catch((err) => {
  console.error('\n❌ Master seeding error:', err.message);
  process.exit(1);
});

const mongoose = require('mongoose');
const Redis = require('ioredis');
require('dotenv').config({ path: 'src/.env' });
if (!process.env.MONGO_URI) require('dotenv').config();

const Contest = require('../src/models/Contest');
const ContestParticipant = require('../src/models/ContestParticipant');
const ContestStanding = require('../src/models/ContestStanding');
const ContestNotification = require('../src/models/ContestNotification');

async function cleanAllDummyContests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/coding-platform');

  const contestCount = await Contest.countDocuments();
  const participantCount = await ContestParticipant.countDocuments();
  const standingCount = await ContestStanding.countDocuments();
  const notificationCount = await ContestNotification.countDocuments();

  console.log(`Found:`);
  console.log(` - Contests: ${contestCount}`);
  console.log(` - Contest Participants: ${participantCount}`);
  console.log(` - Contest Standings: ${standingCount}`);
  console.log(` - Contest Notifications: ${notificationCount}`);

  await Contest.deleteMany({});
  await ContestParticipant.deleteMany({});
  await ContestStanding.deleteMany({});
  await ContestNotification.deleteMany({});

  console.log('✅ Successfully removed all dummy contests and associated records from MongoDB.');

  // Clean Redis keys if Redis is running
  const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6380;
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  try {
    const redis = new Redis({ host: redisHost, port: redisPort, maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    const contestKeys = await redis.keys('contest:*');
    if (contestKeys.length > 0) {
      await redis.del(...contestKeys);
      console.log(`✅ Cleared ${contestKeys.length} contest-related Redis keys.`);
    }
    await redis.quit();
  } catch (err) {
    console.log('ℹ️ Redis not reachable or no active keys; skipped Redis cleanup.');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

cleanAllDummyContests().catch(err => {
  console.error('Failed to clean contests:', err);
  process.exit(1);
});

const Redis = require('ioredis');

// Connect to Redis using REDIS_URL or default to 127.0.0.1:6380
const redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6380', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  console.log('⚡ Redis Client Connected successfully (Port 6380)');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
});

module.exports = redisClient;

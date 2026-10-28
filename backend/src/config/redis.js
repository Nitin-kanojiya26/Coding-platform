require('dotenv').config();
const Redis = require('ioredis');

// In-memory fallback cache when Redis is offline
const memoryStore = new Map();
const memoryExpiries = new Map();

// Helper to clean expired in-memory items
function getMemory(key) {
  const expiry = memoryExpiries.get(key);
  if (expiry && Date.now() > expiry) {
    memoryStore.delete(key);
    memoryExpiries.delete(key);
    return null;
  }
  return memoryStore.get(key) || null;
}

function setMemory(key, value, ttlSeconds) {
  memoryStore.set(key, value);
  if (ttlSeconds) {
    memoryExpiries.set(key, Date.now() + ttlSeconds * 1000);
  } else {
    memoryExpiries.delete(key);
  }
}

function delMemory(key) {
  memoryStore.delete(key);
  memoryExpiries.delete(key);
}

let isRedisConnected = false;
let hasLoggedFailure = false;

// Connect to Redis using REDIS_CACHE_URL, REDIS_URL or default to 127.0.0.1:6380
const redisClient = new Redis(process.env.REDIS_CACHE_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6380', {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  enableOfflineQueue: false,

  retryStrategy(times) {
    if (times > 2) {
      if (!hasLoggedFailure) {
        console.warn('⚠️ [Redis] Redis server not reachable on port 6380. Backend running in in-memory fallback mode.');
        hasLoggedFailure = true;
      }
      return 10000; // Retry quietly every 10 seconds
    }
    return Math.min(times * 300, 2000);
  },
});

redisClient.on('connect', () => {
  isRedisConnected = true;
  hasLoggedFailure = false;
  console.log('⚡ Redis Client Connected successfully');
});

redisClient.on('ready', () => {
  isRedisConnected = true;
});

redisClient.on('error', (err) => {
  isRedisConnected = false;
  if (!hasLoggedFailure) {
    console.warn(`⚠️ [Redis] Connection failed: ${err.message}. Backend will run with in-memory fallback.`);
    hasLoggedFailure = true;
  }
});

redisClient.on('close', () => {
  isRedisConnected = false;
});

// Proxy to gracefully intercept calls when Redis is disconnected
const proxyClient = new Proxy(redisClient, {
  get(target, prop) {
    if (prop === 'isReady' || prop === 'isConnected') {
      return isRedisConnected;
    }

    if (prop === 'get') {
      return async (key) => {
        if (isRedisConnected) {
          try {
            return await target.get(key);
          } catch (_) {
            // fallback on error
          }
        }
        return getMemory(key);
      };
    }

    if (prop === 'set') {
      return async (key, value) => {
        if (isRedisConnected) {
          try {
            return await target.set(key, value);
          } catch (_) {}
        }
        setMemory(key, value);
        return 'OK';
      };
    }

    if (prop === 'setex') {
      return async (key, seconds, value) => {
        if (isRedisConnected) {
          try {
            return await target.setex(key, seconds, value);
          } catch (_) {}
        }
        setMemory(key, value, seconds);
        return 'OK';
      };
    }

    if (prop === 'del') {
      return async (key) => {
        if (isRedisConnected) {
          try {
            return await target.del(key);
          } catch (_) {}
        }
        delMemory(key);
        return 1;
      };
    }

    if (prop === 'call') {
      return async (...args) => {
        if (isRedisConnected) {
          try {
            return await target.call(...args);
          } catch (_) {}
        }
        return null;
      };
    }

    if (prop === 'status') {
      return isRedisConnected ? 'ready' : 'offline';
    }

    const val = target[prop];
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;

  },
});

module.exports = proxyClient;

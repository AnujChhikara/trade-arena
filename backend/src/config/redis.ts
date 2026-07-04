import Redis from 'ioredis';
import { config } from './index.js';

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on('error', (err: Error) => {
  console.error('[Redis] Error:', err.message);
});

redis.on('ready', () => {
  console.log('[Redis] Connected');
});

export default redis;

import Redis from "ioredis";

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    })
  : null;

if (redis) {
  redis.on("error", (err) =>
    console.warn("[Redis] Connection error:", err.message),
  );
  redis.on("connect", () => console.log("[Redis] Connected"));
}

export default redis;

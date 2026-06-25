import { Redis } from "ioredis";
import "dotenv/config";

export const redis = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

redis.on("connect", () => {
  console.log("[redis] connected");
});

redis.on("error", (err: Error) => {
  console.error("[redis] connection error:", err.message);
});

import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => console.error("Redis Connection Fault: ", err));

export async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log("Redis cache engine connected successfully");
    } catch (err) {
      console.warn("Failing back Redis connection safely for standalone testing compatibility: ", err);
    }
  }
}

import { Queue, type ConnectionOptions } from "bullmq";
import "dotenv/config";

export const EARN_QUEUE_NAME = "player-earnings";

export interface EarnJobData {
  eventId: string;
  userId: string;
  amount: number;
  earnedAt: number; // epoch ms
}

const connection: ConnectionOptions = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

export const earnQueue = new Queue<EarnJobData>(EARN_QUEUE_NAME, {
  connection,
});

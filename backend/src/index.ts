import cors from "cors";
import express from "express";
import { redis } from "./config/redis.js";
import { getMongoDb, mongoClient } from "./config/mongo.js";
import { pgPool, testPostgresConnection } from "./config/postgres.js";
import { earnQueue } from "./queues/earnQueues.js";
import { earnRouter } from "./routes/earn.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { weeklyRouter } from "./routes/weekly.js";
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", leaderboardRouter);
app.use("/api", earnRouter);
app.use("/api", weeklyRouter);

async function main() {
  await redis.ping();
  console.log("[redis] ping ok");

  await testPostgresConnection();

  const db = await getMongoDb();
  await db.command({ ping: 1 });
  console.log("[mongo] ping ok");

  console.log("all datastores connected");

  app.listen(port, () => {
    console.log(`[http] listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("startup failed:", err);
  process.exit(1);
});

async function shutdown() {
  await Promise.allSettled([
    redis.quit(),
    earnQueue.close(),
    pgPool.end(),
    mongoClient.close(),
  ]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

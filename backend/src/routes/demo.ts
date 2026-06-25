import { Router, Request, Response } from "express";
import { seedLeaderboard } from "../services/seedLeaderboard.js";

const MAX_DEMO_PLAYER_COUNT = 50_000;

export const demoRouter = Router();

demoRouter.post("/demo/seed", async (req: Request, res: Response) => {
  const requestedCount = Number(req.body?.playerCount);
  const playerCount = Number.isFinite(requestedCount)
    ? Math.min(MAX_DEMO_PLAYER_COUNT, Math.max(1, Math.floor(requestedCount)))
    : undefined;

  try {
    const result = await seedLeaderboard(playerCount);
    res.json(result);
  } catch (err) {
    console.error("[POST /demo/seed] failed:", err);
    res.status(500).json({ error: "failed to seed demo leaderboard" });
  }
});

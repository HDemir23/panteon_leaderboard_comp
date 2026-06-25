import { Router, Request, Response } from "express";
import { getLeaderboardView } from "../services/leaderboard.js";
import { getCurrentWeekId } from "../services/leaderboardWeek.js";

export const leaderboardRouter = Router();

leaderboardRouter.get("/leaderboard", async (req: Request, res: Response) => {
  const userId = req.query.userId as string;

  if (!userId) {
    return res.status(400).json({ error: "userId query param is required" });
  }

  try {
    const view = await getLeaderboardView(getCurrentWeekId(), userId);
    res.json(view);
  } catch (err) {
    console.error("[GET /leaderboard] failed:", err);
    res.status(500).json({ error: "failed to load leaderboard" });
  }
});

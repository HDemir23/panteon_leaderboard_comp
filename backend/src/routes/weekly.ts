import { Router, Request, Response } from "express";
import { getCurrentWeekId } from "../services/leaderboardWeek.js";
import { finalizeWeeklyLeaderboard } from "../services/weeklyFinalizer.js";
import {
  getLatestWeeklySnapshot,
  getWeeklySnapshot,
  getWeeklySnapshotSummaries,
} from "../services/weeklySnapshots.js";
import { queryLimit } from "./queryLimit.js";

export const weeklyRouter = Router();

weeklyRouter.post("/weekly/finalize", async (req: Request, res: Response) => {
  const rawWeekId = req.body?.weekId;
  const weekId =
    typeof rawWeekId === "string" && rawWeekId.trim().length > 0
      ? rawWeekId.trim()
      : getCurrentWeekId();

  try {
    const result = await finalizeWeeklyLeaderboard(weekId);
    res.json(result);
  } catch (err) {
    console.error("[POST /weekly/finalize] failed:", err);
    res.status(500).json({ error: "failed to finalize weekly leaderboard" });
  }
});

weeklyRouter.get("/weekly/snapshots", async (req, res) => {
  try {
    const snapshots = await getWeeklySnapshotSummaries(
      queryLimit(req.query.limit, 12, 50),
    );
    res.json({ snapshots });
  } catch (err) {
    console.error("[GET /weekly/snapshots] failed:", err);
    res.status(500).json({ error: "failed to load weekly snapshots" });
  }
});

weeklyRouter.get("/weekly/snapshots/latest", async (_req, res) => {
  try {
    const snapshot = await getLatestWeeklySnapshot();
    res.json({ snapshot });
  } catch (err) {
    console.error("[GET /weekly/snapshots/latest] failed:", err);
    res.status(500).json({ error: "failed to load weekly snapshot" });
  }
});

weeklyRouter.get("/weekly/snapshots/:weekId", async (req, res) => {
  try {
    const snapshot = await getWeeklySnapshot(req.params.weekId);
    res.json({ snapshot });
  } catch (err) {
    console.error("[GET /weekly/snapshots/:weekId] failed:", err);
    res.status(500).json({ error: "failed to load weekly snapshot" });
  }
});

import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import { earnQueue } from "../queues/earnQueues.js";
import { getRecentEarnEvents } from "../services/earnProcessor.js";
import { queryLimit } from "./queryLimit.js";

export const earnRouter = Router();

earnRouter.get("/events/recent", async (req: Request, res: Response) => {
  try {
    const events = await getRecentEarnEvents(
      queryLimit(req.query.limit, 50, 100),
    );
    res.json({ events });
  } catch (err) {
    console.error("[GET /events/recent] failed:", err);
    res.status(500).json({ error: "failed to load earn events" });
  }
});

earnRouter.post("/events/earn", async (req: Request, res: Response) => {
  const rawUserId = req.body?.userId;
  const amount = req.body?.amount;
  const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";

  if (
    userId.length === 0 ||
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return res
      .status(400)
      .json({ error: "userId and a positive integer amount are required" });
  }

  try {
    const eventId = randomUUID();

    await earnQueue.add(
      "earn-event",
      {
        eventId,
        userId,
        amount,
        earnedAt: Date.now(),
      },
      { jobId: eventId },
    );

    res.status(202).json({ accepted: true, eventId });
  } catch (err) {
    console.error("[POST /events/earn] failed to enqueue:", err);
    res.status(500).json({ error: "failed to process event" });
  }
});

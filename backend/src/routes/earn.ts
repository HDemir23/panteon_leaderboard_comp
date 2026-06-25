import { randomUUID } from "crypto";
import { Router, Request, Response } from "express";
import { earnQueue } from "../queues/earnQueues.js";

export const earnRouter = Router();

earnRouter.post("/events/earn", async (req: Request, res: Response) => {
  const { userId, amount } = req.body;

  if (
    typeof userId !== "string" ||
    userId.trim().length === 0 ||
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
    const normalizedUserId = userId.trim();

    await earnQueue.add(
      "earn-event",
      {
        eventId,
        userId: normalizedUserId,
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

import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { finalizeWeeklyLeaderboard } from "../services/weeklyFinalizer.js";
import { getCurrentWeekId } from "../services/leaderboardWeek.js";

const DEFAULT_WEEKLY_FINALIZE_CRON = "5 0 * * 1";
const FINALIZED_WEEK_LOOKBACK_MS = 10 * 60 * 1000;

export function getWeekIdToFinalize(
  now = new Date(),
  timeZone = process.env.WEEKLY_LEADERBOARD_TIMEZONE || "Europe/Istanbul",
): string {
  return getCurrentWeekId(
    new Date(now.getTime() - FINALIZED_WEEK_LOOKBACK_MS),
    timeZone,
  );
}

export function startWeeklyFinalizeScheduler(): ScheduledTask {
  const expression =
    process.env.WEEKLY_FINALIZE_CRON || DEFAULT_WEEKLY_FINALIZE_CRON;
  const timezone =
    process.env.WEEKLY_FINALIZE_TIMEZONE ||
    process.env.WEEKLY_LEADERBOARD_TIMEZONE ||
    "Europe/Istanbul";

  if (!cron.validate(expression)) {
    throw new Error(`Invalid WEEKLY_FINALIZE_CRON expression: ${expression}`);
  }

  const task = cron.schedule(
    expression,
    async () => {
      const weekId = getWeekIdToFinalize();

      try {
        const result = await finalizeWeeklyLeaderboard(weekId);
        console.log(
          `[weekly:scheduler] ${result.status} ${result.weekId} ` +
            `leaderboard=${result.leaderboardKey}`,
        );
      } catch (err) {
        console.error("[weekly:scheduler] finalization failed:", err);
      }
    },
    {
      timezone,
    },
  );

  console.log(
    `[weekly:scheduler] scheduled cron="${expression}" timezone="${timezone}"`,
  );

  return task;
}

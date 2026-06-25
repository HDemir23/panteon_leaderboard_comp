import { getCurrentWeekId } from "./leaderboardWeek.js";

export function getWeekIdForEarnedAt(earnedAt: number): string {
  return getCurrentWeekId(new Date(earnedAt));
}

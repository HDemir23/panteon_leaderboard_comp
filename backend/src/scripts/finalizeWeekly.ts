import { pgPool } from "../config/postgres.js";
import { redis } from "../config/redis.js";
import { getCurrentWeekId } from "../services/leaderboardWeek.js";
import { finalizeWeeklyLeaderboard } from "../services/weeklyFinalizer.js";

async function main() {
  const result = await finalizeWeeklyLeaderboard(getCurrentWeekId());

  if (result.status === "already-running") {
    console.log(`[weekly] ${result.weekId} is already being finalized`);
    return;
  }

  if (result.status === "already-finalized") {
    console.log(`[weekly] ${result.weekId} is already finalized`);
    return;
  }

	  console.log(
	    `[weekly] finalized ${result.weekId}: ` +
	      `${result.playerCount} rewarded players, ` +
	      `participants=${result.participantCount}, ` +
	      `earned=${result.totalWeeklyEarned}, ` +
	      `prizePool=${result.prizePoolAmount}, ` +
      `distributed=${result.distributedAmount}, ` +
      `undistributed=${result.undistributedAmount}`,
  );
}

main()
  .catch((err) => {
    console.error("[weekly] finalization failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([redis.quit(), pgPool.end()]);
  });

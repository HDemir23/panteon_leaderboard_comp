import { seedLeaderboard } from "../services/seedLeaderboard.js";

const PLAYER_COUNT = Number(process.env.SEED_PLAYER_COUNT ?? 50_000);

async function seed() {
  const result = await seedLeaderboard(PLAYER_COUNT);

  console.log(
    `seeded ${result.playerCount} players into leaderboard:week:${result.weekId}`,
  );
  console.log(`total earned: ${result.totalEarned}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("seed failed:", err);
  process.exit(1);
});

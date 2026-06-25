import { pathToFileURL } from "url";
import { pgPool } from "../config/postgres.js";

export async function setupWeeklyTables() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS weekly_snapshots (
      week_id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('finalizing', 'finalized')),
      total_weekly_earned BIGINT NOT NULL DEFAULT 0 CHECK (total_weekly_earned >= 0),
      prize_pool_amount BIGINT NOT NULL DEFAULT 0 CHECK (prize_pool_amount >= 0),
      distributed_amount BIGINT NOT NULL DEFAULT 0 CHECK (distributed_amount >= 0),
      undistributed_amount BIGINT NOT NULL DEFAULT 0 CHECK (undistributed_amount >= 0),
      player_count INTEGER NOT NULL DEFAULT 0 CHECK (player_count >= 0),
      participant_count INTEGER NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
      finalized_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE weekly_snapshots
      ADD COLUMN IF NOT EXISTS participant_count
        INTEGER NOT NULL DEFAULT 0 CHECK (participant_count >= 0);

    CREATE TABLE IF NOT EXISTS weekly_snapshot_players (
      week_id TEXT NOT NULL REFERENCES weekly_snapshots(week_id) ON DELETE CASCADE,
      rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 100),
      user_id TEXT NOT NULL,
      score BIGINT NOT NULL CHECK (score >= 0),
      reward_amount BIGINT NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (week_id, rank),
      UNIQUE (week_id, user_id)
    );
  `);

  console.log("[postgres] weekly tables are ready");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  setupWeeklyTables()
    .catch((err) => {
      console.error("[postgres] weekly setup failed:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pgPool.end();
    });
}

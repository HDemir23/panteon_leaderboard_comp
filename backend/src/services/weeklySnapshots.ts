import { pgPool } from "../config/postgres.js";

export interface WeeklySnapshotPlayer {
  rank: number;
  userId: string;
  score: number;
  rewardAmount: number;
}

export interface WeeklySnapshotView {
  weekId: string;
  status: string;
  totalWeeklyEarned: number;
  prizePoolAmount: number;
  distributedAmount: number;
  undistributedAmount: number;
  playerCount: number;
  participantCount: number;
  finalizedAt: string | null;
  players: WeeklySnapshotPlayer[];
}

export interface WeeklySnapshotSummary {
  weekId: string;
  totalWeeklyEarned: number;
  prizePoolAmount: number;
  distributedAmount: number;
  playerCount: number;
  participantCount: number;
  finalizedAt: string | null;
}

interface WeeklySnapshotSummaryRow {
  week_id: string;
  total_weekly_earned: string;
  prize_pool_amount: string;
  distributed_amount: string;
  player_count: number;
  participant_count: number;
  finalized_at: Date | string | null;
}

interface WeeklySnapshotRow extends WeeklySnapshotSummaryRow {
  status: string;
  undistributed_amount: string;
}

interface WeeklySnapshotPlayerRow {
  rank: number;
  user_id: string;
  score: string;
  reward_amount: string;
}

const SNAPSHOT_SUMMARY_COLUMNS = `
  week_id,
  total_weekly_earned::text,
  prize_pool_amount::text,
  distributed_amount::text,
  player_count,
  participant_count,
  finalized_at
`;

const SNAPSHOT_VIEW_COLUMNS = `
  week_id,
  status,
  total_weekly_earned::text,
  prize_pool_amount::text,
  distributed_amount::text,
  undistributed_amount::text,
  player_count,
  participant_count,
  finalized_at
`;

const FINALIZED_SNAPSHOT_ORDER =
  "ORDER BY finalized_at DESC NULLS LAST, created_at DESC";

function numberFromPg(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function buildSnapshotSummary(
  snapshot: WeeklySnapshotSummaryRow,
): WeeklySnapshotSummary {
  return {
    weekId: snapshot.week_id,
    totalWeeklyEarned: numberFromPg(snapshot.total_weekly_earned),
    prizePoolAmount: numberFromPg(snapshot.prize_pool_amount),
    distributedAmount: numberFromPg(snapshot.distributed_amount),
    playerCount: snapshot.player_count,
    participantCount: snapshot.participant_count,
    finalizedAt: snapshot.finalized_at
      ? new Date(snapshot.finalized_at).toISOString()
      : null,
  };
}

async function buildSnapshotView(
  snapshot: WeeklySnapshotRow,
): Promise<WeeklySnapshotView> {
  const playersResult = await pgPool.query<WeeklySnapshotPlayerRow>(
    `
      SELECT
        rank,
        user_id,
        score::text,
        reward_amount::text
      FROM weekly_snapshot_players
      WHERE week_id = $1
      ORDER BY rank ASC
      LIMIT 100
    `,
    [snapshot.week_id],
  );

  return {
    weekId: snapshot.week_id,
    status: snapshot.status,
    totalWeeklyEarned: numberFromPg(snapshot.total_weekly_earned),
    prizePoolAmount: numberFromPg(snapshot.prize_pool_amount),
    distributedAmount: numberFromPg(snapshot.distributed_amount),
    undistributedAmount: numberFromPg(snapshot.undistributed_amount),
    playerCount: snapshot.player_count,
    participantCount: snapshot.participant_count,
    finalizedAt: snapshot.finalized_at
      ? new Date(snapshot.finalized_at).toISOString()
      : null,
    players: playersResult.rows.map((player) => ({
      rank: player.rank,
      userId: player.user_id,
      score: numberFromPg(player.score),
      rewardAmount: numberFromPg(player.reward_amount),
    })),
  };
}

export async function getWeeklySnapshot(
  weekId: string,
): Promise<WeeklySnapshotView | null> {
  const snapshotResult = await pgPool.query<WeeklySnapshotRow>(
    `
      SELECT ${SNAPSHOT_VIEW_COLUMNS}
      FROM weekly_snapshots
      WHERE week_id = $1 AND status = 'finalized'
      LIMIT 1
    `,
    [weekId],
  );
  const snapshot = snapshotResult.rows[0];

  if (!snapshot) {
    return null;
  }

  return buildSnapshotView(snapshot);
}

export async function getLatestWeeklySnapshot(): Promise<WeeklySnapshotView | null> {
  const snapshotResult = await pgPool.query<WeeklySnapshotRow>(
    `
      SELECT ${SNAPSHOT_VIEW_COLUMNS}
      FROM weekly_snapshots
      WHERE status = 'finalized'
      ${FINALIZED_SNAPSHOT_ORDER}
      LIMIT 1
    `,
  );
  const snapshot = snapshotResult.rows[0];

  if (!snapshot) {
    return null;
  }

  return buildSnapshotView(snapshot);
}

export async function getWeeklySnapshotSummaries(
  limit: number,
): Promise<WeeklySnapshotSummary[]> {
  const snapshotResult = await pgPool.query<WeeklySnapshotSummaryRow>(
    `
      SELECT ${SNAPSHOT_SUMMARY_COLUMNS}
      FROM weekly_snapshots
      WHERE status = 'finalized'
      ${FINALIZED_SNAPSHOT_ORDER}
      LIMIT $1
    `,
    [limit],
  );

  return snapshotResult.rows.map(buildSnapshotSummary);
}

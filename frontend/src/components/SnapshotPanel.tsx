import type { WeeklySnapshot } from "../types/leaderboard";

export interface SnapshotPanelProps {
  snapshot: WeeklySnapshot | null;
  isLoading: boolean;
}

function formatAmount(value: number): string {
  return value.toLocaleString();
}

function formatDate(value: string | null): string {
  if (!value) return "Not finalized";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SnapshotPanel({ snapshot, isLoading }: SnapshotPanelProps) {
  const players = snapshot?.players.slice(0, 5) ?? [];

  return (
    <section className="snapshot-panel" aria-label="Latest finalized week">
      <div className="snapshot-panel__header">
        <p className="snapshot-panel__eyebrow">Finalized review</p>
        <h2 className="snapshot-panel__title">
          {snapshot ? snapshot.weekId : "No snapshot yet"}
        </h2>
      </div>

      {isLoading && <p className="snapshot-panel__empty">Loading snapshot...</p>}

      {!isLoading && !snapshot && (
        <p className="snapshot-panel__empty">
          Finalize a week to review the stored reward snapshot.
        </p>
      )}

      {!isLoading && snapshot && (
        <>
          <div className="snapshot-stats">
            <div>
              <span>Pool</span>
              <strong>{formatAmount(snapshot.prizePoolAmount)}</strong>
            </div>
            <div>
              <span>Distributed</span>
              <strong>{formatAmount(snapshot.distributedAmount)}</strong>
            </div>
            <div>
              <span>Participants</span>
              <strong>{formatAmount(snapshot.participantCount)}</strong>
            </div>
            <div>
              <span>Finalized</span>
              <strong>{formatDate(snapshot.finalizedAt)}</strong>
            </div>
          </div>

          <div className="snapshot-list" aria-label="Top finalized rewards">
            {players.map((player) => (
              <div className="snapshot-row" key={player.rank}>
                <span>#{player.rank}</span>
                <span>{player.userId}</span>
                <strong>{formatAmount(player.rewardAmount)}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

import { memo, useMemo } from "react";
import { List, type RowComponentProps } from "react-window";
import type { LeaderboardView, PlayerRank } from "../types/leaderboard";
import "./Leaderboard.css";

export interface LeaderboardProps {
  data: LeaderboardView | null;
  currentUserId: string;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  weekEndsAt?: string;
  rewardPoolTotal?: number;
}

interface TopPlayerRowProps {
  players: PlayerRank[];
  currentUserId: string;
}

const ROW_HEIGHT = 52;
const LIST_HEIGHT = 380;
const LIST_STYLE = { height: LIST_HEIGHT };
const EMPTY_PLAYERS: PlayerRank[] = [];

function formatScore(score: number): string {
  return score.toLocaleString();
}

function medalClass(rank: number): string {
  if (rank === 1) return "lb-row--gold";
  if (rank === 2) return "lb-row--silver";
  if (rank === 3) return "lb-row--bronze";
  return "";
}

function PlayerRow({
  player,
  isCurrentUser,
  muted = false,
}: {
  player: PlayerRank;
  isCurrentUser: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={[
        "lb-row",
        medalClass(player.rank),
        isCurrentUser ? "lb-row--self" : "",
        muted ? "lb-row--muted" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="lb-row__rank">{player.rank}</span>
      <span className="lb-row__name">{isCurrentUser ? "you" : player.userId}</span>
      <span className="lb-row__score">{formatScore(player.score)}</span>
    </div>
  );
}

function TopPlayerRow({
  index,
  style,
  players,
  currentUserId,
}: RowComponentProps<TopPlayerRowProps>) {
  const player = players[index];

  return (
    <div style={style} className="lb-virtual-row">
      <PlayerRow
        player={player}
        isCurrentUser={player.userId === currentUserId}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <section className="lb-container" aria-label="Weekly leaderboard loading">
      <div className="lb-header">
        <div>
          <p className="lb-header__eyebrow">Weekly leaderboard</p>
          <h1 className="lb-header__title">Loading ranks</h1>
        </div>
      </div>
      <div className="lb-skeleton-list" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="lb-skeleton-row" />
        ))}
      </div>
    </section>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <section className="lb-container lb-state-message" aria-label="Leaderboard error">
      <p className="lb-state-message__title">Could not load the leaderboard</p>
      <p className="lb-state-message__text">{message}</p>
      {onRetry && (
        <button className="lb-retry-button" type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="lb-container lb-state-message" aria-label="Empty leaderboard">
      <p className="lb-state-message__title">No leaderboard data yet</p>
      <p className="lb-state-message__text">
        Current week scores will appear after players start earning.
      </p>
    </section>
  );
}

function LeaderboardComponent({
  data,
  currentUserId,
  isLoading,
  error,
  onRetry,
  weekEndsAt,
  rewardPoolTotal,
}: LeaderboardProps) {
  const topPlayers = data?.topPlayers ?? EMPTY_PLAYERS;
  const rowProps = useMemo(
    () => ({ players: topPlayers, currentUserId }),
    [topPlayers, currentUserId],
  );

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data || data.topPlayers.length === 0) return <EmptyState />;

  const { currentUserContext } = data;
  const currentUserInTop = topPlayers.some(
    (player) => player.userId === currentUserId,
  );

  return (
    <section className="lb-container" aria-label="Weekly leaderboard">
      <div className="lb-header">
        <div>
          <p className="lb-header__eyebrow">Weekly leaderboard</p>
          <h1 className="lb-header__title">Top players</h1>
        </div>
        {weekEndsAt && <p className="lb-header__meta">Resets {weekEndsAt}</p>}
      </div>

      {rewardPoolTotal !== undefined && (
        <div className="lb-pool-card">
          <p className="lb-pool-card__label">Prize pool</p>
          <p className="lb-pool-card__value">{formatScore(rewardPoolTotal)}</p>
        </div>
      )}

      <div className="lb-list-header" aria-hidden="true">
        <span>Rank</span>
        <span>Player</span>
        <span>Score</span>
      </div>

      <List
        className="lb-list"
        rowComponent={TopPlayerRow}
        rowCount={topPlayers.length}
        rowHeight={ROW_HEIGHT}
        rowProps={rowProps}
        overscanCount={6}
        style={LIST_STYLE}
      />

      {currentUserContext && !currentUserInTop && (
        <div className="lb-self-card">
          <p className="lb-self-card__label">Your rank</p>
          {currentUserContext.above.map((player) => (
            <PlayerRow
              key={player.userId}
              player={player}
              isCurrentUser={false}
              muted
            />
          ))}
          <PlayerRow player={currentUserContext.self} isCurrentUser />
          {currentUserContext.below.map((player) => (
            <PlayerRow
              key={player.userId}
              player={player}
              isCurrentUser={false}
              muted
            />
          ))}
        </div>
      )}
    </section>
  );
}

export const Leaderboard = memo(LeaderboardComponent);

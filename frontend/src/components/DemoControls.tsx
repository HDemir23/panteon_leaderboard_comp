export interface DemoControlsProps {
  userNumber: number;
  pointsToAdd: number;
  isAddingPoints: boolean;
  isFinalizing: boolean;
  isSeeding: boolean;
  message: string | null;
  onUserNumberChange: (value: number) => void;
  onPointsToAddChange: (value: number) => void;
  onAddPoints: () => void;
  onFinalizeWeek: () => void;
  onSeedDemoData: () => void;
  onRefresh: () => void;
}

export function DemoControls({
  userNumber,
  pointsToAdd,
  isAddingPoints,
  isFinalizing,
  isSeeding,
  message,
  onUserNumberChange,
  onPointsToAddChange,
  onAddPoints,
  onFinalizeWeek,
  onSeedDemoData,
  onRefresh,
}: DemoControlsProps) {
  return (
    <section className="demo-panel" aria-label="Leaderboard test controls">
      <div className="demo-panel__header">
        <p className="demo-panel__eyebrow">Test controls</p>
        <h2 className="demo-panel__title">user:{userNumber}</h2>
      </div>

      <label className="demo-field">
        <span className="demo-field__label">User number</span>
        <input
          className="demo-field__input"
          min="1"
          step="1"
          type="number"
          value={userNumber}
          onChange={(event) => onUserNumberChange(Number(event.target.value))}
        />
      </label>

      <label className="demo-field">
        <span className="demo-field__label">Points to add</span>
        <input
          className="demo-field__input"
          min="1"
          step="1"
          type="number"
          value={pointsToAdd}
          onChange={(event) => onPointsToAddChange(Number(event.target.value))}
        />
      </label>

      <div className="demo-actions">
        <button
          className="demo-button demo-button--primary"
          disabled={isAddingPoints}
          type="button"
          onClick={onAddPoints}
        >
          {isAddingPoints ? "Adding..." : "Add points"}
        </button>
        <button className="demo-button" type="button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <button
        className="demo-button demo-button--secondary"
        disabled={isSeeding}
        type="button"
        onClick={onSeedDemoData}
      >
        {isSeeding ? "Seeding..." : "Seed demo data"}
      </button>

      <button
        className="demo-button demo-button--danger"
        disabled={isFinalizing}
        type="button"
        onClick={onFinalizeWeek}
      >
        {isFinalizing ? "Finalizing..." : "Finalize week"}
      </button>

      {message && <p className="demo-panel__message">{message}</p>}
    </section>
  );
}

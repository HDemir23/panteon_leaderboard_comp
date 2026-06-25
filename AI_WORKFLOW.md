# AI Workflow Note

The user used ChatGPT/Codex as a coding assistant and review partner for the weekly leaderboard finalization feature, not as an unattended implementer.

Codex was used to:

- inspect the existing backend structure and identify where the weekly leaderboard flow should live;
- draft the Redis/Postgres finalization flow, including Redis locking, snapshot persistence, Redis cleanup, and idempotency behavior;
- separate the reward calculation into a pure TypeScript function so the money distribution logic can be tested without Redis or Postgres;
- add Jest coverage for the reward formula and a real Redis/Postgres integration test for the weekly finalizer;
- connect the finalizer to the long-running worker process with a real weekly cron scheduler;
- surface implementation risks such as stale `finalizing` rows, rounding remainders, Redis cleanup failure after Postgres commit, lock TTL behavior, and week-boundary timing.

The user drove the product and engineering decisions:

- confirmed that the prize pool is 2% of total weekly earnings;
- required total weekly earnings to be calculated from all Redis leaderboard members, not only the top 100;
- reviewed the tie-break fraction issue and required integer display scores to be calculated with `Math.floor`;
- chose to keep rounding remainders undistributed for this scope;
- pushed the implementation toward Jest tests instead of ad-hoc terminal one-liners;
- required an automatic weekly scheduler instead of only manual `npm run weekly:finalize` execution;
- reviewed and corrected the finalizer edge cases before accepting the implementation.

Verification was done with:

- `npm test` for the pure reward calculator unit tests;
- `npm run test:weekly` for the real Redis/Postgres weekly finalizer integration test;
- manual review of the finalizer flow, especially lock handling, idempotency, stuck `finalizing` recovery, Redis cleanup, and scheduler timing.

Known tradeoffs:

- The current implementation snapshots rewards but does not credit wallet balances.
- `POST /events/earn` is intentionally demo-open. In production, event ingestion should sit behind trusted game-server auth, an API key, or JWT validation.
- Redis keeps raw score state separate from rank-only sorted set scores so tie-break data cannot inflate player earnings.
- Weekly snapshots now store top/rewarded player count separately from total participant count.
- If Postgres commit succeeds but Redis cleanup fails, the finalized Postgres row prevents duplicate finalization. A future hardening pass can add a startup cleanup retry for finalized weeks whose Redis keys still exist.
- The worker process starts a weekly scheduler. It defaults to Monday 00:05 in the leaderboard timezone and can be overridden with `WEEKLY_FINALIZE_CRON`.
- The demo finalizer is acceptable for the current case scale. A very large production leaderboard would keep relying on counters and avoid full historical/global scans for deeper comparison features.

# Panteon Full Stack Case

Weekly leaderboard system for a mobile game case. The project is split into
separate backend and frontend applications.

## Projects

- `backend`: Node.js, TypeScript and Express API with Redis, BullMQ, MongoDB and PostgreSQL.
- `frontend`: React, TypeScript and Vite leaderboard UI.

## What It Does

- Accepts earn events from players.
- Updates the live weekly leaderboard asynchronously.
- Serves a bounded leaderboard response: top 100 players plus the current user's surrounding rank context.
- Finalizes weekly results and stores reward snapshots.

## Read More

- Backend architecture and data flow: [backend/README.md](backend/README.md)
- Frontend component flow: [frontend/README.md](frontend/README.md)

## Local Setup

Run backend and frontend from their own folders:

```bash
cd backend
npm install
docker-compose up -d
npm run weekly:setup
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

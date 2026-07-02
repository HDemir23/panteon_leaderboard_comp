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
- Simulates a 2M-user game without preloading 2M users; only users with earn events exist in Redis/Mongo.

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
npm run worker:dev
npm run simulate:dev
```

```bash
cd frontend
npm install
npm run dev
```

## CI

GitHub Actions runs CI on pull requests and `main` pushes.

Deploys are handled by the existing Railway and Vercel GitHub integrations, so
no extra GitHub Actions secrets are required for deployment.

Railway service start commands:

- API: `npm run start`
- Earn worker: `npm run worker`
- Simulation producer: `npm run simulate`

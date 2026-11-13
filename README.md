# Act!ve Padel — frontend

The player and admin web app for padel.activetimisoara.ro: tournaments (Americano, Challenger,
Masters, King of the Court), sign-ups and partner requests, tournament chat, the league and
ranking points, player profiles and badges, and the admin dashboard.

React + Vite + Tailwind. It talks to the backend (`padel-challenge-backend`) over tRPC.

## Run locally

```bash
# the backend repo must sit next to this one; its router types are imported via the .backend link
ln -s ../padel-challenge-backend-main .backend   # once (the link is git-ignored)
npm install
npm run dev          # http://localhost:5173, expects the backend on :3001
```

## Checks

```bash
npm run typecheck    # tsc -b
npm run lint         # eslint
npm run build        # writes build/
```

`build/` is committed: the server serves it with nginx (see `Dockerfile`, `nginx.conf`), so run
`npm run build` and commit the result with any change to `src/`.

## Layout

- `src/main.tsx`, `src/App.tsx`: providers (react-query, tRPC, auth) and routes
- `src/trpc.ts`, `src/backendRouter.ts`: the tRPC client, typed from the backend's router
- `src/components/`: pages and their parts; `admin/` holds the dashboard, one module per tab
- `src/lib/`: pure helpers (formats, standings, ranking, badges)
- `src/contexts/`: auth

## Deploy

Pushing to `main` deploys: a GitHub Action runs `~/Projects/deploy.sh` on the VPS, which pulls
both repos, backs up the database and rebuilds. A backend-only change needs a push here to go
live (an empty commit is fine). Server operations (backups, alerts, logs) are described in the
backend repo's `ops/README.md`.

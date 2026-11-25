---
name: vps
description: Run commands on the padel app's production VPS over SSH — look at backend or deploy logs, check containers, disk space, query the production Postgres database, restart the app. Use when something has to be checked or done on the live server (a failed deploy, an error only production shows, a data fix in production).
---

# Working on the padel app's VPS

The server is reached through the SSH alias **`active-vps`**, defined in the user's own `~/.ssh/config`
(host, user and key live there only: never write the server's address, user names, keys or any `.env`
values into a repo, a commit or a skill file).

If `ssh active-vps` fails with "Could not resolve hostname active-vps", the alias isn't set up on this
machine: ask the user for the server address and which key to use, and add to `~/.ssh/config`:

```
Host active-vps
  HostName <server IP or hostname>
  User root
  IdentityFile ~/.ssh/<personal key>
  IdentitiesOnly yes
```

Don't use the GitHub Actions deploy key: it's meant for the deploy script only.

## Running commands

Always non-interactive, one command per call, with a timeout:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 active-vps '<command>'
```

- No interactive programs (`psql` without `-c`, `vim`, `top`, `docker exec -it`): use `-c '…'`, `cat`,
  `tail`, `docker exec` without `-it`.
- The app runs from `/root/Projects/active-padel-backend` with **`docker-compose.prod.yml`**, which
  also builds the frontend from `/root/Projects/active-padel-frontend`. Always run compose as
  `cd /root/Projects/active-padel-backend && docker compose -f docker-compose.prod.yml …`.
  Containers: `active-padel-backend-backend-1`, `active-padel-backend-frontend-1` (nginx),
  `active-padel-backend-postgres-1`.
- The `ops/` folder of the backend repo is installed on this server (`ops/install.sh`): nightly
  backups, off-site copy, watchdog, error scan, metrics, weekly report for **all** the apps
  (`/usr/local/bin/active-*`, `/etc/cron.d/active-ops`, logs in `/var/log/active-apps/`). Changing
  those affects every app.
- **The same server runs the user's other apps** (management, kidokinetiq, hikes, dani-padel) and a
  shared Traefik. Only touch the padel containers, files and database; never restart Traefik, Docker
  itself or the server, and never run `docker system prune` or anything server-wide without asking.

### How the deploy works on the server

`~/Projects/deploy.sh` (= `ops/deploy-padel.sh`) takes a lock, backs up the database with
`active-backup pre-deploy padel` (a failed backup stops the deploy), `git reset --hard origin/main` in
both repos, `docker compose -f docker-compose.prod.yml up --build -d`, then waits up to 2 minutes for
the backend to be healthy (migrations run as it starts) and prints its last logs if not. So a failed
deploy is one of: the backup, the build, or the start (often a failing migration) — check in that order.

Useful read-only commands:

| What | Command |
|---|---|
| Containers and health | `cd /root/Projects/active-padel-backend && docker compose -f docker-compose.prod.yml ps` |
| Backend logs (recent) | `docker logs --tail 200 active-padel-backend-backend-1` |
| What's deployed | `cd /root/Projects/active-padel-backend && git log --oneline -5` (and the same in `active-padel-frontend`) |
| Last manual deploy's output | `tail -50 /root/deploy-padel-last.log` |
| Disk space | `df -h / && docker system df` |
| A database query | `docker exec active-padel-backend-postgres-1 psql -U padel -d padel_challenge -c 'SELECT …'` |

## Ask the user before anything that changes the server

Reading (logs, `ps`, `SELECT`, `git log`, `df`) is fine without asking. Running the deploy script after a
failed GitHub deploy is also allowed (see the `deploy` skill). Ask first, saying exactly what will
happen, before:

- restarting, stopping or rebuilding containers
- any database write (`UPDATE`, `DELETE`, `INSERT`, `ALTER`) — and take a backup first:
  `/usr/local/bin/active-backup pre-deploy padel` (checked pg_dump archive in
  `/var/backups/active/pre-deploy/padel/`, restorable with `pg_restore`). **Never run `active-backup`
  without arguments**: that's the nightly backup, and rerunning it rewrites today's files after they
  were uploaded off-site, which breaks the off-site copy.
- editing files on the server (`.env`, compose files, the deploy script, the installed ops scripts),
  `git` changes there
- deleting anything, `docker system prune`, installing or upgrading packages

Never, even if asked casually (confirm twice, explaining the consequence): `docker compose down -v`,
`docker volume rm`, `DROP`/`TRUNCATE`, or removing the Postgres volume — that's the production data.

## Privacy

- Don't print `.env` or secrets into the conversation. To check a variable is set, use
  `grep -c '^NAME=' .env` or show only the name, not the value.
- Production data is real players' data: query only the columns needed, and don't copy personal data
  (emails, phones) into commits, files in the repo or messages outside this conversation.

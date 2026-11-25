---
name: deploy
description: Push the padel app (frontend and/or backend) and watch the deploy to the VPS until it finishes; if the server step fails, run the deploy script on the VPS directly. Use when the user says "push", "deploy", "ship it" or "put it live" in the padel frontend or backend.
---

# Deploy the padel app

The padel app is two repos, deployed together:

| Repo | Local folder | On the VPS | Owner |
|---|---|---|---|
| Frontend `BatrinutSilviu/Padel-Challenge` (public) | `~/Work/padel-challenge` | `/root/Projects/active-padel-frontend` | the user |
| Backend `catacioba/padel-challenge-backend` (private) | `~/Work/padel-challenge-backend` | `/root/Projects/active-padel-backend` | catacioba |

**Only a push to the frontend's `main` deploys.** Its `.github/workflows/deploy.yml` SSHes into the VPS
and runs `~/Projects/deploy.sh` (= `ops/deploy-padel.sh` in the backend repo), which backs up the padel
database (`active-backup pre-deploy padel`; a failed backup stops the deploy), resets **both** repos on
the server to their `origin/main`, runs `docker compose -f docker-compose.prod.yml up --build -d` in the
backend folder (it builds the frontend too), then waits up to 2 minutes for
`active-padel-backend-backend-1` to be healthy. Prisma migrations run on their own when the backend
starts (`prisma migrate deploy`).

So: whatever is on the backend's `origin/main` goes live with the next frontend deploy.

Report in plain words (is it live or not, and what to do), not in CI jargon.

## Steps

1. **Commit**, in each repo that has changes. `git fetch -q`, then `git status -sb`.
   - If there are uncommitted code changes, first run the two passes from CLAUDE.md ("Before every
     commit"): the `simplify` skill, then the `code-review` skill with args `high --fix`. Let them
     apply their fixes.
   - Then stage and commit with a message that says what changed for the people using the app (the
     style of `git log`: one long sentence, no prefix), ending with the attribution lines from the
     system reminder. The frontend is built on the server (its Dockerfile runs `npm run build`), so
     the tracked `build/` folder doesn't need updating.
   - Never commit `.env` or other secrets.

2. **Catch up with origin.** If a branch is behind `origin/main`, `git rebase origin/main`. On a
   conflict, read both sides and re-apply the local change on top; don't drop either side.

3. **Push the backend first, but only with the user's OK.** The backend repo belongs to catacioba:
   push it (`timeout 90 git push`) only if the user said so for this change. Otherwise leave the
   commits local and tell the user they're not live yet. If a frontend change depends on unpushed
   backend commits, say so and don't deploy the frontend alone (it would call API routes that don't
   exist yet).

4. **Push the frontend** (`timeout 90 git push`). This starts the deploy. If only the backend changed,
   deploy it with an empty frontend commit: `git commit --allow-empty -m "Redeploy (backend changes)"`
   (plus the attribution lines), then push.

5. **Watch the deploy** in the background (`run_in_background: true`) so the user isn't blocked, and
   tell them it's running. The frontend repo is public, so the API needs no login (run from the
   frontend folder):

   ```bash
   sleep 20; sha=$(git -C ~/Work/padel-challenge rev-parse HEAD); for i in $(seq 1 55); do
     r=$(curl -s "https://api.github.com/repos/BatrinutSilviu/Padel-Challenge/actions/runs?head_sha=$sha" \
       | python3 -c "import sys,json;w=json.load(sys.stdin)['workflow_runs'];print(w[0]['status'],w[0]['conclusion'],w[0]['html_url']) if w else print('none')" 2>/dev/null)
     case "$r" in completed*) echo "$r"; exit 0;; esac; sleep 30
   done; echo "still: $r"
   ```

6. **Report.**
   - `completed success`: tell the user it's live and to reload the page they were looking at.
   - `completed failure`: the failing step is the SSH step. The VPS often resets SSH connections from
     GitHub, and the user has allowed running the deploy on the server directly (see the `vps` skill
     for the connection):
     `ssh -o BatchMode=yes active-vps 'bash ~/Projects/deploy.sh > /root/deploy-padel-last.log 2>&1; echo exit=$?; tail -40 /root/deploy-padel-last.log'`
     If the connection itself is reset, retry it a few times. If the script fails, read its output:
     the backup, the build, or a backend that never became healthy (its last logs are printed — often a
     failing migration). Report that to the user.

## Don't

- Don't force-push, and never rewrite commits that are already on `origin/main`.
- Don't push the backend repo without the user's OK (see step 3).

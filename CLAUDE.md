# Padel app — frontend

React + Vite frontend of the padel app (tournaments, leagues, open matches). The backend is ~/Work/padel-challenge-backend; both deploy together.

## Push automatically

When a change is finished (and committed after the passes below), push it and watch the deploy
with the `deploy` skill, without asking: the user wants every finished change live.

## Before every commit: clean up, then review

Every commit Claude makes in this repo goes through three passes over the uncommitted changes first,
in this order, without asking:

1. `/simplify`: reuse existing helpers, remove duplication and dead code, make it efficient (no
   extra queries or re-renders). It applies its own fixes.
2. `/code-review high --fix`: finds bugs (wrong logic, admin-only screens or actions shown to players, broken edge cases like waitlists, teams, divisions and live scores) and applies the fixes.
3. `/security-review`: looks for security holes in the changes (missing login or role checks, one
   user reading or changing another user's data, injection, secrets in code, unsafe uploads). Fix what
   it finds. Skip it only when the change is purely visual (styles, text, layout).

Then commit. In the final message, list what the three passes changed or found (one line each, plain
words). If a finding needs the user's decision, ask instead of guessing. Skip all three only for commits
with no code (an empty redeploy commit, docs or skill files only).

## Skills

- `/deploy`: push and watch the deploy (frontend and backend go live together).
- `/vps`: work on the production server over SSH.

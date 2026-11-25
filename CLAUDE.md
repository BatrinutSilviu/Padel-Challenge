# Padel app — frontend

React + Vite frontend of the padel app (tournaments, leagues, open matches). The backend is ~/Work/padel-challenge-backend; both deploy together.

## Before every commit: clean up, then review

Every commit Claude makes in this repo goes through two passes over the uncommitted changes first,
in this order, without asking:

1. `/simplify`: reuse existing helpers, remove duplication and dead code, make it efficient (no
   extra queries or re-renders). It applies its own fixes.
2. `/code-review high --fix`: finds bugs (wrong logic, admin-only screens or actions shown to players, broken edge cases like waitlists, teams, divisions and live scores) and applies the fixes.

Then commit. In the final message, list what the two passes changed or found (one line each, plain
words). If a finding needs the user's decision, ask instead of guessing. Skip both only for commits
with no code (an empty redeploy commit, docs or skill files only).

## Skills

- `/deploy`: push and watch the deploy (frontend and backend go live together).
- `/vps`: work on the production server over SSH.

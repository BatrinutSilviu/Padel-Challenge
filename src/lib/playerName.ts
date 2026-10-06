// Mirrors the backend's rule for names players type in themselves (see
// padel-challenge-backend/src/lib/playerName.ts) so the form can explain a bad
// name up front — the backend still has the final say.
const MIN = 2;
const MAX = 50;
const NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?:(?:[ '’.-]|\. )\p{L}[\p{L}\p{M}]*)*\.?$/u;

export function cleanPlayerName(raw: string): string {
    return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

// Returns why a new player's name isn't acceptable, or null if it's fine.
export function playerNameError(raw: string): string | null {
    const name = cleanPlayerName(raw);
    if (name.length < MIN) return `The name must be at least ${MIN} characters`;
    if (name.length > MAX) return `The name can be at most ${MAX} characters`;
    if (!NAME_PATTERN.test(name)) return "Use only letters, spaces, hyphens and apostrophes in the name";
    return null;
}

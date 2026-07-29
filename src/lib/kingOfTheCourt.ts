// Pure helpers for the King of the Court tournament format (fixed teams, court ladder).
// No React here — shared by the public tournament view and the admin score-entry screen.

export type KotcPlayer = { id: string; name: string };

export type KotcMatch = {
    id: string;
    court: number | null;
    team1Score: number;
    team2Score: number;
    goldenPointWinner: number | null;
    team1Player1: KotcPlayer;
    team1Player2: KotcPlayer;
    team2Player1: KotcPlayer;
    team2Player2: KotcPlayer;
};

export type KotcRound = {
    id: string;
    roundNumber: number;
    matches: KotcMatch[];
};

// A match is scored once it has a decisive score, or a golden point resolved a tie.
export function isKotcMatchScored(m: { team1Score: number; team2Score: number; goldenPointWinner: number | null }): boolean {
    return m.team1Score !== m.team2Score || m.goldenPointWinner != null;
}

// Client-side mirror of the backend's validateKotcScore, used only to decide whether
// "Confirm" should be enabled — the server re-validates authoritatively.
export function isValidKotcScore(team1Score: number, team2Score: number, goldenPointWinner?: number): boolean {
    const tied = team1Score === team2Score;
    if (tied) return goldenPointWinner === 1 || goldenPointWinner === 2;
    return goldenPointWinner == null;
}

export function sortMatchesByCourt(matches: KotcMatch[]): KotcMatch[] {
    return [...matches].sort((a, b) => (a.court ?? 0) - (b.court ?? 0));
}

export function sortRoundsByNumber(rounds: KotcRound[]): KotcRound[] {
    return [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
}

// Formats a set score for display, e.g. "24-19" or "18-18 (GP: Team A)".
export function formatKotcScore(m: KotcMatch): string {
    const base = `${m.team1Score}-${m.team2Score}`;
    if (m.goldenPointWinner != null) {
        return `${base} (GP: Team ${m.goldenPointWinner === 1 ? "A" : "B"})`;
    }
    return base;
}

// King of the Court has no fixed round count — the admin decides after every round
// whether to continue or complete the tournament, so "progress" is just whether the
// most recent round is fully scored yet.
export type KotcProgress = {
    rounds: KotcRound[];
    current: KotcRound | undefined;
    currentRoundScored: boolean;
    // The most recent round that IS fully scored — may be an earlier round than
    // `current` if a further round was started (e.g. by mistake) and never finished.
    // Completing the tournament should still be possible off this round, so a
    // half-started extra round can never leave the admin with no way to end it.
    lastScoredRound: KotcRound | undefined;
};

export function kotcProgress(tournament: { rounds: KotcRound[] }): KotcProgress {
    const rounds = sortRoundsByNumber(tournament.rounds);
    const current = rounds[rounds.length - 1];
    const currentRoundScored = current ? current.matches.every(isKotcMatchScored) : false;
    const lastScoredRound = [...rounds].reverse().find(r => r.matches.every(isKotcMatchScored));
    return { rounds, current, currentRoundScored, lastScoredRound };
}

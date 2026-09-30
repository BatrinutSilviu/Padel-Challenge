// Pure helpers for the Challenger tournament format (8 fixed teams, 2 groups of 4,
// golden/silver knockout bracket). No React here — shared by the public tournament
// view and the admin score-entry screen.

export type ChallengerPlayer = { id: string; name: string };

// One set of a Masters match. A deciding group-stage tiebreak is stored as the last row,
// with isTiebreak set and its points in team1Games/team2Games.
export type MatchSet = { setNumber: number; team1Games: number; team2Games: number; isTiebreak: boolean };

export type ChallengerMatch = {
    id: string;
    team1Score: number;
    team2Score: number;
    team1TiebreakPoints: number | null;
    team2TiebreakPoints: number | null;
    bracketType: string | null;
    bracketStage: string | null;
    // Masters only — for those matches team1Score/team2Score are sets won, not games.
    sets?: MatchSet[];
    team1Player1: ChallengerPlayer;
    team1Player2: ChallengerPlayer;
    team2Player1: ChallengerPlayer;
    team2Player2: ChallengerPlayer;
};

export type ChallengerRound = {
    id: string;
    roundNumber: number;
    groupName: string | null;
    matches: ChallengerMatch[];
};

export type ChallengerTeam = {
    player1: ChallengerPlayer;
    player2: ChallengerPlayer;
};

// A real padel set can never legitimately end 0-0, so this doubles as an
// "unplayed" sentinel — the same convention the backend uses.
export function isChallengerMatchScored(m: { team1Score: number; team2Score: number }): boolean {
    return !(m.team1Score === 0 && m.team2Score === 0);
}

function teamKey(p1Id: string, p2Id: string): string {
    return [p1Id, p2Id].sort().join("|");
}

export function buildTeamsFromMatches(rounds: { matches: ChallengerMatch[] }[]): Map<string, ChallengerTeam> {
    const teams = new Map<string, ChallengerTeam>();
    for (const round of rounds) {
        for (const m of round.matches) {
            teams.set(teamKey(m.team1Player1.id, m.team1Player2.id), { player1: m.team1Player1, player2: m.team1Player2 });
            teams.set(teamKey(m.team2Player1.id, m.team2Player2.id), { player1: m.team2Player1, player2: m.team2Player2 });
        }
    }
    return teams;
}

export function groupRoundsByGroup(rounds: ChallengerRound[]): { A: ChallengerRound[]; B: ChallengerRound[] } {
    return {
        A: rounds.filter(r => r.groupName === "A").sort((a, b) => a.roundNumber - b.roundNumber),
        B: rounds.filter(r => r.groupName === "B").sort((a, b) => a.roundNumber - b.roundNumber),
    };
}

export type GroupStanding = {
    team: ChallengerTeam;
    played: number;
    wins: number;
    gameDiff: number;
    rank: number;
};

// Head-to-head tiebreak between two teams: negative if `a` won their direct match (ranks
// `a` above `b`), positive if `b` won, 0 if they haven't played (or it wasn't scored).
function challengerHeadToHead(a: ChallengerTeam, b: ChallengerTeam, matches: ChallengerMatch[]): number {
    const aKey = teamKey(a.player1.id, a.player2.id);
    const bKey = teamKey(b.player1.id, b.player2.id);
    for (const m of matches) {
        if (!isChallengerMatchScored(m)) continue;
        const k1 = teamKey(m.team1Player1.id, m.team1Player2.id);
        const k2 = teamKey(m.team2Player1.id, m.team2Player2.id);
        if (k1 === aKey && k2 === bKey) return m.team2Score - m.team1Score;
        if (k1 === bKey && k2 === aKey) return m.team1Score - m.team2Score;
    }
    return 0;
}

// Games won by each side. A match scored per set (Masters) adds up its sets, with a
// deciding tiebreak counting as one game to its winner — mirrors matchGames on the backend.
export function matchGames(m: { team1Score: number; team2Score: number; sets?: MatchSet[] }): [number, number] {
    if (!m.sets || m.sets.length === 0) return [m.team1Score, m.team2Score];
    let g1 = 0;
    let g2 = 0;
    for (const s of m.sets) {
        if (s.isTiebreak) {
            if (s.team1Games > s.team2Games) g1++;
            else g2++;
        } else {
            g1 += s.team1Games;
            g2 += s.team2Games;
        }
    }
    return [g1, g2];
}

// Ranked by match wins desc, then total game difference desc, then the head-to-head
// result of the direct match between the tied teams — matches the backend's
// computeChallengerGroupStandings exactly.
export function computeGroupStandings(groupRounds: ChallengerRound[]): GroupStanding[] {
    const matches = groupRounds.flatMap(r => r.matches);
    type Stat = { team: ChallengerTeam; played: number; wins: number; gameDiff: number };
    const stats = new Map<string, Stat>();

    const ensure = (p1: ChallengerPlayer, p2: ChallengerPlayer) => {
        const key = teamKey(p1.id, p2.id);
        if (!stats.has(key)) stats.set(key, { team: { player1: p1, player2: p2 }, played: 0, wins: 0, gameDiff: 0 });
        return stats.get(key)!;
    };

    for (const m of matches) {
        const t1 = ensure(m.team1Player1, m.team1Player2);
        const t2 = ensure(m.team2Player1, m.team2Player2);
        if (!isChallengerMatchScored(m)) continue;

        const [games1, games2] = matchGames(m);
        t1.played++;
        t2.played++;
        t1.gameDiff += games1 - games2;
        t2.gameDiff += games2 - games1;
        if (m.team1Score > m.team2Score) t1.wins++;
        else if (m.team2Score > m.team1Score) t2.wins++;
    }

    return [...stats.values()]
        .sort((a, b) => b.wins - a.wins || b.gameDiff - a.gameDiff || challengerHeadToHead(a.team, b.team, matches))
        .map((s, i) => ({ ...s, rank: i + 1 }));
}

export type BracketSideMatches = {
    semifinals: ChallengerMatch[];
    final?: ChallengerMatch;
    thirdPlace?: ChallengerMatch;
};

// A knockout stage is either split into Golden/Silver brackets (each fed by two semifinals,
// 8-team/2-group mode) or a single bracket that goes straight from group standings to the
// Final and 3rd Place match with no semifinal (4-team/1-group mode).
export type ChallengerBracketSection = BracketSideMatches & {
    key: "GOLDEN" | "SILVER" | "MAIN";
    title: string;
    hasSemifinals: boolean;
};

export function groupBracketMatches(rounds: ChallengerRound[]): ChallengerBracketSection[] {
    const knockoutMatches = rounds.filter(r => r.groupName == null).flatMap(r => r.matches);
    if (knockoutMatches.length === 0) return [];

    const isSplitBracket = knockoutMatches.some(m => m.bracketType === "GOLDEN" || m.bracketType === "SILVER");
    if (!isSplitBracket) {
        return [{
            key: "MAIN",
            title: "Final",
            hasSemifinals: false,
            semifinals: [],
            final: knockoutMatches.find(m => m.bracketStage === "FINAL"),
            thirdPlace: knockoutMatches.find(m => m.bracketStage === "THIRD_PLACE"),
        }];
    }

    const bySide = (bracketType: "GOLDEN" | "SILVER", title: string): ChallengerBracketSection => ({
        key: bracketType,
        title,
        hasSemifinals: true,
        semifinals: knockoutMatches.filter(m => m.bracketType === bracketType && m.bracketStage === "SEMIFINAL"),
        final: knockoutMatches.find(m => m.bracketType === bracketType && m.bracketStage === "FINAL"),
        thirdPlace: knockoutMatches.find(m => m.bracketType === bracketType && m.bracketStage === "THIRD_PLACE"),
    });

    return [bySide("GOLDEN", "Golden Bracket"), bySide("SILVER", "Silver Bracket")];
}

export type ChallengerProgress = {
    groupRounds: { A: ChallengerRound[]; B: ChallengerRound[] };
    allGroupScored: boolean;
    knockoutStarted: boolean;
    bracket: ChallengerBracketSection[];
    allBracketScored: boolean;
};

export function challengerProgress(tournament: { rounds: ChallengerRound[] }): ChallengerProgress {
    const groupRounds = groupRoundsByGroup(tournament.rounds);
    const groupMatches = [...groupRounds.A, ...groupRounds.B].flatMap(r => r.matches);
    const allGroupScored = groupMatches.length > 0 && groupMatches.every(isChallengerMatchScored);
    const knockoutStarted = tournament.rounds.some(r => r.groupName == null);
    const bracket = groupBracketMatches(tournament.rounds);

    const bracketMatches = bracket
        .flatMap(section => [...section.semifinals, section.final, section.thirdPlace])
        .filter((m): m is ChallengerMatch => Boolean(m));

    const allBracketScored =
        bracket.length > 0 &&
        bracket.every(section => section.final != null && section.thirdPlace != null) &&
        bracketMatches.every(isChallengerMatchScored);

    return { groupRounds, allGroupScored, knockoutStarted, bracket, allBracketScored };
}

// Client-side mirror of the backend's validateChallengerSetScore, used only to decide
// whether the "Confirm" button should be enabled — the server re-validates authoritatively.
export function isValidChallengerSetScore(
    team1Games: number,
    team2Games: number,
    team1TiebreakPoints?: number,
    team2TiebreakPoints?: number,
): boolean {
    const hi = Math.max(team1Games, team2Games);
    const lo = Math.min(team1Games, team2Games);
    const hasTiebreak = team1TiebreakPoints != null && team2TiebreakPoints != null;

    if ((hi === 6 && lo <= 4) || (hi === 7 && lo === 5)) return !hasTiebreak;

    if (hi === 7 && lo === 6) {
        if (!hasTiebreak) return false;
        const tbHi = Math.max(team1TiebreakPoints!, team2TiebreakPoints!);
        const tbLo = Math.min(team1TiebreakPoints!, team2TiebreakPoints!);
        if (tbHi < 7 || tbHi - tbLo < 2) return false;
        const setWinnerIsTeam1 = team1Games === 7;
        const tiebreakWinnerIsTeam1 = team1TiebreakPoints === tbHi;
        return setWinnerIsTeam1 === tiebreakWinnerIsTeam1;
    }

    return false;
}

// Formats a score for display: "6-4", "7-6 (TB 7-3)", or set by set for a Masters
// match, e.g. "6-3 4-6 [10-8]" with a deciding tiebreak in brackets.
export function formatChallengerScore(m: ChallengerMatch): string {
    if (m.sets && m.sets.length > 0) {
        return m.sets
            .map(s => (s.isTiebreak ? `[${s.team1Games}-${s.team2Games}]` : `${s.team1Games}-${s.team2Games}`))
            .join(" ");
    }
    const base = `${m.team1Score}-${m.team2Score}`;
    if (m.team1TiebreakPoints != null && m.team2TiebreakPoints != null) {
        return `${base} (TB ${m.team1TiebreakPoints}-${m.team2TiebreakPoints})`;
    }
    return base;
}

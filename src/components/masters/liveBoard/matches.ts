import { isChallengerMatchScored, type ChallengerMatch, type ChallengerTeam } from "../../../lib/challenger";

// The two teams of a match, as team 1 and team 2.
export function teamsOf(m: ChallengerMatch): [ChallengerTeam, ChallengerTeam] {
    return [
        { player1: m.team1Player1, player2: m.team1Player2 },
        { player1: m.team2Player1, player2: m.team2Player2 },
    ];
}

export function winnerOf(m?: ChallengerMatch): ChallengerTeam | undefined {
    if (!m || !isChallengerMatchScored(m)) return undefined;
    const [t1, t2] = teamsOf(m);
    return m.team1Score > m.team2Score ? t1 : t2;
}

export function loserOf(m?: ChallengerMatch): ChallengerTeam | undefined {
    if (!m || !isChallengerMatchScored(m)) return undefined;
    const [t1, t2] = teamsOf(m);
    return m.team1Score > m.team2Score ? t2 : t1;
}

// The most recently scored match (by its save time) and the group it was played in —
// null for a knockout match. `key` changes whenever a newer score is saved.
export function latestScoredMatch(rounds: { groupName: string | null; matches: (ChallengerMatch & { scoredAt?: string | Date | null })[] }[]) {
    let best: { key: string; groupName: string | null; at: number } | null = null;
    for (const round of rounds) {
        for (const m of round.matches) {
            if (!m.scoredAt || !isChallengerMatchScored(m)) continue;
            const at = new Date(m.scoredAt).getTime();
            if (!best || at > best.at) best = { key: `${m.id}@${at}`, groupName: round.groupName, at };
        }
    }
    return best;
}

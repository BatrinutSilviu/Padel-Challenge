import { trpc } from "../trpc";

// The 0–10 level coefficient (backend lib/levels): every division covers a band of it,
// and signing up needs a coefficient inside the division's allowed range.

export type PlayerLevel = {
    coefficient: number | null; // null until the player has a rated match
    provisional: boolean;
    ratedMatches: number;
    eligibleDivisions: number[];
};

// The tables ranking points are scored with (backend lib/rankingPoints).
export const POINTS_FORMAT_LABELS: Record<string, string> = {
    AMERICANO: "Americano",
    AMERICANO_CHAMPIONS: "Americano Champions",
    TEAM_AMERICANO: "Team Americano",
    KING_OF_THE_COURT: "King of the Court",
    CLG1: "Challenger · 4 teams",
    CLG2: "Challenger · placement matches",
    CLG3: "Challenger · golden & silver brackets",
    MASTERS: "Masters",
    LEAGUE: "Act!ve Padel League",
};

export function useLevelRules(enabled = true) {
    return trpc.ranking.rules.useQuery(undefined, { enabled, staleTime: 5 * 60 * 1000 });
}

export function formatCoefficient(c: number | null | undefined): string {
    return c == null ? "—" : c.toFixed(2);
}

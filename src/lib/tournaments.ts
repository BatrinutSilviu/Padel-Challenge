export type TournamentType = "AMERICANO" | "AMERICANO_CHAMPIONS" | "AMERICANO_GIRLS" | "CHALLENGER" | "TEAM_AMERICANO" | "KING_OF_THE_COURT";

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
    AMERICANO: "Americano",
    AMERICANO_CHAMPIONS: "Americano Champions",
    AMERICANO_GIRLS: "Americano Fete",
    CHALLENGER: "Challenger",
    TEAM_AMERICANO: "Team Americano",
    KING_OF_THE_COURT: "King of the Court",
};

export function tournamentTypeLabel(type: string): string {
    return TOURNAMENT_TYPE_LABELS[type as TournamentType] ?? type;
}

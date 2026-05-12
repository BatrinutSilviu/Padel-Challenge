export type TournamentType = "AMERICANO" | "AMERICANO_CHAMPIONS" | "AMERICANO_GIRLS" | "CHALLENGER";

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
    AMERICANO: "Americano",
    AMERICANO_CHAMPIONS: "Americano Champions",
    AMERICANO_GIRLS: "Americano Fete",
    CHALLENGER: "Challenger",
};

export function tournamentTypeLabel(type: string): string {
    return TOURNAMENT_TYPE_LABELS[type as TournamentType] ?? type;
}

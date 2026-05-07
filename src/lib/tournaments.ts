export type TournamentType = "AMERICANO" | "AMERICANO_CHAMPIONS" | "CHALLENGER";

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
    AMERICANO: "Americano",
    AMERICANO_CHAMPIONS: "Americano Champions",
    CHALLENGER: "Challenger",
};

export function tournamentTypeLabel(type: string): string {
    return TOURNAMENT_TYPE_LABELS[type as TournamentType] ?? type;
}

import { RECOMMENDED_MASTERS_FORMAT, mastersTeamCount, type MastersFormat } from "./masters";

export type TournamentType = "AMERICANO" | "AMERICANO_CHAMPIONS" | "AMERICANO_GIRLS" | "CHALLENGER" | "TEAM_AMERICANO" | "KING_OF_THE_COURT" | "MASTERS";

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
    AMERICANO: "Americano",
    AMERICANO_CHAMPIONS: "Americano Champions",
    AMERICANO_GIRLS: "Americano Fete",
    CHALLENGER: "Challenger",
    TEAM_AMERICANO: "Team Americano",
    KING_OF_THE_COURT: "King of the Court",
    MASTERS: "Masters",
};

export function tournamentTypeLabel(type: string): string {
    return TOURNAMENT_TYPE_LABELS[type as TournamentType] ?? type;
}

// Team-based formats need the players paired up before a schedule can be built,
// so an admin has to assign teams when starting a sign-up sheet.
export const TEAM_BASED_TYPES: TournamentType[] = ["TEAM_AMERICANO", "CHALLENGER", "KING_OF_THE_COURT", "MASTERS"];

export function isTeamBasedType(type: string): boolean {
    return TEAM_BASED_TYPES.includes(type as TournamentType);
}

// Player counts each format's schedule generator can work with — mirrors
// playerCountError() in the backend's tournament router.
export const CAPACITY_OPTIONS: Record<TournamentType, number[]> = {
    AMERICANO: [8, 12, 16],
    AMERICANO_CHAMPIONS: [8, 12, 16],
    AMERICANO_GIRLS: [8, 12, 16],
    CHALLENGER: [8, 16],
    TEAM_AMERICANO: [8, 10, 12, 14, 16],
    KING_OF_THE_COURT: [8, 12, 16],
    MASTERS: [32], // really set by the group layout — see mastersFormatOf
};

export function capacityOptions(type: string): number[] {
    return CAPACITY_OPTIONS[type as TournamentType] ?? CAPACITY_OPTIONS.AMERICANO;
}

// Mirrors playerCountError() in the backend's tournament router, so the admin UI
// can explain why a sign-up sheet can't be started yet without a round trip.
export function playerCountError(type: string, count: number, masters?: MastersFormat): string | null {
    switch (type) {
        case "TEAM_AMERICANO":
            return count >= 8 && count % 2 === 0 ? null : "Team Americano needs an even number of players (at least 8)";
        case "CHALLENGER":
            return count === 8 || count === 16 ? null : "Challenger needs exactly 8 or 16 players (4 or 8 teams)";
        case "MASTERS": {
            const format = masters ?? RECOMMENDED_MASTERS_FORMAT;
            const needed = mastersTeamCount(format) * 2;
            return count === needed
                ? null
                : `Masters with ${format.groupCount} group${format.groupCount === 1 ? "" : "s"} of ${format.teamsPerGroup} needs exactly ${needed} players (${needed / 2} teams)`;
        }
        case "KING_OF_THE_COURT":
            return count >= 8 && count % 4 === 0 ? null : "King of the Court needs a multiple of 4 players (at least 8)";
        default:
            return [8, 12, 16].includes(count) ? null : "Americano needs exactly 8, 12 or 16 players";
    }
}

import { RECOMMENDED_MASTERS_FORMAT, mastersFormatNotes, mastersFormatOf, mastersTeamCount, type MastersFormat } from "./masters";
import { challengerFormatNotes } from "./challenger";

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

// One line per format, for players picking a tournament and admins picking a type.
export const TOURNAMENT_TYPE_DESCRIPTIONS: Record<TournamentType, string> = {
    AMERICANO: "Sign up on your own — you play with a different partner every round and collect the points you win.",
    AMERICANO_CHAMPIONS: "An Americano with higher stakes: same rules, more ranking points, and the winner earns the Americano Champion badge.",
    AMERICANO_GIRLS: "An Americano for the girls' division: a different partner every round, points add up.",
    CHALLENGER: "Fixed teams of 2: a group stage, then knockout matches for every place.",
    TEAM_AMERICANO: "Fixed teams of 2 play every other team once; the points you win add up.",
    KING_OF_THE_COURT: "Fixed teams of 2 on a ladder of courts: win to move up a court, lose and you move down.",
    MASTERS: "The big one: fixed teams of 2, a group stage played in full sets, then a knockout bracket.",
};

export function tournamentTypeDescription(type: string): string {
    return TOURNAMENT_TYPE_DESCRIPTIONS[type as TournamentType] ?? "";
}

type FormatInfo = {
    type: string;
    pointsPerGame: number;
    totalRounds: number | null;
    maxPlayers: number | null;
    challengerFormat?: string | null;
    groupCount?: number | null;
    teamsPerGroup?: number | null;
};

// How a tournament is played, for players: a few short points per format, following
// the schedule generators and ranking rules in the backend's tournament router.
export function tournamentFormatNotes(t: FormatInfo): string[] {
    const americanoScoring = `Every match is played to ${t.pointsPerGame} points in total (e.g. ${Math.ceil(t.pointsPerGame / 2) + 2}–${Math.floor(t.pointsPerGame / 2) - 2}), and every point your side wins counts towards your score`;
    switch (t.type) {
        case "AMERICANO":
        case "AMERICANO_GIRLS":
        case "AMERICANO_CHAMPIONS":
            return [
                "Sign up on your own — no partner needed",
                "Every round you play with a different partner, so you partner every other player once and face everyone along the way",
                americanoScoring,
                "Most points wins; on equal points, the player with more match wins ranks higher",
                ...(t.type === "AMERICANO_CHAMPIONS"
                    ? ["The winner earns the Americano Champion badge; the results don't count towards division standings"]
                    : []),
            ];
        case "TEAM_AMERICANO":
            return [
                "You play as a fixed team of 2 — sign up with a partner, or alone and you'll be paired up",
                "Every team plays every other team once (with an odd number of teams, one sits out each round)",
                americanoScoring,
                "The team with the most points wins; on equal points, more match wins ranks higher",
            ];
        case "KING_OF_THE_COURT":
            return [
                "You play as a fixed team of 2 — sign up with a partner, or alone and you'll be paired up",
                "Two teams per court, drawn at random for the first round",
                "After each round the winners move up one court and the losers move down one — the top court is where the kings play",
                "A tied match is decided by a golden point",
                `About ${t.totalRounds ?? 7} rounds; your court in the last round sets your final place (court 1's winners are 1st, its losers 2nd, court 2's winners 3rd, …)`,
            ];
        case "CHALLENGER":
            return challengerFormatNotes(challengerFormatOf(t), t.maxPlayers);
        case "MASTERS":
            return mastersFormatNotes(mastersFormatOf(t));
        default:
            return [];
    }
}

// ─── Times and prizes ──────────────────────────────────────────────────────────
// Times are local wall-clock "HH:MM" strings, shown exactly as stored.

export function timeRangeLabel(t: { startTime?: string | null; endTime?: string | null }): string {
    if (t.startTime && t.endTime) return `${t.startTime}–${t.endTime}`;
    if (t.startTime) return `from ${t.startTime}`;
    if (t.endTime) return `until ${t.endTime}`;
    return "";
}

// The tournament's date (it's stored as midnight UTC, so it's read back in UTC) with
// its times, e.g. "14 November 2026 · 10:00–14:00".
export function tournamentWhen(
    t: { date: string | Date; startTime?: string | null; endTime?: string | null },
    dateStyle: "long" | "short" = "short",
): string {
    const date = new Date(t.date).toLocaleDateString(
        dateStyle === "long" ? "en-GB" : undefined,
        dateStyle === "long" ? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } : { timeZone: "UTC" },
    );
    const times = timeRangeLabel(t);
    return times ? `${date} · ${times}` : date;
}

// A tournament's prizes (backend lib/tournamentDetails): places 1–5, each offered by
// Act!ve (partner null) or by a partner.
export const MAX_PRIZE_PLACE = 5;
export type Prize = { place: number; prize: string; partner: string | null };
export type TournamentPrizes = { prizes?: unknown; prizeNotes?: string | null };

export function placeLabel(place: number): string {
    return ["1st", "2nd", "3rd"][place - 1] ?? `${place}th`;
}

export function prizeList(t: TournamentPrizes): Prize[] {
    return Array.isArray(t.prizes) ? (t.prizes as Prize[]).filter(p => p && p.prize) : [];
}

export function hasPrizes(t: TournamentPrizes): boolean {
    return prizeList(t).length > 0 || !!t.prizeNotes;
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

export function capacityOptions(type: string, challengerFormat?: ChallengerFormat): number[] {
    if (type === "CHALLENGER" && challengerFormat === "PLACEMENT") return [16];
    return CAPACITY_OPTIONS[type as TournamentType] ?? CAPACITY_OPTIONS.AMERICANO;
}

// What follows a Challenger's group stage — mirrors the backend. BRACKETS is the
// Golden/Silver knockout (stored as null); PLACEMENT pairs the two groups place by place.
export type ChallengerFormat = "BRACKETS" | "PLACEMENT";

export function challengerFormatOf(t: { challengerFormat?: string | null }): ChallengerFormat {
    return t.challengerFormat === "PLACEMENT" ? "PLACEMENT" : "BRACKETS";
}

// Mirrors playerCountError() in the backend's tournament router, so the admin UI
// can explain why a sign-up sheet can't be started yet without a round trip.
export function playerCountError(type: string, count: number, masters?: MastersFormat, challengerFormat?: ChallengerFormat): string | null {
    switch (type) {
        case "TEAM_AMERICANO":
            return count >= 8 && count % 2 === 0 ? null : "Team Americano needs an even number of players (at least 8)";
        case "CHALLENGER":
            if (challengerFormat === "PLACEMENT") {
                return count === 16 ? null : "Challenger with placement matches needs exactly 16 players (8 teams)";
            }
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

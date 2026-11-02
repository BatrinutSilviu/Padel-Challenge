// Helpers for the Act!ve Padel League (backend: lib/league and routers/league). A season
// is a round robin in groups of fixed teams, one round a week; teams agree on when and
// where to play within their week. Matches are best of 3 sets, standard sets with a
// tiebreak at 6-6, star point at deuce.
// The backend runs tRPC v10 and the client v11, so infer with the backend's own types.
import type { inferRouterOutputs } from "../../../padel-challenge-backend/node_modules/@trpc/server";
import type { AppRouter } from "../../../padel-challenge-backend/src/router";
import { checkMastersScore } from "./masters";

type Outputs = inferRouterOutputs<AppRouter>;
export type League = Outputs["league"]["getById"];
export type LeagueTier = League["tiers"][number];
export type LeagueGroup = LeagueTier["groups"][number];
export type LeagueTeam = League["teams"][number];
export type LeagueMatch = League["matches"][number];
export type StandingRow = LeagueGroup["standings"][number];
export type LeagueMatchDetails = Outputs["league"]["match"];
export type Outcome = "PROMOTED" | "PLAYOFF_UP" | "STAYED" | "PLAYOFF_DOWN" | "RELEGATED";

export const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export const DAY_LABELS: Record<string, string> = {
    MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
};
// The clubs league matches are played at — mirrors LEAGUE_VENUES on the backend.
export const VENUES = [
    "PadelCenter Dumbravita", "PadelCenter Circumvalatiunii", "X3 Padel", "ActiveArena", "PadelTeam",
] as const;
export type Venue = typeof VENUES[number];

// ─── Availability — hour ranges per day, mirrors lib/league on the backend ──────
// Times are minutes from midnight on a half-hour grid: 18:30 is 1110.

export type Day = typeof DAYS[number];
export type TimeRange = { day: Day; from: number; to: number };

// 07:00 to 24:00 in half hours, for the from/to pickers.
export const TIME_OPTIONS = Array.from({ length: 35 }, (_, i) => 7 * 60 + i * 30);

export function formatMinutes(m: number): string {
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// "18:00–22:00"
export function formatRange(r: { from: number; to: number }): string {
    return `${formatMinutes(r.from)}–${formatMinutes(r.to)}`;
}

// Ranges grouped by day in week order: [["TUE", [ranges]], ["SAT", [ranges]]].
export function rangesByDay(ranges: TimeRange[]): [Day, TimeRange[]][] {
    return DAYS
        .map(d => [d, ranges.filter(r => r.day === d).sort((a, b) => a.from - b.from)] as [Day, TimeRange[]])
        .filter(([, rs]) => rs.length > 0);
}


export function tierLabel(level: number): string {
    return `League ${level}`;
}

export const OUTCOME_INFO: Record<Outcome, { label: string; short: string; className: string; rowClass: string }> = {
    PROMOTED:     { label: "Promoted",          short: "▲",  className: "bg-emerald-50 text-emerald-700 border-emerald-200", rowClass: "border-l-emerald-500" },
    PLAYOFF_UP:   { label: "Promotion playoff", short: "▲?", className: "bg-sky-50 text-sky-700 border-sky-200",             rowClass: "border-l-sky-400" },
    STAYED:       { label: "Stays",             short: "",   className: "bg-gray-50 text-gray-500 border-gray-200",          rowClass: "border-l-transparent" },
    PLAYOFF_DOWN: { label: "Relegation playoff", short: "▼?", className: "bg-amber-50 text-amber-700 border-amber-200",      rowClass: "border-l-amber-400" },
    RELEGATED:    { label: "Relegated",         short: "▼",  className: "bg-red-50 text-red-600 border-red-200",             rowClass: "border-l-red-500" },
};

// ─── Weeks ──────────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

// Week n runs Monday to Sunday, from startDate + 7(n-1) days.
export function weekRange(startDate: string | Date, week: number): { from: Date; to: Date } {
    const start = new Date(startDate).getTime();
    return { from: new Date(start + (week - 1) * 7 * DAY_MS), to: new Date(start + ((week - 1) * 7 + 6) * DAY_MS) };
}

export function formatWeekRange(startDate: string | Date, week: number): string {
    const { from, to } = weekRange(startDate, week);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
    return `${from.toLocaleDateString("en-GB", opts)} – ${to.toLocaleDateString("en-GB", opts)}`;
}

// "2 Nov – 6 Dec 2026", from the Monday of week 1 to the Sunday of the last week.
export function formatSeasonRange(startDate: string | Date, weeks: number): string {
    const { from } = weekRange(startDate, 1);
    const { to } = weekRange(startDate, Math.max(weeks, 1));
    const day: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
    return `${from.toLocaleDateString("en-GB", day)} – ${to.toLocaleDateString("en-GB", { ...day, year: "numeric" })}`;
}

// The week being played today (clamped to the season), so pages open on it.
export function currentWeek(startDate: string | Date, weekCount: number): number {
    const elapsed = Math.floor((Date.now() - new Date(startDate).getTime()) / (7 * DAY_MS));
    return Math.min(Math.max(elapsed + 1, 1), Math.max(weekCount, 1));
}

export function formatScheduledAt(d: string | Date): string {
    return new Date(d).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Teams and results ──────────────────────────────────────────────────────────

export function teamName(t: { player1: { name: string }; player2: { name: string } }): string {
    return `${t.player1.name} & ${t.player2.name}`;
}

type ResultLike = {
    status: string;
    walkoverWinner: number | null;
    team1Sets: number;
    team2Sets: number;
    sets: { team1Games: number; team2Games: number }[];
};

// "6-3 4-6 7-6", "W/O" or "" when nothing is reported yet.
export function formatResult(m: ResultLike): string {
    if (m.walkoverWinner) return "W/O";
    return m.sets.map(s => `${s.team1Games}-${s.team2Games}`).join(" ");
}

export function winnerSide(m: ResultLike): 1 | 2 | null {
    if (m.walkoverWinner) return m.walkoverWinner as 1 | 2;
    if (m.status !== "CONFIRMED") return null;
    return m.team1Sets > m.team2Sets ? 1 : 2;
}

// Best of 3 sets — the same rules as the Masters knockout.
export function checkLeagueScore(cells: [string, string][]) {
    return checkMastersScore("KNOCKOUT", cells);
}

// ─── Drafting groups — mirrors splitIntoGroups on the backend ───────────────────

export const MIN_TEAMS_PER_GROUP = 3;
export const MAX_TEAMS_PER_GROUP = 8;

// Group sizes for a tier's teams, filled in team order as evenly as possible:
// 13 teams at 6 per group → 5, 4, 4.
export function groupSizes(teamCount: number, teamsPerGroup: number): number[] {
    if (teamCount === 0) return [];
    const count = Math.ceil(teamCount / teamsPerGroup);
    const base = Math.floor(teamCount / count);
    return Array.from({ length: count }, (_, g) => base + (g < teamCount % count ? 1 : 0));
}

// Round robin length: 6 teams → 5 weeks; an odd count gives everyone a week off.
export function weekCount(teamsInGroup: number): number {
    return teamsInGroup % 2 === 0 ? teamsInGroup - 1 : teamsInGroup;
}

// The promotion/relegation rules of a tier in words, e.g. "1st of each group up · last down".
export function rulesSummary(
    t: { promoteDirect: number; promoteBest: number; playoffUp: number; relegateDirect: number; relegateWorst: number; playoffDown: number },
    { isTop, isBottom }: { isTop: boolean; isBottom: boolean },
): string[] {
    const ord = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
    const places = (from: number, count: number) =>
        count === 1 ? ord(from) : `${ord(from)}–${ord(from + count - 1)}`;
    // Places counted from the bottom, 1 being the last: "last", "last 2", "2nd from last", "2nd–3rd from last".
    const fromBottom = (from: number, count: number) =>
        from === 1 ? (count === 1 ? "last" : `last ${count}`) : `${places(from, count)} from last`;
    const parts: string[] = [];
    if (!isTop) {
        if (t.promoteDirect > 0) parts.push(`${places(1, t.promoteDirect)} of each group promoted`);
        if (t.promoteBest > 0) parts.push(`best ${t.promoteBest === 1 ? "" : `${t.promoteBest} `}${ord(t.promoteDirect + 1)}-placed promoted`);
        if (t.playoffUp > 0) parts.push(`${places(t.promoteDirect + 1, t.playoffUp)} to a promotion playoff`);
    }
    if (!isBottom) {
        if (t.relegateDirect > 0) parts.push(`${fromBottom(1, t.relegateDirect)} relegated`);
        if (t.relegateWorst > 0) parts.push(`worst ${t.relegateWorst === 1 ? "" : `${t.relegateWorst} `}${fromBottom(t.relegateDirect + 1, 1)} relegated`);
        if (t.playoffDown > 0) parts.push(`${fromBottom(t.relegateDirect + 1, t.playoffDown)} to a relegation playoff`);
    }
    return parts;
}

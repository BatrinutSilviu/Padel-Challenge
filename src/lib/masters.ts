// Pure helpers for the Masters tournament format: fixed teams drawn into groups (4 groups
// of 4 recommended), the top 2 of each group into a knockout bracket, plus a 3rd place match
// between the semifinal losers.
// Matches are scored set by set (see checkMastersScore); team1Score/team2Score hold sets
// won, so "is it scored" and "who won" helpers from ./challenger still apply.
import { isChallengerMatchScored, type ChallengerMatch, type ChallengerRound } from "./challenger";

// ─── Group stage layout — mirrors lib/masters on the backend ────────────────────
// Only 1, 2, 4 or 8 groups fill a bracket exactly with the top 2 of each going through.

export type MastersFormat = { groupCount: number; teamsPerGroup: number };

export const MASTERS_GROUP_COUNTS = [1, 2, 4, 8];
export const MASTERS_TEAMS_PER_GROUP = [3, 4, 5, 6];
export const RECOMMENDED_MASTERS_FORMAT: MastersFormat = { groupCount: 4, teamsPerGroup: 4 };

// Tournaments created before the layout was configurable are 4 groups of 4.
export function mastersFormatOf(t: { groupCount?: number | null; teamsPerGroup?: number | null }): MastersFormat {
    return {
        groupCount: t.groupCount ?? RECOMMENDED_MASTERS_FORMAT.groupCount,
        teamsPerGroup: t.teamsPerGroup ?? RECOMMENDED_MASTERS_FORMAT.teamsPerGroup,
    };
}

export function isRecommendedMastersFormat(f: MastersFormat): boolean {
    return f.groupCount === RECOMMENDED_MASTERS_FORMAT.groupCount && f.teamsPerGroup === RECOMMENDED_MASTERS_FORMAT.teamsPerGroup;
}

export function mastersTeamCount(f: MastersFormat): number {
    return f.groupCount * f.teamsPerGroup;
}

export function mastersGroupNames(groupCount: number): string[] {
    return Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));
}

export type KnockoutStageKey = "ROUND_OF_16" | "QUARTERFINAL" | "SEMIFINAL" | "FINAL";
const KNOCKOUT_STAGES: KnockoutStageKey[] = ["ROUND_OF_16", "QUARTERFINAL", "SEMIFINAL", "FINAL"];

export const STAGE_INFO: Record<KnockoutStageKey, { title: string; one: string; short: string }> = {
    ROUND_OF_16: { title: "Round of 16", one: "Round of 16", short: "R16-" },
    QUARTERFINAL: { title: "Quarterfinals", one: "Quarterfinal", short: "QF" },
    SEMIFINAL: { title: "Semifinals", one: "Semifinal", short: "SF" },
    FINAL: { title: "Final", one: "Final", short: "Final" },
};

// Knockout stages in playing order, e.g. 4 groups → quarterfinals, semifinals, Final.
export function mastersKnockoutStages(groupCount: number): KnockoutStageKey[] {
    return KNOCKOUT_STAGES.slice(KNOCKOUT_STAGES.length - Math.log2(groupCount * 2));
}

// "QF3", "SF1", "Final" — the label of a knockout slot.
export function slotLabel(stage: KnockoutStageKey, index: number): string {
    return stage === "FINAL" ? "Final" : `${STAGE_INFO[stage].short}${index + 1}`;
}

export type MastersSeed = { group: string; rank: 1 | 2 };

export function mastersSeedLabel(seed: MastersSeed, groupCount: number): string {
    return groupCount === 1 ? `Group #${seed.rank}` : `Group ${seed.group} #${seed.rank}`;
}

// First knockout round in bracket order — mirrors mastersFirstRoundDraw on the backend.
// Groups pair up A/B, C/D, …: X1–Y2 in the top half, Y1–X2 in the bottom half, so a
// group's #1 and #2 can only meet again in the Final. 4 groups: A1–B2, C1–D2, B1–A2, D1–C2.
export function mastersFirstRoundDraw(groupCount: number): [MastersSeed, MastersSeed][] {
    const groups = mastersGroupNames(groupCount);
    if (groupCount === 1) return [[{ group: "A", rank: 1 }, { group: "A", rank: 2 }]];
    const pairs = Array.from({ length: groupCount / 2 }, (_, i) => [groups[i * 2], groups[i * 2 + 1]]);
    return [
        ...pairs.map(([x, y]): [MastersSeed, MastersSeed] => [{ group: x, rank: 1 }, { group: y, rank: 2 }]),
        ...pairs.map(([x, y]): [MastersSeed, MastersSeed] => [{ group: y, rank: 1 }, { group: x, rank: 2 }]),
    ];
}

// ─── Courts ─────────────────────────────────────────────────────────────────────
// Courts 1–2 are indoors, 3–4 outdoors. The admin can put any match on a given court
// (stored on the match); every other match follows the default rotation below.
// By default a group round is played on one side, so every
// team in a group plays under the same conditions in every round — and teams are only
// ranked against their own group. Groups pair up (A/B, C/D, …) to share the four courts:
// the first starts indoors, the second outdoors, and both swap sides every round. With
// 4 teams per group: A indoor–outdoor–indoor, B outdoor–indoor–outdoor.
export const MASTERS_COURT_COUNT = 4;

export function isIndoorCourt(court: number): boolean {
    return court <= 2;
}

export function courtName(court: number): string {
    return `Court ${court} · ${isIndoorCourt(court) ? "Indoor" : "Outdoor"}`;
}

// Courts for the matches of a group's round, in match order. A round with more than two
// matches (6 teams per group) spills over onto the other side.
export function mastersGroupRoundCourts(groupIndex: number, roundIndex: number, matchCount: number): number[] {
    const side = (groupIndex + roundIndex) % 2; // 0 indoors, 1 outdoors
    return Array.from({ length: matchCount }, (_, i) => ((side * 2 + i) % MASTERS_COURT_COUNT) + 1);
}

// Knockout matches fill the courts in bracket order: the quarterfinals take all four,
// both semifinals are indoors (same conditions for both), the Final on court 1.
export function mastersKnockoutCourt(slotIndex: number): number {
    return (slotIndex % MASTERS_COURT_COUNT) + 1;
}

// The 3rd place match goes next to the Final, on the other indoor court.
export const MASTERS_THIRD_PLACE_COURT = 2;

// Shown on the sign-up sheet so players know what they're signing up for.
export function mastersFormatNotes(f: MastersFormat): string[] {
    const firstStage = STAGE_INFO[mastersKnockoutStages(f.groupCount)[0]];
    return [
        `${f.groupCount === 1 ? "1 group" : `${f.groupCount} groups`} of ${f.teamsPerGroup} teams`,
        `${f.teamsPerGroup - 1} guaranteed matches`,
        f.groupCount === 1
            ? "The top 2 play the Final"
            : `The top 2 of each group go through to the ${firstStage.title.toLowerCase()}`,
        ...(f.groupCount === 1 ? [] : ["The semifinal losers play a 3rd place match"]),
        "Group matches: 2 sets, with a tiebreak at one set all · Knockout: best of 3 sets",
        "Saturday: group stage · Sunday: knockout stage",
    ];
}

// ─── Progress ───────────────────────────────────────────────────────────────────

// court: set by the admin, null to follow the default rotation.
export type MastersMatch = ChallengerMatch & { bracketPosition: number | null; court?: number | null };
export type MastersRound = Omit<ChallengerRound, "matches"> & { matches: MastersMatch[] };

// Where a knockout slot's team comes from: a group placing (first round), or the winner
// (the loser, for the 3rd place match) of a slot in the previous stage.
export type MastersSlotSource =
    | { kind: "seed"; seed: MastersSeed; label: string }
    | { kind: "winner" | "loser"; stage: KnockoutStageKey; index: number; label: string };

export type MastersSlot = { match?: MastersMatch; sources: [MastersSlotSource, MastersSlotSource] };

export type MastersKnockoutStage = {
    key: KnockoutStageKey;
    slots: MastersSlot[];
};

export type MastersProgress = {
    format: MastersFormat;
    groups: string[];
    groupRounds: Record<string, MastersRound[]>;
    groupMatches: MastersMatch[];
    allGroupScored: boolean;
    knockoutStarted: boolean;
    // Every stage from the first knockout round to the Final, with slots for matches not drawn yet.
    stages: MastersKnockoutStage[];
    bracketMatches: MastersMatch[];
    knockoutMatchCount: number; // once fully drawn
    final?: MastersMatch;
    finalScored: boolean;
    // Semifinal losers' match — none with a single group, which goes straight to the Final.
    thirdPlace?: MastersSlot;
    // Final and 3rd place match both scored: the tournament can be completed.
    knockoutComplete: boolean;
    // match id → court, for every group match and every knockout match drawn so far:
    // the admin's pick if there is one, else the default rotation (autoCourtOf).
    courtOf: Map<string, number>;
    autoCourtOf: Map<string, number>;
};

export function mastersProgress(tournament: {
    rounds: MastersRound[];
    groupCount?: number | null;
    teamsPerGroup?: number | null;
}): MastersProgress {
    const format = mastersFormatOf(tournament);
    const groups = mastersGroupNames(format.groupCount);
    const groupRounds = Object.fromEntries(groups.map(g => [
        g,
        tournament.rounds.filter(r => r.groupName === g).sort((a, b) => a.roundNumber - b.roundNumber),
    ]));
    const groupMatches = groups.flatMap(g => groupRounds[g]).flatMap(r => r.matches);

    const knockoutMatches = tournament.rounds.filter(r => r.groupName == null).flatMap(r => r.matches);
    const stageKeys = mastersKnockoutStages(format.groupCount);
    const draw = mastersFirstRoundDraw(format.groupCount);
    const stages: MastersKnockoutStage[] = stageKeys.map((key, s) => {
        const matches = knockoutMatches
            .filter(m => m.bracketStage === key)
            .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
        const slotCount = 2 ** (stageKeys.length - 1 - s);
        return {
            key,
            slots: Array.from({ length: slotCount }, (_, i) => ({
                match: matches[i],
                sources: s === 0
                    ? [
                        { kind: "seed", seed: draw[i][0], label: mastersSeedLabel(draw[i][0], format.groupCount) },
                        { kind: "seed", seed: draw[i][1], label: mastersSeedLabel(draw[i][1], format.groupCount) },
                    ]
                    : ([0, 1] as const).map(k => {
                        const prev = stageKeys[s - 1];
                        const index = i * 2 + k;
                        return { kind: "winner", stage: prev, index, label: `Winner ${slotLabel(prev, index)}` };
                    }) as [MastersSlotSource, MastersSlotSource],
            })),
        };
    });
    const final = stages[stages.length - 1].slots[0].match;
    const thirdPlaceMatch = knockoutMatches.find(m => m.bracketStage === "THIRD_PLACE");
    // A Final drawn without a 3rd place match predates it — there's none to play then.
    const thirdPlace: MastersSlot | undefined = stageKeys.includes("SEMIFINAL") && (thirdPlaceMatch || !final)
        ? {
            match: thirdPlaceMatch,
            sources: ([0, 1] as const).map(index => (
                { kind: "loser", stage: "SEMIFINAL", index, label: `Loser ${slotLabel("SEMIFINAL", index)}` }
            )) as [MastersSlotSource, MastersSlotSource],
        }
        : undefined;
    const finalScored = final != null && isChallengerMatchScored(final);

    const autoCourtOf = new Map<string, number>();
    groups.forEach((g, gi) => groupRounds[g].forEach((round, ri) => {
        const courts = mastersGroupRoundCourts(gi, ri, round.matches.length);
        round.matches.forEach((m, mi) => autoCourtOf.set(m.id, courts[mi]));
    }));
    for (const stage of stages) {
        stage.slots.forEach((slot, i) => { if (slot.match) autoCourtOf.set(slot.match.id, mastersKnockoutCourt(i)); });
    }
    if (thirdPlace?.match) autoCourtOf.set(thirdPlace.match.id, MASTERS_THIRD_PLACE_COURT);
    const courtOf = new Map(tournament.rounds.flatMap(r => r.matches).flatMap(m => {
        const court = m.court ?? autoCourtOf.get(m.id);
        return court != null ? [[m.id, court] as const] : [];
    }));

    return {
        format,
        groups,
        groupRounds,
        groupMatches,
        allGroupScored: groupMatches.length > 0 && groupMatches.every(isChallengerMatchScored),
        knockoutStarted: knockoutMatches.length > 0,
        stages,
        bracketMatches: knockoutMatches,
        knockoutMatchCount: format.groupCount * 2 - 1 + (thirdPlace ? 1 : 0),
        final,
        finalScored,
        thirdPlace,
        knockoutComplete: finalScored && (!thirdPlace || (thirdPlace.match != null && isChallengerMatchScored(thirdPlace.match))),
        courtOf,
        autoCourtOf,
    };
}

// player id → teammate id, so final standings can list each team on its own row even
// where several teams share a rank.
export function mastersPartnerMap(rounds: { matches: ChallengerMatch[] }[]): Map<string, string> {
    const partnerOf = new Map<string, string>();
    for (const m of rounds.flatMap(r => r.matches)) {
        partnerOf.set(m.team1Player1.id, m.team1Player2.id);
        partnerOf.set(m.team1Player2.id, m.team1Player1.id);
        partnerOf.set(m.team2Player1.id, m.team2Player2.id);
        partnerOf.set(m.team2Player2.id, m.team2Player1.id);
    }
    return partnerOf;
}

export type MastersStage = "GROUP" | "KNOCKOUT";

export function mastersStage(match: { bracketStage: string | null }): MastersStage {
    return match.bracketStage ? "KNOCKOUT" : "GROUP";
}

// A completed padel set: 6-0 to 6-4, 7-5 or 7-6.
export function isValidSet(a: number, b: number): boolean {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return (hi === 6 && lo <= 4) || (hi === 7 && (lo === 5 || lo === 6));
}

export type MastersScoreInput = {
    sets: { team1Games: number; team2Games: number }[];
    tiebreak?: { team1Points: number; team2Points: number };
};

// Client-side mirror of mastersMatchResult on the backend, for the score-entry form.
// `cells` are the raw inputs for up to three columns (sets 1-2, then the group-stage
// tiebreak or the knockout's third set). Returns the payload to save, or why it can't be.
//   Group stage: exactly 2 sets; at one set all a tiebreak decides — any score, as long
//   as someone won it. Knockout: best of 3 sets.
export function checkMastersScore(
    stage: MastersStage,
    cells: [string, string][],
): { ok: true; input: MastersScoreInput } | { ok: false; error: string } {
    const num = (v: string) => (/^\d+$/.test(v.trim()) ? parseInt(v, 10) : NaN);
    const [c1, c2, c3] = cells.map(([a, b]) => [num(a), num(b)] as const);
    const third = cells[2];
    const thirdEmpty = !third || (third[0].trim() === "" && third[1].trim() === "");

    for (const [i, [a, b]] of [c1, c2].entries()) {
        if (isNaN(a) || isNaN(b)) return { ok: false, error: `Enter both scores for set ${i + 1}` };
        if (!isValidSet(a, b)) return { ok: false, error: `Set ${i + 1}: ${a}-${b} isn't a finished set` };
    }
    const sets = [c1, c2].map(([team1Games, team2Games]) => ({ team1Games, team2Games }));
    const split = (c1[0] > c1[1]) !== (c2[0] > c2[1]);

    if (!split) {
        return thirdEmpty
            ? { ok: true, input: { sets } }
            : { ok: false, error: `Won 2-0 in sets — clear the ${stage === "GROUP" ? "tiebreak" : "third set"}` };
    }
    const [a, b] = c3 ?? [NaN, NaN];
    if (stage === "GROUP") {
        if (isNaN(a) || isNaN(b)) return { ok: false, error: "One set all — enter the tiebreak score" };
        if (a === b) return { ok: false, error: "The tiebreak needs a winner" };
        return { ok: true, input: { sets, tiebreak: { team1Points: a, team2Points: b } } };
    }
    if (isNaN(a) || isNaN(b)) return { ok: false, error: "One set all — enter the third set" };
    if (!isValidSet(a, b)) return { ok: false, error: `Set 3: ${a}-${b} isn't a finished set` };
    return { ok: true, input: { sets: [...sets, { team1Games: a, team2Games: b }] } };
}

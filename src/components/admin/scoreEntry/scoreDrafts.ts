import { trpcClient } from "../../../trpc";

// Scores typed in but not confirmed yet, kept on the server (Match.scoreDraft) so every device
// shows the same: type a score on the phone, see it on the laptop. Each score row keeps its own
// boxes in it ({ s1, s2 }, { g1, g2, tb1, tb2 }, …).
//
// The rows read their draft once, when they mount, so this keeps a copy in memory: seeded from
// the tournament as it's loaded (seedScoreDrafts, before the rows render), and updated as the
// rows type. Writes go to the server a moment after the last keystroke.

export type ScoreDraft = Record<string, unknown>;

const drafts = new Map<string, ScoreDraft>();
// Changes made here and not on the server yet: a reload of the tournament mustn't undo them.
const unsent = new Map<string, ReturnType<typeof setTimeout>>();

type MatchWithDraft = { id: string; scoreDraft?: unknown };

/** Takes the drafts the server has for a tournament's matches (keeping any still being sent). */
export function seedScoreDrafts(tournament: { rounds?: { matches: MatchWithDraft[] }[] } | undefined) {
    for (const round of tournament?.rounds ?? []) {
        for (const m of round.matches) {
            if (unsent.has(m.id)) continue;
            const d = m.scoreDraft;
            if (d && typeof d === "object" && !Array.isArray(d)) drafts.set(m.id, d as ScoreDraft);
            else drafts.delete(m.id);
        }
    }
}

export function readScoreDraft(matchId: string): ScoreDraft | null {
    return drafts.get(matchId) ?? null;
}

function send(matchId: string, draft: ScoreDraft | null) {
    clearTimeout(unsent.get(matchId));
    unsent.set(matchId, setTimeout(() => {
        trpcClient.tournament.saveScoreDraft.mutate({ matchId, draft: draft as never })
            .catch(() => { /* the draft is still on this device; the next keystroke sends it again */ })
            .finally(() => unsent.delete(matchId));
    }, 600));
}

export function writeScoreDraft(matchId: string, draft: ScoreDraft) {
    drafts.set(matchId, draft);
    send(matchId, draft);
}

/** Forgets a draft: its score was saved or the boxes were emptied. Also stops a write still waiting
 *  to go out, so it can't bring the draft back. */
export function clearScoreDraft(matchId: string) {
    if (!drafts.has(matchId) && !unsent.has(matchId)) return;
    drafts.delete(matchId);
    send(matchId, null);
}

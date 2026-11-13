import { useCallback, useEffect, useState } from "react";
import { trpc } from "../../../trpc";
import { isChallengerMatchScored, type MatchSet } from "../../../lib/challenger";
import { isKotcMatchScored } from "../../../lib/kingOfTheCourt";
import type { TournamentData } from "../../../lib/tournaments";

type Match = TournamentData["rounds"][number]["matches"][number];

// What the score entry page tracks while scores are being saved: which matches have a
// score (the server's, plus the ones saved from this page since) and how many saves are
// still on their way. The on…Saved callbacks are what each format's score rows call
// once a score is saved.
export function useScoreSaving(id: string, tournament: TournamentData | undefined) {
    const utils = trpc.useUtils();
    const [scoredIds, setScoredIds] = useState<Set<string>>(() => new Set());
    const [pendingSaves, setPendingSaves] = useState(0);

    useEffect(() => {
        if (!tournament) return;
        const ppg = tournament.pointsPerGame;
        const isScored = tournament.type === "CHALLENGER" || tournament.type === "MASTERS"
            ? isChallengerMatchScored
            : tournament.type === "KING_OF_THE_COURT"
            ? isKotcMatchScored
            : (m: { team1Score: number; team2Score: number }) => m.team1Score + m.team2Score === ppg;
        const serverScoredIds = new Set(
            tournament.rounds
                .flatMap(r => r.matches)
                .filter(isScored)
                .map(m => m.id)
        );
        // Merge server-known scored IDs with any locally-tracked ones (e.g. scored
        // from this session but not yet reflected in a fresh server fetch).
        setScoredIds(prev => {
            const merged = new Set(serverScoredIds);
            for (const id of prev) merged.add(id);
            return merged;
        });
    }, [tournament]);

    // Marks the match scored and patches the cache synchronously so it's correct
    // immediately — an invalidateQueries()-only refetch can lose the race if the admin
    // navigates away before it resolves, leaving the stale (unscored) snapshot cached for
    // the next visit to this tournament.
    // It also refetches in the background: the last score of a round or stage can make the
    // server create the next matches (the Challenger Final and Third Place match, the next
    // Masters knockout stage, a new King of the Court round), which a patch can't materialize.
    const patchMatch = useCallback((matchId: string, changes: Partial<Match>) => {
        setScoredIds(prev => new Set([...prev, matchId]));
        utils.tournament.getById.setData({ id }, old => {
            if (!old) return old;
            return {
                ...old,
                rounds: old.rounds.map(r => ({
                    ...r,
                    matches: r.matches.map(m => m.id === matchId ? { ...m, ...changes } : m),
                })),
            };
        });
        utils.tournament.getById.invalidate({ id });
    }, [utils, id]);

    // Americano and Challenger (Challenger matches can end in a tiebreak).
    const onSaved = useCallback((
        matchId: string,
        team1Score: number,
        team2Score: number,
        team1TiebreakPoints?: number | null,
        team2TiebreakPoints?: number | null,
    ) => {
        patchMatch(matchId, {
            team1Score,
            team2Score,
            ...(team1TiebreakPoints !== undefined ? { team1TiebreakPoints, team2TiebreakPoints: team2TiebreakPoints ?? null } : {}),
        });
    }, [patchMatch]);

    // Masters matches are scored per set: patch the sets alongside the sets-won totals.
    const onMastersSaved = useCallback((matchId: string, team1Score: number, team2Score: number, sets: MatchSet[]) => {
        // Until the refetch arrives the patched sets lack their database ids; nothing reads them.
        patchMatch(matchId, { team1Score, team2Score, sets: sets as Match["sets"] });
    }, [patchMatch]);

    // Separate from onSaved: King of the Court's 4th argument (goldenPointWinner) is not
    // positionally compatible with onSaved's tiebreak-point pair.
    const onKotcSaved = useCallback((matchId: string, team1Score: number, team2Score: number, goldenPointWinner: number | null) => {
        patchMatch(matchId, { team1Score, team2Score, goldenPointWinner });
    }, [patchMatch]);

    const onSaveStart = useCallback(() => setPendingSaves(n => n + 1), []);
    const onSaveEnd = useCallback(() => setPendingSaves(n => n - 1), []);

    return { scoredIds, isSaving: pendingSaves > 0, onSaveStart, onSaveEnd, onSaved, onMastersSaved, onKotcSaved };
}

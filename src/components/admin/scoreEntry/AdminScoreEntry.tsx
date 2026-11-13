import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { NavBar } from "../../NavBar";
import { trpc } from "../../../trpc";
import { divisionLabel } from "../../../lib/divisions";
import { challengerProgress } from "../../../lib/challenger";
import { STAGE_INFO, mastersProgress } from "../../../lib/masters";
import { kotcProgress } from "../../../lib/kingOfTheCourt";
import { challengerFormatOf } from "../../../lib/tournaments";
import { LoginPage, SessionExpiredModal } from "../AdminAuth";
import { useAdminSession } from "../useAdminSession";
import { TournamentSignupAdmin } from "../signupSheet/TournamentSignupAdmin";
import { TournamentDetailsEditor } from "../TournamentDetailsInputs";
import { TournamentSettingsEditor } from "../TournamentSettingsEditor";
import { ChatJumpLink, TournamentChat } from "../../TournamentChat";
import { ChallengerScoreEntry } from "./ChallengerScoreEntry";
import { MastersScoreEntry } from "./MastersScoreEntry";
import { KingOfTheCourtScoreEntry } from "./KingOfTheCourtScoreEntry";
import { AmericanoScoreEntry } from "./AmericanoScoreEntry";
import { ParticipantsCard } from "./ParticipantsCard";
import { ScoreProgress } from "./ScoreProgress";
import { useScoreSaving } from "./useScoreSaving";

// The admin page for one tournament (/admin/tournament/:id). Before it starts it's the
// sign-up sheet; once started it's where scores are entered, the knockout stage or next
// round is started, and the tournament is completed.
export function AdminScoreEntry() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const utils = trpc.useUtils();
    const { token, sessionExpired, handleLogin } = useAdminSession();
    const [confirmComplete, setConfirmComplete] = useState(false);
    const [recalcSuccess, setRecalcSuccess] = useState(false);

    const { data: tournament, isPending, error } = trpc.tournament.getById.useQuery({ id: id! });
    const { scoredIds, isSaving, onSaveStart, onSaveEnd, onSaved, onMastersSaved, onKotcSaved } = useScoreSaving(id!, tournament);

    // Every action changes the tournament; completing or recalculating also changes its results in the list.
    const refreshTournament = () => utils.tournament.getById.invalidate({ id: id! });
    const refreshList = () => utils.tournament.list.invalidate();

    const complete = trpc.tournament.complete.useMutation({
        onSuccess: () => {
            refreshTournament();
            refreshList();
            navigate(`/tournament/${id}`);
        },
    });
    const recalculate = trpc.tournament.recalculate.useMutation({
        onSuccess: () => {
            refreshTournament();
            refreshList();
            setRecalcSuccess(true);
        },
    });
    const startKnockout = trpc.tournament.startChallengerKnockout.useMutation({ onSuccess: () => { refreshTournament(); } });
    const startMastersKnockout = trpc.tournament.startMastersKnockout.useMutation({ onSuccess: () => { refreshTournament(); } });
    const advanceKotcRound = trpc.tournament.advanceKingOfTheCourtRound.useMutation({ onSuccess: () => { refreshTournament(); } });

    if (!token && !sessionExpired) return <LoginPage onLogin={handleLogin} />;
    if (isPending) return <LoadingPage />;
    if (error || !tournament) return <div className="p-8 text-red-600">Tournament not found.</div>;

    // Not started yet — there are no matches to score, only a sign-up sheet to manage.
    if (tournament.status === "UPCOMING") {
        return (
            <>
                <TournamentSignupAdmin tournament={tournament} />
                {sessionExpired && <SessionExpiredModal onLogin={handleLogin} />}
            </>
        );
    }

    const isCompleted = tournament.status === "COMPLETED";
    const isChallenger = tournament.type === "CHALLENGER";
    const isKotc = tournament.type === "KING_OF_THE_COURT";
    const isMasters = tournament.type === "MASTERS";
    // Challenger, King of the Court and Masters rank by their own format rules, so a
    // points-based recalculation doesn't apply to them.
    const canRecalculate = !isChallenger && !isKotc && !isMasters;
    const progress = isChallenger ? challengerProgress(tournament) : null;
    const mastersProgressData = isMasters ? mastersProgress(tournament) : null;
    const kotcProgressData = isKotc ? kotcProgress(tournament) : null;
    const totalMatches = tournament.rounds.flatMap(r => r.matches).length;
    const scoredCount = scoredIds.size;
    const allScored = isChallenger
        ? (progress?.allBracketScored ?? false)
        : isMasters
        ? (mastersProgressData?.knockoutComplete ?? false)
        : isKotc
        ? Boolean(kotcProgressData?.lastScoredRound)
        : scoredCount === totalMatches;

    // Challenger and Masters: the group stage ends when the admin draws the knockout
    // stage, which is only possible once every group match has a score.
    const groupStage = isChallenger && progress
        ? {
            matches: [...progress.groupRounds.A, ...progress.groupRounds.B].flatMap(r => r.matches),
            knockoutStarted: progress.knockoutStarted,
            mutation: startKnockout,
            label: challengerFormatOf(tournament) === "PLACEMENT"
                ? "Finish group stage & start placement matches"
                : "Finish group stage & start knockout",
        }
        : isMasters && mastersProgressData
        ? {
            matches: mastersProgressData.groupMatches,
            knockoutStarted: mastersProgressData.knockoutStarted,
            mutation: startMastersKnockout,
            label: `Finish group stage & start the ${mastersProgressData.stages[0].key === "FINAL" ? "Final" : STAGE_INFO[mastersProgressData.stages[0].key].title.toLowerCase()}`,
        }
        : null;
    const groupMatchesLeft = groupStage ? groupStage.matches.filter(m => !scoredIds.has(m.id)).length : 0;

    function handleComplete() {
        if (!allScored) { setConfirmComplete(true); return; }
        complete.mutate({ id: id! });
    }

    return (
        <>
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-6 pb-24 sm:py-8 space-y-5">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div>
                        <Link to="/admin" className="text-sm text-[#FF4200] hover:underline">← Admin</Link>
                        <div className="flex items-center gap-2 mt-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">{tournament.name}</h1>
                            <span className="text-sm text-gray-400">{divisionLabel(tournament.division)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                        {isCompleted && (
                            <Link to={`/tournament/${id}`} className="text-sm text-[#FF4200] hover:underline">
                                View results →
                            </Link>
                        )}
                        {canRecalculate && (
                            <button
                                onClick={() => { setRecalcSuccess(false); recalculate.mutate({ id: id! }); }}
                                disabled={recalculate.isPending || isSaving}
                                title={isSaving ? "Waiting for scores to save…" : undefined}
                                className="bg-amber-500 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                            >
                                {recalculate.isPending ? "Recalculating…" : isSaving ? "Saving scores…" : "Recalculate Results"}
                            </button>
                        )}
                    </div>
                </div>

                <TournamentSettingsEditor tournament={tournament} />
                <TournamentDetailsEditor tournament={tournament} section="payment" />
                <TournamentDetailsEditor tournament={tournament} section="general" />
                <div className="px-1"><ChatJumpLink tournamentId={tournament.id} /></div>

                <ParticipantsCard tournament={tournament} />

                <ScoreProgress
                    challenger={progress}
                    masters={mastersProgressData}
                    kotc={kotcProgressData}
                    scoredIds={scoredIds}
                    scoredCount={scoredCount}
                    totalMatches={totalMatches}
                    allScored={allScored}
                    isCompleted={isCompleted}
                />

                {/* Recalculate success banner */}
                {canRecalculate && recalcSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <p className="text-sm text-green-700 font-medium">Results recalculated successfully.</p>
                        <div className="flex items-center gap-3 shrink-0">
                            <Link to={`/tournament/${id}`} className="text-sm text-green-700 font-semibold hover:underline">
                                View results →
                            </Link>
                            <button onClick={() => setRecalcSuccess(false)} className="text-green-500 hover:text-green-700 text-lg leading-none">×</button>
                        </div>
                    </div>
                )}

                {canRecalculate && recalculate.error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                        {recalculate.error.message}
                    </p>
                )}

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-blue-700 leading-relaxed">
                        After entering a score a confirmation prompt appears. Once confirmed the field is locked. Tap a locked score once to see the hint, then tap again to unlock and edit.
                    </p>
                </div>

                {/* Matches */}
                {isChallenger ? (
                    <ChallengerScoreEntry
                        tournament={tournament}
                        onSaveStart={onSaveStart}
                        onSaveEnd={onSaveEnd}
                        onSaved={onSaved}
                    />
                ) : isMasters ? (
                    <MastersScoreEntry
                        tournament={tournament}
                        onSaveStart={onSaveStart}
                        onSaveEnd={onSaveEnd}
                        onSaved={onMastersSaved}
                    />
                ) : isKotc ? (
                    <KingOfTheCourtScoreEntry
                        tournament={tournament}
                        onSaveStart={onSaveStart}
                        onSaveEnd={onSaveEnd}
                        onSaved={onKotcSaved}
                    />
                ) : (
                    <AmericanoScoreEntry
                        tournament={tournament}
                        scoredIds={scoredIds}
                        onSaveStart={onSaveStart}
                        onSaveEnd={onSaveEnd}
                        onSaved={onSaved}
                    />
                )}

                {groupStage && !groupStage.knockoutStarted && !isCompleted && (
                    <div className="space-y-2">
                        <button
                            onClick={() => groupStage.mutation.mutate({ id: id! })}
                            disabled={groupMatchesLeft > 0 || groupStage.mutation.isPending || isSaving}
                            className="w-full bg-amber-500 text-white rounded-xl px-5 py-4 text-base font-bold shadow-sm hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none transition-colors"
                        >
                            {groupStage.mutation.isPending
                                ? "Starting…"
                                : isSaving
                                ? "Saving scores…"
                                : groupStage.label}
                        </button>
                        {groupMatchesLeft > 0 && (
                            <p className="text-xs text-gray-400 text-center">
                                {groupMatchesLeft} group match{groupMatchesLeft !== 1 ? "es" : ""} still need a score.
                            </p>
                        )}
                        {groupStage.mutation.error && (
                            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                                {groupStage.mutation.error.message}
                            </p>
                        )}
                    </div>
                )}

                {/* Complete tournament — shown after all rounds (or, for Challenger, only once
                    every bracket final/third-place match has a score, since the backend never
                    allows completing a Challenger tournament otherwise; or, for King of the Court,
                    which has no fixed round count, as soon as any round has been scored —
                    even if a further, unfinished round was already started) */}
                {!isCompleted && (isChallenger || isMasters ? allScored : isKotc ? Boolean(kotcProgressData?.lastScoredRound) : true) && (
                    <div className="space-y-3">
                        {confirmComplete && (
                            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <p className="text-sm text-amber-800 font-medium">
                                    {isKotc
                                        ? "Not all matches in the current round have a score yet. Complete anyway?"
                                        : `${totalMatches - scoredCount} match${totalMatches - scoredCount !== 1 ? "es" : ""} still have no score. Complete anyway? Those players will receive 0 points.`}
                                </p>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => setConfirmComplete(false)}
                                        className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-600 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { setConfirmComplete(false); complete.mutate({ id: id! }); }}
                                        className="px-3 py-1.5 rounded-lg text-sm bg-amber-500 text-white hover:bg-amber-600"
                                    >
                                        Complete anyway
                                    </button>
                                </div>
                            </div>
                        )}
                        {advanceKotcRound.error && (
                            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                                {advanceKotcRound.error.message}
                            </p>
                        )}
                        {complete.error && (
                            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                                {complete.error.message}
                            </p>
                        )}
                        {isKotc ? (
                            <div className="flex flex-col sm:flex-row gap-3">
                                {kotcProgressData?.currentRoundScored && (
                                    <button
                                        onClick={() => advanceKotcRound.mutate({ id: id! })}
                                        disabled={advanceKotcRound.isPending || complete.isPending}
                                        className="flex-1 bg-amber-500 text-white rounded-xl px-4 py-4 text-base font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                                    >
                                        {advanceKotcRound.isPending ? "Starting next round…" : "Next Round"}
                                    </button>
                                )}
                                <button
                                    onClick={handleComplete}
                                    disabled={complete.isPending || advanceKotcRound.isPending}
                                    className="flex-1 bg-[#FF4200] text-white rounded-xl px-4 py-4 text-base font-semibold hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                                >
                                    {complete.isPending ? "Completing…" : "Complete Tournament"}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleComplete}
                                disabled={complete.isPending}
                                className="w-full bg-[#FF4200] text-white rounded-xl px-4 py-4 text-base font-semibold hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                            >
                                {complete.isPending ? "Completing…" : "Complete Tournament"}
                            </button>
                        )}
                    </div>
                )}
                <TournamentChat tournamentId={tournament.id} tournamentName={tournament.name} />
            </main>
        </div>
        {sessionExpired && <SessionExpiredModal onLogin={handleLogin} />}
        </>
    );
}

function LoadingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>
        </div>
    );
}

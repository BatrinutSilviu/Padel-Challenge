import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { divisionLabel } from "../../lib/divisions";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

export function AdminScoreEntry() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [confirmComplete, setConfirmComplete] = useState(false);
    const [scoredIds, setScoredIds] = useState<Set<string>>(() => new Set());

    const { data: tournament, isPending, error } = trpc.tournament.getById.useQuery(
        { id: id! },
        {
            onSuccess(data) {
                setScoredIds(prev => {
                    if (prev.size > 0) return prev;
                    const ids = data.rounds
                        .flatMap(r => r.matches)
                        .filter(m => m.team1Score + m.team2Score === 32)
                        .map(m => m.id);
                    return new Set(ids);
                });
            },
        }
    );

    const complete = trpc.tournament.complete.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.getById, { id: id! }) });
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.list) });
            navigate(`/tournament/${id}`);
        },
    });

    const recalculate = trpc.tournament.recalculate.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.getById, { id: id! }) });
            navigate(`/tournament/${id}`);
        },
    });

    if (isPending) return <LoadingPage />;
    if (error || !tournament) return <div className="p-8 text-red-600">Tournament not found.</div>;

    const isCompleted = tournament.status === "COMPLETED";
    const totalMatches = tournament.rounds.flatMap(r => r.matches).length;
    const scoredCount = scoredIds.size;
    const allScored = scoredCount === totalMatches;

    function handleComplete() {
        if (!allScored) { setConfirmComplete(true); return; }
        complete.mutate({ id: id! });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-5">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                    <div>
                        <Link to="/admin" className="text-sm text-[#FF4200] hover:underline">← Admin</Link>
                        <div className="flex items-center gap-2 mt-1">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-800">{tournament.name}</h1>
                            <span className="text-sm text-gray-400">{divisionLabel(tournament.division)}</span>
                        </div>
                    </div>
                    {!isCompleted && (
                        <button
                            onClick={handleComplete}
                            disabled={complete.isPending}
                            className="bg-[#FF4200] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#CC3500] disabled:opacity-50 transition-colors self-start sm:self-auto"
                        >
                            {complete.isPending ? "Completing…" : "Complete Tournament"}
                        </button>
                    )}
                    {isCompleted && (
                        <div className="flex items-center gap-3 self-start sm:self-auto">
                            <Link to={`/tournament/${id}`} className="text-sm text-[#FF4200] hover:underline">
                                View results →
                            </Link>
                            <button
                                onClick={() => recalculate.mutate({ id: id! })}
                                disabled={recalculate.isPending}
                                className="bg-amber-500 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                            >
                                {recalculate.isPending ? "Recalculating…" : "Recalculate Results"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">Scores entered</span>
                        <span className={`font-semibold ${allScored ? "text-[#FF4200]" : "text-gray-700"}`}>
                            {scoredCount} / {totalMatches}
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all ${allScored ? "bg-[#FF4200]" : "bg-[#FF6D00]"}`}
                            style={{ width: `${(scoredCount / totalMatches) * 100}%` }}
                        />
                    </div>
                    {!isCompleted && allScored && (
                        <p className="text-xs text-[#FF4200]">All scores saved — ready to complete.</p>
                    )}
                    {isCompleted && (
                        <p className="text-xs text-amber-600">Tournament completed. Edit scores above then click Recalculate Results.</p>
                    )}
                </div>

                {/* Confirm dialog */}
                {confirmComplete && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-sm text-amber-800 font-medium">
                            {totalMatches - scoredCount} match{totalMatches - scoredCount !== 1 ? "es" : ""} still have no score.
                            Complete anyway? Those players will receive 0 points.
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

                {complete.error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                        {complete.error.message}
                    </p>
                )}
                {recalculate.error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                        {recalculate.error.message}
                    </p>
                )}

                {/* Rounds */}
                <div className="space-y-4">
                    {tournament.rounds.map(round => (
                        <div key={round.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                <span className="font-semibold text-gray-700">Round {round.roundNumber}</span>
                                <span className="text-xs text-gray-400">
                                    {round.matches.filter(m => scoredIds.has(m.id)).length}/{round.matches.length} scored
                                </span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {round.matches.map((match, i) => (
                                    <MatchScoreRow
                                        key={match.id}
                                        match={match}
                                        courtNumber={i + 1}
                                        onSaved={(matchId) => setScoredIds(prev => new Set([...prev, matchId]))}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

type MatchData = {
    id: string;
    team1Score: number;
    team2Score: number;
    team1Player1: { id: string; name: string };
    team1Player2: { id: string; name: string };
    team2Player1: { id: string; name: string };
    team2Player2: { id: string; name: string };
};

function MatchScoreRow({
    match,
    courtNumber,
    onSaved,
}: {
    match: MatchData;
    courtNumber: number;
    onSaved: (matchId: string) => void;
}) {
    const [score1, setScore1] = useState(String(match.team1Score || ""));
    const [score2, setScore2] = useState(String(match.team2Score || ""));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(match.team1Score + match.team2Score === 32);
    const [error, setError] = useState("");

    const update = trpc.tournament.updateMatchScore.useMutation({
        onSuccess: () => {
            setSaving(false);
            setSaved(true);
            onSaved(match.id);
            setError("");
        },
        onError: (e) => { setSaving(false); setError(e.message); },
    });

    function autoSave(s1: number, s2: number) {
        if (s1 + s2 !== 32 || s1 < 0 || s2 < 0) return;
        setSaving(true);
        setSaved(false);
        update.mutate({ matchId: match.id, team1Score: s1, team2Score: s2 });
    }

    function handleScore1Change(val: string) {
        const n = parseInt(val);
        setScore1(val);
        if (!isNaN(n) && n >= 0 && n <= 32) {
            const s2 = 32 - n;
            setScore2(String(s2));
            autoSave(n, s2);
        }
    }

    function handleScore2Change(val: string) {
        const n = parseInt(val);
        setScore2(val);
        if (!isNaN(n) && n >= 0 && n <= 32) {
            const s1 = 32 - n;
            setScore1(String(s1));
            autoSave(s1, n);
        }
    }

    const s1 = parseInt(score1) || 0;
    const s2 = parseInt(score2) || 0;
    const isValid = s1 + s2 === 32 && (s1 > 0 || s2 > 0);

    return (
        <div className="px-4 sm:px-5 py-4">
            <p className="text-xs text-gray-400 mb-3">Court {courtNumber}</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                {/* Team 1 */}
                <div className="sm:flex-1 text-center sm:text-right">
                    <p className="font-medium text-gray-800 text-sm">
                        {match.team1Player1.name} & {match.team1Player2.name}
                    </p>
                </div>

                {/* Scores */}
                <div className="flex items-center justify-center gap-2 shrink-0">
                    <input
                        type="number"
                        min={0}
                        max={32}
                        value={score1}
                        onChange={e => handleScore1Change(e.target.value)}
                        className={`w-14 text-center border rounded-lg px-2 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200] ${
                            isValid && s1 > s2 ? "border-[#FF4200] text-[#FF4200]" : "border-gray-300 text-gray-700"
                        }`}
                    />
                    <span className="text-gray-300 font-bold text-lg">:</span>
                    <input
                        type="number"
                        min={0}
                        max={32}
                        value={score2}
                        onChange={e => handleScore2Change(e.target.value)}
                        className={`w-14 text-center border rounded-lg px-2 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200] ${
                            isValid && s2 > s1 ? "border-[#FF4200] text-[#FF4200]" : "border-gray-300 text-gray-700"
                        }`}
                    />
                    <div className="w-8 text-center">
                        {saving && <span className="text-xs text-gray-400">…</span>}
                        {!saving && saved && isValid && <span className="text-sm text-[#FF4200]">✓</span>}
                    </div>
                </div>

                {/* Team 2 */}
                <div className="sm:flex-1 text-center sm:text-left">
                    <p className="font-medium text-gray-800 text-sm">
                        {match.team2Player1.name} & {match.team2Player2.name}
                    </p>
                </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
        </div>
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

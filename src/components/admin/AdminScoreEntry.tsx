import { useState, useCallback, useEffect, useRef } from "react";
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
    const [pendingSaves, setPendingSaves] = useState(0);
    const [recalcSuccess, setRecalcSuccess] = useState(false);

    const { data: tournament, isPending, error } = trpc.tournament.getById.useQuery({ id: id! });

    useEffect(() => {
        if (!tournament) return;
        setScoredIds(prev => {
            if (prev.size > 0) return prev;
            const ids = tournament.rounds
                .flatMap(r => r.matches)
                .filter(m => m.team1Score + m.team2Score === 32)
                .map(m => m.id);
            return new Set(ids);
        });
    }, [tournament]);

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
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.list) });
            setRecalcSuccess(true);
        },
    });

    const handleSaveStart = useCallback(() => setPendingSaves(n => n + 1), []);
    const handleSaveEnd = useCallback(() => setPendingSaves(n => n - 1), []);
    const handleSaved = useCallback((matchId: string) => {
        setScoredIds(prev => new Set([...prev, matchId]));
    }, []);

    if (isPending) return <LoadingPage />;
    if (error || !tournament) return <div className="p-8 text-red-600">Tournament not found.</div>;

    const isCompleted = tournament.status === "COMPLETED";
    const totalMatches = tournament.rounds.flatMap(r => r.matches).length;
    const scoredCount = scoredIds.size;
    const allScored = scoredCount === totalMatches;
    const isSaving = pendingSaves > 0;

    function handleComplete() {
        if (!allScored) { setConfirmComplete(true); return; }
        complete.mutate({ id: id! });
    }

    return (
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
                        {!isCompleted && (
                            <button
                                onClick={handleComplete}
                                disabled={complete.isPending}
                                className="bg-[#FF4200] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                            >
                                {complete.isPending ? "Completing…" : "Complete Tournament"}
                            </button>
                        )}
                        {isCompleted && (
                            <Link to={`/tournament/${id}`} className="text-sm text-[#FF4200] hover:underline">
                                View results →
                            </Link>
                        )}
                        <button
                            onClick={() => { setRecalcSuccess(false); recalculate.mutate({ id: id! }); }}
                            disabled={recalculate.isPending || isSaving}
                            title={isSaving ? "Waiting for scores to save…" : undefined}
                            className="bg-amber-500 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                        >
                            {recalculate.isPending ? "Recalculating…" : isSaving ? "Saving scores…" : "Recalculate Results"}
                        </button>
                    </div>
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
                            style={{ width: `${totalMatches > 0 ? (scoredCount / totalMatches) * 100 : 0}%` }}
                        />
                    </div>
                    {!isCompleted && allScored && (
                        <p className="text-xs text-[#FF4200]">All scores saved — ready to complete.</p>
                    )}
                </div>

                {/* Recalculate success banner */}
                {recalcSuccess && (
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

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-blue-700 leading-relaxed">
                        After entering a score a confirmation prompt appears. Once confirmed the field is locked. Tap a locked score once to see the hint, then tap again to unlock and edit.
                    </p>
                </div>

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
                                        onSaveStart={handleSaveStart}
                                        onSaveEnd={handleSaveEnd}
                                        onSaved={handleSaved}
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

function readLocalScore(matchId: string): { s1: number; s2: number } | null {
    try {
        const raw = localStorage.getItem(`padel-score-${matchId}`);
        if (!raw) return null;
        const { s1, s2 } = JSON.parse(raw);
        if (typeof s1 === "number" && typeof s2 === "number" && s1 + s2 === 32 && s1 >= 0 && s2 >= 0) {
            return { s1, s2 };
        }
    } catch {}
    return null;
}

function writeLocalScore(matchId: string, s1: number, s2: number) {
    try { localStorage.setItem(`padel-score-${matchId}`, JSON.stringify({ s1, s2 })); } catch {}
}

function clearLocalScore(matchId: string) {
    try { localStorage.removeItem(`padel-score-${matchId}`); } catch {}
}

type ScoreStatus = 'editing' | 'confirming' | 'saving' | 'locked' | 'unlock-pending';

function MatchScoreRow({
    match,
    courtNumber,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    match: MatchData;
    courtNumber: number;
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: (matchId: string) => void;
}) {
    const isScored = match.team1Score + match.team2Score === 32;

    const [score1, setScore1] = useState(() => {
        if (isScored) return String(match.team1Score);
        const pending = readLocalScore(match.id);
        return pending ? String(pending.s1) : "";
    });
    const [score2, setScore2] = useState(() => {
        if (isScored) return String(match.team2Score);
        const pending = readLocalScore(match.id);
        return pending ? String(pending.s2) : "";
    });
    const [status, setStatus] = useState<ScoreStatus>(() => {
        if (isScored) return 'locked';
        return readLocalScore(match.id) ? 'confirming' : 'editing';
    });
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
    const [error, setError] = useState("");
    const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sheetInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isScored) clearLocalScore(match.id);
        return () => { if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (mobileSheetOpen) {
            const t = setTimeout(() => sheetInputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [mobileSheetOpen]);

    const update = trpc.tournament.updateMatchScore.useMutation({
        onSuccess: () => {
            setStatus('locked');
            setMobileSheetOpen(false);
            clearLocalScore(match.id);
            onSaved(match.id);
            onSaveEnd();
            setError("");
        },
        onError: (e) => {
            setStatus('confirming');
            onSaveEnd();
            setError(e.message);
        },
    });

    function handleScoreChange(field: 1 | 2, val: string) {
        if (status !== 'editing' && status !== 'confirming') return;
        const n = parseInt(val);
        if (field === 1) setScore1(val); else setScore2(val);
        if (!isNaN(n) && n >= 0 && n <= 32) {
            const other = 32 - n;
            if (field === 1) setScore2(String(other)); else setScore1(String(other));
            writeLocalScore(match.id, field === 1 ? n : other, field === 1 ? other : n);
            setStatus('confirming');
        } else {
            if (field === 1) setScore2(""); else setScore1("");
            clearLocalScore(match.id);
            setStatus('editing');
        }
    }

    function handleConfirm() {
        const s1 = parseInt(score1);
        const s2 = parseInt(score2);
        if (isNaN(s1) || isNaN(s2) || s1 + s2 !== 32) return;
        setStatus('saving');
        onSaveStart();
        update.mutate({ matchId: match.id, team1Score: s1, team2Score: s2 });
    }

    function handleCancel() {
        clearLocalScore(match.id);
        setScore1("");
        setScore2("");
        setStatus('editing');
        setMobileSheetOpen(false);
        setError("");
    }

    function handleLockedClick() {
        if (status === 'locked') {
            if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
            setStatus('unlock-pending');
            unlockTimerRef.current = setTimeout(() => setStatus('locked'), 3000);
        } else if (status === 'unlock-pending') {
            if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
            clearLocalScore(match.id);
            setScore1("");
            setScore2("");
            setStatus('editing');
            setMobileSheetOpen(true);
        }
    }

    function handleMobileTap() {
        if (status === 'editing' || status === 'confirming') {
            setMobileSheetOpen(true);
        } else if (status === 'locked' || status === 'unlock-pending') {
            handleLockedClick();
        }
    }

    const isLocked = status === 'locked' || status === 'unlock-pending';
    const s1 = parseInt(score1) || 0;
    const s2 = parseInt(score2) || 0;
    const isValid = s1 + s2 === 32;

    function inputClass(team: 1 | 2) {
        const wins = team === 1 ? s1 > s2 : s2 > s1;
        if (status === 'saving') return "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed";
        if (status === 'unlock-pending') return "border-amber-400 bg-amber-50 text-gray-700 cursor-pointer";
        if (status === 'locked') return "border-gray-200 bg-gray-50 text-gray-500 cursor-pointer";
        if (status === 'confirming') return "border-blue-400 text-gray-800 bg-white";
        return isValid && wins ? "border-[#FF4200] text-[#FF4200]" : "border-gray-300 text-gray-700";
    }

    function mobileTileClass() {
        if (status === 'saving') return "border-gray-200 bg-gray-50 text-gray-400";
        if (status === 'unlock-pending') return "border-amber-400 bg-amber-50 text-gray-700";
        if (status === 'locked') return "border-gray-200 bg-gray-50 text-gray-500";
        if (status === 'confirming') return "border-blue-300 bg-blue-50 text-gray-800";
        return "border-gray-200 bg-gray-50 text-gray-400";
    }

    function sheetInputClass(team: 1 | 2) {
        const wins = team === 1 ? s1 > s2 : s2 > s1;
        if (status === 'saving') return "border-gray-200 bg-gray-50 text-gray-400";
        if (status === 'confirming' && isValid && wins) return "border-[#FF4200] text-[#FF4200]";
        return "border-gray-200 text-gray-800";
    }

    const LockIcon = () => (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
    );
    const UnlockIcon = () => (
        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
        </svg>
    );

    return (
        <>
            <div className="px-4 sm:px-5 py-4">
                <p className="text-xs text-gray-400 mb-3">Court {courtNumber}</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    {/* Team 1 */}
                    <div className="sm:flex-1 text-center sm:text-right">
                        <p className="font-medium text-gray-800 text-sm">
                            {match.team1Player1.name} & {match.team1Player2.name}
                        </p>
                    </div>

                    {/* Mobile: tappable score tiles */}
                    <div className="sm:hidden flex items-center justify-center gap-2 shrink-0" onClick={handleMobileTap}>
                        <div className={`w-14 text-center border rounded-lg px-2 py-3 text-base font-semibold select-none transition-colors ${mobileTileClass()}`}>
                            {score1 || '—'}
                        </div>
                        <span className="text-gray-300 font-bold text-lg">:</span>
                        <div className={`w-14 text-center border rounded-lg px-2 py-3 text-base font-semibold select-none transition-colors ${mobileTileClass()}`}>
                            {score2 || '—'}
                        </div>
                        <div className="w-8 flex items-center justify-center shrink-0">
                            {status === 'saving' && <span className="text-xs text-gray-400">…</span>}
                            {status === 'locked' && <LockIcon />}
                            {status === 'unlock-pending' && <UnlockIcon />}
                            {(status === 'editing' || status === 'confirming') && (
                                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Desktop: inline inputs */}
                    <div className="hidden sm:flex items-center justify-center gap-2 shrink-0">
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={score1}
                            onChange={e => handleScoreChange(1, e.target.value)}
                            onClick={isLocked ? handleLockedClick : undefined}
                            readOnly={isLocked}
                            disabled={status === 'saving'}
                            className={`w-14 text-center border rounded-lg px-2 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200] transition-colors ${inputClass(1)}`}
                        />
                        <span className="text-gray-300 font-bold text-lg">:</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={score2}
                            onChange={e => handleScoreChange(2, e.target.value)}
                            onClick={isLocked ? handleLockedClick : undefined}
                            readOnly={isLocked}
                            disabled={status === 'saving'}
                            className={`w-14 text-center border rounded-lg px-2 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200] transition-colors ${inputClass(2)}`}
                        />
                        <div className="w-8 flex items-center justify-center shrink-0">
                            {status === 'saving' && <span className="text-xs text-gray-400">…</span>}
                            {status === 'locked' && <LockIcon />}
                            {status === 'unlock-pending' && <UnlockIcon />}
                        </div>
                    </div>

                    {/* Team 2 */}
                    <div className="sm:flex-1 text-center sm:text-left">
                        <p className="font-medium text-gray-800 text-sm">
                            {match.team2Player1.name} & {match.team2Player2.name}
                        </p>
                    </div>
                </div>

                {/* Mobile unlock hint */}
                {status === 'unlock-pending' && (
                    <p className="sm:hidden text-center text-sm text-amber-600 font-medium mt-2">Tap again to unlock and edit</p>
                )}

                {/* Desktop confirm row */}
                {status === 'confirming' && (
                    <div className="hidden sm:block mt-3 pt-3 border-t border-blue-100">
                        <p className="text-center text-sm text-gray-500 mb-2.5">
                            Confirm <span className="font-bold text-gray-800">{score1} – {score2}</span>?
                        </p>
                        <div className="flex gap-2 max-w-xs mx-auto">
                            <button onClick={handleCancel} className="flex-1 py-3 rounded-xl text-sm border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors">Cancel</button>
                            <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl text-sm bg-[#FF4200] text-white font-semibold hover:bg-[#CC3500] active:bg-[#AA2C00] transition-colors">Confirm</button>
                        </div>
                    </div>
                )}

                {/* Desktop unlock hint */}
                {status === 'unlock-pending' && (
                    <p className="hidden sm:block text-center text-sm text-amber-600 font-medium mt-2">Click again to unlock and edit</p>
                )}

                {/* Desktop error */}
                {error && (
                    <div className="hidden sm:flex items-center justify-center gap-2 mt-2">
                        <p className="text-xs text-red-500">{error}</p>
                        <button onClick={() => { setError(""); handleConfirm(); }} className="text-xs font-semibold text-[#FF4200] hover:underline shrink-0">Retry</button>
                    </div>
                )}
            </div>

            {/* Mobile bottom sheet */}
            {mobileSheetOpen && (
                <div className="sm:hidden fixed inset-0 z-[60] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/50" onClick={() => { if (status !== 'saving') setMobileSheetOpen(false); }} />
                    <div className="relative bg-white rounded-t-2xl px-5 pt-4 pb-10">
                        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Court {courtNumber}</span>
                            <button
                                onClick={() => { if (status !== 'saving') setMobileSheetOpen(false); }}
                                className="text-gray-400 p-1 -mr-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Teams */}
                        <div className="flex items-start justify-between gap-3 mb-6">
                            <div className="flex-1 text-center space-y-0.5">
                                <p className="font-semibold text-gray-800 text-sm">{match.team1Player1.name}</p>
                                <p className="font-semibold text-gray-800 text-sm">{match.team1Player2.name}</p>
                            </div>
                            <span className="text-gray-300 text-xs font-bold mt-1 shrink-0">vs</span>
                            <div className="flex-1 text-center space-y-0.5">
                                <p className="font-semibold text-gray-800 text-sm">{match.team2Player1.name}</p>
                                <p className="font-semibold text-gray-800 text-sm">{match.team2Player2.name}</p>
                            </div>
                        </div>

                        {/* Large score inputs */}
                        <div className="flex items-center justify-center gap-5 mb-6">
                            <input
                                ref={sheetInputRef}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={score1}
                                onChange={e => handleScoreChange(1, e.target.value)}
                                disabled={status === 'saving'}
                                className={`w-24 text-center border-2 rounded-2xl px-3 py-4 text-4xl font-bold focus:outline-none transition-colors ${sheetInputClass(1)}`}
                            />
                            <span className="text-gray-200 font-bold text-4xl">:</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={score2}
                                onChange={e => handleScoreChange(2, e.target.value)}
                                disabled={status === 'saving'}
                                className={`w-24 text-center border-2 rounded-2xl px-3 py-4 text-4xl font-bold focus:outline-none transition-colors ${sheetInputClass(2)}`}
                            />
                        </div>

                        {/* Action buttons */}
                        {status === 'saving' ? (
                            <p className="text-center text-sm text-gray-400 py-3.5">Saving…</p>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-3.5 rounded-xl text-sm border border-gray-300 text-gray-600 font-medium active:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!isValid || status !== 'confirming'}
                                    className="flex-1 py-3.5 rounded-xl text-sm bg-[#FF4200] text-white font-semibold active:bg-[#AA2C00] transition-colors disabled:opacity-40"
                                >
                                    Confirm
                                </button>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="flex items-center justify-center gap-2 mt-3">
                                <p className="text-sm text-red-500">{error}</p>
                                <button onClick={() => { setError(""); handleConfirm(); }} className="text-sm font-semibold text-[#FF4200] shrink-0">Retry</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
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

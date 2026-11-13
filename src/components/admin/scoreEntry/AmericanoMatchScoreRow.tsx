import { useEffect, useRef, useState } from "react";
import { trpc } from "../../../trpc";

type MatchData = {
    id: string;
    team1Score: number;
    team2Score: number;
    team1Player1: { id: string; name: string };
    team1Player2: { id: string; name: string };
    team2Player1: { id: string; name: string };
    team2Player2: { id: string; name: string };
};

// The draft score kept for a match until it's confirmed (see AmericanoMatchScoreRow).
function readLocalScore(matchId: string, ppg: number): { s1: number; s2: number } | null {
    try {
        const raw = localStorage.getItem(`padel-score-${matchId}`);
        if (!raw) return null;
        const { s1, s2 } = JSON.parse(raw);
        if (typeof s1 === "number" && typeof s2 === "number" && s1 + s2 === ppg && s1 >= 0 && s2 >= 0) {
            return { s1, s2 };
        }
    } catch { /* storage unavailable or a corrupt entry: no draft */ }
    return null;
}

function writeLocalScore(matchId: string, s1: number, s2: number) {
    try { localStorage.setItem(`padel-score-${matchId}`, JSON.stringify({ s1, s2 })); } catch { /* storage unavailable: the draft just isn't kept */ }
}

function clearLocalScore(matchId: string) {
    try { localStorage.removeItem(`padel-score-${matchId}`); } catch { /* storage unavailable */ }
}

// A score goes: editing → confirming (both scores typed, waiting for Confirm) → saving →
// locked. A locked score is unlocked with two taps: the first (unlock-pending) shows a hint.
type ScoreStatus = 'editing' | 'confirming' | 'saving' | 'locked' | 'unlock-pending';

// One Americano match: the two scores add up to the points per game, so typing one fills
// in the other. On a phone the scores open in a bottom sheet. A score that's typed but not
// yet confirmed is kept in localStorage, so it survives a reload.
export function AmericanoMatchScoreRow({
    match,
    courtNumber,
    pointsPerGame,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    match: MatchData;
    courtNumber: number;
    pointsPerGame: number;
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: (matchId: string, team1Score: number, team2Score: number) => void;
}) {
    const isScored = match.team1Score + match.team2Score === pointsPerGame;

    const [score1, setScore1] = useState(() => {
        if (isScored) return String(match.team1Score);
        const pending = readLocalScore(match.id, pointsPerGame);
        return pending ? String(pending.s1) : "";
    });
    const [score2, setScore2] = useState(() => {
        if (isScored) return String(match.team2Score);
        const pending = readLocalScore(match.id, pointsPerGame);
        return pending ? String(pending.s2) : "";
    });
    const [status, setStatus] = useState<ScoreStatus>(() => {
        if (isScored) return 'locked';
        return readLocalScore(match.id, pointsPerGame) ? 'confirming' : 'editing';
    });
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
    const [viewportRect, setViewportRect] = useState<{ top: number; height: number } | null>(null);
    const [error, setError] = useState("");
    const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sheetInputRef = useRef<HTMLInputElement>(null);

    // Re-sync whenever the server's committed score for this match changes —
    // not just on mount. Without this, a row that mounts on a briefly-stale
    // query cache (e.g. after navigating away and back) freezes at its
    // initial blank state forever, even once the background refetch brings
    // in the real, already-saved score.
    useEffect(() => {
        if (isScored) {
            clearLocalScore(match.id);
            setScore1(String(match.team1Score));
            setScore2(String(match.team2Score));
            setStatus('locked');
        }
    }, [isScored, match.team1Score, match.team2Score, match.id]);

    useEffect(() => {
        return () => { if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current); };
    }, []);

    useEffect(() => {
        if (mobileSheetOpen) {
            const t = setTimeout(() => sheetInputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
    }, [mobileSheetOpen]);

    // iOS Safari keeps `position: fixed` anchored to the layout viewport, not
    // the visual one — when the keyboard opens, the visual viewport both
    // shrinks AND scrolls (offsetTop > 0), so tracking height alone (as we
    // used to) still leaves the sheet positioned against the pre-keyboard
    // layout and it drifts off-screen. Track both and size/position the
    // overlay to the visual viewport directly instead of guessing an offset.
    useEffect(() => {
        if (!mobileSheetOpen) { setViewportRect(null); return; }
        function update() {
            const vv = window.visualViewport;
            if (vv) setViewportRect({ top: vv.offsetTop, height: vv.height });
        }
        update();
        window.visualViewport?.addEventListener('resize', update);
        window.visualViewport?.addEventListener('scroll', update);
        return () => {
            window.visualViewport?.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('scroll', update);
        };
    }, [mobileSheetOpen]);

    const keyboardOpen = !!viewportRect && viewportRect.height < window.innerHeight - 50;

    const update = trpc.tournament.updateMatchScore.useMutation({
        onSuccess: (data) => {
            setStatus('locked');
            setMobileSheetOpen(false);
            clearLocalScore(match.id);
            onSaved(match.id, data.team1Score, data.team2Score);
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
        if (!isNaN(n) && n >= 0 && n <= pointsPerGame) {
            const other = pointsPerGame - n;
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
        if (isNaN(s1) || isNaN(s2) || s1 + s2 !== pointsPerGame) return;
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
    const isValid = s1 + s2 === pointsPerGame;

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
                <div
                    className="sm:hidden fixed inset-x-0 z-[60]"
                    style={{ top: viewportRect?.top ?? 0, height: viewportRect?.height ?? '100dvh' }}
                >
                    <div className="absolute inset-0 bg-black/50" onClick={() => { if (status !== 'saving') setMobileSheetOpen(false); }} />
                    <div className="absolute left-0 right-0 bottom-0 max-h-full bg-white rounded-t-2xl flex flex-col">
                        {/* Scrollable content — shrinks when keyboard appears */}
                        <div className="overflow-y-auto flex-1 px-5 pt-4 pb-3">
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
                            <div className="flex items-center justify-center gap-5">
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
                        </div>

                        {/* Sticky footer — always visible above keyboard */}
                        <div className="shrink-0 px-5 pt-3 border-t border-gray-100" style={{ paddingBottom: keyboardOpen ? 16 : 40 }}>
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
                            {error && (
                                <div className="flex items-center justify-center gap-2 mt-3">
                                    <p className="text-sm text-red-500">{error}</p>
                                    <button onClick={() => { setError(""); handleConfirm(); }} className="text-sm font-semibold text-[#FF4200] shrink-0">Retry</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function LockIcon() {
    return (
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
    );
}

function UnlockIcon() {
    return (
        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
        </svg>
    );
}

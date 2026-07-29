import { useState, useEffect, useRef } from "react";
import { trpc } from "../../trpc";
import { isChallengerMatchScored, isValidChallengerSetScore, type ChallengerMatch } from "../../lib/challenger";

type ScoreStatus = "editing" | "confirming" | "saving" | "locked" | "unlock-pending";

function readLocalChallengerScore(matchId: string): { g1: string; g2: string; tb1: string; tb2: string } | null {
    try {
        const raw = localStorage.getItem(`padel-challenger-score-${matchId}`);
        if (!raw) return null;
        const { g1, g2, tb1, tb2 } = JSON.parse(raw);
        if (typeof g1 === "string" && typeof g2 === "string") {
            return { g1, g2, tb1: typeof tb1 === "string" ? tb1 : "", tb2: typeof tb2 === "string" ? tb2 : "" };
        }
    } catch { /* ignore malformed drafts */ }
    return null;
}

function writeLocalChallengerScore(matchId: string, g1: string, g2: string, tb1: string, tb2: string) {
    try { localStorage.setItem(`padel-challenger-score-${matchId}`, JSON.stringify({ g1, g2, tb1, tb2 })); } catch { /* storage unavailable */ }
}

function clearLocalChallengerScore(matchId: string) {
    try { localStorage.removeItem(`padel-challenger-score-${matchId}`); } catch { /* storage unavailable */ }
}

function computeInitial(match: ChallengerMatch): { g1: string; g2: string; tb1: string; tb2: string; status: ScoreStatus } {
    if (isChallengerMatchScored(match)) {
        return {
            g1: String(match.team1Score),
            g2: String(match.team2Score),
            tb1: match.team1TiebreakPoints != null ? String(match.team1TiebreakPoints) : "",
            tb2: match.team2TiebreakPoints != null ? String(match.team2TiebreakPoints) : "",
            status: "locked",
        };
    }
    const pending = readLocalChallengerScore(match.id);
    return pending ? { ...pending, status: "confirming" } : { g1: "", g2: "", tb1: "", tb2: "", status: "editing" };
}

export function ChallengerMatchScoreRow({
    match,
    label,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    match: ChallengerMatch;
    label: string;
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: (
        matchId: string,
        team1Score: number,
        team2Score: number,
        team1TiebreakPoints: number | null,
        team2TiebreakPoints: number | null,
    ) => void;
}) {
    const isScored = isChallengerMatchScored(match);

    const [g1, setG1] = useState(() => computeInitial(match).g1);
    const [g2, setG2] = useState(() => computeInitial(match).g2);
    const [tb1, setTb1] = useState(() => computeInitial(match).tb1);
    const [tb2, setTb2] = useState(() => computeInitial(match).tb2);
    const [status, setStatus] = useState<ScoreStatus>(() => computeInitial(match).status);
    const [error, setError] = useState("");
    const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Re-sync whenever the server's committed score for this match changes — not just on
    // mount — mirroring the fix for rows freezing blank after navigating between tournaments.
    useEffect(() => {
        if (isScored) {
            clearLocalChallengerScore(match.id);
            setG1(String(match.team1Score));
            setG2(String(match.team2Score));
            setTb1(match.team1TiebreakPoints != null ? String(match.team1TiebreakPoints) : "");
            setTb2(match.team2TiebreakPoints != null ? String(match.team2TiebreakPoints) : "");
            setStatus("locked");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScored, match.team1Score, match.team2Score, match.team1TiebreakPoints, match.team2TiebreakPoints, match.id]);

    useEffect(() => {
        return () => { if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current); };
    }, []);

    const update = trpc.tournament.updateChallengerMatchScore.useMutation({
        onSuccess: (data) => {
            setStatus("locked");
            clearLocalChallengerScore(match.id);
            onSaved(match.id, data.team1Score, data.team2Score, data.team1TiebreakPoints, data.team2TiebreakPoints);
            onSaveEnd();
            setError("");
        },
        onError: (e) => {
            setStatus("confirming");
            onSaveEnd();
            setError(e.message);
        },
    });

    const n1 = parseInt(g1);
    const n2 = parseInt(g2);
    const needsTiebreak = !isNaN(n1) && !isNaN(n2) && ((n1 === 7 && n2 === 6) || (n1 === 6 && n2 === 7));
    const tbN1 = parseInt(tb1);
    const tbN2 = parseInt(tb2);

    const isValid =
        !isNaN(n1) && !isNaN(n2) &&
        isValidChallengerSetScore(
            n1,
            n2,
            needsTiebreak && !isNaN(tbN1) ? tbN1 : undefined,
            needsTiebreak && !isNaN(tbN2) ? tbN2 : undefined,
        );

    function persistDraft(newG1: string, newG2: string, newTb1: string, newTb2: string) {
        if (newG1 === "" && newG2 === "" && newTb1 === "" && newTb2 === "") {
            clearLocalChallengerScore(match.id);
            setStatus("editing");
            return;
        }
        writeLocalChallengerScore(match.id, newG1, newG2, newTb1, newTb2);
        setStatus("confirming");
    }

    function handleGamesChange(field: 1 | 2, val: string) {
        if (status !== "editing" && status !== "confirming") return;
        if (field === 1) setG1(val); else setG2(val);
        persistDraft(field === 1 ? val : g1, field === 2 ? val : g2, tb1, tb2);
    }

    function handleTiebreakChange(field: 1 | 2, val: string) {
        if (status !== "editing" && status !== "confirming") return;
        if (field === 1) setTb1(val); else setTb2(val);
        persistDraft(g1, g2, field === 1 ? val : tb1, field === 2 ? val : tb2);
    }

    function handleConfirm() {
        if (!isValid) return;
        setStatus("saving");
        onSaveStart();
        update.mutate({
            matchId: match.id,
            team1Games: n1,
            team2Games: n2,
            team1TiebreakPoints: needsTiebreak ? tbN1 : undefined,
            team2TiebreakPoints: needsTiebreak ? tbN2 : undefined,
        });
    }

    function handleCancel() {
        clearLocalChallengerScore(match.id);
        setG1(""); setG2(""); setTb1(""); setTb2("");
        setStatus("editing");
        setError("");
    }

    function handleLockedClick() {
        if (status === "locked") {
            if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
            setStatus("unlock-pending");
            unlockTimerRef.current = setTimeout(() => setStatus("locked"), 3000);
        } else if (status === "unlock-pending") {
            if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
            clearLocalChallengerScore(match.id);
            setG1(""); setG2(""); setTb1(""); setTb2("");
            setStatus("editing");
        }
    }

    const isLocked = status === "locked" || status === "unlock-pending";

    function inputClass(team: 1 | 2) {
        const wins = team === 1 ? n1 > n2 : n2 > n1;
        if (status === "saving") return "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed";
        if (status === "unlock-pending") return "border-amber-400 bg-amber-50 text-gray-700 cursor-pointer";
        if (status === "locked") return "border-gray-200 bg-gray-50 text-gray-500 cursor-pointer";
        if (status === "confirming") return "border-blue-400 text-gray-800 bg-white";
        return isValid && wins ? "border-[#FF4200] text-[#FF4200]" : "border-gray-300 text-gray-700";
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
        <div className="px-4 sm:px-5 py-4">
            <p className={label === "Final" ? "text-xs font-bold uppercase tracking-wide text-[#FF4200] mb-3" : "text-xs text-gray-400 mb-3"}>{label}</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="sm:flex-1 text-center sm:text-right">
                    <p className="font-medium text-gray-800 text-sm">{match.team1Player1.name} &amp; {match.team1Player2.name}</p>
                </div>

                <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="flex items-center justify-center gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={g1}
                            onChange={e => handleGamesChange(1, e.target.value)}
                            onClick={isLocked ? handleLockedClick : undefined}
                            readOnly={isLocked}
                            disabled={status === "saving"}
                            className={`w-14 text-center border rounded-lg px-2 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200] transition-colors ${inputClass(1)}`}
                        />
                        <span className="text-gray-300 font-bold text-lg">:</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={g2}
                            onChange={e => handleGamesChange(2, e.target.value)}
                            onClick={isLocked ? handleLockedClick : undefined}
                            readOnly={isLocked}
                            disabled={status === "saving"}
                            className={`w-14 text-center border rounded-lg px-2 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200] transition-colors ${inputClass(2)}`}
                        />
                        <div className="w-8 flex items-center justify-center shrink-0">
                            {status === "saving" && <span className="text-xs text-gray-400">…</span>}
                            {status === "locked" && <LockIcon />}
                            {status === "unlock-pending" && <UnlockIcon />}
                        </div>
                    </div>

                    {needsTiebreak && (
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-xs text-gray-400 font-medium">TB</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={tb1}
                                onChange={e => handleTiebreakChange(1, e.target.value)}
                                readOnly={isLocked}
                                disabled={status === "saving"}
                                placeholder="0"
                                className="w-12 text-center border rounded-lg px-1.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200] border-gray-300 text-gray-700 bg-white"
                            />
                            <span className="text-gray-300 font-bold text-sm">:</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={tb2}
                                onChange={e => handleTiebreakChange(2, e.target.value)}
                                readOnly={isLocked}
                                disabled={status === "saving"}
                                placeholder="0"
                                className="w-12 text-center border rounded-lg px-1.5 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200] border-gray-300 text-gray-700 bg-white"
                            />
                        </div>
                    )}
                </div>

                <div className="sm:flex-1 text-center sm:text-left">
                    <p className="font-medium text-gray-800 text-sm">{match.team2Player1.name} &amp; {match.team2Player2.name}</p>
                </div>
            </div>

            {status === "unlock-pending" && (
                <p className="text-center text-sm text-amber-600 font-medium mt-2">Tap again to unlock and edit</p>
            )}

            {status === "confirming" && (
                <div className="mt-3 pt-3 border-t border-blue-100">
                    <p className="text-center text-sm text-gray-500 mb-2.5">
                        Confirm <span className="font-bold text-gray-800">
                            {g1 || "?"} – {g2 || "?"}{needsTiebreak ? ` (TB ${tb1 || "?"}-${tb2 || "?"})` : ""}
                        </span>?
                    </p>
                    <div className="flex gap-2 max-w-xs mx-auto">
                        <button onClick={handleCancel} className="flex-1 py-3 rounded-xl text-sm border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors">Cancel</button>
                        <button onClick={handleConfirm} disabled={!isValid} className="flex-1 py-3 rounded-xl text-sm bg-[#FF4200] text-white font-semibold hover:bg-[#CC3500] active:bg-[#AA2C00] transition-colors disabled:opacity-40">Confirm</button>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center justify-center gap-2 mt-2">
                    <p className="text-xs text-red-500">{error}</p>
                    <button onClick={() => { setError(""); handleConfirm(); }} className="text-xs font-semibold text-[#FF4200] hover:underline shrink-0">Retry</button>
                </div>
            )}
        </div>
    );
}

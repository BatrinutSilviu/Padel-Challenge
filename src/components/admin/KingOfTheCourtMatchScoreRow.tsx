import { useState, useEffect, useRef } from "react";
import { trpc } from "../../trpc";
import { isKotcMatchScored, isValidKotcScore, type KotcMatch } from "../../lib/kingOfTheCourt";

type ScoreStatus = "editing" | "confirming" | "saving" | "locked" | "unlock-pending";

function readLocalKotcScore(matchId: string): { s1: string; s2: string; gp: string } | null {
    try {
        const raw = localStorage.getItem(`padel-kotc-score-${matchId}`);
        if (!raw) return null;
        const { s1, s2, gp } = JSON.parse(raw);
        if (typeof s1 === "string" && typeof s2 === "string") {
            return { s1, s2, gp: typeof gp === "string" ? gp : "" };
        }
    } catch { /* ignore malformed drafts */ }
    return null;
}

function writeLocalKotcScore(matchId: string, s1: string, s2: string, gp: string) {
    try { localStorage.setItem(`padel-kotc-score-${matchId}`, JSON.stringify({ s1, s2, gp })); } catch { /* storage unavailable */ }
}

function clearLocalKotcScore(matchId: string) {
    try { localStorage.removeItem(`padel-kotc-score-${matchId}`); } catch { /* storage unavailable */ }
}

function computeInitial(match: KotcMatch): { s1: string; s2: string; gp: string; status: ScoreStatus } {
    if (isKotcMatchScored(match)) {
        return {
            s1: String(match.team1Score),
            s2: String(match.team2Score),
            gp: match.goldenPointWinner != null ? String(match.goldenPointWinner) : "",
            status: "locked",
        };
    }
    const pending = readLocalKotcScore(match.id);
    return pending ? { ...pending, status: "confirming" } : { s1: "", s2: "", gp: "", status: "editing" };
}

export function KingOfTheCourtMatchScoreRow({
    match,
    label,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    match: KotcMatch;
    label: string;
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: (
        matchId: string,
        team1Score: number,
        team2Score: number,
        goldenPointWinner: number | null,
    ) => void;
}) {
    const isScored = isKotcMatchScored(match);

    const [s1, setS1] = useState(() => computeInitial(match).s1);
    const [s2, setS2] = useState(() => computeInitial(match).s2);
    const [gp, setGp] = useState(() => computeInitial(match).gp);
    const [status, setStatus] = useState<ScoreStatus>(() => computeInitial(match).status);
    const [error, setError] = useState("");
    const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Re-sync whenever the server's committed score for this match changes — not just on
    // mount — mirroring the fix for rows freezing blank after navigating between tournaments.
    useEffect(() => {
        if (isScored) {
            clearLocalKotcScore(match.id);
            setS1(String(match.team1Score));
            setS2(String(match.team2Score));
            setGp(match.goldenPointWinner != null ? String(match.goldenPointWinner) : "");
            setStatus("locked");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScored, match.team1Score, match.team2Score, match.goldenPointWinner, match.id]);

    useEffect(() => {
        return () => { if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current); };
    }, []);

    const update = trpc.tournament.updateKingOfCourtMatchScore.useMutation({
        onSuccess: (data) => {
            setStatus("locked");
            clearLocalKotcScore(match.id);
            onSaved(match.id, data.team1Score, data.team2Score, data.goldenPointWinner);
            onSaveEnd();
            setError("");
        },
        onError: (e) => {
            setStatus("confirming");
            onSaveEnd();
            setError(e.message);
        },
    });

    const n1 = parseInt(s1);
    const n2 = parseInt(s2);
    const tied = !isNaN(n1) && !isNaN(n2) && n1 === n2;
    const gpN = gp === "1" ? 1 : gp === "2" ? 2 : undefined;

    const isValid = !isNaN(n1) && !isNaN(n2) && n1 >= 0 && n2 >= 0 && isValidKotcScore(n1, n2, gpN);

    function persistDraft(newS1: string, newS2: string, newGp: string) {
        if (newS1 === "" && newS2 === "") {
            clearLocalKotcScore(match.id);
            setStatus("editing");
            return;
        }
        writeLocalKotcScore(match.id, newS1, newS2, newGp);
        setStatus("confirming");
    }

    function handleScoreChange(field: 1 | 2, val: string) {
        if (status !== "editing" && status !== "confirming") return;
        if (field === 1) setS1(val); else setS2(val);
        const newS1 = field === 1 ? val : s1;
        const newS2 = field === 2 ? val : s2;
        const nn1 = parseInt(newS1), nn2 = parseInt(newS2);
        const stillTied = !isNaN(nn1) && !isNaN(nn2) && nn1 === nn2;
        const newGp = stillTied ? gp : "";
        if (!stillTied) setGp("");
        persistDraft(newS1, newS2, newGp);
    }

    function handleGoldenPointChange(val: "1" | "2") {
        if (status !== "editing" && status !== "confirming") return;
        setGp(val);
        persistDraft(s1, s2, val);
    }

    function handleConfirm() {
        if (!isValid) return;
        setStatus("saving");
        onSaveStart();
        update.mutate({
            matchId: match.id,
            team1Score: n1,
            team2Score: n2,
            goldenPointWinner: tied ? (gpN as 1 | 2) : undefined,
        });
    }

    function handleCancel() {
        clearLocalKotcScore(match.id);
        setS1(""); setS2(""); setGp("");
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
            clearLocalKotcScore(match.id);
            setS1(""); setS2(""); setGp("");
            setStatus("editing");
        }
    }

    const isLocked = status === "locked" || status === "unlock-pending";

    function inputClass(team: 1 | 2) {
        const wins = !tied && (team === 1 ? n1 > n2 : n2 > n1);
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
            <p className="text-xs text-gray-400 mb-3">{label}</p>
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
                            value={s1}
                            onChange={e => handleScoreChange(1, e.target.value)}
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
                            value={s2}
                            onChange={e => handleScoreChange(2, e.target.value)}
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

                    {tied && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-medium">Golden point:</span>
                            <button
                                type="button"
                                onClick={() => handleGoldenPointChange("1")}
                                disabled={isLocked || status === "saving"}
                                className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${gp === "1" ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600"}`}
                            >
                                Team A
                            </button>
                            <button
                                type="button"
                                onClick={() => handleGoldenPointChange("2")}
                                disabled={isLocked || status === "saving"}
                                className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${gp === "2" ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600"}`}
                            >
                                Team B
                            </button>
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
                            {s1 || "?"} – {s2 || "?"}{tied ? ` (golden point: ${gp === "1" ? "Team A" : gp === "2" ? "Team B" : "?"})` : ""}
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

import { useState, useEffect, useRef } from "react";
import { trpc } from "../../trpc";
import { formatChallengerScore, isChallengerMatchScored, type ChallengerMatch, type MatchSet } from "../../lib/challenger";
import { checkMastersScore, isValidSet, mastersStage } from "../../lib/masters";

type ScoreStatus = "editing" | "confirming" | "saving" | "locked" | "unlock-pending";
// Up to three columns: set 1, set 2, then the group tiebreak or the knockout's third set.
type Cells = [string, string][];

export type OnMastersSaved = (matchId: string, team1Score: number, team2Score: number, sets: MatchSet[]) => void;

const EMPTY: Cells = [["", ""], ["", ""], ["", ""]];
const draftKey = (matchId: string) => `padel-masters-score-${matchId}`;

function readDraft(matchId: string): Cells | null {
    try {
        const raw = localStorage.getItem(draftKey(matchId));
        const cells = raw ? JSON.parse(raw) : null;
        if (Array.isArray(cells) && cells.length === 3 && cells.every(c => Array.isArray(c) && c.length === 2 && c.every(v => typeof v === "string"))) {
            return cells as Cells;
        }
    } catch { /* ignore malformed drafts */ }
    return null;
}

function writeDraft(matchId: string, cells: Cells) {
    try { localStorage.setItem(draftKey(matchId), JSON.stringify(cells)); } catch { /* storage unavailable */ }
}

function clearDraft(matchId: string) {
    try { localStorage.removeItem(draftKey(matchId)); } catch { /* storage unavailable */ }
}

function cellsFromSets(sets: MatchSet[] | undefined): Cells {
    const cells = EMPTY.map(c => [...c]) as Cells;
    for (const s of sets ?? []) {
        if (s.setNumber >= 1 && s.setNumber <= 3) cells[s.setNumber - 1] = [String(s.team1Games), String(s.team2Games)];
    }
    return cells;
}

function computeInitial(match: ChallengerMatch): { cells: Cells; status: ScoreStatus } {
    if (isChallengerMatchScored(match)) return { cells: cellsFromSets(match.sets), status: "locked" };
    const draft = readDraft(match.id);
    return draft ? { cells: draft, status: "confirming" } : { cells: EMPTY, status: "editing" };
}

// Score entry for one Masters match, set by set. Same flow as ChallengerMatchScoreRow:
// type → confirm → saved and locked; tap a locked score twice to correct it. Drafts
// survive a reload, which matters on a phone at the side of the court.
export function MastersMatchScoreRow({
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
    onSaved: OnMastersSaved;
}) {
    const stage = mastersStage(match);
    const isScored = isChallengerMatchScored(match);
    const [cells, setCells] = useState<Cells>(() => computeInitial(match).cells);
    const [status, setStatus] = useState<ScoreStatus>(() => computeInitial(match).status);
    const [error, setError] = useState("");
    const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Re-sync whenever the server's committed score changes, not just on mount.
    const serverScore = formatChallengerScore(match);
    useEffect(() => {
        if (isScored) {
            clearDraft(match.id);
            setCells(cellsFromSets(match.sets));
            setStatus("locked");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScored, serverScore, match.id]);

    useEffect(() => () => { if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current); }, []);

    const update = trpc.tournament.updateMastersMatchScore.useMutation({
        onSuccess: data => {
            setStatus("locked");
            clearDraft(match.id);
            onSaved(match.id, data.team1Score, data.team2Score, data.sets);
            onSaveEnd();
            setError("");
        },
        onError: e => {
            setStatus("confirming");
            onSaveEnd();
            setError(e.message);
        },
    });

    const check = checkMastersScore(stage, cells);
    // The deciding column only appears at one set all (or if something is already in it).
    const n = (v: string) => (/^\d+$/.test(v) ? parseInt(v, 10) : NaN);
    const [s1, s2] = [cells[0].map(n), cells[1].map(n)];
    const firstTwoDone = isValidSet(s1[0], s1[1]) && isValidSet(s2[0], s2[1]);
    const split = firstTwoDone && (s1[0] > s1[1]) !== (s2[0] > s2[1]);
    const showDecider = split || cells[2][0] !== "" || cells[2][1] !== "";
    const columns = showDecider ? 3 : 2;
    const deciderLabel = stage === "GROUP" ? "Tiebreak" : "Set 3";

    function handleChange(col: number, team: 0 | 1, value: string) {
        if (status !== "editing" && status !== "confirming") return;
        const next = cells.map(c => [...c]) as Cells;
        next[col][team] = value.replace(/\D/g, "").slice(0, 2);
        setCells(next);
        if (next.every(([a, b]) => a === "" && b === "")) {
            clearDraft(match.id);
            setStatus("editing");
        } else {
            writeDraft(match.id, next);
            setStatus("confirming");
        }
    }

    function handleConfirm() {
        if (!check.ok) return;
        setStatus("saving");
        onSaveStart();
        update.mutate({ matchId: match.id, ...check.input });
    }

    function handleCancel() {
        clearDraft(match.id);
        setCells(EMPTY);
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
            setStatus("editing");
        }
    }

    const isLocked = status === "locked" || status === "unlock-pending";

    function inputClass(col: number, team: 0 | 1) {
        if (status === "saving") return "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed";
        if (status === "unlock-pending") return "border-amber-400 bg-amber-50 text-gray-700 cursor-pointer";
        if (status === "locked") return "border-gray-200 bg-gray-50 text-gray-500 cursor-pointer";
        const [a, b] = cells[col].map(n);
        const wonColumn = !isNaN(a) && !isNaN(b) && (team === 0 ? a > b : b > a)
            && (col === 2 && stage === "GROUP" ? a !== b : isValidSet(a, b));
        if (wonColumn) return "border-[#FF4200] text-[#FF4200] bg-white";
        return status === "confirming" ? "border-blue-400 text-gray-800 bg-white" : "border-gray-300 text-gray-700 bg-white";
    }

    const teamNames = [
        `${match.team1Player1.name} & ${match.team1Player2.name}`,
        `${match.team2Player1.name} & ${match.team2Player2.name}`,
    ];
    const summary = cells
        .slice(0, columns)
        .map(([a, b], i) => (i === 2 && stage === "GROUP" ? `[${a || "?"}-${b || "?"}]` : `${a || "?"}-${b || "?"}`))
        .join(" ");

    return (
        <div className="px-4 sm:px-5 py-4">
            <div className="flex items-center justify-between mb-3">
                <p className={label === "Final" ? "text-xs font-bold uppercase tracking-wide text-[#FF4200]" : "text-xs text-gray-400"}>{label}</p>
                <p className="text-[11px] text-gray-400">{stage === "GROUP" ? "2 sets · tiebreak at 1-1" : "Best of 3 sets"}</p>
            </div>

            <div className="grid items-center gap-x-2 gap-y-2" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${columns}, 3.25rem) 1.5rem` }}>
                <span />
                {Array.from({ length: columns }, (_, i) => (
                    <span key={i} className={`text-center text-[10px] font-bold uppercase tracking-wide ${i === 2 ? "text-[#FF4200]" : "text-gray-400"}`}>
                        {i === 2 ? deciderLabel : `Set ${i + 1}`}
                    </span>
                ))}
                <span />

                {([0, 1] as const).map(team => (
                    <div key={team} className="contents">
                        <p className="font-medium text-gray-800 text-sm min-w-0 break-words">{teamNames[team]}</p>
                        {Array.from({ length: columns }, (_, col) => (
                            <input
                                key={col}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                aria-label={`${teamNames[team]}, ${col === 2 ? deciderLabel : `set ${col + 1}`}`}
                                value={cells[col][team]}
                                onChange={e => handleChange(col, team, e.target.value)}
                                onClick={isLocked ? handleLockedClick : undefined}
                                readOnly={isLocked}
                                disabled={status === "saving"}
                                className={`w-full text-center border rounded-lg px-1 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200] transition-colors ${inputClass(col, team)}`}
                            />
                        ))}
                        <div className="flex items-center justify-center">
                            {team === 0 && status === "saving" && <span className="text-xs text-gray-400">…</span>}
                            {team === 0 && status === "locked" && <LockIcon />}
                            {team === 0 && status === "unlock-pending" && <UnlockIcon />}
                        </div>
                    </div>
                ))}
            </div>

            {status === "unlock-pending" && (
                <p className="text-center text-sm text-amber-600 font-medium mt-2">Tap again to unlock and edit</p>
            )}

            {status === "confirming" && (
                <div className="mt-3 pt-3 border-t border-blue-100">
                    {check.ok ? (
                        <p className="text-center text-sm text-gray-500 mb-2.5">
                            Confirm <span className="font-bold text-gray-800">{summary}</span>?
                        </p>
                    ) : (
                        <p className="text-center text-sm text-gray-400 mb-2.5">{check.error}</p>
                    )}
                    <div className="flex gap-2 max-w-xs mx-auto">
                        <button onClick={handleCancel} className="flex-1 py-3 rounded-xl text-sm border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors">Cancel</button>
                        <button onClick={handleConfirm} disabled={!check.ok} className="flex-1 py-3 rounded-xl text-sm bg-[#FF4200] text-white font-semibold hover:bg-[#CC3500] active:bg-[#AA2C00] transition-colors disabled:opacity-40">Confirm</button>
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

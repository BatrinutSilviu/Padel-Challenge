import { useState } from "react";
import { isValidSet } from "../../lib/masters";
import { checkLeagueScore } from "../../lib/league";

type Cells = [string, string][];
export type SetsInput = { team1Games: number; team2Games: number }[];

function cellsFrom(sets: { team1Games: number; team2Games: number }[] | undefined): Cells {
    const cells: Cells = [["", ""], ["", ""], ["", ""]];
    (sets ?? []).slice(0, 3).forEach((s, i) => { cells[i] = [String(s.team1Games), String(s.team2Games)]; });
    return cells;
}

// Best-of-3 score entry for a league match: two sets, and a third one at one set all.
// Used by the players reporting their match and by admins.
export function LeagueScoreForm({
    teamNames,
    initialSets,
    submitLabel,
    pending,
    error,
    onSubmit,
    onCancel,
}: {
    teamNames: [string, string];
    initialSets?: { team1Games: number; team2Games: number }[];
    submitLabel: string;
    pending: boolean;
    error?: string;
    onSubmit: (sets: SetsInput) => void;
    onCancel?: () => void;
}) {
    const [cells, setCells] = useState<Cells>(() => cellsFrom(initialSets));
    const check = checkLeagueScore(cells);

    const n = (v: string) => (/^\d+$/.test(v) ? parseInt(v, 10) : NaN);
    const [s1, s2] = [cells[0].map(n), cells[1].map(n)];
    const split = isValidSet(s1[0], s1[1]) && isValidSet(s2[0], s2[1]) && (s1[0] > s1[1]) !== (s2[0] > s2[1]);
    const columns = split || cells[2][0] !== "" || cells[2][1] !== "" ? 3 : 2;
    const touched = cells.some(([a, b]) => a !== "" || b !== "");

    function change(col: number, team: 0 | 1, value: string) {
        const next = cells.map(c => [...c]) as Cells;
        next[col][team] = value.replace(/\D/g, "").slice(0, 1);
        setCells(next);
    }

    function cellClass(col: number, team: 0 | 1) {
        const [a, b] = cells[col].map(n);
        const won = !isNaN(a) && !isNaN(b) && isValidSet(a, b) && (team === 0 ? a > b : b > a);
        return won ? "border-[#FF4200] text-[#FF4200]" : "border-gray-300 text-gray-800";
    }

    return (
        <form
            onSubmit={e => { e.preventDefault(); if (check.ok) onSubmit(check.input.sets); }}
            className="space-y-3"
        >
            <div className="grid items-center gap-x-2 gap-y-2" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${columns}, 3rem)` }}>
                <span />
                {Array.from({ length: columns }, (_, i) => (
                    <span key={i} className="text-center text-[10px] font-bold uppercase tracking-wide text-gray-400">Set {i + 1}</span>
                ))}
                {([0, 1] as const).map(team => (
                    <div key={team} className="contents">
                        <p className="text-sm font-medium text-gray-800 min-w-0 break-words">{teamNames[team]}</p>
                        {Array.from({ length: columns }, (_, col) => (
                            <input
                                key={col}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                aria-label={`${teamNames[team]}, set ${col + 1}`}
                                value={cells[col][team]}
                                onChange={e => change(col, team, e.target.value)}
                                disabled={pending}
                                className={`w-full text-center border rounded-lg px-1 py-2.5 text-base font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4200] ${cellClass(col, team)}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-400">Tiebreak at 6-6 — enter it as 7-6.</p>
            {/* Why the button is still disabled — easy to miss otherwise. */}
            {touched && !check.ok && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{check.error}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-300 text-gray-600 font-medium hover:bg-gray-50">
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={!check.ok || pending}
                    className="flex-1 py-2.5 rounded-xl text-sm bg-[#FF4200] text-white font-semibold hover:bg-[#CC3500] disabled:opacity-40"
                >
                    {pending ? "Saving…" : submitLabel}
                </button>
            </div>
        </form>
    );
}

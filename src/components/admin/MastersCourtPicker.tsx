import { useState } from "react";
import { trpc } from "../../trpc";
import { MASTERS_COURT_COUNT, isIndoorCourt } from "../../lib/masters";

// Puts a Masters match on a given court, whatever its stage. Tapping the court it's
// already on does nothing; "Auto" hands it back to the default rotation.
export function MastersCourtPicker({
    tournamentId,
    matchId,
    court,
    autoCourt,
    isSet,
}: {
    tournamentId: string;
    matchId: string;
    court: number | undefined;
    autoCourt: number | undefined;
    isSet: boolean; // the admin picked this court rather than the rotation
}) {
    const utils = trpc.useUtils();
    const [error, setError] = useState("");
    const setCourt = trpc.tournament.setMastersMatchCourt.useMutation({
        onSuccess: ({ id, court }) => {
            setError("");
            utils.tournament.getById.setData({ id: tournamentId }, old => old && {
                ...old,
                rounds: old.rounds.map(r => ({ ...r, matches: r.matches.map(m => (m.id === id ? { ...m, court } : m)) })),
            });
        },
        onError: e => setError(e.message),
    });
    const pick = (next: number | null) => {
        if (setCourt.isPending || (next === null ? !isSet : next === court && isSet)) return;
        setCourt.mutate({ matchId, court: next });
    };

    return (
        <div className="flex items-center gap-1 shrink-0" title={error || undefined}>
            {Array.from({ length: MASTERS_COURT_COUNT }, (_, i) => i + 1).map(c => {
                const on = c === court;
                return (
                    <button
                        key={c}
                        type="button"
                        onClick={() => pick(c)}
                        disabled={setCourt.isPending}
                        aria-pressed={on}
                        aria-label={`Court ${c}, ${isIndoorCourt(c) ? "indoor" : "outdoor"}`}
                        className={`w-7 h-7 rounded-md text-xs font-bold tabular-nums transition-colors disabled:opacity-50 ${
                            on
                                ? isSet ? "bg-[#FF4200] text-white" : "bg-[#333366] text-white"
                                : isIndoorCourt(c) ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                    >
                        {c}
                    </button>
                );
            })}
            {isSet && (
                <button
                    type="button"
                    onClick={() => pick(null)}
                    disabled={setCourt.isPending}
                    className="ml-1 text-[11px] font-semibold text-gray-400 hover:text-[#FF4200] disabled:opacity-50"
                    title={autoCourt != null ? `Back to the default rotation (court ${autoCourt})` : "Back to the default rotation"}
                >
                    Auto
                </button>
            )}
            {error && <span className="ml-1 text-[11px] text-red-500">!</span>}
        </div>
    );
}

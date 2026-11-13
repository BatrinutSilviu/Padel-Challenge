import { useEffect, useState } from "react";
import { trpc } from "../../../../trpc";
import { divisionLabel } from "../../../../lib/divisions";
import { TOURNAMENT_TYPE_LABELS, type TournamentType } from "../../../../lib/tournaments";
import { tierLabel } from "../../../../lib/league";
import { SaveMessage } from "./SaveMessage";
import { useFlashMessage } from "./useFlashMessage";

const TYPE_ORDER = ["AMERICANO", "TEAM_AMERICANO", "KING_OF_THE_COURT", "AMERICANO_CHAMPIONS", "CHALLENGER", "MASTERS"];

// Ranking points multipliers (backend lib/rankingPoints). Saving recalculates everyone's
// points straight away — they're worked out from the results every time.
export function RankingCoefficientsEditor() {
    const utils = trpc.useUtils();
    const { data } = trpc.ranking.coefficients.useQuery();
    const [values, setValues] = useState<Record<string, string>>({});
    const { message, flash, fail } = useFlashMessage(4000);

    const rows: { key: string; label: string; group: string; current: number; def: number }[] = data ? [
        ...TYPE_ORDER.map(t => ({ key: `type:${t}`, label: TOURNAMENT_TYPE_LABELS[t as TournamentType] ?? t, group: "Tournament type", current: data.current.type[t], def: data.defaults.type[t] })),
        { key: "league", label: "Act!ve Padel League", group: "Tournament type", current: data.current.league, def: data.defaults.league },
        ...Object.keys(data.defaults.division).map(d => ({ key: `division:${d}`, label: divisionLabel(Number(d)), group: "Level", current: data.current.division[Number(d)], def: data.defaults.division[Number(d)] })),
        ...Object.keys(data.defaults.leagueTier).map(l => ({ key: `leagueTier:${l}`, label: tierLabel(Number(l)), group: "League tier", current: data.current.leagueTier[Number(l)], def: data.defaults.leagueTier[Number(l)] })),
    ] : [];

    useEffect(() => {
        if (data) setValues(Object.fromEntries(rows.map(r => [r.key, String(r.current)])));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const save = trpc.ranking.setCoefficients.useMutation({
        onSuccess: () => {
            utils.ranking.coefficients.invalidate();
            utils.player.invalidate();
            utils.division.invalidate();
            flash("Saved — everyone's ranking points are updated.");
        },
        onError: fail,
    });

    const changed = rows.filter(r => values[r.key] !== undefined && Number(values[r.key]) !== r.current);
    const invalid = rows.some(r => values[r.key] === "" || isNaN(Number(values[r.key])) || Number(values[r.key]) < 0 || Number(values[r.key]) > 20);

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
                <h2 className="text-base font-semibold text-gray-800">Ranking points coefficients</h2>
                <p className="text-sm text-gray-500">
                    Each place's points (10 per player in the tournament, shared out best place first) are multiplied by the
                    tournament type's coefficient and the division's — or, for the league, the league's and the tier's.
                </p>
            </div>
            {!data ? <p className="text-gray-400 text-sm">Loading…</p> : (
                <div className="grid sm:grid-cols-3 gap-4">
                    {["Tournament type", "Level", "League tier"].map(group => (
                        <div key={group} className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{group}</p>
                            {rows.filter(r => r.group === group).map(r => (
                                <label key={r.key} className="flex items-center justify-between gap-2 text-sm text-gray-700">
                                    <span className="min-w-0 truncate">{r.label}</span>
                                    <span className="flex items-center gap-1 shrink-0">
                                        <span className="text-gray-400">×</span>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min={0}
                                            max={20}
                                            value={values[r.key] ?? ""}
                                            onChange={e => setValues({ ...values, [r.key]: e.target.value })}
                                            title={`Default ${r.def}`}
                                            className={`w-20 border rounded-lg px-2 py-1.5 text-base sm:text-sm text-right tabular-nums ${Number(values[r.key]) !== r.def ? "border-[#FF4200]" : "border-gray-300"}`}
                                        />
                                    </span>
                                </label>
                            ))}
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={() => save.mutate(changed.map(r => ({ key: r.key, value: Number(values[r.key]) })))}
                    disabled={changed.length === 0 || invalid || save.isPending}
                    className="px-4 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-semibold disabled:opacity-40"
                >
                    {save.isPending ? "Saving…" : `Save${changed.length ? ` (${changed.length})` : ""}`}
                </button>
                <button
                    onClick={() => {
                        if (confirm("Put every coefficient back to its default?")) save.mutate(rows.map(r => ({ key: r.key, value: null })));
                    }}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600"
                >
                    Reset to defaults
                </button>
                <SaveMessage message={message} />
            </div>
            <p className="text-xs text-gray-400">An orange box differs from the default (hover to see it).</p>
        </div>
    );
}

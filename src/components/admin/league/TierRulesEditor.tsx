import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../../../trpc";
import { MAX_TEAMS_PER_GROUP, MIN_TEAMS_PER_GROUP, rulesSummary, type League, type LeagueTier } from "../../../lib/league";

export function useInvalidateLeague() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.getById) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.list) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.match) });
    };
}

// ─── Rules and prizes (also editable while the league is played) ───────────────

type RuleKey = "teamsPerGroup" | "promoteDirect" | "promoteBest" | "playoffUp" | "relegateDirect" | "relegateWorst" | "playoffDown";

export function TierRulesEditor({ league, tier, draft = false }: { league: League; tier: LeagueTier; draft?: boolean }) {
    const invalidate = useInvalidateLeague();
    const isTop = tier.level === 1;
    const isBottom = tier.level === league.tiers.length;
    const initial = {
        teamsPerGroup: tier.teamsPerGroup, promoteDirect: tier.promoteDirect, promoteBest: tier.promoteBest,
        playoffUp: tier.playoffUp, relegateDirect: tier.relegateDirect, relegateWorst: tier.relegateWorst,
        playoffDown: tier.playoffDown, prize1: tier.prize1 ?? "", prize2: tier.prize2 ?? "", prize3: tier.prize3 ?? "",
    };
    const [v, setV] = useState(initial);
    const [open, setOpen] = useState(draft);
    const update = trpc.league.updateTier.useMutation({ onSuccess: invalidate });
    const changed = JSON.stringify(v) !== JSON.stringify(initial);
    const summary = rulesSummary(v, { isTop, isBottom });

    const num = (key: RuleKey, label: string, min = 0, max = MAX_TEAMS_PER_GROUP) => (
        <label className="flex items-center justify-between gap-2 text-sm text-gray-700">
            <span>{label}</span>
            <input
                type="number"
                min={min}
                max={max}
                value={v[key]}
                onChange={e => setV({ ...v, [key]: Math.max(min, Math.min(max, Number(e.target.value) || 0)) })}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-base sm:text-sm text-center"
            />
        </label>
    );

    return (
        <div className="space-y-3">
            <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-left">
                <span>
                    <span className="text-sm font-semibold text-gray-800">Promotion, relegation & prizes</span>
                    <span className="block text-xs text-gray-500">{summary.length ? summary.join(" · ") : "Nobody moves"}</span>
                </span>
                <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
            </button>
            {open && (
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        update.mutate({ tierId: tier.id, ...v, prize1: v.prize1.trim() || null, prize2: v.prize2.trim() || null, prize3: v.prize3.trim() || null });
                    }}
                    className="space-y-4"
                >
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                        {draft && <div className="sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]">{num("teamsPerGroup", "Teams per group", MIN_TEAMS_PER_GROUP, MAX_TEAMS_PER_GROUP)}</div>}
                        {!isTop && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Promotion</p>
                                {num("promoteDirect", "Top places of each group go up")}
                                {num("promoteBest", "+ best of the next place across groups", 0, 20)}
                                {num("playoffUp", "Next places to a promotion playoff")}
                            </div>
                        )}
                        {!isBottom && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Relegation</p>
                                {num("relegateDirect", "Bottom places of each group go down")}
                                {num("relegateWorst", "+ worst of the next place across groups", 0, 20)}
                                {num("playoffDown", "Next places to a relegation playoff")}
                            </div>
                        )}
                    </div>
                    {isTop && isBottom && <p className="text-xs text-gray-500">With a single league nobody is promoted or relegated.</p>}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Prizes (top 3 of every group)</p>
                        <div className="grid sm:grid-cols-3 gap-2">
                            {(["prize1", "prize2", "prize3"] as const).map((k, i) => (
                                <input
                                    key={k}
                                    value={v[k]}
                                    onChange={e => setV({ ...v, [k]: e.target.value })}
                                    placeholder={`${["🥇", "🥈", "🥉"][i]} ${["1st", "2nd", "3rd"][i]} place prize`}
                                    maxLength={100}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm"
                                />
                            ))}
                        </div>
                    </div>
                    {update.error && <p className="text-sm text-red-500">{update.error.message}</p>}
                    <button type="submit" disabled={!changed || update.isPending} className="px-4 py-2 rounded-lg bg-[#333366] text-white text-sm font-semibold disabled:opacity-40">
                        {update.isPending ? "Saving…" : "Save rules"}
                    </button>
                </form>
            )}
        </div>
    );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "../../trpc";
import { useRankingSystem, type RankingSystem } from "../../lib/ranking";
import { RankingCoefficientsEditor } from "./RankingCoefficientsEditor";

const OPTIONS: { system: RankingSystem; title: string; description: string }[] = [
    {
        system: "ELO",
        title: "ELO rating",
        description: "Every match won or lost moves a player's rating, weighted by how strong the opponents were. Friendly matches count too.",
    },
    {
        system: "POINTS",
        title: "Ranking points",
        description: "Points for each finishing place in the last 12 months, times coefficients for the tournament type and division. Friendly matches don't count.",
    },
];

// The site-wide ranking system: what standings, badges and promotion/relegation go by.
// Elo is always kept up to date, so switching takes effect straight away.
export function RankingSystemSettings() {
    const qc = useQueryClient();
    const { system } = useRankingSystem();
    const [eloMsg, setEloMsg] = useState("");

    const setSystem = trpc.ranking.setSystem.useMutation({
        // Every ranking on the site changes, so refetch everything.
        onSuccess: () => qc.invalidateQueries(),
    });
    const recalcElo = trpc.player.recalculateElo.useMutation({
        onSuccess: () => {
            qc.invalidateQueries();
            setEloMsg("ELO recalculated successfully.");
            setTimeout(() => setEloMsg(""), 4000);
        },
        onError: (e) => setEloMsg(`Error: ${e.message}`),
    });

    function choose(next: RankingSystem) {
        if (next === system || setSystem.isPending) return;
        const label = OPTIONS.find(o => o.system === next)!.title;
        if (!confirm(`Rank all players by ${label}? Standings, badges and promotion/relegation will use it from now on.`)) return;
        setSystem.mutate({ system: next });
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">Ranking system</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Used across the whole site: player standings, badges and who gets promoted or relegated.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                    {OPTIONS.map(o => {
                        const active = o.system === system;
                        return (
                            <button
                                key={o.system}
                                type="button"
                                onClick={() => choose(o.system)}
                                disabled={setSystem.isPending}
                                className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-60 ${active ? "border-[#FF4200] bg-orange-50" : "border-gray-200 hover:border-[#FF4200]"}`}
                            >
                                <span className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-gray-800">{o.title}</span>
                                    {active && <span className="text-[10px] font-bold uppercase tracking-wide text-[#FF4200]">In use</span>}
                                </span>
                                <span className="block text-xs text-gray-500 mt-1">{o.description}</span>
                            </button>
                        );
                    })}
                </div>
                {setSystem.error && <p className="text-sm text-red-500">Error: {setSystem.error.message}</p>}

                <div className="flex flex-col sm:flex-row gap-3 items-start pt-2 border-t border-gray-100">
                    <button
                        onClick={() => {
                            if (!confirm("Recalculate ELO for all players from scratch? This replays all completed tournaments in order.")) return;
                            recalcElo.mutate();
                        }}
                        disabled={recalcElo.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 disabled:opacity-50 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {recalcElo.isPending ? "Recalculating…" : "Recalculate ELO"}
                    </button>
                    {eloMsg && <p className={`text-sm self-center ${eloMsg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>{eloMsg}</p>}
                </div>
                <p className="text-xs text-gray-400">Resets all ELO ratings to 1000 and replays every completed tournament and friendly match in chronological order.</p>
            </div>
            {system === "POINTS" && <RankingCoefficientsEditor />}
        </>
    );
}

import { trpc } from "../trpc";

// The ranking system the admin picked (backend lib/rankingSystem): players are ranked by
// their Elo rating or by their ranking points everywhere on the site.
export type RankingSystem = "ELO" | "POINTS";

export function useRankingSystem() {
    // Elo until told otherwise — it's the default on the backend too.
    const { data: system = "ELO" } = trpc.ranking.system.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
    const isPoints = system === "POINTS";
    return {
        system,
        isPoints,
        // The number a player is ranked by in the active system.
        scoreOf: (p: { elo: number; rankingPoints: number }) => isPoints ? Math.round(p.rankingPoints) : p.elo,
        unit: isPoints ? "pts" : "ELO",
        name: isPoints ? "ranking points" : "ELO",
    };
}

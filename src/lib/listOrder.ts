import { useState } from "react";
import { useRankingSystem } from "./ranking";

// How player lists are ordered: by the ranking score (points or Elo, whichever the site ranks by)
// or by the level coefficient. Remembered in this browser and shared by every player list.
export type ListOrder = "SCORE" | "COEFFICIENT";

const KEY = "players-order";

function readOrder(): ListOrder {
    try {
        return localStorage.getItem(KEY) === "COEFFICIENT" ? "COEFFICIENT" : "SCORE";
    } catch {
        return "SCORE";
    }
}

type Rankable = { id: string; name: string; elo: number; rankingPoints: number; level: { coefficient: number | null } };

// Lists work out both orders up front (orderTools) and show one with a class, so changing
// `order` only changes that class.
export function useListOrder() {
    const { isPoints } = useRankingSystem();
    const [order, setOrderState] = useState<ListOrder>(readOrder);
    const setOrder = (o: ListOrder) => {
        setOrderState(o);
        try { localStorage.setItem(KEY, o); } catch { /* private mode: only for this visit */ }
    };
    return { order, setOrder, isPoints, scoreLabel: isPoints ? "Points" : "ELO" };
}

// Comparing and ranking players by an order. Plain functions of their inputs, so lists built
// with them can be memoised.
export function orderTools(order: ListOrder, isPoints: boolean) {
    const scoreOf = (p: Rankable) => isPoints ? Math.round(p.rankingPoints) : p.elo;
    const byCoefficient = order === "COEFFICIENT";
    // Players without a coefficient yet (no rated result) go last.
    const keyOf = (p: Rankable) => byCoefficient ? (p.level.coefficient ?? -1) : scoreOf(p);
    const compare = (a: Rankable, b: Rankable) =>
        keyOf(b) - keyOf(a) ||
        (byCoefficient ? scoreOf(b) - scoreOf(a) : 0) ||
        a.name.localeCompare(b.name);
    // 1-based positions in an already sorted list; equal keys share a position.
    const ranks = (sorted: Rankable[]) => {
        const out = new Map<string, number>();
        sorted.forEach((p, i) => {
            const prev = sorted[i - 1];
            out.set(p.id, prev && keyOf(prev) === keyOf(p) ? out.get(prev.id)! : i + 1);
        });
        return out;
    };
    return { compare, ranks, byCoefficient, scoreOf };
}

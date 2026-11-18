import { divisionLabel } from "../lib/divisions";

// Where the ranking says a player should play next, when it isn't their current level:
// ▲ Level 3 (top 10% of their level by coefficient) or ▼ Level 5 (bottom 10%). The backend works it out
// once (lib/divisionMoves) and every page shows the same thing.
export function RecommendedLevel({ division, recommended, compact = false }: {
    division: number;
    recommended: number;
    compact?: boolean; // the arrow only
}) {
    if (recommended === division) return null;
    const up = recommended < division;
    const title = `${up ? "Recommended to move up" : "Recommended to move down"} to ${divisionLabel(recommended)}`;
    return (
        <span
            title={title}
            className={`inline-flex items-center gap-1 shrink-0 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}
        >
            <span aria-hidden>{up ? "▲" : "▼"}</span>
            {compact ? <span className="sr-only">{title}</span> : divisionLabel(recommended)}
        </span>
    );
}

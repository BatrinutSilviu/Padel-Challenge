import type { ListOrder } from "../lib/listOrder";

// "Order by: Points | Coefficient" above a player list.
export function ListOrderToggle({ order, onChange, scoreLabel }: {
    order: ListOrder;
    onChange: (o: ListOrder) => void;
    scoreLabel: string;
}) {
    const options: [ListOrder, string][] = [["SCORE", scoreLabel], ["COEFFICIENT", "Coefficient"]];
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">Order by</span>
            <div className="flex gap-1 bg-surface border border-line rounded-2xl p-1 w-fit shadow-sm" role="radiogroup" aria-label="Order players by">
                {options.map(([o, label]) => (
                    <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={order === o}
                        onClick={() => onChange(o)}
                        className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${
                            order === o ? "bg-[#FF4200] text-white shadow-sm" : "text-muted hover:text-ink"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

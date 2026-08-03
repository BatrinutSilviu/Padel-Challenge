import { useState } from "react";

export function PlayerPicker({
    value,
    onChange,
    players,
    excludeIds,
    placeholder = "Pick player",
}: {
    value: string;
    onChange: (id: string) => void;
    players: { id: string; name: string; division: number }[];
    excludeIds: Set<string>;
    placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const selected = players.find(p => p.id === value);
    const filtered = players.filter(p =>
        !excludeIds.has(p.id) &&
        (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="relative flex-1 min-w-0">
            <button
                type="button"
                onClick={() => { setOpen(v => !v); setSearch(""); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors truncate ${
                    selected
                        ? "border-gray-300 text-gray-800 bg-white hover:border-[#FF4200]"
                        : "border-dashed border-gray-300 text-gray-400 bg-white hover:border-[#FF4200] hover:text-[#FF4200]"
                }`}
            >
                {selected ? selected.name : placeholder}
            </button>
            {open && (
                <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[220px]">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === "Escape" && setOpen(false)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                            placeholder="Search…"
                        />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <p className="text-sm text-gray-400 px-3 py-3">No players available</p>
                        ) : (
                            filtered.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => { onChange(p.id); setOpen(false); }}
                                    className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-[#FF4200]/5 hover:text-[#FF4200] flex items-center justify-between gap-2"
                                >
                                    <span>{p.name}</span>
                                    <span className="text-xs text-gray-400 shrink-0">Div {p.division === 6 ? "Beg" : p.division}</span>
                                </button>
                            ))
                        )}
                    </div>
                    {value && (
                        <div className="border-t border-gray-100 p-1.5">
                            <button
                                type="button"
                                onClick={() => { onChange(""); setOpen(false); }}
                                className="w-full text-left px-3 py-2.5 text-xs text-gray-400 hover:text-red-400 rounded-lg"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

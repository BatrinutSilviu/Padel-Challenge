import { useState } from "react";
import { AddPlayerInline } from "./AddPlayerInline";

export function PlayerPicker({
    value,
    onChange,
    players,
    excludeIds,
    placeholder = "Pick player",
    division,
}: {
    value: string;
    onChange: (id: string) => void;
    players: { id: string; name: string; division: number }[];
    excludeIds: Set<string>;
    placeholder?: string;
    division?: number;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [adding, setAdding] = useState(false);

    const selected = players.find(p => p.id === value);
    const filtered = players.filter(p =>
        !excludeIds.has(p.id) &&
        (search === "" || p.name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="relative flex-1 min-w-0">
            <button
                type="button"
                onClick={() => { setOpen(v => !v); setSearch(""); setAdding(false); }}
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
                    {!adding && (
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
                    )}
                    {adding ? (
                        <div className="p-2">
                            <AddPlayerInline
                                defaultName={search}
                                defaultDivision={division}
                                onCreated={(p) => { onChange(p.id); setOpen(false); setAdding(false); }}
                                onCancel={() => setAdding(false)}
                            />
                        </div>
                    ) : (
                        <>
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
                            <div className="border-t border-gray-100 p-1.5 space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => setAdding(true)}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-[#FF4200] hover:bg-[#FF4200]/5 rounded-lg"
                                >
                                    + Add new player
                                </button>
                                {value && (
                                    <button
                                        type="button"
                                        onClick={() => { onChange(""); setOpen(false); }}
                                        className="w-full text-left px-3 py-2.5 text-xs text-gray-400 hover:text-red-400 rounded-lg"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

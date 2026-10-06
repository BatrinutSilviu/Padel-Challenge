import { useState } from "react";
import { AddPlayerInline } from "./AddPlayerInline";

export function PlayerPicker({
    value,
    onChange,
    players,
    excludeIds,
    placeholder = "Pick player",
    division,
    align = "left",
    allowAdd = true,
    onAddName,
}: {
    value: string;
    onChange: (id: string) => void;
    players: { id: string; name: string; division: number }[];
    excludeIds: Set<string>;
    placeholder?: string;
    division?: number;
    // Which edge the dropdown lines up with — "right" for a picker on the right-hand
    // side of a narrow screen, so the (wider) dropdown doesn't run off it.
    align?: "left" | "right";
    // "+ Add new player" creates a player, which only admins can do.
    allowAdd?: boolean;
    // Instead of creating the player right away, hand the typed name back — used
    // where the player is only created once the surrounding form is submitted.
    onAddName?: (name: string) => void;
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
                <div className={`absolute z-30 top-full ${align === "right" ? "right-0" : "left-0"} mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-full min-w-[220px]`}>
                    {!adding && (
                        <div className="p-2 border-b border-gray-100">
                            <input
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Escape") setOpen(false);
                                    // The phone keyboard's Go/Enter adds a typed name nobody matches.
                                    if (e.key === "Enter" && onAddName && search.trim() && filtered.length === 0) {
                                        e.preventDefault();
                                        onAddName(search);
                                        setOpen(false);
                                    }
                                }}
                                enterKeyHint={onAddName ? "done" : undefined}
                                // 16px on phones: iOS zooms the page into any smaller input on focus.
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
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
                            {onAddName && search.trim() && !players.some(p => p.name.toLowerCase() === search.trim().toLowerCase()) && (
                                <div className="border-t border-gray-100 p-1.5">
                                    <button
                                        type="button"
                                        onClick={() => { onAddName(search); setOpen(false); }}
                                        className="w-full text-left px-3 py-2.5 text-sm font-medium text-[#FF4200] hover:bg-[#FF4200]/5 rounded-lg truncate"
                                    >
                                        + Add “{search.trim()}” as a new player
                                    </button>
                                </div>
                            )}
                            {(allowAdd || value) && <div className="border-t border-gray-100 p-1.5 space-y-0.5">
                                {allowAdd && <button
                                    type="button"
                                    onClick={() => setAdding(true)}
                                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-[#FF4200] hover:bg-[#FF4200]/5 rounded-lg"
                                >
                                    + Add new player
                                </button>}
                                {value && (
                                    <button
                                        type="button"
                                        onClick={() => { onChange(""); setOpen(false); }}
                                        className="w-full text-left px-3 py-2.5 text-xs text-gray-400 hover:text-red-400 rounded-lg"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

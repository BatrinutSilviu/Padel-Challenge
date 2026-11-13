import { useState } from "react";
import { trpc } from "../../../../trpc";
import { DIVISION_NAMES, divisionLabel } from "../../../../lib/divisions";
import { compactField } from "../../formStyles";
import { ProfileClaimsQueue } from "./ProfileClaimsQueue";
import { PlayerRow } from "./PlayerRow";

// Adding, finding and editing players, with profile claims to approve at the top.
export function PlayersTab() {
    const utils = trpc.useUtils();
    const [name, setName] = useState("");
    const [division, setDivision] = useState(6);
    const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
    const [error, setError] = useState("");

    const players = trpc.player.list.useQuery();
    const create = trpc.player.create.useMutation({
        onSuccess: () => {
            utils.player.list.invalidate();
            setName("");
            setGender("MALE");
            setError("");
        },
        onError: (e) => setError(e.message),
    });
    const remove = trpc.player.delete.useMutation({
        onSuccess: () => utils.player.list.invalidate(),
    });

    // Searching the list below — accents and case don't matter ("stefan" finds "Ștefan").
    const [search, setSearch] = useState("");
    const fold = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const searchKey = fold(search.trim());
    // Contact details (admins only): the account's email and the profile's phone.
    const contacts = trpc.player.contacts.useQuery();
    const contactOf = (id: string) => contacts.data?.[id];
    const listed = (players.data ?? []).filter(p => {
        if (!searchKey) return true;
        const c = contactOf(p.id);
        return [p.name, c?.email ?? "", (c?.phone ?? "").replace(/\s+/g, "")].some(v => fold(v).includes(searchKey.replace(/\s+(?=\d)/g, "")));
    });

    const q = name.trim().toLowerCase();
    const matches = q.length >= 2
        ? (players.data ?? []).filter(p => p.name.toLowerCase().includes(q))
        : [];

    function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return setError("Name is required.");
        create.mutate({ name: name.trim(), division, gender });
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <ProfileClaimsQueue />
            <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="text-base font-semibold text-gray-800">Add Player</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 space-y-1.5">
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={`${compactField} w-full`}
                            placeholder="Player name"
                            autoComplete="off"
                        />
                        {q.length >= 2 && (
                            <div className={`rounded-lg border text-sm px-3 py-2 ${
                                matches.length > 0
                                    ? "border-amber-200 bg-amber-50"
                                    : "border-green-200 bg-green-50"
                            }`}>
                                {matches.length > 0 ? (
                                    <>
                                        <p className="text-amber-700 font-medium mb-1.5">Similar players found:</p>
                                        <ul className="space-y-1">
                                            {matches.map(p => (
                                                <li key={p.id} className="flex items-center justify-between gap-2">
                                                    <span className="text-amber-800 font-semibold">{p.name}</span>
                                                    <span className="text-amber-600 text-xs">
                                                        {divisionLabel(p.division)} · {p.gender === "MALE" ? "♂" : "♀"}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <p className="text-green-700 font-medium">No existing player found — safe to add.</p>
                                )}
                            </div>
                        )}
                    </div>
                    <select
                        value={division}
                        onChange={e => setDivision(Number(e.target.value))}
                        className={`${compactField} self-start`}
                    >
                        {[1, 2, 3, 4, 5, 6].map(d => (
                            <option key={d} value={d}>{DIVISION_NAMES[d]}</option>
                        ))}
                    </select>
                    <select
                        value={gender}
                        onChange={e => setGender(e.target.value as "MALE" | "FEMALE")}
                        className={`${compactField} self-start`}
                    >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                    <button
                        type="submit"
                        disabled={create.isPending}
                        className="bg-[#FF4200] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors self-start"
                    >
                        Add
                    </button>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </form>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
                <div className="p-3 border-b border-gray-100">
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={`Search ${players.data?.length ?? ""} players by name, email or phone…`}
                        className={`${compactField} w-full`}
                        autoComplete="off"
                    />
                    {searchKey && <p className="text-xs text-gray-400 mt-1.5">{listed.length} found</p>}
                </div>
                {players.isPending && <p className="text-gray-500 p-4">Loading…</p>}
                <table className="w-full text-sm min-w-[300px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-4 py-2 text-gray-600 font-medium">Player</th>
                            <th className="text-left px-4 py-2 text-gray-600 font-medium hidden sm:table-cell">Level</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {listed.map(p => (
                            <PlayerRow
                                key={p.id}
                                player={p}
                                contact={contactOf(p.id)}
                                onDelete={() => { if (confirm(`Delete "${p.name}"? This cannot be undone.`)) remove.mutate({ id: p.id }); }}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

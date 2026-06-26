import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { DIVISION_NAMES, divisionLabel } from "../../lib/divisions";
import { TournamentType, TOURNAMENT_TYPE_LABELS } from "../../lib/tournaments";

type Tab = "players" | "tournaments" | "new-tournament";


export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get("tab") as Tab) ?? "tournaments";
    const setTab = (t: Tab) => setSearchParams({ tab: t });

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 pb-24 sm:py-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between mb-6">
                    <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit overflow-x-auto">
                        {(["tournaments", "new-tournament", "players"] as Tab[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-4 py-1.5 md:px-6 md:py-2.5 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                                    tab === t ? "bg-[#FF4200] text-white" : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                {t === "new-tournament" ? "New Tournament" : t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={onLogout}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500 transition-colors self-start sm:self-auto"
                    >
                        Logout
                    </button>
                </div>

                {tab === "tournaments" && <TournamentsTab />}
                {tab === "new-tournament" && <NewTournamentTab onCreated={() => setTab("tournaments")} />}
                {tab === "players" && <PlayersTab />}
            </main>
        </div>
    );
}

function TournamentsTab() {
    const qc = useQueryClient();
    const { data, isPending } = trpc.tournament.list.useQuery();
    const active = data?.filter(t => t.status === "IN_PROGRESS") ?? [];
    const others = data?.filter(t => t.status !== "IN_PROGRESS") ?? [];

    const deleteTournament = trpc.tournament.delete.useMutation({
        onSuccess: () => qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.list) }),
    });

    function handleDelete(id: string, name: string) {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        deleteTournament.mutate({ id });
    }

    return (
        <div className="space-y-6">
            <section>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">In Progress</h2>
                {isPending && <p className="text-gray-500">Loading…</p>}
                {!isPending && active.length === 0 && <p className="text-gray-500">No active tournaments.</p>}
                <div className="space-y-2">
                    {active.map(t => (
                        <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-lg border border-yellow-200 px-4 py-3">
                            <div className="min-w-0">
                                <span className="font-medium text-gray-800 block truncate">{t.name}</span>
                                <span className="text-xs text-gray-400">{divisionLabel(t.division)} · {new Date(t.date).toLocaleDateString()} · {TOURNAMENT_TYPE_LABELS[t.type as TournamentType] ?? t.type}</span>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                <Link
                                    to={`/admin/tournament/${t.id}`}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-[#FF4200] text-white px-4 py-2 rounded-lg hover:bg-[#CC3500] transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L7.5 20.213l-4 1 1-4 12.362-12.726z"/></svg>
                                    Enter Scores
                                </Link>
                                <button
                                    onClick={() => handleDelete(t.id, t.name)}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium border border-red-200 text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Other Tournaments</h2>
                <div className="space-y-2">
                    {others.map(t => (
                        <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white rounded-lg border border-gray-200 px-4 py-3">
                            <div className="min-w-0">
                                <span className="font-medium text-gray-800 block truncate">{t.name}</span>
                                <span className="text-xs text-gray-400">{divisionLabel(t.division)} · {new Date(t.date).toLocaleDateString()} · {TOURNAMENT_TYPE_LABELS[t.type as TournamentType] ?? t.type}</span>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                <StatusBadge status={t.status} />
                                <Link
                                    to={`/admin/tournament/${t.id}`}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium border border-[#FF4200] text-[#FF4200] px-3 py-2 rounded-lg hover:bg-[#FF4200]/5 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L7.5 20.213l-4 1 1-4 12.362-12.726z"/></svg>
                                    {t.status === "COMPLETED" ? "Edit scores" : "Enter scores"}
                                </Link>
                                <button
                                    onClick={() => handleDelete(t.id, t.name)}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium border border-red-200 text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function NewTournamentTab({ onCreated }: { onCreated: () => void }) {
    const [mode, setMode] = useState<"create" | "import" | "team">("create");
    if (mode === "import") return <ImportRankedinTab onImported={onCreated} onBack={() => setMode("create")} />;
    if (mode === "team") return <CreateTeamAmericanoForm onCreated={onCreated} onBack={() => setMode("create")} />;
    return <CreateTournamentForm onCreated={onCreated} onImport={() => setMode("import")} onTeamAmericano={() => setMode("team")} />;
}

function CreateTournamentForm({ onCreated, onImport, onTeamAmericano }: { onCreated: () => void; onImport: () => void; onTeamAmericano: () => void }) {
    const [division, setDivision] = useState(1);
    const [name, setName] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [type, setType] = useState<TournamentType>("AMERICANO");
    const [pointsPerGame, setPointsPerGame] = useState(32);
    const [maxPlayers, setMaxPlayers] = useState(8);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [playerFilter, setPlayerFilter] = useState("");
    const [error, setError] = useState("");

    const divisionPlayersQuery = trpc.division.players.useQuery({ division });
    const allPlayersQuery = trpc.division.allPlayers.useQuery();

    const divisionPlayers = divisionPlayersQuery.data ?? [];
    const allPlayers = allPlayersQuery.data ?? [];
    const q = playerFilter.trim().toLowerCase();
    const selectedPlayers = allPlayers.filter(p => selectedIds.includes(p.id));
    const unselectedPlayers = (() => {
        if (selectedIds.length >= maxPlayers) return [];
        if (q) return allPlayers.filter(p => p.name.toLowerCase().includes(q) && !selectedIds.includes(p.id));
        return divisionPlayers.filter(p => !selectedIds.includes(p.id));
    })();

    const create = trpc.tournament.create.useMutation({
        onSuccess: onCreated,
        onError: (e) => setError(e.message),
    });

    function togglePlayer(id: string) {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= maxPlayers) return prev;
            if (playerFilter) setPlayerFilter("");
            return [...prev, id];
        });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!name.trim()) return setError("Tournament name is required.");
        if (selectedIds.length !== maxPlayers) return setError(`Select exactly ${maxPlayers} players.`);
        create.mutate({ name: name.trim(), date, division, type, pointsPerGame, playerIds: selectedIds });
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-5 max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-800">Create Tournament</h2>
                <button
                    type="button"
                    onClick={onImport}
                    className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:border-[#FF4200] hover:text-[#FF4200] transition-colors shrink-0"
                >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                    Import from Rankedin
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={input}
                        placeholder="e.g. Division 1 — Round 5"
                    />
                </Field>
                <Field label="Date">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} />
                </Field>
            </div>

            <Field label="Division">
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map(d => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => { setDivision(d); setSelectedIds([]); setPlayerFilter(""); }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                division === d
                                    ? "bg-[#FF4200] text-white border-[#FF4200]"
                                    : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
                            }`}
                        >
                            {d === 6 ? "Beginner" : `${d} — ${DIVISION_NAMES[d]}`}
                        </button>
                    ))}
                </div>
            </Field>

            <Field label="Type">
                <div className="flex flex-wrap gap-2">
                    {(["AMERICANO", "AMERICANO_CHAMPIONS", "AMERICANO_GIRLS", "CHALLENGER"] as TournamentType[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setType(t)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                type === t
                                    ? "bg-[#FF4200] text-white border-[#FF4200]"
                                    : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
                            }`}
                        >
                            {TOURNAMENT_TYPE_LABELS[t]}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={onTeamAmericano}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors border-gray-300 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200]"
                    >
                        {TOURNAMENT_TYPE_LABELS["TEAM_AMERICANO"]}
                    </button>
                </div>
            </Field>

            <Field label="Number of players">
                <div className="flex gap-2">
                    {[8, 12, 16].map(n => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => { setMaxPlayers(n); setSelectedIds([]); }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                maxPlayers === n
                                    ? "bg-[#FF4200] text-white border-[#FF4200]"
                                    : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
                            }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </Field>

            <Field label="Points per game">
                <div className="flex flex-wrap gap-2">
                    {[16, 24, 32].map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPointsPerGame(p)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                pointsPerGame === p
                                    ? "bg-[#FF4200] text-white border-[#FF4200]"
                                    : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </Field>

            <div className="space-y-1">
                <div className="sticky top-14 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 py-2 bg-white border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Players</span>
                    <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                        selectedIds.length === maxPlayers
                            ? "bg-[#FF4200] text-white"
                            : selectedIds.length > 0
                            ? "bg-[#FF4200]/10 text-[#FF4200]"
                            : "bg-gray-100 text-gray-600"
                    }`}>
                        {selectedIds.length} / {maxPlayers}
                    </span>
                </div>
                <div className="relative mb-2 pt-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                        type="text"
                        value={playerFilter}
                        onChange={e => setPlayerFilter(e.target.value)}
                        placeholder="Search across all divisions…"
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] focus:border-transparent bg-white placeholder-gray-400"
                    />
                    {playerFilter && (
                        <button
                            type="button"
                            onClick={() => setPlayerFilter("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    )}
                </div>
                {divisionPlayersQuery.isPending && <p className="text-gray-500 text-sm">Loading…</p>}
                {!q && divisionPlayers.length < maxPlayers && !divisionPlayersQuery.isPending && (
                    <p className="text-amber-600 text-sm">{divisionLabel(division)} only has {divisionPlayers.length} players — need {maxPlayers}.</p>
                )}
                {q && unselectedPlayers.length === 0 && !allPlayersQuery.isPending && (
                    <p className="text-gray-500 text-sm">No players match "{playerFilter}".</p>
                )}
                {selectedPlayers.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                        {selectedPlayers.map(p => {
                            const isOtherDiv = p.division !== division;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => togglePlayer(p.id)}
                                    className="text-left px-3 py-2.5 rounded-lg text-sm border transition-colors bg-[#FF4200]/10 border-[#FF4200] text-[#333366] font-medium"
                                >
                                    <span className="mr-1">✓</span>
                                    {p.name}
                                    {isOtherDiv && (
                                        <span className="ml-1.5 text-xs font-normal text-gray-400">(Div {p.division === 6 ? "Beg." : p.division})</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
                {unselectedPlayers.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                        {unselectedPlayers.map(p => {
                            const isOtherDiv = p.division !== division;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => togglePlayer(p.id)}
                                    className="text-left px-3 py-2.5 rounded-lg text-sm border transition-colors border-gray-200 text-gray-700 hover:border-[#FF4200]/50"
                                >
                                    {p.name}
                                    {isOtherDiv && (
                                        <span className="ml-1.5 text-xs font-normal text-gray-400">(Div {p.division === 6 ? "Beg." : p.division})</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
                type="submit"
                disabled={create.isPending}
                className="w-full sm:w-auto bg-[#FF4200] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
            >
                {create.isPending ? "Creating…" : "Create & Generate Schedule"}
            </button>
        </form>
    );
}


// ─── Team Americano ──────────────────────────────────────────────────────────

function PlayerPicker({
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
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors truncate ${
                    selected
                        ? "border-gray-300 text-gray-800 bg-white hover:border-[#FF4200]"
                        : "border-dashed border-gray-300 text-gray-400 bg-white hover:border-[#FF4200] hover:text-[#FF4200]"
                }`}
            >
                {selected ? selected.name : placeholder}
            </button>
            {open && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === "Escape" && setOpen(false)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                            placeholder="Search…"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <p className="text-sm text-gray-400 px-3 py-2">No players available</p>
                        ) : (
                            filtered.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => { onChange(p.id); setOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-[#FF4200]/5 hover:text-[#FF4200] flex items-center justify-between"
                                >
                                    <span>{p.name}</span>
                                    <span className="text-xs text-gray-400 ml-2 shrink-0">Div {p.division === 6 ? "Beg" : p.division}</span>
                                </button>
                            ))
                        )}
                    </div>
                    {value && (
                        <div className="border-t border-gray-100 p-1.5">
                            <button
                                type="button"
                                onClick={() => { onChange(""); setOpen(false); }}
                                className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 rounded-lg"
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

function CreateTeamAmericanoForm({ onCreated, onBack }: { onCreated: () => void; onBack: () => void }) {
    const [name, setName] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [division, setDivision] = useState(4);
    const [pointsPerGame, setPointsPerGame] = useState(32);
    const [teams, setTeams] = useState<[string, string][]>([["", ""], ["", ""], ["", ""], ["", ""]]);
    const [error, setError] = useState("");

    const allPlayersQuery = trpc.division.allPlayers.useQuery();
    const allPlayers = allPlayersQuery.data ?? [];

    const create = trpc.tournament.createTeamAmericano.useMutation({
        onSuccess: onCreated,
        onError: (e) => setError(e.message),
    });

    const assignedIds = new Set(teams.flat().filter(Boolean));
    const numTeams = teams.length;
    const totalMatches = (numTeams * (numTeams - 1)) / 2;
    const numRounds = numTeams % 2 === 0 ? numTeams - 1 : numTeams;

    function updateTeam(i: number, slot: 0 | 1, playerId: string) {
        setTeams(prev => prev.map((t, idx) => idx === i ? (slot === 0 ? [playerId, t[1]] : [t[0], playerId]) : t));
    }

    function addTeam() {
        setTeams(prev => [...prev, ["", ""]]);
    }

    function removeTeam(i: number) {
        setTeams(prev => prev.filter((_, idx) => idx !== i));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!name.trim()) return setError("Tournament name is required.");
        if (teams.length < 2) return setError("At least 2 teams required.");
        for (let i = 0; i < teams.length; i++) {
            const [p1, p2] = teams[i];
            if (!p1 || !p2) return setError(`Team ${i + 1} is incomplete — select both players.`);
            if (p1 === p2) return setError(`Team ${i + 1} has the same player in both slots.`);
        }
        create.mutate({
            name: name.trim(),
            date,
            division,
            pointsPerGame,
            teams: teams.map(([p1, p2]) => ({ player1Id: p1, player2Id: p2 })),
        });
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-5 max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-800">Team Americano</h2>
                <button type="button" onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>
                    Back
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                    <input value={name} onChange={e => setName(e.target.value)} className={input} placeholder="e.g. Team Cup — Round 1" />
                </Field>
                <Field label="Date">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} />
                </Field>
            </div>

            <Field label="Division">
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map(d => (
                        <button key={d} type="button" onClick={() => setDivision(d)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${division === d ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600 hover:border-[#FF4200]"}`}>
                            {d === 6 ? "Beginner" : `${d} — ${DIVISION_NAMES[d]}`}
                        </button>
                    ))}
                </div>
            </Field>

            <Field label="Points per game">
                <div className="flex flex-wrap gap-2">
                    {[16, 24, 32].map(p => (
                        <button key={p} type="button" onClick={() => setPointsPerGame(p)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${pointsPerGame === p ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600 hover:border-[#FF4200]"}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </Field>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Teams</span>
                    <span className="text-xs text-gray-400">{numTeams} teams · {totalMatches} matches · {numRounds} rounds</span>
                </div>

                {teams.map(([p1, p2], i) => {
                    const excludeForSlot0 = new Set([...assignedIds].filter(id => id !== p1));
                    const excludeForSlot1 = new Set([...assignedIds].filter(id => id !== p2));
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500 w-14 shrink-0">Team {i + 1}</span>
                            <PlayerPicker value={p1} onChange={id => updateTeam(i, 0, id)} players={allPlayers} excludeIds={excludeForSlot0} placeholder="Player 1" />
                            <PlayerPicker value={p2} onChange={id => updateTeam(i, 1, id)} players={allPlayers} excludeIds={excludeForSlot1} placeholder="Player 2" />
                            {teams.length > 2 && (
                                <button type="button" onClick={() => removeTeam(i)}
                                    className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-400 rounded-lg border border-gray-200 hover:border-red-200 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                                </button>
                            )}
                        </div>
                    );
                })}

                <button type="button" onClick={addTeam}
                    className="inline-flex items-center gap-1.5 text-sm font-medium border border-dashed border-gray-300 text-gray-500 px-3 py-2 rounded-lg hover:border-[#FF4200] hover:text-[#FF4200] transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                    Add team
                </button>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={create.isPending}
                className="w-full sm:w-auto bg-[#FF4200] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors">
                {create.isPending ? "Creating…" : "Create & Generate Schedule"}
            </button>
        </form>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

type Resolution =
    | { kind: "link"; localPlayerId: string; localName: string }
    | { kind: "create"; gender?: "MALE" | "FEMALE" };

function ImportRankedinTab({ onImported, onBack }: { onImported: () => void; onBack?: () => void }) {
    const [url, setUrl] = useState("");
    const [division, setDivision] = useState(4);
    const [type, setType] = useState<TournamentType>("AMERICANO");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [name, setName] = useState("");
    const [resolutions, setResolutions] = useState<Record<number, Resolution>>({});
    const [error, setError] = useState("");
    const [imported, setImported] = useState(false);
    const qc = useQueryClient();

    const preview = trpc.tournament.previewRankedinImport.useMutation({
        onSuccess: (data) => {
            setName(data.name);
            if (data.date) setDate(data.date);
            setResolutions({});
            setError("");
        },
        onError: (e) => setError(e.message),
    });

    const importMutation = trpc.tournament.importFromRankedin.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.list) });
            setImported(true);
        },
        onError: (e) => setError(e.message),
    });

    const previewData = preview.data;

    function setResolution(rankedinId: number, res: Resolution) {
        setResolutions(prev => ({ ...prev, [rankedinId]: res }));
    }

    function handlePreview(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        preview.mutate({ url: url.trim() });
    }

    function handleImport(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!previewData) return;
        if (!name.trim()) return setError("Tournament name is required.");

        for (const p of previewData.unmatched) {
            const res = resolutions[p.rankedinId];
            if (!res) return setError(`Resolve player: ${p.displayName}`);
            if (res.kind === "create" && !res.gender) return setError(`Select gender for: ${p.displayName}`);
        }

        importMutation.mutate({
            tournamentId: previewData.tournamentId,
            name: name.trim(),
            date,
            division,
            type,
            playerResolutions: previewData.unmatched.map(p => {
                const res = resolutions[p.rankedinId]!;
                return res.kind === "link"
                    ? { rankedinId: p.rankedinId, localPlayerId: res.localPlayerId }
                    : { rankedinId: p.rankedinId, gender: res.gender };
            }),
        });
    }

    if (imported) {
        return (
            <div className="max-w-2xl">
                <div className="bg-white rounded-xl border border-green-200 p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                    </div>
                    <div>
                        <p className="text-base font-semibold text-gray-800">Tournament imported successfully</p>
                        <p className="text-sm text-gray-400 mt-1">ELO ratings have been recalculated for all players.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onImported}
                        className="bg-[#FF4200] text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-[#CC3500] transition-colors"
                    >
                        View Tournaments
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-2xl">
            {/* URL fetch card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-800">Import from Rankedin</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Paste an americano tournament URL to import all matches and scores.</p>
                    </div>
                    {onBack && (
                        <button type="button" onClick={onBack}
                            className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>
                            Back
                        </button>
                    )}
                </div>

                <form onSubmit={handlePreview}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rankedin URL</label>
                    {/* Stack on mobile, row on sm+ */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            value={url}
                            onChange={e => { setUrl(e.target.value); preview.reset(); }}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] focus:border-transparent bg-white placeholder-gray-400 min-w-0"
                            placeholder="https://www.rankedin.com/en/americano/71474/…"
                            type="url"
                        />
                        <button
                            type="submit"
                            disabled={preview.isPending || !url.trim()}
                            className="w-full sm:w-auto bg-[#FF4200] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                        >
                            {preview.isPending ? "Fetching…" : "Preview"}
                        </button>
                    </div>
                    {error && !previewData && (
                        <p className="mt-2 text-sm text-red-500">{error}</p>
                    )}
                </form>
            </div>

            {/* Import details card — appears after preview */}
            {previewData && (
                <form onSubmit={handleImport} className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">

                    {/* Stats strip */}
                    <div className="px-4 sm:px-6 py-4 flex gap-6">
                        <Stat label="Matches" value={previewData.totalMatches} />
                        <Stat label="Pts / game" value={previewData.pointsPerGame} />
                        <Stat label="Players" value={previewData.matched.length + previewData.unmatched.length} />
                    </div>

                    {/* Tournament details */}
                    <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tournament details</p>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input value={name} onChange={e => setName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] focus:border-transparent bg-white" />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] focus:border-transparent bg-white" />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Division</label>
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5, 6].map(d => (
                                    <button key={d} type="button" onClick={() => setDivision(d)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${division === d ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600 hover:border-[#FF4200]"}`}>
                                        {d === 6 ? "Beginner" : `${d} — ${DIVISION_NAMES[d]}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <div className="flex flex-wrap gap-2">
                                {(["AMERICANO", "AMERICANO_CHAMPIONS", "AMERICANO_GIRLS", "CHALLENGER"] as TournamentType[]).map(t => (
                                    <button key={t} type="button" onClick={() => setType(t)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${type === t ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600 hover:border-[#FF4200]"}`}>
                                        {TOURNAMENT_TYPE_LABELS[t]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Players */}
                    <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Players</p>

                        {previewData.matched.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-600">
                                    Found in database
                                    <span className="ml-2 text-xs font-normal text-gray-400">({previewData.matched.length})</span>
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {previewData.matched.map(p => (
                                        <div key={p.rankedinId} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-green-200 bg-green-50">
                                            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                                            <div className="min-w-0">
                                                <span className="text-sm font-medium text-green-800">{p.localName}</span>
                                                {p.localName !== p.displayName && (
                                                    <span className="block text-xs text-green-500 truncate">{p.displayName}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {previewData.unmatched.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-600">
                                    No exact match found
                                    <span className="ml-2 text-xs font-normal text-amber-500">({previewData.unmatched.length}) — review each player</span>
                                </p>
                                <div className="space-y-3">
                                    {previewData.unmatched.map(p => {
                                        const res = resolutions[p.rankedinId];
                                        const isLinked = res?.kind === "link";
                                        const isCreate = res?.kind === "create";
                                        return (
                                            <div key={p.rankedinId} className={`rounded-xl border px-3 sm:px-4 py-3.5 space-y-3 transition-colors ${isLinked ? "border-green-300 bg-green-50" : isCreate ? "border-blue-200 bg-blue-50/40" : "border-amber-200 bg-amber-50/50"}`}>
                                                {/* Header row — name + status badge */}
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <span className="text-sm font-semibold text-gray-800">{p.displayName}</span>
                                                    {isLinked && <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Linked</span>}
                                                    {isCreate && <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">New player</span>}
                                                    {!res && <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Needs review</span>}
                                                </div>

                                                {/* Candidates */}
                                                {p.candidates.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Similar players in database</p>
                                                        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                                                            {p.candidates.map(c => {
                                                                const chosen = isLinked && res.kind === "link" && res.localPlayerId === c.id;
                                                                return (
                                                                    <button
                                                                        key={c.id}
                                                                        type="button"
                                                                        onClick={() => setResolution(p.rankedinId, chosen ? { kind: "create" } : { kind: "link", localPlayerId: c.id, localName: c.name })}
                                                                        className={`inline-flex items-center gap-2 w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg border text-sm transition-colors ${chosen ? "bg-green-600 text-white border-green-600" : "bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:bg-green-50"}`}
                                                                    >
                                                                        {chosen && <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                                                                        <span className="font-medium">{c.name}</span>
                                                                        <span className={`text-xs ml-auto sm:ml-0 ${chosen ? "text-green-200" : "text-gray-400"}`}>Div {c.division === 6 ? "Beg" : c.division} · {Math.round(c.similarity * 100)}%</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Create new row */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setResolution(p.rankedinId, { kind: "create" })}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${isCreate ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-dashed border-gray-400 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200] bg-white"}`}
                                                    >
                                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                                                        {p.candidates.length > 0 ? "Create as new" : "Create new player"}
                                                    </button>
                                                    {(isCreate || (!isLinked && p.candidates.length === 0)) && (
                                                        <div className="flex gap-1.5">
                                                            {(["MALE", "FEMALE"] as const).map(g => {
                                                                const gender = res?.kind === "create" ? res.gender : undefined;
                                                                return (
                                                                    <button key={g} type="button"
                                                                        onClick={() => setResolution(p.rankedinId, { kind: "create", gender: g })}
                                                                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${gender === g ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 bg-white text-gray-600 hover:border-[#FF4200]"}`}>
                                                                        {g === "MALE" ? "Male" : "Female"}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={importMutation.isPending}
                            className="w-full sm:w-auto bg-[#FF4200] text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                        >
                            {importMutation.isPending ? "Importing…" : "Import Tournament"}
                        </button>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                </form>
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-800">{value}</span>
            <span className="text-xs text-gray-400 mt-0.5">{label}</span>
        </div>
    );
}

function PlayersTab() {
    const qc = useQueryClient();
    const [name, setName] = useState("");
    const [division, setDivision] = useState(6);
    const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
    const [error, setError] = useState("");
    const [eloMsg, setEloMsg] = useState("");

    const players = trpc.player.list.useQuery();
    const create = trpc.player.create.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.player.list) });
            setName("");
            setGender("MALE");
            setError("");
        },
        onError: (e) => setError(e.message),
    });
    const remove = trpc.player.delete.useMutation({
        onSuccess: () => qc.invalidateQueries({ queryKey: getQueryKey(trpc.player.list) }),
    });
    const recalcElo = trpc.player.recalculateElo.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.player.list) });
            setEloMsg("ELO recalculated successfully.");
            setTimeout(() => setEloMsg(""), 4000);
        },
        onError: (e) => setEloMsg(`Error: ${e.message}`),
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
            <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="text-base font-semibold text-gray-800">Add Player</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 space-y-1.5">
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={`${input} w-full`}
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
                                                        {p.division === 6 ? "Beginner" : `Div ${p.division}`} · {p.gender === "MALE" ? "♂" : "♀"}
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
                        className={`${input} self-start`}
                    >
                        {[1, 2, 3, 4, 5, 6].map(d => (
                            <option key={d} value={d}>{d === 6 ? "Beginner" : `Div ${d} — ${DIVISION_NAMES[d]}`}</option>
                        ))}
                    </select>
                    <select
                        value={gender}
                        onChange={e => setGender(e.target.value as "MALE" | "FEMALE")}
                        className={`${input} self-start`}
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
                {players.isPending && <p className="text-gray-500 p-4">Loading…</p>}
                <table className="w-full text-sm min-w-[300px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-4 py-2 text-gray-600 font-medium">Player</th>
                            <th className="text-left px-4 py-2 text-gray-600 font-medium hidden sm:table-cell">Division</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.data?.map(p => (
                            <tr key={p.id} className="border-b border-gray-100 last:border-0">
                                <td className="px-4 py-2 font-medium text-gray-800">
                                    <div>{p.name}</div>
                                    <div className="text-xs text-gray-400 sm:hidden">{p.division === 6 ? "Beginner" : `Div ${p.division} — ${DIVISION_NAMES[p.division]}`}</div>
                                </td>
                                <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">{p.division === 6 ? "Beginner" : `Div ${p.division} — ${DIVISION_NAMES[p.division]}`}</td>
                                <td className="px-4 py-2 text-right">
                                    <button
                                        onClick={() => { if (confirm(`Delete "${p.name}"? This cannot be undone.`)) remove.mutate({ id: p.id }); }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-xs font-medium transition-colors"
                                        title="Delete player"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <h2 className="text-base font-semibold text-gray-800">Admin Tools</h2>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
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
                <p className="text-xs text-gray-400">Resets all ELO ratings to 1000 and replays every completed tournament in chronological order.</p>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            {children}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        UPCOMING: "bg-blue-100 text-blue-700",
        IN_PROGRESS: "bg-yellow-100 text-yellow-700",
        COMPLETED: "bg-green-100 text-green-700",
    };
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

const input = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-full sm:w-auto";

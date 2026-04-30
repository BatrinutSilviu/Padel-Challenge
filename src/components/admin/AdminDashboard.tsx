import { useState } from "react";
import { Link } from "react-router-dom";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";

type Tab = "players" | "tournaments" | "new-tournament";

const DIVISION_NAMES: Record<number, string> = {
    1: "Elite", 2: "Premier", 3: "Gold", 4: "Silver", 5: "Bronze", 6: "Beginner",
};

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
    const [tab, setTab] = useState<Tab>("tournaments");

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
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
    const { data, isPending } = trpc.tournament.list.useQuery();
    const active = data?.filter(t => t.status === "IN_PROGRESS") ?? [];
    const others = data?.filter(t => t.status !== "IN_PROGRESS") ?? [];

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
                                <span className="text-xs text-gray-400">Div {t.division} · {new Date(t.date).toLocaleDateString()}</span>
                            </div>
                            <Link
                                to={`/admin/tournament/${t.id}`}
                                className="text-sm bg-[#FF4200] text-white px-4 py-2 rounded-lg hover:bg-[#CC3500] transition-colors self-start sm:self-auto shrink-0"
                            >
                                Enter Scores
                            </Link>
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
                                <span className="text-xs text-gray-400">Div {t.division} · {new Date(t.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                <StatusBadge status={t.status} />
                                {t.status === "COMPLETED" && (
                                    <Link
                                        to={`/admin/tournament/${t.id}`}
                                        className="text-xs text-[#FF4200] hover:underline"
                                    >
                                        Edit scores
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

function NewTournamentTab({ onCreated }: { onCreated: () => void }) {
    const [division, setDivision] = useState(1);
    const [name, setName] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [error, setError] = useState("");

    const players = trpc.player.list.useQuery();
    const divisionPlayers = players.data?.filter(p => p.division === division) ?? [];

    const create = trpc.tournament.create.useMutation({
        onSuccess: onCreated,
        onError: (e) => setError(e.message),
    });

    function togglePlayer(id: string) {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 8 ? [...prev, id] : prev
        );
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!name.trim()) return setError("Tournament name is required.");
        if (selectedIds.length !== 8) return setError("Select exactly 8 players.");
        create.mutate({ name: name.trim(), date, division, playerIds: selectedIds });
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-5 max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-800">Create Tournament</h2>

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
                            onClick={() => { setDivision(d); setSelectedIds([]); }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                division === d
                                    ? "bg-[#FF4200] text-white border-[#FF4200]"
                                    : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
                            }`}
                        >
                            {d} — {DIVISION_NAMES[d]}
                        </button>
                    ))}
                </div>
            </Field>

            <Field label={`Players (${selectedIds.length}/8 selected)`}>
                {players.isPending && <p className="text-gray-500 text-sm">Loading…</p>}
                {divisionPlayers.length < 8 && !players.isPending && (
                    <p className="text-amber-600 text-sm">Division {division} only has {divisionPlayers.length} players — need 8.</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                    {divisionPlayers.map(p => {
                        const selected = selectedIds.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => togglePlayer(p.id)}
                                className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-colors ${
                                    selected
                                        ? "bg-[#FF4200]/10 border-[#FF4200] text-[#333366] font-medium"
                                        : "border-gray-200 text-gray-700 hover:border-[#FF4200]/50"
                                }`}
                            >
                                {selected && <span className="mr-1">✓</span>}{p.name}
                            </button>
                        );
                    })}
                </div>
            </Field>

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

function PlayersTab() {
    const qc = useQueryClient();
    const [name, setName] = useState("");
    const [division, setDivision] = useState(6);
    const [error, setError] = useState("");

    const players = trpc.player.list.useQuery();
    const create = trpc.player.create.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.player.list) });
            setName("");
            setError("");
        },
        onError: (e) => setError(e.message),
    });
    const remove = trpc.player.delete.useMutation({
        onSuccess: () => qc.invalidateQueries({ queryKey: getQueryKey(trpc.player.list) }),
    });

    function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return setError("Name is required.");
        create.mutate({ name: name.trim(), division });
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="text-base font-semibold text-gray-800">Add Player</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={`${input} flex-1`}
                        placeholder="Player name"
                    />
                    <select
                        value={division}
                        onChange={e => setDivision(Number(e.target.value))}
                        className={input}
                    >
                        {[1, 2, 3, 4, 5, 6].map(d => (
                            <option key={d} value={d}>Div {d} — {DIVISION_NAMES[d]}</option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        disabled={create.isPending}
                        className="bg-[#FF4200] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
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
                                    <div className="text-xs text-gray-400 sm:hidden">Div {p.division} — {DIVISION_NAMES[p.division]}</div>
                                </td>
                                <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">Div {p.division} — {DIVISION_NAMES[p.division]}</td>
                                <td className="px-4 py-2">
                                    <button
                                        onClick={() => remove.mutate({ id: p.id })}
                                        className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
                                        title="Delete player"
                                    >
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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

import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";
import { useState } from "react";

const DIVISION_NAMES: Record<number, string> = {
    1: "Elite",
    2: "Premier",
    3: "Gold",
    4: "Silver",
    5: "Bronze",
    6: "Beginner",
};

type Tab = "divisions" | "players" | "tournaments";

export function HomePage() {
    const [tab, setTab] = useState<Tab>("divisions");

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
                <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit overflow-x-auto max-w-full">
                    {(["divisions", "players", "tournaments"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 md:px-6 md:py-2.5 rounded-lg text-sm md:text-base font-medium capitalize transition-colors whitespace-nowrap ${
                                tab === t
                                    ? "bg-[#FF4200] text-white"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {tab === "divisions" && <DivisionsTab />}
                {tab === "players" && <PlayersTab />}
                {tab === "tournaments" && <TournamentsTab />}
            </main>
        </div>
    );
}

const DIVISION_BADGES: Record<number, { label: string; className: string }> = {
    1: { label: "Elite",   className: "bg-amber-100 text-amber-700 border border-amber-300" },
    2: { label: "Premier", className: "bg-slate-100 text-slate-600 border border-slate-300" },
    3: { label: "Gold",    className: "bg-yellow-100 text-yellow-700 border border-yellow-300" },
    4: { label: "Silver",  className: "bg-gray-100 text-gray-500 border border-gray-300" },
    5: { label: "Bronze",   className: "bg-orange-100 text-orange-700 border border-orange-300" },
    6: { label: "Beginner", className: "bg-green-100 text-green-700 border border-green-300" },
};

function DivisionsTab() {
    const { data, isPending } = trpc.division.list.useQuery();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isPending && <p className="text-gray-500">Loading…</p>}
            {data?.map(({ division, playerCount }) => {
                const badge = DIVISION_BADGES[division];
                return (
                    <Link
                        key={division}
                        to={`/division/${division}`}
                        className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#FF4200] hover:shadow-md transition-all"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-lg font-semibold text-gray-800">Division {division}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                                {badge.label}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">{playerCount} player{playerCount !== 1 ? "s" : ""}</p>
                    </Link>
                );
            })}
        </div>
    );
}

const DIVISION_COLORS: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200" },
    2: { bg: "bg-slate-50",   text: "text-slate-600",  border: "border-slate-200" },
    3: { bg: "bg-yellow-50",  text: "text-yellow-700", border: "border-yellow-200" },
    4: { bg: "bg-gray-50",    text: "text-gray-600",   border: "border-gray-200" },
    5: { bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200" },
    6: { bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200" },
};

function initials(name: string) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function PlayersTab() {
    const { data, isPending } = trpc.player.list.useQuery();
    const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");

    if (isPending) return <p className="text-gray-500">Loading…</p>;
    if (!data?.length) return <p className="text-gray-500">No players yet.</p>;

    const filtered = genderFilter === "ALL" ? data : data.filter(p => p.gender === genderFilter);

    // Overall rank: division 1 best → division 6 worst, within each division by avgPoints desc
    // data is already sorted this way by the backend — use full list for rank, not filtered
    const overallRanks = new Map(data.map((p, i) => [p.id, i + 1]));

    const groups = [1, 2, 3, 4, 5, 6].map(d => ({
        division: d,
        players: filtered.filter(p => p.division === d),
    })).filter(g => g.players.length > 0);

    return (
        <div className="space-y-4">
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
                {(["ALL", "MALE", "FEMALE"] as const).map(g => (
                    <button
                        key={g}
                        onClick={() => setGenderFilter(g)}
                        className={`px-4 py-1.5 md:px-5 md:py-2 rounded-lg text-sm md:text-base font-medium transition-colors ${
                            genderFilter === g ? "bg-[#FF4200] text-white" : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        {g === "ALL" ? "All" : g === "MALE" ? "♂ Male" : "♀ Female"}
                    </button>
                ))}
            </div>

            {groups.map(({ division, players }) => {
                const colors = DIVISION_COLORS[division];
                return (
                    <div key={division} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <Link
                            to={`/division/${division}`}
                            className={`flex items-center justify-between px-4 py-3 ${colors.bg} border-b ${colors.border} hover:opacity-80 transition-opacity`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`font-semibold ${colors.text}`}>Division {division}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors.border} ${colors.text}`}>
                                    {DIVISION_NAMES[division]}
                                </span>
                            </div>
                            <span className="text-xs text-gray-400">{players.length} players</span>
                        </Link>

                        <div>
                            {players.map((player, divRank) => {
                                const overallRank = overallRanks.get(player.id)!;
                                return (
                                    <Link
                                        key={player.id}
                                        to={`/player/${player.id}`}
                                        className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                                    >
                                        {/* Division rank */}
                                        <span className={`text-sm font-bold w-6 text-center shrink-0 ${
                                            divRank === 0 ? "text-amber-500" :
                                            divRank === 1 ? "text-gray-400" :
                                            divRank === 2 ? "text-orange-400" : "text-gray-300"
                                        }`}>
                                            {divRank === 0 ? "🥇" : divRank === 1 ? "🥈" : divRank === 2 ? "🥉" : divRank + 1}
                                        </span>

                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${colors.bg} ${colors.text}`}>
                                            {initials(player.name)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium text-gray-800 text-sm truncate block">{player.name}</span>
                                            <span className="text-xs text-gray-400">Overall #{overallRank}</span>
                                        </div>

                                        {player.avgPoints > 0 ? (
                                            <div className="text-right shrink-0">
                                                <span className="text-sm font-semibold text-gray-700">{player.avgPoints}</span>
                                                <span className="text-xs text-gray-400 ml-1">avg</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-300 shrink-0">—</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TournamentsTab() {
    const { data, isPending } = trpc.tournament.list.useQuery();
    return (
        <div className="space-y-2">
            {isPending && <p className="text-gray-500">Loading…</p>}
            {data?.length === 0 && <p className="text-gray-500">No tournaments yet.</p>}
            {data?.map(t => (
                <Link
                    key={t.id}
                    to={`/tournament/${t.id}`}
                    className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-[#FF4200] hover:shadow-sm transition-all gap-3"
                >
                    <div className="min-w-0">
                        <span className="font-medium text-gray-800 block truncate">{t.name}</span>
                        <span className="text-xs text-gray-500">Division {t.division}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400 hidden sm:inline">{new Date(t.date).toLocaleDateString()}</span>
                        <StatusBadge status={t.status} />
                    </div>
                </Link>
            ))}
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

import { Link, useSearchParams } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";
import { useState } from "react";

import { DIVISION_NAMES, DIVISION_BADGES, DIVISION_COLORS, divisionLabel } from "../lib/divisions";
import { TournamentType, TOURNAMENT_TYPE_LABELS } from "../lib/tournaments";
import { BADGE_META, BadgeType } from "../lib/badges";

type Tab = "divisions" | "players" | "tournaments";

export function HomePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get("tab") as Tab) ?? "divisions";
    const setTab = (t: Tab) => setSearchParams({ tab: t });

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
                            <span className="text-lg font-semibold text-gray-800">{divisionLabel(division)}</span>
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


function initials(name: string) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function PlayersTab() {
    const { data, isPending } = trpc.player.list.useQuery();
    const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
    const [search, setSearch] = useState("");

    if (isPending) return <p className="text-gray-500">Loading…</p>;
    if (!data?.length) return <p className="text-gray-500">No players yet.</p>;

    const filtered = data
        .filter(p => genderFilter === "ALL" || p.gender === genderFilter)
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    // Competition ranking: tied players (same avgPoints + avgWonRounds) share the same rank.
    const overallRanks = new Map<string, number>();
    data.forEach((p, i) => {
        const prev = data[i - 1];
        const tied = prev && p.avgPoints === prev.avgPoints && p.avgWonRounds === prev.avgWonRounds;
        overallRanks.set(p.id, tied ? overallRanks.get(prev.id)! : i + 1);
    });

    const groups = [1, 2, 3, 4, 5, 6].map(d => ({
        division: d,
        players: filtered.filter(p => p.division === d),
    })).filter(g => g.players.length > 0);


    return (
        <div className="space-y-4">
            <div className="relative group">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#FF4200] transition-colors pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search players…"
                    className="w-full pl-11 pr-10 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:border-[#FF4200] transition-colors"
                />
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 transition-colors text-xs"
                    >
                        ✕
                    </button>
                )}
            </div>
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

            {groups.length === 0 && <p className="text-gray-500">No players found.</p>}

            {groups.map(({ division, players }) => {
                const colors = DIVISION_COLORS[division];
                return (
                    <div key={division} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <Link
                            to={`/division/${division}`}
                            className={`flex items-center justify-between px-4 py-3 ${colors.bg} border-b ${colors.border} hover:opacity-80 transition-opacity`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`font-semibold ${colors.text}`}>{divisionLabel(division)}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors.border} ${colors.text}`}>{DIVISION_NAMES[division]}</span>
                            </div>
                            <span className="text-xs text-gray-400">{players.length} players</span>
                        </Link>

                        <div>
                            {players.map((player, i) => {
                                const overallRank = overallRanks.get(player.id)!;
                                const prev = players[i - 1];
                                const divRank = prev && prev.avgPoints === player.avgPoints && prev.avgWonRounds === player.avgWonRounds
                                    ? players.findIndex(p => p.avgPoints === player.avgPoints && p.avgWonRounds === player.avgWonRounds)
                                    : i;
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
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-medium text-gray-800 text-sm truncate">{player.name}</span>
                                                {(player.badges as BadgeType[]).map(badge => (
                                                    <span key={badge} title={BADGE_META[badge].description} className="text-sm shrink-0">{BADGE_META[badge].emoji}</span>
                                                ))}
                                            </div>
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
    const [divisionFilter, setDivisionFilter] = useState<number | "ALL">("ALL");
    const [typeFilter, setTypeFilter] = useState<TournamentType | "ALL">("ALL");

    const filtered = (data ?? [])
        .filter(t => divisionFilter === "ALL" || t.division === divisionFilter)
        .filter(t => typeFilter === "ALL" || t.type === typeFilter);

    const activeDivisions = [...new Set((data ?? []).map(t => t.division))].sort((a, b) => a - b);

    return (
        <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Division</span>
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            onClick={() => setDivisionFilter("ALL")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${divisionFilter === "ALL" ? "bg-[#FF4200] text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                            All
                        </button>
                        {activeDivisions.map(d => (
                            <button
                                key={d}
                                onClick={() => setDivisionFilter(d)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${divisionFilter === d ? "bg-[#FF4200] text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                {divisionLabel(d)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-gray-100" />

                <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</span>
                    <div className="flex flex-wrap gap-1.5">
                        {(["ALL", "AMERICANO", "AMERICANO_CHAMPIONS", "CHALLENGER"] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${typeFilter === type ? "bg-[#FF4200] text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                {type === "ALL" ? "All" : TOURNAMENT_TYPE_LABELS[type]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {isPending && <p className="text-gray-500">Loading…</p>}
                {!isPending && filtered.length === 0 && <p className="text-gray-500">No tournaments found.</p>}
                {filtered.map(t => (
                <Link
                    key={t.id}
                    to={`/tournament/${t.id}`}
                    className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-[#FF4200] hover:shadow-sm transition-all gap-3"
                >
                    <div className="min-w-0">
                        <span className="font-medium text-gray-800 block truncate">{t.name}</span>
                        <span className="text-xs text-gray-500">{divisionLabel(t.division)} · {TOURNAMENT_TYPE_LABELS[t.type as TournamentType] ?? t.type}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400 hidden sm:inline">{new Date(t.date).toLocaleDateString()}</span>
                        <StatusBadge status={t.status} />
                    </div>
                </Link>
                ))}
            </div>
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

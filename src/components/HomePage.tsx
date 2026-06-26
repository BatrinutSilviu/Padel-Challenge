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
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8">
                <div className="flex gap-1 bg-white border border-[#E5E5EA] rounded-2xl p-1 mb-6 w-full sm:w-fit shadow-sm">
                    {(["divisions", "players", "tournaments"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 sm:flex-none px-4 py-2 md:px-6 md:py-2.5 rounded-xl text-sm md:text-base font-bold capitalize transition-all whitespace-nowrap ${
                                tab === t
                                    ? "bg-[#FF4200] text-white shadow-sm"
                                    : "text-[#8E8E93] hover:text-[#1A1A2E]"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isPending && <p className="text-[#8E8E93]">Loading…</p>}
            {data?.map(({ division, playerCount }) => {
                const badge = DIVISION_BADGES[division];
                return (
                    <Link
                        key={division}
                        to={`/division/${division}`}
                        className="bg-white rounded-2xl border border-[#E5E5EA] p-5 hover:border-[#FF4200]/40 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-black text-[#1A1A2E] group-hover:text-[#FF4200] transition-colors">{divisionLabel(division)}</span>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.className}`}>
                                {badge.label}
                            </span>
                        </div>
                        <p className="text-sm text-[#8E8E93] font-medium">{playerCount} player{playerCount !== 1 ? "s" : ""}</p>
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

    if (isPending) return <p className="text-[#8E8E93]">Loading…</p>;
    if (!data?.length) return <p className="text-[#8E8E93]">No players yet.</p>;

    const filtered = data
        .filter(p => genderFilter === "ALL" || p.gender === genderFilter)
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    const sortedByElo = [...data].sort((a, b) => b.elo - a.elo);
    const overallRanks = new Map<string, number>();
    sortedByElo.forEach((p, i) => {
        const prev = sortedByElo[i - 1];
        const tied = prev && p.elo === prev.elo;
        overallRanks.set(p.id, tied ? overallRanks.get(prev.id)! : i + 1);
    });

    const groups = [1, 2, 3, 4, 5, 6, 7].map(d => ({
        division: d,
        players: filtered
            .filter(p => p.highestDivisionPlayed === d)
            .sort((a, b) => b.elo - a.elo),
    })).filter(g => g.players.length > 0);

    return (
        <div className="space-y-4">
            <div className="relative group">
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93] group-focus-within:text-[#FF4200] transition-colors pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search players…"
                    className="w-full pl-11 pr-10 py-3 bg-white border-2 border-[#E5E5EA] rounded-2xl text-sm text-[#1A1A2E] placeholder-[#8E8E93] shadow-sm focus:outline-none focus:border-[#FF4200] transition-colors"
                />
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-[#E5E5EA] hover:bg-gray-300 text-[#8E8E93] transition-colors text-xs"
                    >
                        ✕
                    </button>
                )}
            </div>
            <div className="flex gap-1 bg-white border border-[#E5E5EA] rounded-2xl p-1 w-fit shadow-sm">
                {(["ALL", "MALE", "FEMALE"] as const).map(g => (
                    <button
                        key={g}
                        onClick={() => setGenderFilter(g)}
                        className={`px-4 py-1.5 md:px-5 md:py-2 rounded-xl text-sm md:text-base font-bold transition-all ${
                            genderFilter === g ? "bg-[#FF4200] text-white shadow-sm" : "text-[#8E8E93] hover:text-[#1A1A2E]"
                        }`}
                    >
                        {g === "ALL" ? "All" : g === "MALE" ? "♂ Male" : "♀ Female"}
                    </button>
                ))}
            </div>

            {groups.length === 0 && <p className="text-[#8E8E93]">No players found.</p>}

            {groups.map(({ division, players }) => {
                const colors = DIVISION_COLORS[division];
                return (
                    <div key={division} className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
                        <Link
                            to={`/division/${division}`}
                            className={`flex items-center justify-between px-4 py-3 ${colors.bg} border-b ${colors.border} hover:opacity-80 transition-opacity`}
                        >
                            <div className="flex items-center gap-2">
                                <span className={`font-black text-sm ${colors.text}`}>{divisionLabel(division)}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors.border} ${colors.text}`}>{DIVISION_NAMES[division]}</span>
                            </div>
                            <span className="text-xs font-medium text-[#8E8E93]">{players.length} players</span>
                        </Link>

                        <div>
                            {players.map((player, i) => {
                                const overallRank = overallRanks.get(player.id)!;
                                const prev = players[i - 1];
                                const divRank = prev && prev.elo === player.elo
                                    ? players.findIndex(p => p.elo === player.elo)
                                    : i;
                                return (
                                    <Link
                                        key={player.id}
                                        to={`/player/${player.id}`}
                                        className="flex items-center gap-3 px-4 py-3 border-b border-[#F5F5F7] last:border-0 hover:bg-[#F5F5F7] transition-colors"
                                    >
                                        <span className={`text-sm font-black w-6 text-center shrink-0 ${
                                            divRank === 0 ? "text-amber-500" :
                                            divRank === 1 ? "text-gray-400" :
                                            divRank === 2 ? "text-orange-400" : "text-[#E5E5EA]"
                                        }`}>
                                            {divRank === 0 ? "🥇" : divRank === 1 ? "🥈" : divRank === 2 ? "🥉" : divRank + 1}
                                        </span>

                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${colors.bg} ${colors.text}`}>
                                            {initials(player.name)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-semibold text-[#1A1A2E] text-sm truncate">{player.name}</span>
                                                {(player.badges as BadgeType[]).map(badge => (
                                                    <span key={badge} title={BADGE_META[badge].description} className="text-sm shrink-0">{BADGE_META[badge].emoji}</span>
                                                ))}
                                            </div>
                                            {division !== 7 && <span className="text-xs text-[#8E8E93]">Overall #{overallRank}</span>}
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {player.avgPoints > 0 && (
                                                <div className="text-right hidden sm:block">
                                                    <span className="text-sm font-bold text-[#8E8E93]">{player.avgPoints}</span>
                                                    <span className="text-xs text-[#8E8E93] ml-1">avg</span>
                                                </div>
                                            )}
                                            <div className="text-right">
                                                <span className="text-sm font-black text-[#FF4200]">{player.elo}</span>
                                                <span className="text-xs text-[#8E8E93] ml-1">ELO</span>
                                            </div>
                                        </div>
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
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Division</span>
                    <div className="flex flex-wrap gap-1.5">
                        <FilterChip active={divisionFilter === "ALL"} onClick={() => setDivisionFilter("ALL")}>All</FilterChip>
                        {activeDivisions.map(d => (
                            <FilterChip key={d} active={divisionFilter === d} onClick={() => setDivisionFilter(d)}>
                                {divisionLabel(d)}
                            </FilterChip>
                        ))}
                    </div>
                </div>

                <div className="border-t border-[#F5F5F7]" />

                <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Type</span>
                    <div className="flex flex-wrap gap-1.5">
                        {(["ALL", "AMERICANO", "AMERICANO_CHAMPIONS", "AMERICANO_GIRLS", "CHALLENGER", "TEAM_AMERICANO"] as const).map(type => (
                            <FilterChip key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>
                                {type === "ALL" ? "All" : TOURNAMENT_TYPE_LABELS[type]}
                            </FilterChip>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {isPending && <p className="text-[#8E8E93]">Loading…</p>}
                {!isPending && filtered.length === 0 && <p className="text-[#8E8E93]">No tournaments found.</p>}
                {filtered.map(t => (
                    <Link
                        key={t.id}
                        to={`/tournament/${t.id}`}
                        className={`flex items-center justify-between bg-white rounded-2xl border px-4 py-3.5 hover:border-[#FF4200]/40 hover:shadow-sm transition-all gap-3 ${
                            t.status === "IN_PROGRESS"
                                ? "border-l-[3px] border-l-[#FF4200] border-[#E5E5EA]"
                                : "border-[#E5E5EA]"
                        }`}
                    >
                        <div className="min-w-0">
                            <span className="font-bold text-[#1A1A2E] block truncate">{t.name}</span>
                            <span className="text-xs text-[#8E8E93] font-medium">{divisionLabel(t.division)} · {TOURNAMENT_TYPE_LABELS[t.type as TournamentType] ?? t.type}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-[#8E8E93] hidden sm:inline">{new Date(t.date).toLocaleDateString()}</span>
                            <StatusBadge status={t.status} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                active ? "bg-[#FF4200] text-white shadow-sm" : "bg-[#F5F5F7] text-[#8E8E93] hover:text-[#1A1A2E]"
            }`}
        >
            {children}
        </button>
    );
}

export function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        UPCOMING: "bg-sky-50 text-sky-600",
        IN_PROGRESS: "bg-[#FF4200]/10 text-[#FF4200]",
        COMPLETED: "bg-emerald-50 text-emerald-600",
    };
    const labels: Record<string, string> = {
        UPCOMING: "Upcoming",
        IN_PROGRESS: "Live",
        COMPLETED: "Completed",
    };
    return (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${styles[status] ?? "bg-[#F5F5F7] text-[#8E8E93]"}`}>
            {labels[status] ?? status}
        </span>
    );
}

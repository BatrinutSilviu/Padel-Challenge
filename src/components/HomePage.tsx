import { Link, useSearchParams } from "react-router-dom";
import { trpc } from "../trpc";
import type { RouterOutputs } from "../backendRouter";
import { NavBar } from "./NavBar";
import { useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { AccountStatusNotice } from "./auth/AccountStatus";

import { DIVISION_COLORS, divisionLabel, useDivisionDescriptions } from "../lib/divisions";
import { TournamentType, TOURNAMENT_TYPE_LABELS, spotsLeft } from "../lib/tournaments";
import { BADGE_META, BadgeType } from "../lib/badges";
import { RankingPointsInfo } from "./RankingPointsInfo";
import { TournamentCard } from "./TournamentCard";
import { SupportContact } from "./SupportContact";
import { useRankingSystem } from "../lib/ranking";

type Tab = "divisions" | "players" | "tournaments";

// Partner invitations waiting for the logged-in player: someone signed up and picked them as
// their partner; they join that tournament when they accept it on its page.
function PartnerInvitations() {
    const { token, playerId } = useAuth();
    const { data } = trpc.tournament.myInvitations.useQuery(undefined, { enabled: !!token && !!playerId });
    if (!data?.length) return null;
    return (
        <div className="space-y-2 mb-6">
            {data.map(inv => (
                <Link key={inv.tournament.id} to={`/tournament/${inv.tournament.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#FF4200]/40 bg-white px-4 py-3 shadow-sm hover:border-[#FF4200]">
                    <span className="text-sm text-[#1A1A2E] min-w-0">
                        🤝 <span className="font-bold">{inv.from}</span> invited you to play together in <span className="font-bold">{inv.tournament.name}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-[#FF4200]">Answer →</span>
                </Link>
            ))}
        </div>
    );
}

export function HomePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get("tab") as Tab) ?? "divisions";
    const setTab = (t: Tab) => setSearchParams({ tab: t });

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8">
                <AccountStatusNotice className="mb-6" />
                <PartnerInvitations />
                <OpenSignups />

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

                <div className="mt-6 space-y-3">
                    <SupportContact />
                    <p className="text-center text-xs text-[#8E8E93]">
                        <Link to="/privacy" className="hover:text-[#FF4200]">Politica de confidențialitate (GDPR)</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}


type MySignup = RouterOutputs["tournament"]["mySignups"][number];

// Tournaments taking sign-ups, at the top of every tab so players find them; for a
// logged-in player, the ones they're already on say so.
function OpenSignups() {
    const { token } = useAuth();
    const { data } = trpc.tournament.list.useQuery();
    const { data: mine } = trpc.tournament.mySignups.useQuery(undefined, { enabled: !!token });
    const mySignups = new Map<string, MySignup>((token ? mine ?? [] : []).map(s => [s.tournamentId, s]));
    const openForSignup = (data ?? []).filter(t => t.status === "UPCOMING" && t.registrationOpen);

    return (
        <>
        {openForSignup.length > 0 && (
            <section className="space-y-2 mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Open for sign-up</h2>
                {openForSignup.map(t => {
                    const left = spotsLeft(t);
                    const mine = mySignups.get(t.id);
                    return (
                        <TournamentCard
                            key={t.id}
                            tournament={t}
                            highlight
                            aside={mine ? (
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap ${
                                    mine.confirmed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                }`}>
                                    {mine.confirmed ? "You're in" : "On waiting list"}
                                </span>
                            ) : (
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap ${
                                    left === 0 ? "bg-[#F5F5F7] text-[#8E8E93]" : "bg-[#FF4200] text-white"
                                }`}>
                                    {left === 0 ? "Waiting list" : "Join"}
                                </span>
                            )}
                        />
                    );
                })}
            </section>
        )}
        </>
    );
}

function DivisionsTab() {
    const { data, isPending } = trpc.division.list.useQuery();
    const describe = useDivisionDescriptions();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isPending && <p className="text-[#8E8E93]">Loading…</p>}
            {data?.map(({ division, playerCount }) => {
                return (
                    <Link
                        key={division}
                        to={`/division/${division}`}
                        className="bg-white rounded-2xl border border-[#E5E5EA] p-5 hover:border-[#FF4200]/40 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-black text-[#1A1A2E] group-hover:text-[#FF4200] transition-colors">{divisionLabel(division)}</span>
                            
                        </div>
                        {describe(division) && <p className="text-sm text-[#3A3A4E] leading-snug line-clamp-2 mb-1.5">{describe(division)}</p>}
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
    const { isPoints, scoreOf, unit } = useRankingSystem();
    const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
    const [search, setSearch] = useState("");

    if (isPending) return <p className="text-[#8E8E93]">Loading…</p>;
    if (!data?.length) return <p className="text-[#8E8E93]">No players yet.</p>;

    const filtered = data
        .filter(p => genderFilter === "ALL" || p.gender === genderFilter)
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    const sortedByPoints = [...data].sort((a, b) => scoreOf(b) - scoreOf(a));
    const overallRanks = new Map<string, number>();
    sortedByPoints.forEach((p, i) => {
        const prev = sortedByPoints[i - 1];
        const tied = prev && scoreOf(p) === scoreOf(prev);
        overallRanks.set(p.id, tied ? overallRanks.get(prev.id)! : i + 1);
    });

    const groups = [1, 2, 3, 4, 5, 6].map(d => ({
        division: d,
        players: filtered
            .filter(p => p.highestDivisionPlayed === d)
            .sort((a, b) => scoreOf(b) - scoreOf(a)),
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
            {isPoints && <RankingPointsInfo />}
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
                            </div>
                            <span className="text-xs font-medium text-[#8E8E93]">{players.length} players</span>
                        </Link>

                        <div>
                            {players.map((player, i) => {
                                const overallRank = overallRanks.get(player.id)!;
                                const prev = players[i - 1];
                                const divRank = prev && scoreOf(prev) === scoreOf(player)
                                    ? players.findIndex(p => scoreOf(p) === scoreOf(player))
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
                                            <span className="text-xs text-[#8E8E93]">Overall #{overallRank}</span>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {player.avgPoints > 0 && (
                                                <div className="text-right hidden sm:block">
                                                    <span className="text-sm font-bold text-[#8E8E93]">{player.avgPoints}</span>
                                                    <span className="text-xs text-[#8E8E93] ml-1">avg</span>
                                                </div>
                                            )}
                                            <div className="text-right">
                                                <span className="text-sm font-black text-[#FF4200]">{scoreOf(player)}</span>
                                                <span className="text-xs text-[#8E8E93] ml-1">{unit}</span>
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
                    <span className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Level</span>
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
                        {(["ALL", "AMERICANO", "AMERICANO_CHAMPIONS", "CHALLENGER", "TEAM_AMERICANO", "MASTERS"] as const).map(type => (
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
                    <TournamentCard key={t.id} tournament={t} aside={<StatusBadge status={t.status} />} />
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

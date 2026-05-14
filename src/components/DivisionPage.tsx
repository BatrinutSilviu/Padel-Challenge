import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";
import { DIVISION_NAMES, DIVISION_BADGES } from "../lib/divisions";
import { BADGE_META, BadgeType } from "../lib/badges";
import { StatusBadge } from "./HomePage";

export function DivisionPage() {
    const { id } = useParams<{ id: string }>();
    const division = Number(id);

    const standings = trpc.division.standings.useQuery({ division });
    const tournaments = trpc.tournament.list.useQuery({ division });

    if (isNaN(division) || division < 1 || division > 7) {
        return <div className="p-8 text-red-600">Invalid division.</div>;
    }

    const badge = DIVISION_BADGES[division];

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-6 sm:space-y-8">

                <div className="flex items-start gap-3">
                    <Link
                        to="/"
                        className="mt-1 shrink-0 text-[#8E8E93] hover:text-[#FF4200] transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-3xl font-black text-[#1A1A2E] tracking-tight leading-none">
                                {DIVISION_NAMES[division] ?? `Division ${division}`}
                            </h1>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.className}`}>
                                Division {division}
                            </span>
                        </div>
                    </div>
                </div>

                <section>
                    <SectionLabel>Standings</SectionLabel>
                    {standings.isPending && <p className="text-[#8E8E93]">Loading…</p>}
                    {standings.data?.length === 0 && <p className="text-[#8E8E93]">No players in this division.</p>}
                    <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
                        {(() => {
                            const byElo = (a: typeof standings.data[number], b: typeof standings.data[number]) =>
                                b.elo - a.elo || a.name.localeCompare(b.name);
                            const sorted = (standings.data ?? []).slice().sort(byElo);
                            return sorted.map((player, i) => {
                                const total = player.participations.reduce((s, p) => s + p.totalPoints, 0);
                                const avg = player.participations.length > 0
                                    ? Math.round(total / player.participations.length)
                                    : 0;
                                const prev = sorted[i - 1];
                                const rank = prev && prev.elo === player.elo ? sorted.findIndex(p => p.elo === player.elo) + 1 : i + 1;
                                return (
                                    <PlayerRow
                                        key={player.id}
                                        player={player}
                                        rank={rank}
                                        division={division}
                                        avg={avg}
                                    />
                                );
                            });
                        })()}
                    </div>
                    <div className="text-xs text-[#8E8E93] mt-2 space-y-0.5">
                        <p>▲ Promotion eligible — top 15% by ELO in this division.</p>
                        <p>▼ Relegation eligible — bottom 15% by ELO in this division.</p>
                        <p>Americano Champions results are not counted in standings.</p>
                    </div>
                </section>

                <section>
                    <SectionLabel>Tournaments</SectionLabel>
                    {tournaments.isPending && <p className="text-[#8E8E93]">Loading…</p>}
                    {tournaments.data?.length === 0 && <p className="text-[#8E8E93]">No tournaments in this division yet.</p>}
                    <div className="space-y-2">
                        {tournaments.data?.map(t => (
                            <Link
                                key={t.id}
                                to={`/tournament/${t.id}`}
                                className={`flex items-center justify-between bg-white rounded-2xl border px-4 py-3.5 hover:border-[#FF4200]/40 hover:shadow-sm transition-all gap-3 ${
                                    t.status === "IN_PROGRESS"
                                        ? "border-l-[3px] border-l-[#FF4200] border-[#E5E5EA]"
                                        : "border-[#E5E5EA]"
                                }`}
                            >
                                <span className="font-bold text-[#1A1A2E] truncate">{t.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-[#8E8E93] hidden sm:inline">
                                        {new Date(t.date).toLocaleDateString()}
                                    </span>
                                    <StatusBadge status={t.status} />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

type PlayerEntry = NonNullable<ReturnType<typeof trpc.division.standings.useQuery>["data"]>[number];

function PlayerRow({ player, rank, division, avg }: {
    player: PlayerEntry;
    rank: number;
    division: number;
    avg: number;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border-b border-[#F5F5F7] last:border-0">
            <div
                className="flex items-center justify-between px-4 py-3 hover:bg-[#F5F5F7] transition-colors cursor-pointer gap-2"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-black text-[#8E8E93] w-5 shrink-0 text-right">{rank}</span>
                    <Link
                        to={`/player/${player.id}`}
                        onClick={e => e.stopPropagation()}
                        className="font-semibold text-[#1A1A2E] truncate hover:text-[#FF4200] transition-colors"
                    >
                        {player.name}
                    </Link>
                    {(player.badges as BadgeType[]).map(badge => (
                        <span key={badge} title={BADGE_META[badge].description} className="text-base shrink-0">{BADGE_META[badge].emoji}</span>
                    ))}
                    {player.promotionEligible && (
                        <>
                            <span title="Eligible for promotion" className="text-sm shrink-0 text-emerald-500 font-bold">▲</span>
                            <span className={`hidden sm:inline text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${DIVISION_BADGES[division - 1].className}`}>
                                Div {division - 1}
                            </span>
                        </>
                    )}
                    {player.relegationEligible && (
                        <>
                            <span title="Eligible for relegation" className="text-sm shrink-0 text-red-500 font-bold">▼</span>
                            <span className={`hidden sm:inline text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${DIVISION_BADGES[division + 1].className}`}>
                                Div {division + 1}
                            </span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex gap-1 flex-wrap">
                        {player.participations.map(p => <RankBadge key={p.id} rank={p.finalRank} />)}
                    </div>
                    <div className="hidden sm:block text-right">
                        <span className="text-sm font-bold text-[#8E8E93]">{avg}</span>
                        <span className="text-xs text-[#8E8E93] ml-1">avg</span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-black text-[#FF4200]">{player.elo}</span>
                        <span className="text-xs text-[#8E8E93] ml-1">ELO</span>
                    </div>
                    <span className="sm:hidden text-[#8E8E93] text-xs w-3 text-center shrink-0">
                        {expanded ? "▴" : "▾"}
                    </span>
                </div>
            </div>

            {expanded && (
                <div className="sm:hidden px-4 pb-3 pl-11 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex gap-1 flex-wrap">
                            {player.participations.map(p => <RankBadge key={p.id} rank={p.finalRank} />)}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {player.promotionEligible && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${DIVISION_BADGES[division - 1].className}`}>
                                    Div {division - 1}
                                </span>
                            )}
                            {player.relegationEligible && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${DIVISION_BADGES[division + 1].className}`}>
                                    Div {division + 1}
                                </span>
                            )}
                            <span className="text-sm font-bold text-[#8E8E93]">{avg}</span>
                            <span className="text-xs text-[#8E8E93]">avg</span>
                        </div>
                    </div>
                    <Link
                        to={`/player/${player.id}`}
                        onClick={e => e.stopPropagation()}
                        className="block text-xs font-bold text-[#FF4200] hover:underline"
                    >
                        View profile →
                    </Link>
                </div>
            )}
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2.5 mb-3">
            <div className="w-1 h-4 rounded-full bg-[#FF4200]" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">{children}</h2>
        </div>
    );
}

function RankBadge({ rank }: { rank: number | null }) {
    if (rank === null) return null;
    const color = rank <= 3 ? "bg-[#9FD2DD]/30 text-[#333366]" : rank >= 6 ? "bg-red-100 text-red-600" : "bg-[#F5F5F7] text-[#8E8E93]";
    return (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>
            #{rank}
        </span>
    );
}

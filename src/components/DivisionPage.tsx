import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { trpc } from "../trpc";
import type { RouterOutputs } from "../backendRouter";
import { NavBar } from "./NavBar";
import { DIVISION_NAMES, DIVISION_BADGES, useDivisionDescriptions } from "../lib/divisions";
import { BADGE_META, BadgeType } from "../lib/badges";
import { StatusBadge } from "./HomePage";
import { TournamentCard } from "./TournamentCard";
import { formatCoefficient } from "../lib/levels";
import { useRankingSystem } from "../lib/ranking";

export function DivisionPage() {
    const { id } = useParams<{ id: string }>();
    const division = Number(id);

    const standings = trpc.division.standings.useQuery({ division });
    const tournaments = trpc.tournament.list.useQuery({ division });
    const { scoreOf, name: rankingName } = useRankingSystem();
    const describe = useDivisionDescriptions();

    if (isNaN(division) || division < 1 || division > 7) {
        return <div className="p-8 text-red-600">Invalid division.</div>;
    }

    return (
        <div className="min-h-screen bg-canvas">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-6 sm:space-y-8">

                <div className="flex items-start gap-3">
                    <Link
                        to="/?tab=divisions"
                        className="mt-1 shrink-0 text-muted hover:text-[#FF4200] transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-3xl font-bold text-ink tracking-tight leading-none">
                                {DIVISION_NAMES[division] ?? `Division ${division}`}
                            </h1>
                        </div>
                        {describe(division) && <p className="text-sm text-ink-2 mt-2 max-w-2xl">{describe(division)}</p>}
                    </div>
                </div>

                <section>
                    <SectionLabel>Standings</SectionLabel>
                    {standings.isPending && <p className="text-muted">Loading…</p>}
                    {standings.data?.length === 0 && <p className="text-muted">No players in this division.</p>}
                    <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
                        {(() => {
                            const byPoints = (a: PlayerEntry, b: PlayerEntry) =>
                                scoreOf(b) - scoreOf(a) || a.name.localeCompare(b.name);
                            const sorted = (standings.data ?? []).slice().sort(byPoints);
                            return sorted.map((player, i) => {
                                const prev = sorted[i - 1];
                                const rank = prev && scoreOf(prev) === scoreOf(player) ? sorted.findIndex(p => scoreOf(p) === scoreOf(player)) + 1 : i + 1;
                                return (
                                    <PlayerRow
                                        key={player.id}
                                        player={player}
                                        rank={rank}
                                        division={division}
                                    />
                                );
                            });
                        })()}
                    </div>
                    <div className="text-xs text-muted mt-2 space-y-0.5">
                        <p>▲ Promotion eligible — top 15% by {rankingName} in this division.</p>
                        <p>▼ Relegation eligible — bottom 15% by {rankingName} in this division.</p>
                        <p>Americano Champions results are not counted in standings.</p>
                    </div>
                </section>

                <section>
                    <SectionLabel>Tournaments</SectionLabel>
                    {tournaments.isPending && <p className="text-muted">Loading…</p>}
                    {tournaments.data?.length === 0 && <p className="text-muted">No tournaments in this division yet.</p>}
                    <div className="space-y-2">
                        {tournaments.data?.map(t => (
                            <TournamentCard key={t.id} tournament={t} aside={<StatusBadge status={t.status} />} />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

type PlayerEntry = RouterOutputs["division"]["standings"][number];

function PlayerRow({ player, rank, division }: {
    player: PlayerEntry;
    rank: number;
    division: number;
}) {
    const [expanded, setExpanded] = useState(false);
    const { scoreOf, unit } = useRankingSystem();

    return (
        <div className="border-b border-canvas last:border-0">
            <div
                className="flex items-center justify-between px-4 py-3 hover:bg-canvas transition-colors cursor-pointer gap-2"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-bold text-muted w-5 shrink-0 text-right">{rank}</span>
                    <Link
                        to={`/player/${player.id}`}
                        onClick={e => e.stopPropagation()}
                        className="font-semibold text-ink truncate hover:text-[#FF4200] transition-colors"
                    >
                        {player.name}
                    </Link>
                    {/* On a phone only the first badge fits beside the name; the rest are counted. */}
                    {(player.badges as BadgeType[]).map((badge, i) => (
                        <span key={badge} title={BADGE_META[badge].description} className={`text-base shrink-0 ${i > 0 ? "hidden sm:inline" : ""}`}>{BADGE_META[badge].emoji}</span>
                    ))}
                    {player.badges.length > 1 && (
                        <span className="sm:hidden text-[11px] font-bold text-muted shrink-0">+{player.badges.length - 1}</span>
                    )}
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
                    {player.level.coefficient !== null && (
                        <div className="text-right" title={`Level coefficient${player.level.provisional ? " (provisional — still settling)" : ""}`}>
                            <span className="text-sm font-bold text-[#9FD2DD] tabular-nums">{formatCoefficient(player.level.coefficient)}{player.level.provisional && "*"}</span>
                            <span className="hidden sm:inline text-xs text-muted ml-1">lvl</span>
                        </div>
                    )}
                    <div className="text-right">
                        <span className="text-sm font-bold text-[#FF4200]">{scoreOf(player)}</span>
                        <span className="text-xs text-muted ml-1">{unit}</span>
                    </div>
                    <span className="sm:hidden text-muted text-xs w-3 text-center shrink-0">
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
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">{children}</h2>
        </div>
    );
}

function RankBadge({ rank }: { rank: number | null }) {
    if (rank === null) return null;
    const color = rank <= 3 ? "bg-[#9FD2DD]/15 text-[#9FD2DD]" : rank >= 6 ? "bg-red-100 text-red-600" : "bg-canvas text-muted";
    return (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>
            #{rank}
        </span>
    );
}

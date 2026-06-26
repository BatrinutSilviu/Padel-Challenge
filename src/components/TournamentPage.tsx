import { useParams, Link } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";
import { divisionLabel } from "../lib/divisions";
import { tournamentTypeLabel } from "../lib/tournaments";
import { useState } from "react";
import { StatusBadge } from "./HomePage";

export function TournamentPage() {
    const { id } = useParams<{ id: string }>();
    const { data: tournament, isPending, error } = trpc.tournament.getById.useQuery({ id: id! });
    const [expandedRound, setExpandedRound] = useState<number | null>(null);

    if (isPending) return <LoadingPage />;
    if (error || !tournament) return <div className="p-8 text-red-600">Tournament not found.</div>;

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-5 sm:space-y-6">

                <Link
                    to="/?tab=tournaments"
                    className="text-[#8E8E93] hover:text-[#FF4200] transition-colors flex items-center gap-1.5 text-sm font-semibold"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Tournaments
                </Link>

                <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight">{tournament.name}</h1>
                            <p className="text-sm text-[#8E8E93] font-medium mt-1">
                                {new Date(tournament.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                {" · "}{divisionLabel(tournament.division)}
                                {" · "}{tournamentTypeLabel(tournament.type)}
                                {" · "}{tournament.participants.length} players
                            </p>
                        </div>
                        <StatusBadge status={tournament.status} />
                    </div>
                </div>

                {tournament.status === "COMPLETED" && tournament.participants.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Final Standings</h2>
                        {tournament.type === "TEAM_AMERICANO" ? (
                            <TeamStandings tournament={tournament} />
                        ) : (
                            <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden overflow-x-auto shadow-sm">
                                <table className="w-full text-sm min-w-[280px]">
                                    <thead className="border-b border-[#F5F5F7]">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93] w-12">Rank</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Player</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Points</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tournament.participants.map(p => (
                                            <tr key={p.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                                                <td className="px-4 py-3">
                                                    <RankMedal rank={p.finalRank ?? 0} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link to={`/player/${p.player.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] transition-colors">
                                                        {p.player.name}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-right font-black text-[#1A1A2E]">{p.totalPoints}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}

                <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Rounds</h2>
                    <div className="space-y-2">
                        {tournament.rounds.map(round => (
                            <div key={round.id} className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
                                <button
                                    onClick={() => setExpandedRound(expandedRound === round.roundNumber ? null : round.roundNumber)}
                                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F5F5F7] transition-colors"
                                >
                                    <span className="font-bold text-[#1A1A2E]">Round {round.roundNumber}</span>
                                    <svg className={`w-4 h-4 text-[#8E8E93] transition-transform ${expandedRound === round.roundNumber ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {expandedRound === round.roundNumber && (
                                    <div className="border-t border-[#F5F5F7] divide-y divide-[#F5F5F7]">
                                        {round.matches.map((match, i) => (
                                            <div key={match.id} className="px-4 py-4">
                                                <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Court {i + 1}</p>
                                                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                                    <div className="text-right">
                                                        <Link to={`/player/${match.team1Player1.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team1Player1.name}</Link>
                                                        <Link to={`/player/${match.team1Player2.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team1Player2.name}</Link>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 justify-center shrink-0">
                                                        <span className={`text-2xl font-black tabular-nums ${match.team1Score > match.team2Score ? "text-[#FF4200]" : "text-[#E5E5EA]"}`}>{match.team1Score}</span>
                                                        <span className="text-[#E5E5EA] font-black text-lg">:</span>
                                                        <span className={`text-2xl font-black tabular-nums ${match.team2Score > match.team1Score ? "text-[#FF4200]" : "text-[#E5E5EA]"}`}>{match.team2Score}</span>
                                                    </div>
                                                    <div className="text-left">
                                                        <Link to={`/player/${match.team2Player1.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team2Player1.name}</Link>
                                                        <Link to={`/player/${match.team2Player2.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team2Player2.name}</Link>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

type TournamentData = NonNullable<ReturnType<typeof trpc.tournament.getById.useQuery>["data"]>;

function TeamStandings({ tournament }: { tournament: TournamentData }) {
    // Build a partner map by scanning all matches (teams are fixed, so any match works)
    const partnerMap = new Map<string, string>();
    for (const round of tournament.rounds) {
        for (const match of round.matches) {
            partnerMap.set(match.team1Player1.id, match.team1Player2.id);
            partnerMap.set(match.team1Player2.id, match.team1Player1.id);
            partnerMap.set(match.team2Player1.id, match.team2Player2.id);
            partnerMap.set(match.team2Player2.id, match.team2Player1.id);
        }
    }

    // Group participants into teams, deduplicate
    const seen = new Set<string>();
    const teams: { p1: typeof tournament.participants[0]; p2: typeof tournament.participants[0] | null; rank: number; points: number }[] = [];
    for (const p of tournament.participants) {
        if (seen.has(p.player.id)) continue;
        seen.add(p.player.id);
        const partnerId = partnerMap.get(p.player.id);
        const partner = partnerId ? tournament.participants.find(x => x.player.id === partnerId) ?? null : null;
        if (partner) seen.add(partner.player.id);
        teams.push({ p1: p, p2: partner, rank: p.finalRank ?? 0, points: p.totalPoints });
    }
    teams.sort((a, b) => a.rank - b.rank);

    return (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden overflow-x-auto shadow-sm">
            <table className="w-full text-sm min-w-[280px]">
                <thead className="border-b border-[#F5F5F7]">
                    <tr>
                        <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93] w-12">Rank</th>
                        <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Team</th>
                        <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Points</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map(({ p1, p2, rank, points }) => (
                        <tr key={p1.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                            <td className="px-4 py-3 align-middle">
                                <RankMedal rank={rank} />
                            </td>
                            <td className="px-4 py-3">
                                <Link to={`/player/${p1.player.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] transition-colors block">
                                    {p1.player.name}
                                </Link>
                                {p2 && (
                                    <Link to={`/player/${p2.player.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] transition-colors block">
                                        {p2.player.name}
                                    </Link>
                                )}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-[#1A1A2E] align-middle">{points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RankMedal({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-yellow-500 font-black text-lg">🥇</span>;
    if (rank === 2) return <span className="text-gray-400 font-black text-lg">🥈</span>;
    if (rank === 3) return <span className="text-amber-600 font-black text-lg">🥉</span>;
    return <span className="text-[#8E8E93] font-bold">#{rank}</span>;
}

function LoadingPage() {
    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <div className="flex items-center justify-center h-64 text-[#8E8E93]">Loading…</div>
        </div>
    );
}

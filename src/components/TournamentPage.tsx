import { useParams, Link } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";
import { useState } from "react";

export function TournamentPage() {
    const { id } = useParams<{ id: string }>();
    const { data: tournament, isPending, error } = trpc.tournament.getById.useQuery({ id: id! });
    const [expandedRound, setExpandedRound] = useState<number | null>(null);

    if (isPending) return <LoadingPage />;
    if (error || !tournament) return <div className="p-8 text-red-600">Tournament not found.</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
                <Link
                    to={`/division/${tournament.division}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <span className="text-base leading-none">←</span>
                    Division {tournament.division}
                </Link>

                <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{tournament.name}</h1>
                            <p className="text-gray-500 mt-1 text-sm">
                                {new Date(tournament.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                                {" · "}Division {tournament.division}
                                {" · "}{tournament.participants.length} players
                            </p>
                        </div>
                        <StatusBadge status={tournament.status} />
                    </div>
                </div>

                {tournament.status === "COMPLETED" && tournament.participants.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Final Standings</h2>
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-gray-600 font-medium w-12">Rank</th>
                                        <th className="text-left px-4 py-2 text-gray-600 font-medium">Player</th>
                                        <th className="text-right px-4 py-2 text-gray-600 font-medium">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tournament.participants.map(p => (
                                        <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                            <td className="px-4 py-2">
                                                <RankMedal rank={p.finalRank ?? 0} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <Link to={`/player/${p.player.id}`} className="font-medium text-gray-800 hover:text-[#FF4200]">
                                                    {p.player.name}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold text-gray-700">{p.totalPoints}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <section>
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Rounds</h2>
                    <div className="space-y-2">
                        {tournament.rounds.map(round => (
                            <div key={round.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <button
                                    onClick={() => setExpandedRound(expandedRound === round.roundNumber ? null : round.roundNumber)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-medium text-gray-800">Round {round.roundNumber}</span>
                                    <span className="text-gray-400 text-sm">{expandedRound === round.roundNumber ? "▲" : "▼"}</span>
                                </button>

                                {expandedRound === round.roundNumber && (
                                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                                        {round.matches.map((match, i) => (
                                            <div key={match.id} className="px-4 py-4">
                                                <p className="text-xs text-gray-400 mb-3">Court {i + 1}</p>
                                                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                                                    <div className="sm:flex-1 text-center sm:text-right w-full">
                                                        <span className="font-medium text-gray-800 text-sm">
                                                            <Link to={`/player/${match.team1Player1.id}`} className="hover:text-[#FF4200]">{match.team1Player1.name}</Link>
                                                            {" & "}
                                                            <Link to={`/player/${match.team1Player2.id}`} className="hover:text-[#FF4200]">{match.team1Player2.name}</Link>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-lg font-bold min-w-[60px] justify-center shrink-0">
                                                        <span className={match.team1Score > match.team2Score ? "text-[#FF4200]" : "text-gray-400"}>
                                                            {match.team1Score}
                                                        </span>
                                                        <span className="text-gray-300">:</span>
                                                        <span className={match.team2Score > match.team1Score ? "text-[#FF4200]" : "text-gray-400"}>
                                                            {match.team2Score}
                                                        </span>
                                                    </div>
                                                    <div className="sm:flex-1 text-center sm:text-left w-full">
                                                        <span className="font-medium text-gray-800 text-sm">
                                                            <Link to={`/player/${match.team2Player1.id}`} className="hover:text-[#FF4200]">{match.team2Player1.name}</Link>
                                                            {" & "}
                                                            <Link to={`/player/${match.team2Player2.id}`} className="hover:text-[#FF4200]">{match.team2Player2.name}</Link>
                                                        </span>
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

function RankMedal({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-yellow-500 font-bold">🥇</span>;
    if (rank === 2) return <span className="text-gray-400 font-bold">🥈</span>;
    if (rank === 3) return <span className="text-amber-600 font-bold">🥉</span>;
    return <span className="text-gray-500 font-medium">#{rank}</span>;
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        UPCOMING: "bg-blue-100 text-blue-700",
        IN_PROGRESS: "bg-yellow-100 text-yellow-700",
        COMPLETED: "bg-green-100 text-green-700",
    };
    return (
        <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

function LoadingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>
        </div>
    );
}

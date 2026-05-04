import { useParams, Link } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";
import { DIVISION_NAMES, divisionLabel } from "../lib/divisions";

export function PlayerPage() {
    const { id } = useParams<{ id: string }>();
    const { data: player, isPending, error } = trpc.player.getById.useQuery({ id: id! });
    const { data: allPlayers } = trpc.player.list.useQuery();

    if (isPending) return <LoadingPage />;
    if (error || !player) return <div className="p-8 text-red-600">Player not found.</div>;

    const completedResults = player.participations.filter(p => p.finalRank !== null);

    // data is sorted by division ASC then avgPoints DESC — overall rank is just the index
    const divisionRank = allPlayers
        ? allPlayers.filter(p => p.division === player.division)
            .findIndex(p => p.id === player.id) + 1
        : null;

    const overallRank = allPlayers
        ? allPlayers.findIndex(p => p.id === player.id) + 1
        : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
                <Link
                    to={`/division/${player.division}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <span className="text-base leading-none">←</span>
                    {divisionLabel(player.division)}
                </Link>

                <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{player.name}</h1>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            player.gender === "FEMALE"
                                ? "bg-pink-100 text-pink-700"
                                : "bg-blue-100 text-blue-700"
                        }`}>
                            {player.gender === "FEMALE" ? "♀ Female" : "♂ Male"}
                        </span>
                    </div>
                    <p className="text-gray-500 mt-1">
                        {player.division === 6 ? "Beginner" : `Division ${player.division} — ${DIVISION_NAMES[player.division]}`}
                    </p>
                    <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 pt-4 border-t border-gray-100">
                        {divisionRank && <Stat label="Division Rank" value={`#${divisionRank}`} />}
                        {overallRank && <Stat label="Overall Rank" value={`#${overallRank}`} />}
                        {completedResults.length > 0 && <>
                            <Stat label="Tournaments" value={completedResults.length} />
                            <Stat
                                label="Avg Points"
                                value={Math.round(completedResults.reduce((s, p) => s + p.totalPoints, 0) / completedResults.length)}
                            />
                            <Stat
                                label="Best Finish"
                                value={`#${Math.min(...completedResults.map(p => p.finalRank!))}`}
                            />
                        </>}
                    </div>
                </div>

                <section>
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Tournament History</h2>
                    {player.participations.length === 0 && (
                        <p className="text-gray-500">No tournaments yet.</p>
                    )}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
                        <table className="w-full text-sm min-w-[360px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-2 text-gray-600 font-medium">Tournament</th>
                                    <th className="text-left px-4 py-2 text-gray-600 font-medium hidden sm:table-cell">Date</th>
                                    <th className="text-center px-3 py-2 text-gray-600 font-medium hidden sm:table-cell">Div</th>
                                    <th className="text-right px-4 py-2 text-gray-600 font-medium">Rank</th>
                                    <th className="text-right px-4 py-2 text-gray-600 font-medium">Pts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {player.participations.map(p => (
                                    <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            <Link to={`/tournament/${p.tournament.id}`} className="text-[#FF4200] hover:underline font-medium">
                                                {p.tournament.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">
                                            {new Date(p.tournament.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-3 py-2 text-center text-gray-500 hidden sm:table-cell">{divisionLabel(p.tournament.division)}</td>
                                        <td className="px-4 py-2 text-right">
                                            {p.finalRank !== null ? (
                                                <span className={rankColor(p.finalRank)}>#{p.finalRank}</span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium text-gray-700">
                                            {p.finalRank !== null ? p.totalPoints : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
    );
}

function rankColor(rank: number) {
    if (rank === 1) return "font-bold text-yellow-500";
    if (rank <= 3) return "font-semibold text-[#FF4200]";
    if (rank >= 6) return "text-red-500";
    return "text-gray-700";
}

function LoadingPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <div className="flex items-center justify-center h-64 text-gray-500">Loading…</div>
        </div>
    );
}

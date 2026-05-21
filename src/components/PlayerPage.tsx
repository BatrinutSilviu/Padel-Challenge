import { useParams, Link } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";
import { DIVISION_NAMES } from "../lib/divisions";
import { BADGE_META, BadgeType } from "../lib/badges";

export function PlayerPage() {
    const { id } = useParams<{ id: string }>();
    const { data: player, isPending, error } = trpc.player.getById.useQuery({ id: id! });
    const { data: allPlayers } = trpc.player.list.useQuery();

    if (isPending) return <LoadingPage />;
    if (error || !player) return <div className="p-8 text-red-600">Player not found.</div>;

    const completedResults = player.participations.filter(p => p.finalRank !== null);

    const competitionRank = (sorted: typeof allPlayers, id: string) => {
        if (!sorted) return null;
        const idx = sorted.findIndex(p => p.id === id);
        if (idx === -1) return null;
        const t = sorted[idx];
        const first = sorted.findIndex(p => p.avgPoints === t.avgPoints && p.avgWonRounds === t.avgWonRounds);
        return first + 1;
    };

    const divisionRank = competitionRank(
        allPlayers?.filter(p => p.division === player.division) ?? null,
        player.id,
    );
    const overallRank = competitionRank(allPlayers ?? null, player.id);

    const initials = player.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-5 sm:space-y-6">

                <Link
                    to="/?tab=players"
                    className="text-[#8E8E93] hover:text-[#FF4200] transition-colors flex items-center gap-1.5 text-sm font-semibold"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Players
                </Link>

                {/* Profile hero */}
                <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#333366] flex items-center justify-center shrink-0">
                            <span className="text-lg font-black text-white">{initials}</span>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight leading-none">{player.name}</h1>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-sm text-[#8E8E93] font-medium">
                                    {player.division === 6 ? "Beginner" : `Division ${player.division} — ${DIVISION_NAMES[player.division]}`}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    player.gender === "FEMALE" ? "bg-pink-100 text-pink-700" : "bg-sky-50 text-sky-600"
                                }`}>
                                    {player.gender === "FEMALE" ? "♀ Female" : "♂ Male"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#F5F5F7]">
                        <Stat label="ELO" value={player.elo} highlight />
                        {divisionRank && <Stat label="Div Rank" value={`#${divisionRank}`} />}
                        {overallRank && <Stat label="Overall" value={`#${overallRank}`} />}
                        {completedResults.length > 0 && (
                            <Stat label="Tournaments" value={completedResults.length} />
                        )}
                        {completedResults.length > 0 && (
                            <Stat label="Avg Points" value={Math.round(completedResults.reduce((s, p) => s + p.totalPoints, 0) / completedResults.length)} />
                        )}
                        {completedResults.length > 0 && (
                            <Stat label="Total Pts" value={completedResults.reduce((s, p) => s + p.totalPoints, 0)} />
                        )}
                        {completedResults.length > 0 && (
                            <Stat label="Best Finish" value={`#${Math.min(...completedResults.map(p => p.finalRank!))}`} />
                        )}
                    </div>
                </div>

                {player.badges.length > 0 && (
                    <section>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Achievements</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {(player.badges as BadgeType[]).map(badge => {
                                const meta = BADGE_META[badge];
                                return (
                                    <div key={badge} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${meta.className}`}>
                                        <span className="text-2xl shrink-0">{meta.emoji}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold leading-tight">{meta.label}</p>
                                            <p className="text-xs opacity-70 leading-tight">{meta.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Tournament History</h2>
                    {player.participations.length === 0 && (
                        <p className="text-[#8E8E93]">No tournaments yet.</p>
                    )}
                    <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden overflow-x-auto shadow-sm">
                        <table className="w-full text-sm min-w-[360px]">
                            <thead className="border-b border-[#F5F5F7]">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Tournament</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93] hidden sm:table-cell">Date</th>
                                    <th className="text-center px-3 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93] hidden sm:table-cell">Div</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Rank</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Pts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {player.participations.map(p => (
                                    <tr key={p.id} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                                        <td className="px-4 py-3">
                                            <Link to={`/tournament/${p.tournament.id}`} className="text-[#FF4200] hover:underline font-bold">
                                                {p.tournament.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-[#8E8E93] hidden sm:table-cell">
                                            {new Date(p.tournament.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-3 py-3 text-center text-[#8E8E93] hidden sm:table-cell">
                                            {DIVISION_NAMES[p.tournament.division] ?? `Div ${p.tournament.division}`}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {p.finalRank !== null ? (
                                                <span className={`font-black ${rankColor(p.finalRank)}`}>#{p.finalRank}</span>
                                            ) : (
                                                <span className="text-[#E5E5EA]">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-[#1A1A2E]">
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

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
    return (
        <div className="bg-[#F5F5F7] rounded-xl px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-0.5">{label}</p>
            <p className={`text-xl font-black ${highlight ? "text-[#FF4200]" : "text-[#1A1A2E]"}`}>{value}</p>
        </div>
    );
}

function rankColor(rank: number) {
    if (rank === 1) return "text-yellow-500";
    if (rank <= 3) return "text-[#FF4200]";
    if (rank >= 6) return "text-red-500";
    return "text-[#1A1A2E]";
}

function LoadingPage() {
    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <div className="flex items-center justify-center h-64 text-[#8E8E93]">Loading…</div>
        </div>
    );
}

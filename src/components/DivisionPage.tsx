import { useParams, Link } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";

const DIVISION_NAMES: Record<number, string> = {
    1: "Elite", 2: "Premier", 3: "Gold", 4: "Silver", 5: "Bronze", 6: "Beginner",
};

export function DivisionPage() {
    const { id } = useParams<{ id: string }>();
    const division = Number(id);

    const standings = trpc.division.standings.useQuery({ division });
    const tournaments = trpc.tournament.list.useQuery({ division });

    if (isNaN(division) || division < 1 || division > 6) {
        return <div className="p-8 text-red-600">Invalid division.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-8 sm:space-y-10">
                <div className="space-y-2">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <span className="text-base leading-none">←</span>
                        Home
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                        Division {division} — {DIVISION_NAMES[division]}
                    </h1>
                </div>

                <section>
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Players</h2>
                    {standings.isPending && <p className="text-gray-500">Loading…</p>}
                    {standings.data?.length === 0 && <p className="text-gray-500">No players in this division.</p>}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {[...(standings.data ?? [])].sort((a, b) => {
                            const pts = (p: typeof a) => p.participations.reduce((s, x) => s + x.totalPoints, 0);
                            return pts(b) - pts(a);
                        }).map((player, i) => {
                            const streak = getStreak(player.participations);
                            const total = player.participations.reduce((s, p) => s + p.totalPoints, 0);
                            const avg = player.participations.length > 0
                                ? Math.round(total / player.participations.length)
                                : 0;
                            return (
                                <Link
                                    key={player.id}
                                    to={`/player/${player.id}`}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors gap-1 sm:gap-2"
                                >
                                    {/* Top row: rank + name + streak + pts */}
                                    <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm text-gray-400 w-5 shrink-0">{i + 1}</span>
                                            <span className="font-medium text-gray-800 truncate">{player.name}</span>
                                            {streak === "promotion" && (
                                                <span title="Promotion streak" className="text-[#FF4200] text-base shrink-0">▲</span>
                                            )}
                                            {streak === "relegation" && (
                                                <span title="Relegation streak" className="text-red-500 text-base shrink-0">▼</span>
                                            )}
                                        </div>
                                        {/* pts visible on mobile inline with name row */}
                                        <div className="text-right shrink-0 sm:hidden">
                                            <span className="text-sm font-semibold text-gray-700">{total}</span>
                                            <span className="text-xs text-gray-400 ml-1">pts</span>
                                        </div>
                                    </div>

                                    {/* Bottom row on mobile: badges + avg */}
                                    <div className="flex items-center justify-between pl-7 sm:pl-0 sm:justify-end gap-3 sm:gap-4">
                                        <div className="flex gap-1 flex-wrap">
                                            {player.participations.map(p => (
                                                <RankBadge key={p.id} rank={p.finalRank} />
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <span className="text-sm font-semibold text-gray-500">{avg}</span>
                                                <span className="text-xs text-gray-400 ml-1">avg</span>
                                            </div>
                                            {/* pts on desktop only here */}
                                            <div className="text-right hidden sm:block">
                                                <span className="text-sm font-semibold text-gray-700">{total}</span>
                                                <span className="text-xs text-gray-400 ml-1">pts</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Points from last 5 tournaments. ▲ = top 3 in last 3 → promotion, ▼ = bottom 3 in last 3 → relegation.</p>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Tournaments</h2>
                    {tournaments.isPending && <p className="text-gray-500">Loading…</p>}
                    {tournaments.data?.length === 0 && <p className="text-gray-500">No tournaments in this division yet.</p>}
                    <div className="space-y-2">
                        {tournaments.data?.map(t => (
                            <Link
                                key={t.id}
                                to={`/tournament/${t.id}`}
                                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-[#FF4200] hover:shadow-sm transition-all gap-3"
                            >
                                <span className="font-medium text-gray-800 truncate">{t.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-gray-400 hidden sm:inline">
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

type Participation = { finalRank: number | null };

function getStreak(participations: Participation[]): "promotion" | "relegation" | null {
    if (participations.length < 3) return null;
    const ranks = participations.slice(0, 3).map(p => p.finalRank);
    if (ranks.some(r => r === null)) return null;
    if ((ranks as number[]).every(r => r <= 3)) return "promotion";
    if ((ranks as number[]).every(r => r >= 6)) return "relegation";
    return null;
}

function RankBadge({ rank }: { rank: number | null }) {
    if (rank === null) return null;
    const color = rank <= 3 ? "bg-[#9FD2DD]/30 text-[#333366]" : rank >= 6 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600";
    return (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
            #{rank}
        </span>
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

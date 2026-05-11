import { useParams, Link } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";
import { DIVISION_NAMES, DIVISION_BADGES, divisionLabel } from "../lib/divisions";
import { BADGE_META, BadgeType } from "../lib/badges";

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
                        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200] shadow-sm transition-colors w-fit"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Home
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                        {division === 6 ? "Beginner" : `Division ${division} — ${DIVISION_NAMES[division]}`}
                    </h1>
                </div>

                <section>
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Players</h2>
                    {standings.isPending && <p className="text-gray-500">Loading…</p>}
                    {standings.data?.length === 0 && <p className="text-gray-500">No players in this division.</p>}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {(() => {
                            const playerAvg = (p: NonNullable<typeof standings.data>[number]) =>
                                p.participations.length > 0
                                    ? p.participations.reduce((s, x) => s + x.totalPoints, 0) / p.participations.length
                                    : 0;
                            const sorted = [...(standings.data ?? [])].sort((a, b) =>
                                playerAvg(b) - playerAvg(a)
                                || b.avgWonRounds - a.avgWonRounds
                                || a.name.localeCompare(b.name)
                            );
                            return sorted.map((player, i) => {
                            const total = player.participations.reduce((s, p) => s + p.totalPoints, 0);
                            const avg = player.participations.length > 0
                                ? Math.round(total / player.participations.length)
                                : 0;
                            const prev = sorted[i - 1];
                            const rank = prev && playerAvg(prev) === playerAvg(player) && prev.avgWonRounds === player.avgWonRounds
                                ? sorted.findIndex(p => playerAvg(p) === playerAvg(player) && p.avgWonRounds === player.avgWonRounds) + 1
                                : i + 1;
                            return (
                                <Link
                                    key={player.id}
                                    to={`/player/${player.id}`}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors gap-1 sm:gap-2"
                                >
                                    {/* Top row: rank + name + streak + pts */}
                                    <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm text-gray-400 w-5 shrink-0">{rank}</span>
                                            <span className="font-medium text-gray-800 truncate">{player.name}</span>
                                            {(player.badges as BadgeType[]).map(badge => (
                                                <span key={badge} title={BADGE_META[badge].description} className="text-base shrink-0">{BADGE_META[badge].emoji}</span>
                                            ))}
                                            {player.division !== division && !player.homeDivBottomFinish && (
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${DIVISION_BADGES[player.division].className}`}>
                                                    {divisionLabel(player.division)}
                                                </span>
                                            )}
                                            {player.promotionEligible && (
                                                <>
                                                    <span title="Eligible for promotion" className="text-base shrink-0 text-green-500">▲</span>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${DIVISION_BADGES[division - 1].className}`}>
                                                        {divisionLabel(division - 1)}
                                                    </span>
                                                </>
                                            )}
                                            {player.relegationEligible && (
                                                <>
                                                    <span title="Eligible for relegation" className="text-base shrink-0 text-red-500">▼</span>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${DIVISION_BADGES[division + 1].className}`}>
                                                        {divisionLabel(division + 1)}
                                                    </span>
                                                </>
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
                        });
                        })()}
                    </div>
                    <div className="text-xs text-gray-400 mt-2 space-y-0.5">
                        <p>▲ Promotion eligible — 3 consecutive top-3 or 3+ top-3 in last 5 with avg ≥ 80th percentile.</p>
                        <p>▼ Relegation eligible — 3 consecutive bottom-3 or 3+ bottom-3 in last 5 with avg ≤ 20th percentile.</p>
                        <p>Americano Champions results are not counted in standings.</p>
                    </div>
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

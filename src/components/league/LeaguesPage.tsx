import { Link } from "react-router-dom";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/useAuth";
import { MyAvailabilityCard } from "./MyAvailabilityCard";
import { formatScheduledAt, formatWeekRange, teamName } from "../../lib/league";

export function LeaguesPage() {
    const { token } = useAuth();
    const { data: leagues, isPending } = trpc.league.list.useQuery();
    const { data: openMatches } = trpc.league.myOpenMatches.useQuery(undefined, { enabled: !!token });

    return (
        <div className="min-h-screen bg-canvas">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-5">
                <div className="bg-[#333366] rounded-2xl px-5 py-5 shadow-sm">
                    <p className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-[#FF4200]">Act!ve Padel League</p>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Leagues</h1>
                    <p className="text-sm text-white/70 mt-1">
                        Fixed teams, one match a week against every team in your group — you agree on the time and place.
                        The best go up, the last go down.
                    </p>
                </div>

                {leagues?.some(l => l.myTeamId && l.status !== "COMPLETED") ? <MyAvailabilityCard /> : token && (
                    <Link to="/league/availability" className="flex items-center justify-between gap-3 bg-surface rounded-2xl border border-line px-4 py-3 hover:border-[#FF4200]/40">
                        <span className="min-w-0">
                            <span className="block text-sm font-bold text-ink">My contact & availability</span>
                            <span className="block text-xs text-muted">Your phone and when and where you can play — for arranging league matches.</span>
                        </span>
                        <span className="text-[#FF4200] font-bold shrink-0">→</span>
                    </Link>
                )}

                {openMatches && openMatches.length > 0 && (
                    <section className="space-y-2">
                        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">Your matches to play</h2>
                        <div className="bg-surface rounded-2xl border border-[#FF4200]/30 overflow-hidden shadow-sm">
                            {openMatches.map(m => (
                                <Link key={m.id} to={`/league/match/${m.id}`} className="block px-4 py-3 border-b border-canvas last:border-0 hover:bg-canvas">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                        {m.league.name} · {m.week ? `Week ${m.week} · ${formatWeekRange(m.league.startDate, m.week)}` : "Playoff"}
                                    </p>
                                    <p className="text-sm font-semibold text-ink truncate">{teamName(m.team1)} <span className="text-muted font-normal">vs</span> {teamName(m.team2)}</p>
                                    <p className="text-xs text-muted">
                                        {m.status === "SUBMITTED" ? "Score reported — waiting for confirmation"
                                            : m.scheduledAt ? `${formatScheduledAt(m.scheduledAt)}${m.venue ? ` · ${m.venue}` : ""}`
                                            : "Not scheduled yet"}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                <div className="space-y-2">
                    {isPending && <p className="text-muted">Loading…</p>}
                    {!isPending && leagues?.length === 0 && <p className="text-muted">No leagues yet.</p>}
                    {leagues?.map(l => (
                        <Link
                            key={l.id}
                            to={`/league/${l.id}`}
                            className={`flex items-center justify-between gap-3 bg-surface rounded-2xl border px-4 py-3.5 hover:border-[#FF4200]/40 hover:shadow-sm transition-all ${l.status === "IN_PROGRESS" ? "border-l-[3px] border-l-[#FF4200] border-line" : "border-line"}`}
                        >
                            <div className="min-w-0">
                                <span className="font-bold text-ink block truncate">{l.name}</span>
                                <span className="text-xs text-muted font-medium">
                                    From {new Date(l.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                                    {" · "}{l._count.teams} teams{l._count.tiers > 1 ? ` · ${l._count.tiers} leagues` : ""}
                                    {l.myTeamId && <span className="text-[#FF4200] font-bold"> · You play</span>}
                                </span>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${l.status === "IN_PROGRESS" ? "bg-[#FF4200]/10 text-[#FF4200]" : l.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"}`}>
                                {l.status === "IN_PROGRESS" ? "Live" : l.status === "COMPLETED" ? "Completed" : "Draft"}
                            </span>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}

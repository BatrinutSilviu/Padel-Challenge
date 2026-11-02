import { Link } from "react-router-dom";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/AuthContext";
import { MyAvailabilityCard } from "./MyAvailabilityCard";
import { formatScheduledAt, formatWeekRange, teamName } from "../../lib/league";

export function LeaguesPage() {
    const { token } = useAuth();
    const { data: leagues, isPending } = trpc.league.list.useQuery();
    const { data: openMatches } = trpc.league.myOpenMatches.useQuery(undefined, { enabled: !!token });

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-5">
                <div className="bg-[#333366] rounded-2xl px-5 py-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#FF4200]">Act!ve Padel League</p>
                    <h1 className="text-2xl font-black text-white tracking-tight">Leagues</h1>
                    <p className="text-sm text-white/70 mt-1">
                        Fixed teams, one match a week against every team in your group — you agree on the time and place.
                        The best go up, the last go down.
                    </p>
                </div>

                {leagues?.some(l => l.myTeamId && l.status !== "COMPLETED") && <MyAvailabilityCard />}

                {openMatches && openMatches.length > 0 && (
                    <section className="space-y-2">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Your matches to play</h2>
                        <div className="bg-white rounded-2xl border border-[#FF4200]/30 overflow-hidden shadow-sm">
                            {openMatches.map(m => (
                                <Link key={m.id} to={`/league/match/${m.id}`} className="block px-4 py-3 border-b border-[#F5F5F7] last:border-0 hover:bg-[#F5F5F7]">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#8E8E93]">
                                        {m.league.name} · {m.week ? `Week ${m.week} · ${formatWeekRange(m.league.startDate, m.week)}` : "Playoff"}
                                    </p>
                                    <p className="text-sm font-semibold text-[#1A1A2E] truncate">{teamName(m.team1)} <span className="text-[#8E8E93] font-normal">vs</span> {teamName(m.team2)}</p>
                                    <p className="text-xs text-[#8E8E93]">
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
                    {isPending && <p className="text-[#8E8E93]">Loading…</p>}
                    {!isPending && leagues?.length === 0 && <p className="text-[#8E8E93]">No leagues yet.</p>}
                    {leagues?.map(l => (
                        <Link
                            key={l.id}
                            to={`/league/${l.id}`}
                            className={`flex items-center justify-between gap-3 bg-white rounded-2xl border px-4 py-3.5 hover:border-[#FF4200]/40 hover:shadow-sm transition-all ${l.status === "IN_PROGRESS" ? "border-l-[3px] border-l-[#FF4200] border-[#E5E5EA]" : "border-[#E5E5EA]"}`}
                        >
                            <div className="min-w-0">
                                <span className="font-bold text-[#1A1A2E] block truncate">{l.name}</span>
                                <span className="text-xs text-[#8E8E93] font-medium">
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

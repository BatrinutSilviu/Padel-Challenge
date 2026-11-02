import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/AuthContext";
import {
    currentWeek, formatSeasonRange, formatWeekRange, rulesSummary, teamName, tierLabel,
    type League, type LeagueGroup, type LeagueMatch, type LeagueTeam, type LeagueTier,
} from "../../lib/league";
import { LeagueStandings, OutcomeLegend } from "./LeagueStandings";
import { LeagueMatchLine } from "./LeagueMatchLine";
import { MyAvailabilityCard } from "./MyAvailabilityCard";

const STATUS_LABEL: Record<string, string> = { DRAFT: "Draft", IN_PROGRESS: "Live", COMPLETED: "Completed" };

export function LeaguePage() {
    const { id } = useParams<{ id: string }>();
    const { data: league, isPending, error } = trpc.league.getById.useQuery({ id: id! });

    if (isPending) return <Shell><p className="text-[#8E8E93]">Loading…</p></Shell>;
    if (error || !league) return <Shell><p className="text-red-600">League not found.</p></Shell>;
    return <Shell><LeagueView league={league} /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-5">
                <Link to="/league" className="text-[#8E8E93] hover:text-[#FF4200] transition-colors text-sm font-semibold">← Leagues</Link>
                {children}
            </main>
        </div>
    );
}

export function leagueWeeks(league: League): number {
    return Math.max(0, ...league.matches.map(m => m.week ?? 0));
}

function LeagueView({ league }: { league: League }) {
    const { token } = useAuth();
    const teams = useMemo(() => new Map(league.teams.map(t => [t.id, t])), [league.teams]);
    const myTeam = league.myTeamId ? teams.get(league.myTeamId) : undefined;
    const weeks = leagueWeeks(league);
    const [tierId, setTierId] = useState<string>(() => myTeam?.tierId ?? league.tiers[0]?.id ?? "");
    const tier = league.tiers.find(t => t.id === tierId) ?? league.tiers[0];
    const playoffs = league.matches.filter(m => m.groupId === null);

    return (
        <>
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#FF4200]">Act!ve Padel League</p>
                        <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight">{league.name}</h1>
                        <p className="text-sm text-[#8E8E93] font-medium mt-1">
                            {weeks > 0 ? `${weeks} weeks · ${formatSeasonRange(league.startDate, weeks)}` : `Starts ${new Date(league.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}`}
                            {" · "}{league.teams.length} teams
                        </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${league.status === "IN_PROGRESS" ? "bg-[#FF4200]/10 text-[#FF4200]" : league.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600"}`}>
                        {STATUS_LABEL[league.status]}
                    </span>
                </div>
                <p className="text-xs text-[#8E8E93] mt-3">
                    Everyone plays everyone in their group, one match a week, at a time and place the two teams agree on.
                    Best of 3 sets, tiebreak at 6-6, star point at deuce.
                </p>
            </div>

            {myTeam && league.status !== "COMPLETED" && <MyAvailabilityCard />}
            {myTeam && league.status === "IN_PROGRESS" && <MyMatches league={league} team={myTeam} teams={teams} />}
            {!token && league.status === "IN_PROGRESS" && (
                <p className="text-sm text-[#8E8E93]">
                    Playing in this league? <Link to={`/login?redirect=/league/${league.id}`} className="text-[#FF4200] font-semibold hover:underline">Log in</Link> to report scores and see your opponents' contact details.
                </p>
            )}

            {league.tiers.length > 1 && (
                <div className="flex gap-1 bg-white border border-[#E5E5EA] rounded-2xl p-1 w-full sm:w-fit shadow-sm overflow-x-auto">
                    {league.tiers.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTierId(t.id)}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${t.id === tier?.id ? "bg-[#FF4200] text-white shadow-sm" : "text-[#8E8E93] hover:text-[#1A1A2E]"}`}
                        >
                            {tierLabel(t.level)}
                        </button>
                    ))}
                </div>
            )}

            {tier && <TierView league={league} tier={tier} teams={teams} weeks={weeks} />}

            {playoffs.length > 0 && (
                <section className="space-y-2">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Playoffs</h2>
                    <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
                        {playoffs.map(m => <LeagueMatchLine key={m.id} match={m} teams={teams} myTeamId={league.myTeamId} />)}
                    </div>
                </section>
            )}
        </>
    );
}

function MyMatches({ league, team, teams }: { league: League; team: LeagueTeam; teams: Map<string, LeagueTeam> }) {
    const mine = league.matches.filter(m => m.team1Id === team.id || m.team2Id === team.id);
    const open = mine.filter(m => m.status !== "CONFIRMED");
    return (
        <section className="bg-[#333366] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60">Your team</p>
                <p className="font-black text-white truncate">{teamName(team)}</p>
            </div>
            {open.length === 0 ? (
                <p className="text-sm text-white/70">All your matches are played. 🎉</p>
            ) : (
                <div className="bg-white rounded-xl overflow-hidden">
                    {open.map(m => (
                        <div key={m.id}>
                            <p className="px-4 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-[#8E8E93]">
                                {m.week ? `Week ${m.week} · ${formatWeekRange(league.startDate, m.week)}` : "Playoff"}
                            </p>
                            <LeagueMatchLine match={m} teams={teams} />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function TierView({ league, tier, teams, weeks }: { league: League; tier: LeagueTier; teams: Map<string, LeagueTeam>; weeks: number }) {
    const levelCount = league.tiers.length;
    const rules = rulesSummary(tier, { isTop: tier.level === 1, isBottom: tier.level === levelCount });
    const prizes = [tier.prize1, tier.prize2, tier.prize3];
    const [week, setWeek] = useState(() => currentWeek(league.startDate, weeks));

    if (league.status === "DRAFT") {
        return <p className="text-[#8E8E93]">The groups haven't been drawn yet.</p>;
    }

    return (
        <div className="space-y-5">
            {(prizes.some(Boolean) || rules.length > 0) && (
                <div className="bg-white rounded-2xl border border-[#E5E5EA] px-4 py-3 shadow-sm space-y-1.5 text-sm">
                    {prizes.some(Boolean) && (
                        <p className="flex flex-wrap gap-x-4 gap-y-1">
                            <span className="font-bold text-[#1A1A2E]">Prizes in every group:</span>
                            {prizes.map((p, i) => p && <span key={i}>{["🥇", "🥈", "🥉"][i]} {p}</span>)}
                        </p>
                    )}
                    {rules.length > 0 && <p className="text-[#8E8E93]">{rules.join(" · ")}</p>}
                </div>
            )}

            {tier.groups.map(g => (
                <GroupCard key={g.id} league={league} tier={tier} group={g} teams={teams} week={week} weeks={weeks} onWeek={setWeek} />
            ))}

            <OutcomeLegend />
        </div>
    );
}

function GroupCard({
    league, tier, group, teams, week, weeks, onWeek,
}: {
    league: League; tier: LeagueTier; group: LeagueGroup; teams: Map<string, LeagueTeam>;
    week: number; weeks: number; onWeek: (w: number) => void;
}) {
    const matches: LeagueMatch[] = league.matches.filter(m => m.groupId === group.id && m.week === week);
    const prizes = [tier.prize1, tier.prize2, tier.prize3];
    return (
        <section className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#F5F5F7] flex items-center justify-between">
                <h2 className="font-black text-[#1A1A2E]">
                    {league.tiers.length > 1 && <span className="text-[#8E8E93] font-bold">{tierLabel(tier.level)} · </span>}
                    Group {group.name}
                </h2>
            </div>
            <LeagueStandings
                rows={group.standings}
                teams={teams}
                outcomes={league.outcomes}
                myTeamId={league.myTeamId}
                showMedals={league.status === "COMPLETED" || prizes.some(Boolean)}
            />
            <div className="border-t border-[#E5E5EA] bg-[#FAFAFB]">
                <WeekPicker week={week} weeks={weeks} startDate={league.startDate} onWeek={onWeek} />
                <div className="bg-white">
                    {matches.length === 0
                        ? <p className="px-4 py-3 text-sm text-[#8E8E93]">No matches this week.</p>
                        : matches.map(m => <LeagueMatchLine key={m.id} match={m} teams={teams} myTeamId={league.myTeamId} />)}
                </div>
            </div>
        </section>
    );
}

export function WeekPicker({ week, weeks, startDate, onWeek }: { week: number; weeks: number; startDate: string; onWeek: (w: number) => void }) {
    return (
        <div className="flex items-center justify-between gap-2 px-2 py-2">
            <button
                onClick={() => onWeek(week - 1)}
                disabled={week <= 1}
                aria-label="Previous week"
                className="w-9 h-9 rounded-lg text-[#8E8E93] hover:bg-white hover:text-[#FF4200] disabled:opacity-30"
            >
                ‹
            </button>
            <div className="text-center">
                <p className="text-sm font-bold text-[#1A1A2E]">Week {week} of {weeks}</p>
                <p className="text-xs text-[#8E8E93]">{formatWeekRange(startDate, week)}</p>
            </div>
            <button
                onClick={() => onWeek(week + 1)}
                disabled={week >= weeks}
                aria-label="Next week"
                className="w-9 h-9 rounded-lg text-[#8E8E93] hover:bg-white hover:text-[#FF4200] disabled:opacity-30"
            >
                ›
            </button>
        </div>
    );
}

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { NavBar } from "../../NavBar";
import { trpc } from "../../../trpc";
import { LoginPage, SessionExpiredModal } from "../AdminAuth";
import { useAdminSession } from "../useAdminSession";
import { PlayerPicker } from "../../PlayerPicker";
import { MIN_TEAMS_PER_GROUP, groupSizes, teamName, tierLabel, weekCount, type League, type LeagueTeam, type LeagueTier } from "../../../lib/league";
import { AdminLeagueLive } from "./AdminLeagueLive";
import { TierRulesEditor } from "./TierRulesEditor";
import { useInvalidateLeague } from "./useInvalidateLeague";

export function AdminLeaguePage() {
    const { id } = useParams<{ id: string }>();
    const { token, sessionExpired, handleLogin } = useAdminSession();
    const { data: league, isPending, error } = trpc.league.getById.useQuery({ id: id! }, { enabled: !!token });

    if (!token && !sessionExpired) return <LoginPage onLogin={handleLogin} />;

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 pb-24 sm:py-8 space-y-5">
                <Link to="/admin?tab=league" className="text-sm text-gray-500 hover:text-[#FF4200]">← Leagues</Link>
                {isPending ? <p className="text-gray-400">Loading…</p>
                    : error || !league ? <p className="text-red-600">League not found.</p>
                    : (
                        <>
                            <LeagueHeader league={league} />
                            {league.status === "DRAFT" ? <DraftView league={league} /> : <AdminLeagueLive league={league} />}
                        </>
                    )}
            </main>
            {sessionExpired && <SessionExpiredModal onLogin={handleLogin} />}
        </div>
    );
}

function LeagueHeader({ league }: { league: League }) {
    const navigate = useNavigate();
    const invalidate = useInvalidateLeague();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(league.name);
    const [startDate, setStartDate] = useState(league.startDate.slice(0, 10));
    const update = trpc.league.update.useMutation({ onSuccess: () => { invalidate(); setEditing(false); } });
    const del = trpc.league.delete.useMutation({ onSuccess: () => { invalidate(); navigate("/admin?tab=league"); } });

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            {editing ? (
                <form onSubmit={e => { e.preventDefault(); update.mutate({ id: league.id, name: name.trim(), startDate }); }} className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
                    <input value={name} onChange={e => setName(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm" />
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm" />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm">Cancel</button>
                        <button type="submit" disabled={!name.trim() || update.isPending} className="px-3 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-semibold disabled:opacity-50">Save</button>
                    </div>
                    {update.error && <p className="text-sm text-red-500 sm:col-span-3">{update.error.message}</p>}
                </form>
            ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-gray-900">{league.name}</h1>
                        <p className="text-sm text-gray-500">
                            Week 1 starts {new Date(league.startDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                            {" · "}{league.teams.length} teams
                            {" · "}<span className="font-semibold">{league.status === "DRAFT" ? "Draft" : league.status === "IN_PROGRESS" ? "Live" : "Completed"}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {league.status !== "DRAFT" && <Link to={`/league/${league.id}`} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200]">Public page</Link>}
                        <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200]">Edit</button>
                        <button
                            onClick={() => { if (confirm(`Delete "${league.name}" with all its teams and results? This cannot be undone.`)) del.mutate({ id: league.id }); }}
                            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Draft: tiers, teams and group order ────────────────────────────────────────

function DraftView({ league }: { league: League }) {
    const invalidate = useInvalidateLeague();
    const addTier = trpc.league.addTier.useMutation({ onSuccess: invalidate });
    const removeTier = trpc.league.removeTier.useMutation({ onSuccess: invalidate });
    const start = trpc.league.start.useMutation({ onSuccess: invalidate });
    const { data: allPlayers } = trpc.division.allPlayers.useQuery();
    const taken = new Set(league.teams.flatMap(t => [t.player1Id, t.player2Id]));
    const bottom = league.tiers[league.tiers.length - 1];

    return (
        <div className="space-y-5">
            <p className="text-sm text-gray-600 bg-sky-50 border border-sky-200 rounded-lg px-4 py-3">
                Add the teams of each league. Groups are filled in the order of the list — the first teams make Group A, the next Group B, and so on.
                Reorder them or shuffle for a random draw, then start the league to create the weekly schedule.
            </p>

            {league.tiers.map(tier => (
                <DraftTierCard key={tier.id} league={league} tier={tier} allPlayers={allPlayers ?? []} taken={taken} />
            ))}

            <div className="flex flex-wrap gap-2">
                <button onClick={() => addTier.mutate({ leagueId: league.id })} className="text-sm px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200]">
                    + Add {tierLabel(league.tiers.length + 1)}
                </button>
                {league.tiers.length > 1 && (
                    <button
                        onClick={() => {
                            const n = league.teams.filter(t => t.tierId === bottom.id).length;
                            if (n === 0 || confirm(`Remove ${tierLabel(bottom.level)} and its ${n} teams?`)) removeTier.mutate({ tierId: bottom.id });
                        }}
                        className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500"
                    >
                        Remove {tierLabel(bottom.level)}
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
                <h2 className="font-semibold text-gray-800">Start the league</h2>
                <ul className="text-sm text-gray-600 space-y-0.5">
                    {league.tiers.map(t => {
                        const sizes = groupSizes(league.teams.filter(x => x.tierId === t.id).length, t.teamsPerGroup);
                        return (
                            <li key={t.id}>
                                <span className="font-medium">{tierLabel(t.level)}:</span>{" "}
                                {sizes.length === 0 ? <span className="text-red-500">no teams</span>
                                    : `${sizes.length} group${sizes.length > 1 ? "s" : ""} (${sizes.join(", ")} teams) · ${weekCount(Math.max(...sizes))} week${weekCount(Math.max(...sizes)) > 1 ? "s" : ""}`}
                                {sizes.some(n => n < MIN_TEAMS_PER_GROUP) && <span className="text-red-500"> — every group needs at least {MIN_TEAMS_PER_GROUP} teams</span>}
                            </li>
                        );
                    })}
                </ul>
                {start.error && <p className="text-sm text-red-500">{start.error.message}</p>}
                <button
                    onClick={() => { if (confirm("Draw the groups and create the schedule? Teams can't be added after this.")) start.mutate({ leagueId: league.id }); }}
                    disabled={start.isPending}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#FF4200] text-white text-sm font-semibold hover:bg-[#CC3500] disabled:opacity-50"
                >
                    {start.isPending ? "Starting…" : "Start league"}
                </button>
            </div>
        </div>
    );
}

type PlayerOption = { id: string; name: string; division: number };

function DraftTierCard({ league, tier, allPlayers, taken }: { league: League; tier: LeagueTier; allPlayers: PlayerOption[]; taken: Set<string> }) {
    const invalidate = useInvalidateLeague();
    const teams = league.teams.filter(t => t.tierId === tier.id);
    const [p1, setP1] = useState("");
    const [p2, setP2] = useState("");
    const addTeam = trpc.league.addTeam.useMutation({ onSuccess: () => { invalidate(); setP1(""); setP2(""); } });
    const removeTeam = trpc.league.removeTeam.useMutation({ onSuccess: invalidate });
    const setOrder = trpc.league.setTeamOrder.useMutation({ onSuccess: invalidate });

    const sizes = groupSizes(teams.length, tier.teamsPerGroup);
    const groupStarts = sizes.reduce<number[]>((acc, _, i) => [...acc, i === 0 ? 0 : acc[i - 1] + sizes[i - 1]], []);

    function move(i: number, delta: number) {
        const ids = teams.map(t => t.id);
        const j = i + delta;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        setOrder.mutate({ tierId: tier.id, teamIds: ids });
    }

    function shuffle() {
        const ids = teams.map(t => t.id);
        for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        setOrder.mutate({ tierId: tier.id, teamIds: ids });
    }

    function moveToTier(team: LeagueTeam, targetTierId: string) {
        const targetIds = league.teams.filter(t => t.tierId === targetTierId).map(t => t.id);
        setOrder.mutate({ tierId: targetTierId, teamIds: [...targetIds, team.id] });
    }

    return (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="font-bold text-gray-900">{tierLabel(tier.level)}</h2>
                    <p className="text-xs text-gray-500">
                        {teams.length} teams{sizes.length > 0 && ` → ${sizes.length} group${sizes.length > 1 ? "s" : ""} of ${sizes.join(", ")}`}
                    </p>
                </div>
                {teams.length > 1 && (
                    <button onClick={shuffle} disabled={setOrder.isPending} className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200] disabled:opacity-50">
                        🔀 Random draw
                    </button>
                )}
            </div>

            <div className="px-4 sm:px-5 py-3 space-y-1.5">
                {teams.length === 0 && <p className="text-sm text-gray-400">No teams yet.</p>}
                {teams.map((t, i) => (
                    <div key={t.id}>
                        {groupStarts.includes(i) && (
                            <p className={`text-xs font-semibold uppercase tracking-wide text-[#FF4200] ${i > 0 ? "pt-2" : ""}`}>
                                Group {String.fromCharCode(65 + groupStarts.indexOf(i))}
                            </p>
                        )}
                        <div className="flex items-center gap-2 py-1">
                            <span className="text-xs text-gray-400 w-5 text-right tabular-nums">{i + 1}</span>
                            <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{teamName(t)}</span>
                            <button onClick={() => move(i, -1)} disabled={i === 0 || setOrder.isPending} aria-label="Move up" className="w-7 h-7 rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30">↑</button>
                            <button onClick={() => move(i, 1)} disabled={i === teams.length - 1 || setOrder.isPending} aria-label="Move down" className="w-7 h-7 rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30">↓</button>
                            {league.tiers.length > 1 && (
                                <select
                                    value={tier.id}
                                    onChange={e => moveToTier(t, e.target.value)}
                                    aria-label="Move to league"
                                    className="text-xs border border-gray-200 rounded px-1 py-1 bg-white text-gray-600"
                                >
                                    {league.tiers.map(x => <option key={x.id} value={x.id}>L{x.level}</option>)}
                                </select>
                            )}
                            <button onClick={() => removeTeam.mutate({ teamId: t.id })} aria-label="Remove team" className="w-7 h-7 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">✕</button>
                        </div>
                    </div>
                ))}
            </div>

            <form
                onSubmit={e => { e.preventDefault(); addTeam.mutate({ tierId: tier.id, player1Id: p1, player2Id: p2 }); }}
                className="px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50 space-y-2"
            >
                <div className="flex gap-2">
                    <PlayerPicker value={p1} onChange={setP1} players={allPlayers} excludeIds={new Set([...taken, p2])} placeholder="Player 1" />
                    <PlayerPicker value={p2} onChange={setP2} players={allPlayers} excludeIds={new Set([...taken, p1])} placeholder="Player 2" align="right" />
                    <button type="submit" disabled={!p1 || !p2 || addTeam.isPending} className="shrink-0 px-4 rounded-lg bg-[#FF4200] text-white text-sm font-semibold hover:bg-[#CC3500] disabled:opacity-40">Add</button>
                </div>
                {addTeam.error && <p className="text-sm text-red-500">{addTeam.error.message}</p>}
            </form>

            <div className="px-4 sm:px-5 py-3 border-t border-gray-100">
                <TierRulesEditor league={league} tier={tier} draft />
            </div>
        </section>
    );
}

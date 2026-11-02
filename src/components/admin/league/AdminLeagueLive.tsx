import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { trpc } from "../../../trpc";
import {
    OUTCOME_INFO, currentWeek, formatResult, formatScheduledAt, teamName, tierLabel, winnerSide,
    type League, type LeagueMatch, type LeagueTeam, type LeagueTier, type Outcome,
} from "../../../lib/league";
import { LeagueStandings, OutcomeLegend } from "../../league/LeagueStandings";
import { LeagueScoreForm } from "../../league/LeagueScoreForm";
import { WeekPicker, leagueWeeks } from "../../league/LeaguePage";
import { ProfileForm } from "../../ProfileForm";
import { TierRulesEditor, useInvalidateLeague } from "./TierRulesEditor";

export function AdminLeagueLive({ league }: { league: League }) {
    const teams = useMemo(() => new Map(league.teams.map(t => [t.id, t])), [league.teams]);
    const [tierId, setTierId] = useState(league.tiers[0]?.id);
    const tier = league.tiers.find(t => t.id === tierId) ?? league.tiers[0];
    const weeks = leagueWeeks(league);
    const [week, setWeek] = useState(() => currentWeek(league.startDate, weeks));
    const [contactsFor, setContactsFor] = useState<LeagueTeam | null>(null);

    return (
        <div className="space-y-5">
            <NeedsAttention league={league} teams={teams} />

            {league.tiers.length > 1 && (
                <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
                    {league.tiers.map(t => (
                        <button key={t.id} onClick={() => setTierId(t.id)} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${t.id === tier.id ? "bg-[#FF4200] text-white" : "text-gray-600 hover:text-gray-900"}`}>
                            {tierLabel(t.level)}
                        </button>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-3">
                <TierRulesEditor key={tier.id} league={league} tier={tier} />
            </div>

            {tier.groups.map(g => (
                <section key={g.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <h2 className="px-4 py-3 border-b border-gray-100 font-bold text-gray-900">
                        {league.tiers.length > 1 && `${tierLabel(tier.level)} · `}Group {g.name}
                    </h2>
                    <LeagueStandings
                        rows={g.standings}
                        teams={teams}
                        outcomes={league.outcomes}
                        showMedals={false}
                        extra={row => <TeamControls league={league} team={teams.get(row.teamId)!} onContacts={setContactsFor} />}
                    />
                    <div className="border-t border-gray-200 bg-gray-50">
                        <WeekPicker week={week} weeks={weeks} startDate={league.startDate} onWeek={setWeek} />
                        <div className="bg-white">
                            {league.matches.filter(m => m.groupId === g.id && m.week === week).map(m => (
                                <AdminMatchRow key={m.id} match={m} teams={teams} />
                            ))}
                        </div>
                    </div>
                </section>
            ))}

            <OutcomeLegend />
            <Playoffs league={league} teams={teams} />
            <SeasonEnd league={league} teams={teams} />

            {contactsFor && <ContactsModal team={contactsFor} onClose={() => setContactsFor(null)} />}
        </div>
    );
}

// Scores the players reported that the other team hasn't confirmed yet, disputed first.
function NeedsAttention({ league, teams }: { league: League; teams: Map<string, LeagueTeam> }) {
    const waiting = league.matches
        .filter(m => m.status === "SUBMITTED")
        .sort((a, b) => Number(b.disputed) - Number(a.disputed));
    if (waiting.length === 0) return null;
    return (
        <section className="bg-white rounded-xl border border-amber-200 overflow-hidden">
            <h2 className="px-4 py-3 border-b border-amber-100 bg-amber-50 font-semibold text-amber-800 text-sm">
                Waiting for confirmation ({waiting.length})
            </h2>
            {waiting.map(m => <AdminMatchRow key={m.id} match={m} teams={teams} showWeek />)}
        </section>
    );
}

function AdminMatchRow({ match, teams, showWeek = false, onDelete }: { match: LeagueMatch; teams: Map<string, LeagueTeam>; showWeek?: boolean; onDelete?: () => void }) {
    const invalidate = useInvalidateLeague();
    const [editing, setEditing] = useState(false);
    const t1 = teams.get(match.team1Id)!;
    const t2 = teams.get(match.team2Id)!;
    const setScore = trpc.league.setScore.useMutation({ onSuccess: () => { invalidate(); setEditing(false); } });
    const confirmScore = trpc.league.adminConfirmScore.useMutation({ onSuccess: invalidate });
    const walkover = trpc.league.setWalkover.useMutation({ onSuccess: invalidate });
    const winner = winnerSide(match);
    const result = formatResult(match);

    return (
        <div className="px-4 py-3 border-b border-gray-100 last:border-0 space-y-2">
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 text-sm">
                    {showWeek && <p className="text-[10px] font-bold uppercase text-gray-400">{match.week ? `Week ${match.week}` : "Playoff"}</p>}
                    <p className={`truncate ${winner === 1 ? "font-bold" : ""} ${t1.eliminated ? "line-through text-gray-400" : "text-gray-800"}`}>{teamName(t1)}</p>
                    <p className={`truncate ${winner === 2 ? "font-bold" : ""} ${t2.eliminated ? "line-through text-gray-400" : "text-gray-800"}`}>{teamName(t2)}</p>
                    {match.status !== "CONFIRMED" && (match.scheduledAt || match.venue) && (
                        <p className="text-xs text-gray-400">{match.scheduledAt && formatScheduledAt(match.scheduledAt)}{match.venue && ` · ${match.venue}`}</p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-gray-800">{result || "—"}</p>
                    <p className={`text-[10px] font-bold uppercase ${match.disputed && match.status === "SUBMITTED" ? "text-red-500" : match.status === "SUBMITTED" ? "text-amber-600" : match.status === "CONFIRMED" ? "text-emerald-600" : "text-gray-400"}`}>
                        {match.status === "SUBMITTED"
                            ? `${match.disputed ? "Disputed · " : ""}reported by ${match.submittedBySide === 1 ? "top" : "bottom"} team`
                            : match.status === "CONFIRMED" ? "Confirmed" : "Not played"}
                    </p>
                </div>
            </div>
            {editing ? (
                <LeagueScoreForm
                    teamNames={[teamName(t1), teamName(t2)]}
                    initialSets={match.sets}
                    submitLabel="Save score"
                    pending={setScore.isPending}
                    error={setScore.error?.message}
                    onSubmit={sets => setScore.mutate({ matchId: match.id, sets })}
                    onCancel={() => setEditing(false)}
                />
            ) : (
                <div className="flex flex-wrap gap-1.5 text-xs">
                    {match.status === "SUBMITTED" && (
                        <button onClick={() => confirmScore.mutate({ matchId: match.id })} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">Confirm {result}</button>
                    )}
                    <button onClick={() => setEditing(true)} className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-[#FF4200]">{match.status === "PENDING" ? "Enter score" : "Edit score"}</button>
                    {match.walkoverWinner !== 1 && <button onClick={() => walkover.mutate({ matchId: match.id, winnerSide: 1 })} className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-[#FF4200]">W/O to top</button>}
                    {match.walkoverWinner !== 2 && <button onClick={() => walkover.mutate({ matchId: match.id, winnerSide: 2 })} className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-[#FF4200]">W/O to bottom</button>}
                    {match.status !== "PENDING" && (
                        <button onClick={() => { if (confirm("Clear this result?")) walkover.mutate({ matchId: match.id, winnerSide: null }); }} className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500">Clear</button>
                    )}
                    <Link to={`/league/match/${match.id}`} className="px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-[#FF4200]">Open ↗</Link>
                    {onDelete && <button onClick={onDelete} className="px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-red-500">Delete</button>}
                </div>
            )}
        </div>
    );
}

function TeamControls({ league, team, onContacts }: { league: League; team: LeagueTeam; onContacts: (t: LeagueTeam) => void }) {
    const invalidate = useInvalidateLeague();
    const eliminate = trpc.league.setEliminated.useMutation({ onSuccess: invalidate });
    const override = trpc.league.setOutcomeOverride.useMutation({ onSuccess: invalidate });
    const byRules = (league.outcomesByRules[team.id] ?? "STAYED") as Outcome;

    return (
        <div className="flex items-center justify-start sm:justify-end gap-1">
            <select
                value={team.outcomeOverride ?? ""}
                onChange={e => override.mutate({ teamId: team.id, outcome: (e.target.value || null) as "PROMOTED" | "STAYED" | "RELEGATED" | null })}
                aria-label="Where this team goes next season"
                title="Where this team goes next season"
                className={`text-xs border rounded px-1 py-1 bg-white max-w-[9rem] ${team.outcomeOverride ? "border-[#FF4200] text-[#FF4200]" : "border-gray-200 text-gray-500"}`}
            >
                <option value="">Auto: {OUTCOME_INFO[byRules].label}</option>
                <option value="PROMOTED">▲ Promoted</option>
                <option value="STAYED">= Stays</option>
                <option value="RELEGATED">▼ Relegated</option>
            </select>
            <button onClick={() => onContacts(team)} title="Contact details" aria-label="Contact details" className="w-7 h-7 rounded text-gray-400 hover:bg-gray-100">📞</button>
            <button
                onClick={() => {
                    if (team.eliminated || confirm(`Eliminate ${teamName(team)}? They'll lose every match 6-0 6-0, played or not.`)) {
                        eliminate.mutate({ teamId: team.id, eliminated: !team.eliminated });
                    }
                }}
                className={`text-xs px-2 py-1 rounded border ${team.eliminated ? "border-gray-300 text-gray-600" : "border-red-200 text-red-500 hover:bg-red-50"}`}
            >
                {team.eliminated ? "Restore" : "Eliminate"}
            </button>
        </div>
    );
}

function ContactsModal({ team, onClose }: { team: LeagueTeam; onClose: () => void }) {
    const players = [team.player1, team.player2];
    const [playerId, setPlayerId] = useState(players[0].id);
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-gray-900">Contact details</h2>
                    <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500">✕</button>
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {players.map(p => (
                        <button key={p.id} onClick={() => setPlayerId(p.id)} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium truncate ${p.id === playerId ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>
                            {p.name}
                        </button>
                    ))}
                </div>
                <PlayerContactEditor key={playerId} playerId={playerId} />
            </div>
        </div>
    );
}

function PlayerContactEditor({ playerId }: { playerId: string }) {
    const invalidate = useInvalidateLeague();
    const { data: profile } = trpc.profile.getForPlayer.useQuery({ playerId });
    const [saved, setSaved] = useState(false);
    const update = trpc.profile.updateForPlayer.useMutation({ onSuccess: () => { invalidate(); setSaved(true); } });
    if (!profile) return <p className="text-gray-400 text-sm">Loading…</p>;
    return (
        <>
            <p className="text-xs text-gray-500">Players with an account can fill this in themselves on their profile page.</p>
            <ProfileForm
                profile={profile}
                pending={update.isPending}
                error={update.error?.message}
                submitLabel={saved ? "Saved ✓" : "Save"}
                onSubmit={p => { setSaved(false); update.mutate({ playerId, ...p }); }}
            />
        </>
    );
}

function Playoffs({ league, teams }: { league: League; teams: Map<string, LeagueTeam> }) {
    const invalidate = useInvalidateLeague();
    const playoffs = league.matches.filter(m => m.groupId === null);
    const [team1Id, setTeam1Id] = useState("");
    const [team2Id, setTeam2Id] = useState("");
    const [kind, setKind] = useState<"PROMOTION" | "RELEGATION">("PROMOTION");
    const create = trpc.league.createPlayoff.useMutation({ onSuccess: () => { invalidate(); setTeam1Id(""); setTeam2Id(""); } });
    const del = trpc.league.deletePlayoff.useMutation({ onSuccess: invalidate });

    const levelOf = new Map(league.tiers.map(t => [t.id, t.level]));
    const t1 = teams.get(team1Id);
    const t2 = teams.get(team2Id);
    const sameTier = t1 && t2 && t1.tierId === t2.tierId;
    // Playoff candidates first, then everyone else, by tier.
    const options = [...league.teams].sort((a, b) => {
        const pa = league.outcomesByRules[a.id]?.startsWith("PLAYOFF") ? 0 : 1;
        const pb = league.outcomesByRules[b.id]?.startsWith("PLAYOFF") ? 0 : 1;
        return pa - pb || levelOf.get(a.tierId)! - levelOf.get(b.tierId)!;
    });
    const label = (t: LeagueTeam) => {
        const o = league.outcomesByRules[t.id] as Outcome | undefined;
        return `L${levelOf.get(t.tierId)} · ${teamName(t)}${o?.startsWith("PLAYOFF") ? ` (${OUTCOME_INFO[o].label.toLowerCase()})` : ""}`;
    };

    return (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Playoffs</h2>
                <p className="text-xs text-gray-500">
                    Between two leagues, the lower team goes up if it wins and the higher one goes down if it loses. For a playoff over
                    several rounds, add the next round once the first is played — each team's latest playoff decides.
                </p>
            </div>
            {playoffs.map(m => (
                <AdminMatchRow key={m.id} match={m} teams={teams} onDelete={() => { if (confirm("Delete this playoff?")) del.mutate({ matchId: m.id }); }} />
            ))}
            <form
                onSubmit={e => { e.preventDefault(); create.mutate({ leagueId: league.id, team1Id, team2Id, kind: sameTier ? kind : null }); }}
                className="px-4 sm:px-5 py-3 bg-gray-50 border-t border-gray-100 space-y-2"
            >
                <div className="grid sm:grid-cols-2 gap-2">
                    {[{ v: team1Id, set: setTeam1Id }, { v: team2Id, set: setTeam2Id }].map(({ v, set }, i) => (
                        <select key={i} value={v} onChange={e => set(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-base sm:text-sm bg-white min-w-0">
                            <option value="">Team {i + 1}…</option>
                            {options.map(t => <option key={t.id} value={t.id} disabled={t.id === (i === 0 ? team2Id : team1Id)}>{label(t)}</option>)}
                        </select>
                    ))}
                </div>
                {sameTier && (
                    <div className="flex gap-3 text-sm text-gray-700">
                        <label className="flex items-center gap-1.5"><input type="radio" checked={kind === "PROMOTION"} onChange={() => setKind("PROMOTION")} /> Winner goes up</label>
                        <label className="flex items-center gap-1.5"><input type="radio" checked={kind === "RELEGATION"} onChange={() => setKind("RELEGATION")} /> Loser goes down</label>
                    </div>
                )}
                {create.error && <p className="text-sm text-red-500">{create.error.message}</p>}
                <button type="submit" disabled={!team1Id || !team2Id || create.isPending} className="px-4 py-2 rounded-lg bg-[#333366] text-white text-sm font-semibold disabled:opacity-40">
                    Add playoff match
                </button>
            </form>
        </section>
    );
}

// How many teams each league would have next season, then complete / next season.
function SeasonEnd({ league, teams }: { league: League; teams: Map<string, LeagueTeam> }) {
    const navigate = useNavigate();
    const invalidate = useInvalidateLeague();
    const setStatus = trpc.league.setStatus.useMutation({ onSuccess: invalidate });
    const [name, setName] = useState("");
    const [startDate, setStartDate] = useState("");
    const next = trpc.league.createNextSeason.useMutation({ onSuccess: l => { invalidate(); navigate(`/admin/league/${l.id}`); } });

    const levelCount = league.tiers.length;
    const levelOf = new Map(league.tiers.map(t => [t.id, t.level]));
    const outcomeOf = (id: string) => (league.outcomes[id] ?? "STAYED") as Outcome;
    const undecided = league.teams.filter(t => outcomeOf(t.id).startsWith("PLAYOFF"));
    const nextSize = (tier: LeagueTier) => league.teams.filter(t => {
        const level = levelOf.get(t.tierId)!;
        const o = outcomeOf(t.id);
        const to = o === "PROMOTED" ? Math.max(1, level - 1) : o === "RELEGATED" ? Math.min(levelCount, level + 1) : level;
        return to === tier.level && !o.startsWith("PLAYOFF");
    }).length;
    const unplayed = league.matches.filter(m => m.status !== "CONFIRMED" && !teams.get(m.team1Id)?.eliminated && !teams.get(m.team2Id)?.eliminated).length;

    return (
        <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4">
            <div>
                <h2 className="font-bold text-gray-900">End of season</h2>
                <p className="text-sm text-gray-500">{unplayed === 0 ? "All matches are played." : `${unplayed} match${unplayed > 1 ? "es" : ""} still to play or confirm.`}</p>
            </div>
            {levelCount > 1 && (
                <ul className="text-sm text-gray-700 space-y-0.5">
                    {league.tiers.map(t => (
                        <li key={t.id}>
                            {tierLabel(t.level)}: {league.teams.filter(x => x.tierId === t.id).length} teams now → <span className="font-semibold">{nextSize(t)}</span> next season
                            <span className="text-gray-400"> ({t.teamsPerGroup} per group)</span>
                        </li>
                    ))}
                    {undecided.length > 0 && <li className="text-sky-700">{undecided.length} team{undecided.length > 1 ? "s" : ""} waiting on a playoff</li>}
                </ul>
            )}
            <div className="flex flex-wrap gap-2">
                {league.status === "IN_PROGRESS" ? (
                    <button
                        onClick={() => { if (confirm("Complete the league? Players can no longer report scores.")) setStatus.mutate({ leagueId: league.id, status: "COMPLETED" }); }}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
                    >
                        Complete league
                    </button>
                ) : (
                    <button onClick={() => setStatus.mutate({ leagueId: league.id, status: "IN_PROGRESS" })} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700">
                        Reopen league
                    </button>
                )}
            </div>
            <form
                    onSubmit={e => { e.preventDefault(); next.mutate({ leagueId: league.id, name: name.trim(), startDate }); }}
                    className="border-t border-gray-100 pt-4 space-y-2"
                >
                    <p className="text-sm font-semibold text-gray-800">Create next season</p>
                    <p className="text-xs text-gray-500">Same leagues and rules; every team placed where its result sends it. You can still change teams and draw the groups before starting it.</p>
                    <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm" />
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm" />
                        <button type="submit" disabled={!name.trim() || !startDate || next.isPending || undecided.length > 0} className="px-4 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-semibold disabled:opacity-40">
                            {next.isPending ? "Creating…" : "Create"}
                        </button>
                    </div>
                {next.error && <p className="text-sm text-red-500">{next.error.message}</p>}
            </form>
        </section>
    );
}

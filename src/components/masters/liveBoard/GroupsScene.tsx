import { STAGE_INFO, isIndoorCourt, type MastersProgress } from "../../../lib/masters";
import { isChallengerMatchScored, type ChallengerMatch, type GroupStanding } from "../../../lib/challenger";
import { SetsLine, TeamNames } from "./parts";

type Standings = Record<string, GroupStanding[]>;

// ── Groups ──────────────────────────────────────────────────────────────────────

export function GroupsScene({
    progress,
    groups,
    standings,
    flashing,
}: {
    progress: MastersProgress;
    groups: string[];
    standings: Standings;
    flashing: Set<string>;
}) {
    const { groupCount, teamsPerGroup } = progress.format;
    // With 1 or 2 groups on screen each card is wide enough for standings and matches side by side.
    const wide = groups.length <= 2;
    const firstStage = progress.stages[0].key;
    const qualifyLabel = firstStage === "FINAL" ? "Final" : STAGE_INFO[firstStage].title;
    // How many matches fit under the standings; bigger groups show the rounds around
    // the one being played instead of every round.
    const matchCapacity = wide ? 12 : Math.floor(10.5 - 0.9 * teamsPerGroup);

    return (
        <div className="h-full grid gap-5" style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}>
            {groups.map(g => {
                const rounds = progress.groupRounds[g];
                const matches = rounds.flatMap(r => r.matches);
                const played = matches.filter(isChallengerMatchScored).length;
                const perRound = Math.max(1, ...rounds.map(r => r.matches.length));
                const shown = Math.min(rounds.length, Math.max(1, Math.floor(matchCapacity / perRound)));
                const current = Math.max(0, rounds.findIndex(r => r.matches.some(m => !isChallengerMatchScored(m))));
                const currentRound = rounds.every(r => r.matches.every(isChallengerMatchScored)) ? rounds.length - 1 : current;
                const start = Math.min(Math.max(0, currentRound - Math.ceil((shown - 1) / 2)), rounds.length - shown);
                const visible = rounds.slice(start, start + shown);

                return (
                    <section key={g} className="min-h-0 flex flex-col rounded-3xl bg-white/[0.04] border border-white/10 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#FF4200] to-[#FF6A33]">
                            <h2 className="text-2xl font-black tracking-tight">{groupCount === 1 ? "Group" : `Group ${g}`}</h2>
                            <span className="text-base font-bold text-white/80 tabular-nums">{played}/{matches.length} played</span>
                        </div>

                        <div className={wide ? "flex-1 min-h-0 grid grid-cols-2 gap-4 p-2" : "flex-1 min-h-0 flex flex-col"}>
                            <div className="px-2 pt-2">
                                <div className="grid grid-cols-[2.5rem_1fr_repeat(4,2.75rem)] items-center px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white/40">
                                    <span>#</span>
                                    <span>Team</span>
                                    <span className="text-center">P</span>
                                    <span className="text-center">W</span>
                                    <span className="text-center">L</span>
                                    <span className="text-center">GD</span>
                                </div>
                                {standings[g].map(s => {
                                    const qualifies = s.rank <= 2;
                                    return (
                                        <div
                                            key={s.team.player1.id}
                                            className={`relative grid grid-cols-[2.5rem_1fr_repeat(4,2.75rem)] items-center px-3 py-1.5 rounded-xl mb-1 ${
                                                qualifies ? "bg-[#FF4200]/15" : "bg-white/[0.03]"
                                            }`}
                                        >
                                            <span
                                                className={`flex items-center justify-center w-8 h-8 rounded-lg text-lg font-black ${
                                                    qualifies ? "bg-[#FF4200] text-white" : "bg-white/10 text-white/60"
                                                }`}
                                            >
                                                {s.rank}
                                            </span>
                                            <TeamNames team={s.team} className="text-lg font-bold pl-1" />
                                            <span className="text-center text-lg font-semibold text-white/60 tabular-nums">{s.played}</span>
                                            <span className="text-center text-2xl font-black tabular-nums">{s.wins}</span>
                                            <span className="text-center text-lg font-semibold text-white/60 tabular-nums">{s.played - s.wins}</span>
                                            <span className={`text-center text-lg font-bold tabular-nums ${s.gameDiff > 0 ? "text-emerald-300" : s.gameDiff < 0 ? "text-rose-300" : "text-white/60"}`}>
                                                {s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}
                                            </span>
                                        </div>
                                    );
                                })}
                                <p className="flex items-center gap-2 px-3 pt-1 text-xs font-bold uppercase tracking-widest text-white/40">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-[#FF4200]" /> {qualifyLabel}
                                </p>
                            </div>

                            <div className={`flex-1 min-h-0 flex flex-col justify-around px-3 py-2 ${wide ? "border-l" : "mt-2 border-t"} border-white/10`}>
                                {visible.length < rounds.length && (
                                    <p className="px-2 text-xs font-bold uppercase tracking-widest text-white/30">
                                        Rounds {start + 1}–{start + visible.length} of {rounds.length}
                                    </p>
                                )}
                                {visible.map((round, i) => (
                                    <div key={round.id}>
                                        <p className="px-2 mb-0.5 text-xs font-bold uppercase tracking-widest text-[#9FD2DD]/70">
                                            Round {start + i + 1}
                                            {round.matches.length > 0 && round.matches.every(m => isIndoorCourt(progress.courtOf.get(m.id)!)) && " · Indoor"}
                                            {round.matches.length > 0 && round.matches.every(m => !isIndoorCourt(progress.courtOf.get(m.id)!)) && " · Outdoor"}
                                        </p>
                                        {round.matches.map(m => <GroupMatchRow key={m.id} match={m} court={progress.courtOf.get(m.id)} flash={flashing.has(m.id)} />)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

function GroupMatchRow({ match, court, flash }: { match: ChallengerMatch; court?: number; flash: boolean }) {
    return (
        <div className={`flex items-center gap-2 rounded-xl bg-white/[0.03] pl-2 pr-3 py-0.5 mb-1 last:mb-0 ${flash ? "live-flash" : ""}`}>
            {court != null && (
                <span className="shrink-0 w-7 text-center leading-none" title={`Court ${court}`}>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-white/35">Ct</span>
                    <span className="block text-lg font-black text-[#9FD2DD]/80 tabular-nums">{court}</span>
                </span>
            )}
            <div className="flex-1 min-w-0">
                <SetsLine match={match} side={1} />
                <SetsLine match={match} side={2} />
            </div>
        </div>
    );
}

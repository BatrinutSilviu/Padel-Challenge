// Full-screen scoreboard for broadcasting Masters tournaments on a TV. Polls for new
// scores, shows the group tables (up to 4 groups per screen) or the knockout bracket,
// and briefly highlights any result that has just come in.
//
// /live follows whichever live Masters tournament had a score saved most recently — and
// for 15 minutes after a Masters tournament is completed, shows its winners instead;
// /tournament/:id/live sticks to one tournament. Either way the screen follows the latest
// result: a group match shows its group, a knockout match the bracket. A tab (or ←/→,
// which most TV remotes send) shows another screen until the next result comes in.
// F (or a double click) toggles full screen.
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "../../trpc";
import {
    computeGroupStandings,
    isChallengerMatchScored,
    type ChallengerMatch,
    type ChallengerTeam,
    type GroupStanding,
} from "../../lib/challenger";
import {
    STAGE_INFO,
    isIndoorCourt,
    mastersKnockoutCourt,
    mastersProgress,
    slotLabel,
    type MastersProgress,
    type MastersSlotSource,
} from "../../lib/masters";

type TournamentData = NonNullable<ReturnType<typeof trpc.tournament.getById.useQuery>["data"]>;
type SceneKind = "groups" | "bracket";
type Scene = { key: string; kind: SceneKind; label: string; groups: string[] };
type Standings = Record<string, GroupStanding[]>;

const GROUPS_PER_SCREEN = 4;

const POLL_MS = 10_000;
// Matches WINNERS_SCREEN_MINUTES on the backend, which decides this for /live.
const WINNERS_SCREEN_MS = 15 * 60_000;
const FLASH_MS = 15_000;
// /tournament/:id/live — one tournament.
export function MastersLiveBoard() {
    const { id } = useParams<{ id: string }>();
    useTvScale();
    useWakeLock();
    return <TournamentBoard id={id!} />;
}

// /live — whichever live Masters tournament was scored last; switches when the other
// one gets a result.
export function LatestLiveBoard() {
    const { data } = trpc.tournament.liveBoard.useQuery(undefined, {
        refetchInterval: POLL_MS,
        refetchIntervalInBackground: true,
    });
    useTvScale();
    useWakeLock();

    if (!data) return <Message>Loading…</Message>;
    if (data.mode === "winners") return <WinnersBoard ids={data.tournamentIds} />;
    if (data.mode === "none") return <Message>No Masters tournament is live right now.</Message>;
    // Keyed so switching tournaments starts fresh instead of flashing every match.
    return <TournamentBoard key={data.tournamentId} id={data.tournamentId} />;
}

function Message({ children }: { children: ReactNode }) {
    return (
        <Screen>
            <div className="flex-1 flex items-center justify-center text-2xl text-white/50">{children}</div>
        </Screen>
    );
}

function TournamentBoard({ id }: { id: string }) {
    const { data: tournament, error, isError, dataUpdatedAt } = trpc.tournament.getById.useQuery(
        { id },
        { refetchInterval: POLL_MS, refetchIntervalInBackground: true },
    );
    const now = useNow();

    if (!tournament) {
        return (
            <Screen>
                <div className="flex-1 flex items-center justify-center text-2xl text-white/50">
                    {error ? "Tournament not found." : "Loading…"}
                </div>
            </Screen>
        );
    }
    if (tournament.type !== "MASTERS") {
        return (
            <Screen>
                <div className="flex-1 flex items-center justify-center text-2xl text-white/50">
                    The live board is only available for Masters tournaments.
                </div>
            </Screen>
        );
    }
    const completedAt = tournament.completedAt ? new Date(tournament.completedAt).getTime() : null;
    if (tournament.status === "COMPLETED" && completedAt !== null && now - completedAt < WINNERS_SCREEN_MS) {
        return <WinnersBoard ids={[id]} />;
    }
    return <LiveBoard tournament={tournament} updatedAt={dataUpdatedAt} stale={isError} />;
}

// ── Winners ─────────────────────────────────────────────────────────────────────
// Shown after a tournament is completed: a podium per tournament, side by side when
// two finished together.

function WinnersBoard({ ids }: { ids: string[] }) {
    const now = useNow();
    return (
        <Screen className="relative">
            <Confetti />
            <header className="relative flex items-center gap-6 shrink-0">
                <Brand />
                <h1 className="flex-1 text-center text-5xl font-black tracking-tight">
                    Congratulations to the winners!
                </h1>
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-5 py-2 text-lg font-black tracking-widest shrink-0">FINISHED</span>
                <span className="text-4xl font-black tabular-nums text-white/90 shrink-0">
                    {new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
            </header>
            <main
                className="relative flex-1 min-h-0 grid gap-10 live-scene-in"
                style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}
            >
                {ids.map(id => <WinnersPanel key={id} id={id} compact={ids.length > 1} />)}
            </main>
        </Screen>
    );
}

function WinnersPanel({ id, compact }: { id: string; compact: boolean }) {
    const { data: tournament } = trpc.tournament.getById.useQuery({ id });
    if (!tournament) return <div />;

    const progress = mastersProgress(tournament);
    const final = progress.final;
    const semifinals = progress.stages.find(stage => stage.key === "SEMIFINAL")?.slots ?? [];
    const champion = winnerOf(final);
    const runnerUp = loserOf(final);
    const thirds = semifinals.map(slot => loserOf(slot.match)).filter((t): t is ChallengerTeam => Boolean(t));

    return (
        <section className="min-h-0 flex flex-col">
            <h2 className={`text-center font-black tracking-tight text-[#9FD2DD] ${compact ? "text-3xl" : "text-4xl"}`}>{tournament.name}</h2>
            <div className="flex-1 min-h-0 flex items-end justify-center gap-4 pt-6">
                {runnerUp && <PodiumColumn place={2} teams={[runnerUp]} compact={compact} />}
                {champion && <PodiumColumn place={1} teams={[champion]} compact={compact} />}
                {thirds.length > 0 && <PodiumColumn place={3} teams={thirds} compact={compact} />}
            </div>
        </section>
    );
}

const PODIUM: Record<1 | 2 | 3, { medal: string; label: string; block: string; card: string; height: string }> = {
    1: {
        medal: "🏆",
        label: "Champions",
        block: "from-amber-300 to-amber-600 text-amber-950",
        card: "border-amber-300/80 bg-gradient-to-b from-amber-300/25 to-amber-500/5 shadow-[0_0_60px_rgba(252,211,77,0.35)]",
        height: "h-[42%]",
    },
    2: {
        medal: "🥈",
        label: "Runners-up",
        block: "from-slate-200 to-slate-400 text-slate-800",
        card: "border-slate-300/50 bg-white/[0.06]",
        height: "h-[30%]",
    },
    3: {
        medal: "🥉",
        label: "Third place",
        block: "from-orange-300 to-orange-700 text-orange-950",
        card: "border-orange-300/40 bg-white/[0.04]",
        height: "h-[20%]",
    },
};

function PodiumColumn({ place, teams, compact }: { place: 1 | 2 | 3; teams: ChallengerTeam[]; compact: boolean }) {
    const style = PODIUM[place];
    const champion = place === 1;
    const names = champion ? (compact ? "text-3xl" : "text-4xl") : compact ? "text-xl" : "text-2xl";

    return (
        <div className={`h-full flex flex-col justify-end ${champion ? "flex-[1.3]" : "flex-1"} min-w-0`}>
            <div className="flex flex-col gap-3 mb-4">
                <div className="text-center">
                    <div className={champion ? (compact ? "text-7xl" : "text-8xl") : compact ? "text-4xl" : "text-5xl"}>{style.medal}</div>
                    <p className="mt-1 text-sm font-black uppercase tracking-[0.25em] text-white/60">{style.label}</p>
                </div>
                {teams.map(team => (
                    <div key={team.player1.id} className={`rounded-2xl border-2 px-4 py-3 text-center ${style.card}`}>
                        <p className={`font-black leading-tight truncate ${names}`}>{team.player1.name}</p>
                        <p className={`font-black leading-tight truncate ${names}`}>{team.player2.name}</p>
                    </div>
                ))}
            </div>
            <div className={`${style.height} min-h-[4rem] rounded-t-2xl bg-gradient-to-b ${style.block} flex items-start justify-center pt-3`}>
                <span className={`font-black ${champion ? "text-7xl" : "text-5xl"}`}>{place}</span>
            </div>
        </div>
    );
}

// Light confetti drifting down behind the podium — pure CSS, generated once.
function Confetti() {
    const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: -Math.random() * 12,
        duration: 8 + Math.random() * 6,
        size: 0.4 + Math.random() * 0.5,
        color: ["#FF4200", "#FCD34D", "#9FD2DD", "#FFFFFF", "#F472B6"][i % 5],
        drift: (Math.random() - 0.5) * 12,
    })), []);
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {pieces.map((p, i) => (
                <span
                    key={i}
                    className="absolute top-0 rounded-sm opacity-80"
                    style={{
                        left: `${p.left}%`,
                        width: `${p.size}rem`,
                        height: `${p.size * 0.45}rem`,
                        background: p.color,
                        animation: `confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
                        "--drift": `${p.drift}rem`,
                    } as CSSProperties}
                />
            ))}
        </div>
    );
}

function LiveBoard({ tournament, updatedAt, stale }: { tournament: TournamentData; updatedAt: number; stale: boolean }) {
    const progress = mastersProgress(tournament);
    const now = useNow();
    const flashing = useRecentlyChanged([...progress.groupMatches, ...progress.bracketMatches], now);
    const idle = useIdle(3000);

    // 8 groups don't fit one screen, so they're shown 4 at a time.
    const pages = Array.from(
        { length: Math.ceil(progress.groups.length / GROUPS_PER_SCREEN) },
        (_, i) => progress.groups.slice(i * GROUPS_PER_SCREEN, (i + 1) * GROUPS_PER_SCREEN),
    );
    const allScenes: Scene[] = [
        ...pages.map((groups, i): Scene => ({
            key: `groups-${i}`,
            kind: "groups",
            label: pages.length === 1 ? "Groups" : `Groups ${groups[0]}–${groups[groups.length - 1]}`,
            groups,
        })),
        { key: "bracket", kind: "bracket", label: "Bracket", groups: [] },
    ];
    // The latest saved score picks the screen. Before anything is scored, open on the
    // stage being played.
    const bracketScene = allScenes[allScenes.length - 1];
    const latest = latestScoredMatch(tournament.rounds);
    const followScene = latest
        ? latest.groupName ? allScenes.find(s => s.groups.includes(latest.groupName!)) ?? allScenes[0] : bracketScene
        : progress.knockoutStarted ? bracketScene : allScenes[0];
    // A tab picked by hand holds only until the next result arrives.
    const [picked, setPicked] = useState<{ key: string; latest: string | null } | null>(null);
    const latestKey = latest?.key ?? null;
    const scene = (picked?.latest === latestKey && allScenes.find(s => s.key === picked.key)) || followScene;
    const sceneIndex = allScenes.indexOf(scene);

    function show(key: string) {
        setPicked({ key, latest: latestKey });
    }

    const step = useRef((_delta: number) => {});
    step.current = delta => show(allScenes[(sceneIndex + delta + allScenes.length) % allScenes.length].key);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") step.current(1);
            if (e.key === "ArrowLeft") step.current(-1);
            if (e.key === "f" || e.key === "F") toggleFullscreen();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const standings: Standings = Object.fromEntries(
        progress.groups.map(g => [g, computeGroupStandings(progress.groupRounds[g])]),
    );
    const groupPlayed = progress.groupMatches.filter(isChallengerMatchScored).length;
    const stageLabel = tournament.status === "COMPLETED"
        ? "Final results"
        : progress.knockoutStarted
            ? "Knockout stage"
            : `Group stage · ${groupPlayed}/${progress.groupMatches.length} matches played`;
    const secondsAgo = Math.max(0, Math.round((now - updatedAt) / 1000));

    return (
        <Screen className={idle ? "cursor-none" : ""} onDoubleClick={toggleFullscreen}>
            <header className="flex items-center gap-6 shrink-0">
                <Brand />
                <div className="min-w-0 flex-1">
                    <h1 className="text-4xl font-black tracking-tight truncate leading-tight">{tournament.name}</h1>
                    <p className="text-lg font-semibold text-[#9FD2DD]">{stageLabel}</p>
                </div>
                <nav
                    className="flex items-center gap-1 rounded-full bg-white/5 p-1 border border-white/10 shrink-0"
                    onDoubleClick={e => e.stopPropagation()}
                >
                    {allScenes.map(s => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => show(s.key)}
                            className={`px-5 py-2 rounded-full text-base font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${
                                scene.key === s.key ? "bg-white text-[#1A1A3E]" : "text-white/50 hover:text-white hover:bg-white/10"
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </nav>
                {tournament.status === "IN_PROGRESS" ? (
                    <span className="flex items-center gap-2.5 rounded-full bg-[#FF4200] px-5 py-2 text-lg font-black tracking-widest shrink-0">
                        <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                        </span>
                        LIVE
                    </span>
                ) : tournament.status === "COMPLETED" ? (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-5 py-2 text-lg font-black tracking-widest shrink-0">FINISHED</span>
                ) : null}
                <span className="text-4xl font-black tabular-nums text-white/90 shrink-0">
                    {new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
            </header>

            <main key={scene.key} className="flex-1 min-h-0 live-scene-in">
                {scene.kind === "groups"
                    ? <GroupsScene progress={progress} groups={scene.groups} standings={standings} flashing={flashing} />
                    : <BracketScene progress={progress} standings={standings} flashing={flashing} />}
            </main>

            <footer className="shrink-0">
                <div className="flex items-center justify-between text-sm font-semibold text-white/40">
                    <span className={stale ? "text-amber-300" : ""}>
                        {stale ? "Connection lost — reconnecting…" : `Updated ${secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}`}
                    </span>
                    <span className={`transition-opacity ${idle ? "opacity-0" : "opacity-100"}`}>
                        Follows the latest result · a tab or ← → shows another screen until the next one · F full screen
                    </span>
                </div>
            </footer>
        </Screen>
    );
}

// ── Groups ──────────────────────────────────────────────────────────────────────

function GroupsScene({
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

// One team's line of a scoreboard: names (the match winner's in bold white), then a box
// per set with the set winner's games highlighted. A deciding tiebreak box is outlined.
function SetsLine({ match, side, size = "sm" }: { match: ChallengerMatch; side: 1 | 2; size?: "sm" | "md" | "lg" }) {
    const team = teamsOf(match)[side - 1];
    const scored = isChallengerMatchScored(match);
    const won = scored && (side === 1 ? match.team1Score > match.team2Score : match.team2Score > match.team1Score);
    const sets = match.sets ?? [];
    const box = { sm: "min-w-[1.6rem] h-6 text-base", md: "min-w-[2.75rem] h-11 text-2xl", lg: "min-w-[3.5rem] h-14 text-3xl" }[size];
    const names = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[size];

    return (
        <div className={`flex items-center gap-1.5 ${size === "sm" ? "py-px" : "py-1.5"}`}>
            {size === "sm" ? (
                <p className={`flex-1 min-w-0 truncate ${names} ${!scored ? "font-semibold text-white/80" : won ? "font-extrabold text-white" : "font-medium text-white/40"}`}>
                    {team.player1.name} / {team.player2.name}
                </p>
            ) : (
                <TeamNames team={team} className={`flex-1 ${names} ${!scored ? "font-semibold text-white/90" : won ? "font-extrabold text-white" : "font-medium text-white/35"}`} />
            )}
            {sets.length === 0 ? (
                <span className={`flex items-center justify-center rounded-lg font-black bg-white/5 text-white/20 ${box}`}>–</span>
            ) : (
                sets.map(set => {
                    const mine = side === 1 ? set.team1Games : set.team2Games;
                    const theirs = side === 1 ? set.team2Games : set.team1Games;
                    const wonSet = mine > theirs;
                    return (
                        <span
                            key={set.setNumber}
                            className={`flex items-center justify-center rounded-lg px-1 font-black tabular-nums ${box} ${
                                set.isTiebreak ? "border border-[#9FD2DD]/40 " : ""
                            }${wonSet ? "bg-[#FF4200] text-white" : "bg-white/10 text-white/50"}`}
                        >
                            {set.isTiebreak ? <span className="text-[0.8em]">{mine}</span> : mine}
                        </span>
                    );
                })
            )}
        </div>
    );
}

// ── Bracket ─────────────────────────────────────────────────────────────────────

type SlotInfo = { label: string; team?: ChallengerTeam };
type CardSize = "sm" | "md" | "lg";

function BracketScene({
    progress,
    standings,
    flashing,
}: {
    progress: MastersProgress;
    standings: Standings;
    flashing: Set<string>;
}) {
    const { stages, final } = progress;
    // Before the draw, show who would go through if the group stage ended now; later
    // stages show the winners so far.
    const resolve = (source: MastersSlotSource): SlotInfo => {
        if (source.kind === "seed") {
            const { group, rank } = source.seed;
            const scoredAny = progress.groupRounds[group].some(r => r.matches.some(isChallengerMatchScored));
            return { label: source.label, team: scoredAny ? standings[group][rank - 1]?.team : undefined };
        }
        const prev = stages.find(st => st.key === source.stage);
        return { label: source.label, team: winnerOf(prev?.slots[source.index]?.match) };
    };
    const scored = (m?: ChallengerMatch) => m != null && isChallengerMatchScored(m);
    const sizeOf = (key: string, slots: number): CardSize => (key === "FINAL" ? "lg" : slots >= 8 ? "sm" : "md");
    const template = [...stages.map(() => "minmax(0,1fr)"), "0.85fr"].join(" 3rem ");

    return (
        <div className="h-full grid grid-rows-[auto_1fr] gap-y-4" style={{ gridTemplateColumns: template } as CSSProperties}>
            {stages.map(stage => (
                <Fragment key={stage.key}>
                    <StageTitle accent={stage.key === "FINAL"}>{STAGE_INFO[stage.key].title}</StageTitle>
                    <span />
                </Fragment>
            ))}
            <StageTitle gold>Champion</StageTitle>

            {stages.map(stage => (
                <Fragment key={stage.key}>
                    <div className="flex flex-col justify-around min-h-0">
                        {stage.slots.map((slot, i) => (
                            <KnockoutCard
                                key={i}
                                label={`${slotLabel(stage.key, i)} · Court ${(slot.match && progress.courtOf.get(slot.match.id)) ?? mastersKnockoutCourt(i)}`}
                                match={slot.match}
                                slots={[resolve(slot.sources[0]), resolve(slot.sources[1])]}
                                flash={!!slot.match && flashing.has(slot.match.id)}
                                size={sizeOf(stage.key, stage.slots.length)}
                            />
                        ))}
                    </div>
                    <Connector done={stage.slots.map(slot => scored(slot.match))} />
                </Fragment>
            ))}
            <div className="flex flex-col justify-around min-h-0">
                <ChampionCard team={winnerOf(final)} />
            </div>
        </div>
    );
}

function StageTitle({ children, accent, gold }: { children: ReactNode; accent?: boolean; gold?: boolean }) {
    return (
        <h2 className={`text-lg font-black uppercase tracking-[0.2em] ${gold ? "text-amber-300" : accent ? "text-[#FF4200]" : "text-[#9FD2DD]"}`}>
            {children}
        </h2>
    );
}

function KnockoutCard({
    label,
    match,
    slots,
    flash,
    size,
}: {
    label: string;
    match?: ChallengerMatch;
    slots: [SlotInfo, SlotInfo];
    flash: boolean;
    size: CardSize;
}) {
    const big = size === "lg";
    const frame = big
        ? "border-2 border-[#FF4200] shadow-[0_0_40px_rgba(255,66,0,0.35)] bg-[#FF4200]/[0.08]"
        : match ? "border border-white/15 bg-white/[0.05]" : "border border-dashed border-white/15 bg-white/[0.02]";

    return (
        <div className={`rounded-2xl overflow-hidden ${frame} ${flash ? "live-flash" : ""}`}>
            <div className={`flex items-center justify-between px-4 text-xs font-bold uppercase tracking-widest text-white/40 ${size === "sm" ? "pt-1" : "pt-2"}`}>
                <span>{label}</span>
                {match && !isChallengerMatchScored(match) && <span className="text-[#9FD2DD]">Up next</span>}
            </div>
            {match ? (
                <>
                    <div className="px-3">
                        <SetsLine match={match} side={1} size={size} />
                        <div className="h-px bg-white/10" />
                        <SetsLine match={match} side={2} size={size} />
                    </div>
                </>
            ) : (
                <>
                    <PlaceholderRow slot={slots[0]} size={size} />
                    <div className="mx-4 h-px bg-white/5" />
                    <PlaceholderRow slot={slots[1]} size={size} />
                </>
            )}
        </div>
    );
}

function PlaceholderRow({ slot, size }: { slot: SlotInfo; size: CardSize }) {
    const box = { sm: "py-1 min-h-[2.5rem]", md: "py-2 min-h-[4rem]", lg: "py-3 min-h-[5.5rem]" }[size];
    return (
        <div className={`px-4 ${box} flex flex-col justify-center`}>
            <p className={`font-bold uppercase tracking-widest text-[#9FD2DD]/80 ${size === "sm" ? "text-xs" : "text-sm"}`}>{slot.label}</p>
            {slot.team && (
                <p className={`truncate font-semibold text-white/50 italic ${{ sm: "text-sm", md: "text-base", lg: "text-xl" }[size]}`}>
                    {slot.team.player1.name} / {slot.team.player2.name}
                </p>
            )}
        </div>
    );
}

function ChampionCard({ team }: { team?: ChallengerTeam }) {
    return (
        <div
            className={`rounded-3xl px-5 py-8 text-center ${
                team
                    ? "bg-gradient-to-b from-amber-300/25 to-amber-500/5 border-2 border-amber-300/70 shadow-[0_0_60px_rgba(252,211,77,0.3)]"
                    : "border border-dashed border-white/15"
            }`}
        >
            <div className={`text-7xl mb-4 ${team ? "" : "grayscale opacity-30"}`}>🏆</div>
            {team ? (
                <>
                    <p className="text-2xl font-black leading-tight">{team.player1.name}</p>
                    <p className="text-2xl font-black leading-tight">{team.player2.name}</p>
                </>
            ) : (
                <p className="text-lg font-bold text-white/30">To be decided</p>
            )}
        </div>
    );
}

// Lines joining each pair of matches on the left to the match they feed on the right.
// Columns use justify-around, so the n-th of k cards is centred at (n + ½)/k of the height
// no matter how tall the cards are — the lines can be drawn on that grid.
function Connector({ done }: { done: boolean[] }) {
    const n = done.length;
    const y = (i: number, of: number) => ((i + 0.5) / of) * 100;
    const stroke = (on: boolean) => (on ? "#FF4200" : "rgba(255,255,255,0.18)");
    const lineProps = { fill: "none", strokeWidth: 3, vectorEffect: "non-scaling-stroke" as const };

    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" aria-hidden>
            {n === 1 ? (
                <path d={`M0 50 H100`} stroke={stroke(done[0])} {...lineProps} />
            ) : (
                Array.from({ length: n / 2 }, (_, p) => {
                    const top = y(p * 2, n);
                    const bottom = y(p * 2 + 1, n);
                    const mid = y(p, n / 2);
                    return (
                        <g key={p}>
                            <path d={`M0 ${top} H50 V${mid}`} stroke={stroke(done[p * 2])} {...lineProps} />
                            <path d={`M0 ${bottom} H50 V${mid}`} stroke={stroke(done[p * 2 + 1])} {...lineProps} />
                            <path d={`M50 ${mid} H100`} stroke={stroke(done[p * 2] && done[p * 2 + 1])} {...lineProps} />
                        </g>
                    );
                })
            )}
        </svg>
    );
}

// ── Shared bits ─────────────────────────────────────────────────────────────────

// Our logo, then our partners' (white artwork, made for dark backgrounds).
function Brand() {
    return (
        <div className="flex items-center gap-3 shrink-0">
            <img src="/active.png" alt="Act!ve" className="h-9 w-auto" />
            <div className="w-px h-8 bg-white/20" />
            <span className="text-4xl font-black tracking-tighter leading-none">
                Padel<span className="text-[#FF4200]">.</span>
            </span>
            <div className="w-px h-12 bg-white/20 ml-3" />
            <img src="/partner-logo.svg" alt="Active Arena" className="h-16 w-auto ml-1" />
        </div>
    );
}

function Screen({ children, className = "", onDoubleClick }: { children: ReactNode; className?: string; onDoubleClick?: () => void }) {
    return (
        <div
            onDoubleClick={onDoubleClick}
            className={`h-screen w-screen overflow-hidden flex flex-col gap-6 px-10 py-7 text-white select-none ${className}`}
            style={{ background: "radial-gradient(ellipse at top, #333366 0%, #1A1A3E 45%, #0B0B1E 100%)" }}
        >
            {children}
        </div>
    );
}

function TeamNames({ team, className = "" }: { team: ChallengerTeam; className?: string }) {
    return (
        <div className={`min-w-0 leading-tight ${className}`}>
            <p className="truncate">{team.player1.name}</p>
            <p className="truncate">{team.player2.name}</p>
        </div>
    );
}

function teamsOf(m: ChallengerMatch): [ChallengerTeam, ChallengerTeam] {
    return [
        { player1: m.team1Player1, player2: m.team1Player2 },
        { player1: m.team2Player1, player2: m.team2Player2 },
    ];
}

function winnerOf(m?: ChallengerMatch): ChallengerTeam | undefined {
    if (!m || !isChallengerMatchScored(m)) return undefined;
    const [t1, t2] = teamsOf(m);
    return m.team1Score > m.team2Score ? t1 : t2;
}

function loserOf(m?: ChallengerMatch): ChallengerTeam | undefined {
    if (!m || !isChallengerMatchScored(m)) return undefined;
    const [t1, t2] = teamsOf(m);
    return m.team1Score > m.team2Score ? t2 : t1;
}

// The most recently scored match (by its save time) and the group it was played in —
// null for a knockout match. `key` changes whenever a newer score is saved.
function latestScoredMatch(rounds: { groupName: string | null; matches: (ChallengerMatch & { scoredAt?: string | Date | null })[] }[]) {
    let best: { key: string; groupName: string | null; at: number } | null = null;
    for (const round of rounds) {
        for (const m of round.matches) {
            if (!m.scoredAt || !isChallengerMatchScored(m)) continue;
            const at = new Date(m.scoredAt).getTime();
            if (!best || at > best.at) best = { key: `${m.id}@${at}`, groupName: round.groupName, at };
        }
    }
    return best;
}

function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
}

// Scales every rem-based size with the screen, so the board fills a 720p, 1080p or 4K TV
// the same way (16px at 1920×1080).
function useTvScale() {
    useEffect(() => {
        const html = document.documentElement;
        const previous = html.style.fontSize;
        html.style.fontSize = "max(10px, min(0.833vw, 1.48vh))";
        return () => { html.style.fontSize = previous; };
    }, []);
}

// Stops the TV's browser from dimming or sleeping while the board is up.
function useWakeLock() {
    useEffect(() => {
        let lock: { release: () => Promise<void> } | null = null;
        const request = () => {
            (navigator as any).wakeLock?.request("screen").then((l: typeof lock) => { lock = l; }).catch(() => {});
        };
        const onVisible = () => { if (document.visibilityState === "visible") request(); };
        request();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            lock?.release().catch(() => {});
        };
    }, []);
}

function useNow(): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    return now;
}

function useIdle(ms: number): boolean {
    const [idle, setIdle] = useState(false);
    useEffect(() => {
        let t = setTimeout(() => setIdle(true), ms);
        const onMove = () => {
            setIdle(false);
            clearTimeout(t);
            t = setTimeout(() => setIdle(true), ms);
        };
        window.addEventListener("mousemove", onMove);
        return () => { clearTimeout(t); window.removeEventListener("mousemove", onMove); };
    }, [ms]);
    return idle;
}

// Match ids whose score changed (or that were just drawn) in the last FLASH_MS. Nothing
// flashes on the first load — only updates that arrive while the board is up.
function useRecentlyChanged(matches: ChallengerMatch[], now: number): Set<string> {
    const previous = useRef<Map<string, string> | null>(null);
    const [changedAt, setChangedAt] = useState<Map<string, number>>(new Map());
    const signatures = new Map(matches.map(m => [
        m.id,
        `${m.team1Score}-${m.team2Score}-${m.team1TiebreakPoints}-${m.team2TiebreakPoints}`,
    ]));
    const key = [...signatures].join("|");

    useEffect(() => {
        const prev = previous.current;
        previous.current = signatures;
        if (!prev) return;
        const fresh = [...signatures].filter(([id, sig]) => prev.get(id) !== sig).map(([id]) => id);
        if (fresh.length === 0) return;
        setChangedAt(old => {
            const next = new Map(old);
            for (const id of fresh) next.set(id, Date.now());
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return new Set([...changedAt].filter(([, t]) => now - t < FLASH_MS).map(([id]) => id));
}

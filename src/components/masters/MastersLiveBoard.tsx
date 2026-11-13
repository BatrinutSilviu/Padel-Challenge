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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { trpc } from "../../trpc";
import type { TournamentData } from "../../lib/tournaments";
import { computeGroupStandings, isChallengerMatchScored, type GroupStanding } from "../../lib/challenger";
import { mastersProgress } from "../../lib/masters";
import { useIdle, useNow, useRecentlyChanged, useTvScale, useWakeLock } from "./liveBoard/hooks";
import { latestScoredMatch } from "./liveBoard/matches";
import { Brand, Screen } from "./liveBoard/parts";
import { WinnersBoard } from "./liveBoard/WinnersBoard";
import { GroupsScene } from "./liveBoard/GroupsScene";
import { BracketScene } from "./liveBoard/BracketScene";

type SceneKind = "groups" | "bracket";
type Scene = { key: string; kind: SceneKind; label: string; groups: string[] };
type Standings = Record<string, GroupStanding[]>;

const GROUPS_PER_SCREEN = 4;

const POLL_MS = 10_000;
// Matches WINNERS_SCREEN_MINUTES on the backend, which decides this for /live.
const WINNERS_SCREEN_MS = 15 * 60_000;

// /tournament/:id/live — one tournament.
export function MastersLiveBoard() {
    const { id } = useParams<{ id: string }>();
    return <PhoneGate tournamentId={id}><MastersTvBoard id={id!} /></PhoneGate>;
}

function MastersTvBoard({ id }: { id: string }) {
    useTvScale();
    useWakeLock();
    return <TournamentBoard id={id} />;
}

// /live — whichever live Masters tournament was scored last; switches when the other
// one gets a result.
export function LatestLiveBoard() {
    return <PhoneGate><LatestTvBoard /></PhoneGate>;
}

// The board is laid out for a TV. On a phone held upright it can't be read, so it
// points to the tournament page instead — unless asked to show the board anyway (or the
// phone is turned sideways).
function PhoneGate({ tournamentId, children }: { tournamentId?: string; children: ReactNode }) {
    const narrow = () => typeof window !== "undefined" && window.innerWidth < 768 && window.innerHeight > window.innerWidth;
    const [isNarrow, setIsNarrow] = useState(narrow);
    const [anyway, setAnyway] = useState(false);
    useEffect(() => {
        const update = () => setIsNarrow(narrow());
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);
    if (!isNarrow || anyway) return <>{children}</>;
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center text-white"
            style={{ background: "radial-gradient(ellipse at top, #333366 0%, #1A1A3E 45%, #0B0B1E 100%)" }}
        >
            <p className="text-4xl" aria-hidden>📺</p>
            <div>
                <p className="text-xl font-black">This is the TV board</p>
                <p className="text-sm text-white/70 mt-1">It's made for the big screen at the club. On your phone, the tournament page shows the same scores and standings.</p>
            </div>
            <Link
                to={tournamentId ? `/tournament/${tournamentId}` : "/"}
                className="w-full max-w-xs rounded-xl bg-[#FF4200] px-5 py-3 text-base font-bold"
            >
                {tournamentId ? "Open the tournament page" : "Go to the home page"}
            </Link>
            <button type="button" onClick={() => setAnyway(true)} className="text-sm font-semibold text-white/70 underline py-2">
                Show the TV board anyway
            </button>
        </div>
    );
}

function LatestTvBoard() {
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

    const step = useRef<(delta: number) => void>(() => {});
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

function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
}

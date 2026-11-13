import { useMemo, type CSSProperties } from "react";
import { trpc } from "../../../trpc";
import type { ChallengerTeam } from "../../../lib/challenger";
import { mastersProgress } from "../../../lib/masters";
import { useNow } from "./hooks";
import { loserOf, winnerOf } from "./matches";
import { Brand, Screen } from "./parts";

// ── Winners ─────────────────────────────────────────────────────────────────────
// Shown after a tournament is completed: a podium per tournament, side by side when
// two finished together.

export function WinnersBoard({ ids }: { ids: string[] }) {
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
    // Tournaments from before the 3rd place match have two teams sharing 3rd.
    const thirdPlaceWinner = winnerOf(progress.thirdPlace?.match);
    const thirds = thirdPlaceWinner
        ? [thirdPlaceWinner]
        : semifinals.map(slot => loserOf(slot.match)).filter((t): t is ChallengerTeam => Boolean(t));

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

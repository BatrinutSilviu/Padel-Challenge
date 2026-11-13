import { Fragment, type CSSProperties, type ReactNode } from "react";
import { isChallengerMatchScored, type ChallengerMatch, type ChallengerTeam, type GroupStanding } from "../../../lib/challenger";
import {
    MASTERS_THIRD_PLACE_COURT,
    STAGE_INFO,
    mastersKnockoutCourt,
    slotLabel,
    type MastersProgress,
    type MastersSlotSource,
} from "../../../lib/masters";
import { loserOf, winnerOf } from "./matches";
import { SetsLine } from "./parts";

type Standings = Record<string, GroupStanding[]>;

// ── Bracket ─────────────────────────────────────────────────────────────────────

type SlotInfo = { label: string; team?: ChallengerTeam };
type CardSize = "sm" | "md" | "lg";

export function BracketScene({
    progress,
    standings,
    flashing,
}: {
    progress: MastersProgress;
    standings: Standings;
    flashing: Set<string>;
}) {
    const { stages, final, thirdPlace } = progress;
    // Before the draw, show who would go through if the group stage ended now; later
    // stages show the winners so far.
    const resolve = (source: MastersSlotSource): SlotInfo => {
        if (source.kind === "seed") {
            const { group, rank } = source.seed;
            const scoredAny = progress.groupRounds[group].some(r => r.matches.some(isChallengerMatchScored));
            return { label: source.label, team: scoredAny ? standings[group][rank - 1]?.team : undefined };
        }
        const prev = stages.find(st => st.key === source.stage)?.slots[source.index]?.match;
        return { label: source.label, team: source.kind === "loser" ? loserOf(prev) : winnerOf(prev) };
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
                    <div className="relative flex flex-col justify-around min-h-0">
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
                        {/* Pinned to the bottom, so the Final stays centred where the bracket lines meet it. */}
                        {stage.key === "FINAL" && thirdPlace && (
                            <div className="absolute inset-x-0 bottom-0">
                                <KnockoutCard
                                    label={`3rd Place · Court ${(thirdPlace.match && progress.courtOf.get(thirdPlace.match.id)) ?? MASTERS_THIRD_PLACE_COURT}`}
                                    match={thirdPlace.match}
                                    slots={[resolve(thirdPlace.sources[0]), resolve(thirdPlace.sources[1])]}
                                    flash={!!thirdPlace.match && flashing.has(thirdPlace.match.id)}
                                    size="md"
                                />
                            </div>
                        )}
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

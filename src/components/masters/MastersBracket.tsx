import type { CSSProperties, ReactNode } from "react";
import { STAGE_INFO, slotLabel, type MastersKnockoutStage } from "../../lib/masters";
import { BracketMatchCard } from "../challenger/ChallengerBracket";

// First knockout round → … → Final, left to right on wide screens and stacked on
// phones. Stages not drawn yet show where their teams will come from.
export function MastersBracket({ stages }: { stages: MastersKnockoutStage[] }) {
    return (
        <div
            className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-4 sm:p-6 grid grid-cols-1 md:[grid-template-columns:repeat(var(--stages),minmax(0,1fr))] gap-6 md:gap-4"
            style={{ "--stages": stages.length } as CSSProperties}
        >
            {stages.map(stage => (
                <Stage key={stage.key} title={STAGE_INFO[stage.key].title} accent={stage.key === "FINAL"}>
                    {stage.slots.map((slot, i) => (
                        <Slot key={i} label={stage.key === "FINAL" ? null : slotLabel(stage.key, i)}>
                            {slot.match
                                ? <BracketMatchCard match={slot.match} />
                                : <BracketMatchCard placeholderLeft={slot.sources[0].label} placeholderRight={slot.sources[1].label} />}
                        </Slot>
                    ))}
                </Stage>
            ))}
        </div>
    );
}

function Stage({ title, accent, children }: { title: string; accent?: boolean; children: ReactNode }) {
    return (
        <div className="flex flex-col">
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${accent ? "text-[#FF4200]" : "text-[#8E8E93]"}`}>{title}</p>
            <div className="flex-1 flex flex-col justify-around gap-4">{children}</div>
        </div>
    );
}

function Slot({ label, children }: { label: string | null; children: ReactNode }) {
    return (
        <div>
            {label && <p className="text-[10px] font-bold uppercase tracking-widest text-[#C7C7CC] mb-1">{label}</p>}
            {children}
        </div>
    );
}

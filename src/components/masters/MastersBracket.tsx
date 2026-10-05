import type { CSSProperties, ReactNode } from "react";
import { MASTERS_THIRD_PLACE_COURT, STAGE_INFO, mastersKnockoutCourt, slotLabel, type MastersKnockoutStage, type MastersSlot } from "../../lib/masters";
import { BracketMatchCard } from "../challenger/ChallengerBracket";

// First knockout round → … → Final, left to right on wide screens and stacked on
// phones, with the 3rd place match under the Final. Stages not drawn yet show where their
// teams will come from.
export function MastersBracket({
    stages,
    thirdPlace,
    courtOf,
}: {
    stages: MastersKnockoutStage[];
    thirdPlace?: MastersSlot;
    courtOf: Map<string, number>;
}) {
    return (
        <div
            className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm p-4 sm:p-6 grid grid-cols-1 md:[grid-template-columns:repeat(var(--stages),minmax(0,1fr))] gap-6 md:gap-4"
            style={{ "--stages": stages.length } as CSSProperties}
        >
            {stages.map(stage => (
                <Stage key={stage.key} title={STAGE_INFO[stage.key].title} accent={stage.key === "FINAL"}>
                    {stage.slots.map((slot, i) => (
                        <Slot key={i} label={`${stage.key === "FINAL" ? "" : `${slotLabel(stage.key, i)} · `}Court ${(slot.match && courtOf.get(slot.match.id)) ?? mastersKnockoutCourt(i)}`}>
                            <SlotCard slot={slot} />
                        </Slot>
                    ))}
                    {stage.key === "FINAL" && thirdPlace && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">3rd Place</p>
                            <Slot label={`Court ${(thirdPlace.match && courtOf.get(thirdPlace.match.id)) ?? MASTERS_THIRD_PLACE_COURT}`}>
                                <SlotCard slot={thirdPlace} />
                            </Slot>
                        </div>
                    )}
                </Stage>
            ))}
        </div>
    );
}

function SlotCard({ slot }: { slot: MastersSlot }) {
    return slot.match
        ? <BracketMatchCard match={slot.match} />
        : <BracketMatchCard placeholderLeft={slot.sources[0].label} placeholderRight={slot.sources[1].label} />;
}

function Stage({ title, accent, children }: { title: string; accent?: boolean; children: ReactNode }) {
    return (
        <div className="flex flex-col">
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${accent ? "text-[#FF4200]" : "text-[#8E8E93]"}`}>{title}</p>
            <div className="flex-1 flex flex-col justify-around gap-4">{children}</div>
        </div>
    );
}

function Slot({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C7C7CC] mb-1">{label}</p>
            {children}
        </div>
    );
}

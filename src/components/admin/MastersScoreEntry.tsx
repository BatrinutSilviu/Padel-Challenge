import { useEffect, useRef, useState } from "react";
import { isChallengerMatchScored } from "../../lib/challenger";
import { STAGE_INFO, courtName, mastersKnockoutCourt, mastersProgress, type MastersMatch, type MastersRound } from "../../lib/masters";
import { MastersCourtPicker } from "./MastersCourtPicker";
import { MastersMatchScoreRow, type OnMastersSaved } from "./MastersMatchScoreRow";

const KNOCKOUT = "knockout";
const sectionKey = (tournamentId: string) => `padel-masters-section-${tournamentId}`;

// Score entry for a Masters tournament, one stage at a time: a sticky bar of Group A, B, …
// and Knockout buttons picks which one is shown, so an admin on a phone doesn't scroll
// past every finished group match to reach the knockout.
export function MastersScoreEntry({
    tournament,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    tournament: { id: string; rounds: MastersRound[]; groupCount?: number | null; teamsPerGroup?: number | null };
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: OnMastersSaved;
}) {
    const progress = mastersProgress(tournament);
    const rows: { label: string; match: MastersMatch }[] = progress.stages.flatMap(stage =>
        stage.slots.flatMap((slot, i) => slot.match
            ? [{ label: `${stage.key === "FINAL" ? "Final" : `${STAGE_INFO[stage.key].one} ${i + 1}`} · ${courtName(progress.courtOf.get(slot.match.id) ?? mastersKnockoutCourt(i))}`, match: slot.match }]
            : []),
    );
    // The first stage that hasn't been drawn yet, if the knockout is under way.
    const nextStage = progress.stages.find(stage => stage.slots.every(slot => !slot.match));
    const nextStageNote = nextStage
        ? nextStage.key === "FINAL" ? "The Final is" : `The ${STAGE_INFO[nextStage.key].title.toLowerCase()} are`
        : null;
    const rowProps = { onSaveStart, onSaveEnd, onSaved };
    const courtPicker = (match: MastersMatch) => (
        <MastersCourtPicker
            tournamentId={tournament.id}
            matchId={match.id}
            court={progress.courtOf.get(match.id)}
            autoCourt={progress.autoCourtOf.get(match.id)}
            isSet={match.court != null}
        />
    );
    const singleGroup = progress.groups.length === 1;

    const sections = [
        ...progress.groups.map(g => {
            const matches = progress.groupRounds[g].flatMap(r => r.matches);
            return {
                key: g,
                label: singleGroup ? "Group" : `Group ${g}`,
                // With 8 groups the bar only has room for the letters.
                short: singleGroup ? "Group" : progress.groups.length > 4 ? g : `Group ${g}`,
                scored: matches.filter(isChallengerMatchScored).length,
                total: matches.length,
            };
        }),
        ...(progress.knockoutStarted
            ? [{ key: KNOCKOUT, label: "Knockout", short: progress.groups.length > 4 ? "KO" : "Bracket", scored: progress.bracketMatches.filter(isChallengerMatchScored).length, total: progress.knockoutMatchCount }]
            : []),
    ];

    // Opens where the work is: the knockout once it's drawn, else the first group with
    // matches left (or wherever this admin was, on a reload). After that it only moves
    // when tapped — or when the knockout is drawn — so a row never vanishes mid-edit.
    const [selected, setSelected] = useState<string>(() => {
        const saved = readSection(tournament.id);
        if (saved && sections.some(s => s.key === saved)) return saved;
        if (progress.knockoutStarted) return KNOCKOUT;
        return sections.find(s => s.scored < s.total)?.key ?? sections[0]?.key;
    });
    const knockoutWasStarted = useRef(progress.knockoutStarted);
    useEffect(() => {
        if (progress.knockoutStarted && !knockoutWasStarted.current) setSelected(KNOCKOUT);
        knockoutWasStarted.current = progress.knockoutStarted;
    }, [progress.knockoutStarted]);
    useEffect(() => { writeSection(tournament.id, selected); }, [tournament.id, selected]);

    const listRef = useRef<HTMLDivElement>(null);
    function select(key: string) {
        setSelected(key);
        // Keep the bar in view and start the new stage at its top.
        if (listRef.current && listRef.current.getBoundingClientRect().top < 0) {
            listRef.current.scrollIntoView({ block: "start" });
        }
    }

    const active = sections.find(s => s.key === selected) ?? sections[0];

    return (
        <div ref={listRef} className="space-y-4 scroll-mt-[50px]">
            {sections.length > 1 && (
                <div className="sticky top-[50px] z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-2 bg-gray-50/95 backdrop-blur">
                    <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
                        {sections.map(s => {
                            const done = s.total > 0 && s.scored === s.total;
                            const on = s.key === active.key;
                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => select(s.key)}
                                    className={`flex-1 min-w-0 rounded-lg px-1 py-1.5 text-center transition-colors ${
                                        on ? "bg-[#FF4200] text-white" : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <span className="block text-xs sm:text-sm font-semibold whitespace-nowrap truncate">
                                        <span className="sm:hidden">{s.short}</span>
                                        <span className="hidden sm:inline">{s.label}</span>
                                    </span>
                                    <span className={`block text-[11px] tabular-nums ${on ? "text-white/80" : done ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                        {done ? "✓" : `${s.scored}/${s.total}`}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {active.key !== KNOCKOUT ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <SectionHeader title={active.label} note="2 sets · tiebreak at 1-1" />
                    <div className="divide-y divide-gray-200">
                        {progress.groupRounds[active.key].map((round, ri) => (
                            <div key={round.id}>
                                <div className="px-4 sm:px-5 py-2 bg-gray-50/70 border-b border-gray-100">
                                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Round {ri + 1}</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {round.matches.map(match => (
                                        <MastersMatchScoreRow key={match.id} match={match} label={courtName(progress.courtOf.get(match.id)!)} aside={courtPicker(match)} {...rowProps} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <SectionHeader title="Knockout" note="Best of 3 sets" accent />
                    <div className="divide-y divide-gray-100">
                        {rows.map(({ label, match }) => (
                            <MastersMatchScoreRow key={match.id} match={match} label={label} aside={courtPicker(match)} {...rowProps} />
                        ))}
                    </div>
                    {nextStageNote && (
                        <p className="px-4 sm:px-5 py-3 text-xs text-gray-400 border-t border-gray-100">
                            {nextStageNote} drawn automatically once every match above is scored.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function SectionHeader({ title, note, accent }: { title: string; note: string; accent?: boolean }) {
    return (
        <div className={`px-4 sm:px-5 py-3 border-b flex items-center justify-between gap-3 ${
            accent ? "bg-orange-50 border-[#FF4200]/20 text-[#FF4200]" : "bg-gray-50 border-gray-200 text-gray-700"
        }`}>
            <span className="font-semibold">{title}</span>
            <span className="text-xs text-gray-400">{note}</span>
        </div>
    );
}

function readSection(tournamentId: string): string | null {
    try { return localStorage.getItem(sectionKey(tournamentId)); } catch { return null; }
}

function writeSection(tournamentId: string, key: string) {
    try { localStorage.setItem(sectionKey(tournamentId), key); } catch { /* storage unavailable */ }
}

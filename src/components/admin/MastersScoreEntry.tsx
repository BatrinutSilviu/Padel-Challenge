import { STAGE_INFO, mastersProgress, type MastersMatch, type MastersRound } from "../../lib/masters";
import { MastersMatchScoreRow, type OnMastersSaved } from "./MastersMatchScoreRow";

export function MastersScoreEntry({
    tournament,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    tournament: { rounds: MastersRound[]; groupCount?: number | null; teamsPerGroup?: number | null };
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: OnMastersSaved;
}) {
    const progress = mastersProgress(tournament);
    const rows: { label: string; match: MastersMatch }[] = progress.stages.flatMap(stage =>
        stage.slots.flatMap((slot, i) => slot.match
            ? [{ label: stage.key === "FINAL" ? "Final" : `${STAGE_INFO[stage.key].one} ${i + 1}`, match: slot.match }]
            : []),
    );
    // The first stage that hasn't been drawn yet, if the knockout is under way.
    const nextStage = progress.stages.find(stage => stage.slots.every(slot => !slot.match));
    const nextStageNote = nextStage
        ? nextStage.key === "FINAL" ? "The Final is" : `The ${STAGE_INFO[nextStage.key].title.toLowerCase()} are`
        : null;
    const rowProps = { onSaveStart, onSaveEnd, onSaved };

    return (
        <div className="space-y-4">
            {progress.groups.map(g => (
                <div key={g} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200">
                        <span className="font-semibold text-gray-700">{progress.groups.length === 1 ? "Group" : `Group ${g}`}</span>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {progress.groupRounds[g].map((round, ri) => (
                            <div key={round.id}>
                                <div className="px-4 sm:px-5 py-2 bg-gray-50/70 border-b border-gray-100">
                                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Round {ri + 1}</span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {round.matches.map((match, mi) => (
                                        <MastersMatchScoreRow key={match.id} match={match} label={`Court ${mi + 1}`} {...rowProps} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {progress.knockoutStarted && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b bg-orange-50 border-[#FF4200]/20 text-[#FF4200]">
                        <span className="font-semibold">Knockout</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {rows.map(({ label, match }) => (
                            <MastersMatchScoreRow key={match.id} match={match} label={label} {...rowProps} />
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

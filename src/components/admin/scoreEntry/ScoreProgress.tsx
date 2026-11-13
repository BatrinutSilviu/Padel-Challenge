import type { challengerProgress } from "../../../lib/challenger";
import type { mastersProgress } from "../../../lib/masters";
import type { kotcProgress } from "../../../lib/kingOfTheCourt";

// How far score entry has got, by the tournament's format: group stage and knockout for
// Challenger and Masters, the current round for King of the Court, all matches otherwise.
// Only the format's own progress is passed in.
export function ScoreProgress({ challenger, masters, kotc, scoredIds, scoredCount, totalMatches, allScored, isCompleted }: {
    challenger: ReturnType<typeof challengerProgress> | null;
    masters: ReturnType<typeof mastersProgress> | null;
    kotc: ReturnType<typeof kotcProgress> | null;
    scoredIds: Set<string>;
    scoredCount: number;
    totalMatches: number;
    allScored: boolean;
    isCompleted: boolean;
}) {
    return challenger ? (
        <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 space-y-3">
            <ProgressRow
                label="Group stage"
                scored={[...challenger.groupRounds.A, ...challenger.groupRounds.B].flatMap(r => r.matches).filter(m => scoredIds.has(m.id)).length}
                total={[...challenger.groupRounds.A, ...challenger.groupRounds.B].flatMap(r => r.matches).length}
            />
            {challenger.knockoutStarted && (
                <ProgressRow
                    label={challenger.placement.length > 0 ? "Placement matches" : "Bracket"}
                    scored={challenger.bracketMatches.filter(m => scoredIds.has(m.id)).length}
                    total={challenger.bracketMatches.length}
                />
            )}
            {!isCompleted && allScored && (
                <p className="text-xs text-[#FF4200]">All scores saved — ready to complete.</p>
            )}
        </div>
    ) : masters ? (
        <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 space-y-3">
            <ProgressRow
                label="Group stage"
                scored={masters.groupMatches.filter(m => scoredIds.has(m.id)).length}
                total={masters.groupMatches.length}
            />
            {masters.knockoutStarted && (
                <ProgressRow
                    label="Knockout"
                    scored={masters.bracketMatches.filter(m => scoredIds.has(m.id)).length}
                    total={masters.knockoutMatchCount}
                />
            )}
            {!isCompleted && allScored && (
                <p className="text-xs text-[#FF4200]">All scores saved — ready to complete.</p>
            )}
        </div>
    ) : kotc ? (
        <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 space-y-3">
            <ProgressRow
                label={`Round ${kotc.current?.roundNumber ?? 1}`}
                scored={kotc.current?.matches.filter(m => scoredIds.has(m.id)).length ?? 0}
                total={kotc.current?.matches.length ?? 0}
            />
            {!isCompleted && kotc.currentRoundScored && (
                <p className="text-xs text-[#FF4200]">Round complete — start the next round or complete the tournament.</p>
            )}
            {!isCompleted && !kotc.currentRoundScored && kotc.lastScoredRound && kotc.lastScoredRound.id !== kotc.current?.id && (
                <p className="text-xs text-gray-400">
                    This round isn't finished — you can still complete the tournament using Round {kotc.lastScoredRound.roundNumber}'s results.
                </p>
            )}
        </div>
    ) : (
        <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Scores entered</span>
                <span className={`font-semibold ${allScored ? "text-[#FF4200]" : "text-gray-700"}`}>
                    {scoredCount} / {totalMatches}
                </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all ${allScored ? "bg-[#FF4200]" : "bg-[#FF6D00]"}`}
                    style={{ width: `${totalMatches > 0 ? (scoredCount / totalMatches) * 100 : 0}%` }}
                />
            </div>
            {!isCompleted && allScored && (
                <p className="text-xs text-[#FF4200]">All scores saved — ready to complete.</p>
            )}
        </div>
    );
}

function ProgressRow({ label, scored, total }: { label: string; scored: number; total: number }) {
    const allScored = total > 0 && scored === total;
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">{label}</span>
                <span className={`font-semibold ${allScored ? "text-[#FF4200]" : "text-gray-700"}`}>{scored} / {total}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all ${allScored ? "bg-[#FF4200]" : "bg-[#FF6D00]"}`}
                    style={{ width: `${total > 0 ? (scored / total) * 100 : 0}%` }}
                />
            </div>
        </div>
    );
}

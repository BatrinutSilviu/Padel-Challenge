import { challengerProgress, type BracketSideMatches, type ChallengerMatch, type ChallengerRound } from "../../lib/challenger";
import { ChallengerMatchScoreRow } from "./ChallengerMatchScoreRow";

type OnSaved = (
    matchId: string,
    team1Score: number,
    team2Score: number,
    team1TiebreakPoints: number | null,
    team2TiebreakPoints: number | null,
) => void;

export function ChallengerScoreEntry({
    tournament,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    tournament: { rounds: ChallengerRound[] };
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: OnSaved;
}) {
    const progress = challengerProgress(tournament);

    return (
        <div className="space-y-4">
            <GroupBlock title="Group A" rounds={progress.groupRounds.A} onSaveStart={onSaveStart} onSaveEnd={onSaveEnd} onSaved={onSaved} />
            <GroupBlock title="Group B" rounds={progress.groupRounds.B} onSaveStart={onSaveStart} onSaveEnd={onSaveEnd} onSaved={onSaved} />

            {progress.knockoutStarted && (
                <>
                    <BracketBlock title="Golden Bracket" accent="bg-amber-50 border-amber-200 text-amber-700" side={progress.bracket.golden} onSaveStart={onSaveStart} onSaveEnd={onSaveEnd} onSaved={onSaved} />
                    <BracketBlock title="Silver Bracket" accent="bg-gray-50 border-gray-200 text-gray-700" side={progress.bracket.silver} onSaveStart={onSaveStart} onSaveEnd={onSaveEnd} onSaved={onSaved} />
                </>
            )}
        </div>
    );
}

function GroupBlock({
    title,
    rounds,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    title: string;
    rounds: ChallengerRound[];
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: OnSaved;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200">
                <span className="font-semibold text-gray-700">{title}</span>
            </div>
            <div className="divide-y divide-gray-200">
                {rounds.map((round, ri) => (
                    <div key={round.id}>
                        <div className="px-4 sm:px-5 py-2 bg-gray-50/70 border-b border-gray-100">
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Round {ri + 1}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {round.matches.map((match, mi) => (
                                <ChallengerMatchScoreRow
                                    key={match.id}
                                    match={match}
                                    label={`Court ${mi + 1}`}
                                    onSaveStart={onSaveStart}
                                    onSaveEnd={onSaveEnd}
                                    onSaved={onSaved}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BracketBlock({
    title,
    accent,
    side,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    title: string;
    accent: string;
    side: BracketSideMatches;
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: OnSaved;
}) {
    const rows: { key: string; label: string; match: ChallengerMatch }[] = [
        ...side.semifinals.map((match, i) => ({ key: match.id, label: `Semifinal ${i + 1}`, match })),
        ...(side.final ? [{ key: side.final.id, label: "Final", match: side.final }] : []),
        ...(side.thirdPlace ? [{ key: side.thirdPlace.id, label: "3rd Place Match", match: side.thirdPlace }] : []),
    ];

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className={`px-4 sm:px-5 py-3 border-b ${accent}`}>
                <span className="font-semibold">{title}</span>
            </div>
            <div className="divide-y divide-gray-100">
                {rows.length > 0 ? (
                    rows.map(({ key, label, match }) => (
                        <ChallengerMatchScoreRow
                            key={key}
                            match={match}
                            label={label}
                            onSaveStart={onSaveStart}
                            onSaveEnd={onSaveEnd}
                            onSaved={onSaved}
                        />
                    ))
                ) : (
                    <p className="px-4 sm:px-5 py-4 text-sm text-gray-400">Not seeded yet.</p>
                )}
            </div>
        </div>
    );
}

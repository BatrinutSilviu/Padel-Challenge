import type { TournamentData } from "../../../lib/tournaments";
import { AmericanoMatchScoreRow } from "./AmericanoMatchScoreRow";

// Americano (and Team Americano) score entry: every round with its matches, one court each.
export function AmericanoScoreEntry({ tournament, scoredIds, onSaveStart, onSaveEnd, onSaved }: {
    tournament: TournamentData;
    scoredIds: Set<string>;
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: (matchId: string, team1Score: number, team2Score: number) => void;
}) {
    return (
        <div className="space-y-4">
            {tournament.rounds.map(round => (
                <div key={round.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <span className="font-semibold text-gray-700">Round {round.roundNumber}</span>
                        <span className="text-xs text-gray-400">
                            {round.matches.filter(m => scoredIds.has(m.id)).length}/{round.matches.length} scored
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {round.matches.map((match, i) => (
                            <AmericanoMatchScoreRow
                                key={match.id}
                                match={match}
                                courtNumber={i + 1}
                                pointsPerGame={tournament.pointsPerGame}
                                onSaveStart={onSaveStart}
                                onSaveEnd={onSaveEnd}
                                onSaved={onSaved}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

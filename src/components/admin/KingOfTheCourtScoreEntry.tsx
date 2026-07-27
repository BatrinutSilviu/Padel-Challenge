import { sortMatchesByCourt, sortRoundsByNumber, type KotcRound } from "../../lib/kingOfTheCourt";
import { KingOfTheCourtMatchScoreRow } from "./KingOfTheCourtMatchScoreRow";

type OnSaved = (
    matchId: string,
    team1Score: number,
    team2Score: number,
    goldenPointWinner: number | null,
) => void;

export function KingOfTheCourtScoreEntry({
    tournament,
    onSaveStart,
    onSaveEnd,
    onSaved,
}: {
    tournament: { rounds: KotcRound[] };
    onSaveStart: () => void;
    onSaveEnd: () => void;
    onSaved: OnSaved;
}) {
    const rounds = sortRoundsByNumber(tournament.rounds);

    return (
        <div className="space-y-4">
            {rounds.map(round => {
                const matches = sortMatchesByCourt(round.matches);
                return (
                    <div key={round.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 sm:px-5 py-3 bg-gray-50 border-b border-gray-200">
                            <span className="font-semibold text-gray-700">Round {round.roundNumber}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {matches.map(match => (
                                <KingOfTheCourtMatchScoreRow
                                    key={match.id}
                                    match={match}
                                    label={`Court ${match.court}`}
                                    onSaveStart={onSaveStart}
                                    onSaveEnd={onSaveEnd}
                                    onSaved={onSaved}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

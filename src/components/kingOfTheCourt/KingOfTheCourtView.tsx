import { Link } from "react-router-dom";
import { formatKotcScore, isKotcMatchScored, sortMatchesByCourt, sortRoundsByNumber } from "../../lib/kingOfTheCourt";
import { TeamFinalStandings } from "../TeamFinalStandings";
import type { TournamentData } from "../../lib/tournaments";

type RoundData = TournamentData["rounds"][number];

export function KingOfTheCourtView({ tournament }: { tournament: TournamentData }) {
    const rounds = sortRoundsByNumber(tournament.rounds);

    return (
        <div className="space-y-6">
            {tournament.status === "COMPLETED" && <TeamFinalStandings participants={tournament.participants} />}

            <section>
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted mb-3">Rounds</h2>
                <div className="space-y-2">
                    {rounds.map(round => (
                        <RoundCard key={round.id} round={round} />
                    ))}
                </div>
            </section>
        </div>
    );
}

function RoundCard({ round }: { round: RoundData }) {
    const matches = sortMatchesByCourt(round.matches);
    return (
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-canvas">
                <span className="font-bold text-ink">Round {round.roundNumber}</span>
            </div>
            <div className="divide-y divide-canvas">
                {matches.map(match => (
                    <div key={match.id} className="px-4 py-4">
                        <p className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted mb-3">Court {match.court}</p>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                            <div className="text-right">
                                <Link to={`/player/${match.team1Player1.id}`} className="font-semibold text-ink hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team1Player1.name}</Link>
                                <Link to={`/player/${match.team1Player2.id}`} className="font-semibold text-ink hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team1Player2.name}</Link>
                            </div>
                            <div className="text-center shrink-0">
                                <span className={`text-lg font-bold tabular-nums ${isKotcMatchScored(match) ? "text-[#FF4200]" : "text-line"}`}>
                                    {formatKotcScore(match)}
                                </span>
                            </div>
                            <div className="text-left">
                                <Link to={`/player/${match.team2Player1.id}`} className="font-semibold text-ink hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team2Player1.name}</Link>
                                <Link to={`/player/${match.team2Player2.id}`} className="font-semibold text-ink hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team2Player2.name}</Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

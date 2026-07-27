import { Link } from "react-router-dom";
import { trpc } from "../../trpc";
import { formatKotcScore, sortMatchesByCourt, sortRoundsByNumber } from "../../lib/kingOfTheCourt";
import { TeamFinalStandings } from "../TeamFinalStandings";

type TournamentData = NonNullable<ReturnType<typeof trpc.tournament.getById.useQuery>["data"]>;
type RoundData = TournamentData["rounds"][number];

export function KingOfTheCourtView({ tournament }: { tournament: TournamentData }) {
    const rounds = sortRoundsByNumber(tournament.rounds);

    return (
        <div className="space-y-6">
            {tournament.status === "COMPLETED" && <TeamFinalStandings participants={tournament.participants} />}

            <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Rounds</h2>
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
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#F5F5F7]">
                <span className="font-bold text-[#1A1A2E]">Round {round.roundNumber}</span>
            </div>
            <div className="divide-y divide-[#F5F5F7]">
                {matches.map(match => (
                    <div key={match.id} className="px-4 py-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Court {match.court}</p>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <div className="text-right">
                                <Link to={`/player/${match.team1Player1.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team1Player1.name}</Link>
                                <Link to={`/player/${match.team1Player2.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team1Player2.name}</Link>
                            </div>
                            <div className="text-center shrink-0">
                                <span className={`text-lg font-black tabular-nums ${match.team1Score > match.team2Score ? "text-[#FF4200]" : match.team2Score > match.team1Score ? "text-[#8E8E93]" : "text-[#E5E5EA]"}`}>
                                    {formatKotcScore(match)}
                                </span>
                            </div>
                            <div className="text-left">
                                <Link to={`/player/${match.team2Player1.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team2Player1.name}</Link>
                                <Link to={`/player/${match.team2Player2.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team2Player2.name}</Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

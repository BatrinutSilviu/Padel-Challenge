import { Link } from "react-router-dom";
import { trpc } from "../../trpc";
import {
    challengerProgress,
    computeGroupStandings,
    formatChallengerScore,
    isChallengerMatchScored,
    type ChallengerRound,
} from "../../lib/challenger";
import { ChallengerBracket } from "./ChallengerBracket";
import { TeamFinalStandings } from "../TeamFinalStandings";

type TournamentData = NonNullable<ReturnType<typeof trpc.tournament.getById.useQuery>["data"]>;

export function ChallengerView({ tournament }: { tournament: TournamentData }) {
    const progress = challengerProgress(tournament);
    const hasGroupB = progress.groupRounds.B.length > 0;

    return (
        <div className="space-y-6">
            {tournament.status === "COMPLETED" && <TeamFinalStandings participants={tournament.participants} />}

            <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Bracket</h2>
                <ChallengerBracket bracket={progress.bracket} knockoutStarted={progress.knockoutStarted} hasGroupB={hasGroupB} />
            </section>

            <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Group Stage</h2>
                <div className={`grid grid-cols-1 ${hasGroupB ? "lg:grid-cols-2" : ""} gap-4`}>
                    <GroupSection title={hasGroupB ? "Group A" : "Group"} rounds={progress.groupRounds.A} />
                    {hasGroupB && <GroupSection title="Group B" rounds={progress.groupRounds.B} />}
                </div>
            </section>
        </div>
    );
}

function GroupSection({ title, rounds }: { title: string; rounds: ChallengerRound[] }) {
    const standings = computeGroupStandings(rounds);

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-[#F5F5F7]">
                    <span className="font-bold text-[#1A1A2E]">{title}</span>
                </div>
                <table className="w-full text-sm">
                    <thead className="border-b border-[#F5F5F7]">
                        <tr>
                            <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#8E8E93] w-8">#</th>
                            <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Team</th>
                            <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">W</th>
                            <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">GD</th>
                        </tr>
                    </thead>
                    <tbody>
                        {standings.map(s => (
                            <tr key={s.team.player1.id} className="border-b border-[#F5F5F7] last:border-0">
                                <td className="px-3 py-2.5 font-bold text-[#8E8E93]">{s.rank}</td>
                                <td className="px-3 py-2.5">
                                    <Link to={`/player/${s.team.player1.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] transition-colors block truncate">{s.team.player1.name}</Link>
                                    <Link to={`/player/${s.team.player2.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] transition-colors block truncate">{s.team.player2.name}</Link>
                                </td>
                                <td className="px-3 py-2.5 text-right font-black text-[#1A1A2E]">{s.wins}</td>
                                <td className="px-3 py-2.5 text-right font-medium text-[#8E8E93]">{s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="space-y-2">
                {rounds.map((round, i) => (
                    <div key={round.id} className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
                        <div className="px-4 py-2.5 bg-[#F5F5F7] border-b border-[#E5E5EA]">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Round {i + 1}</span>
                        </div>
                        <div className="divide-y divide-[#F5F5F7]">
                            {round.matches.map(match => (
                                <div key={match.id} className="px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                    <div className="text-right">
                                        <Link to={`/player/${match.team1Player1.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team1Player1.name}</Link>
                                        <Link to={`/player/${match.team1Player2.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team1Player2.name}</Link>
                                    </div>
                                    <div className="text-center shrink-0">
                                        <span className={`text-base font-black tabular-nums ${isChallengerMatchScored(match) ? "text-[#FF4200]" : "text-[#E5E5EA]"}`}>
                                            {formatChallengerScore(match)}
                                        </span>
                                    </div>
                                    <div className="text-left">
                                        <Link to={`/player/${match.team2Player1.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team2Player1.name}</Link>
                                        <Link to={`/player/${match.team2Player2.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] text-sm block truncate transition-colors">{match.team2Player2.name}</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

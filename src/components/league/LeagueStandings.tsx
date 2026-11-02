import type { ReactNode } from "react";
import { OUTCOME_INFO, teamName, type LeagueTeam, type Outcome, type StandingRow } from "../../lib/league";

const MEDALS = ["🥇", "🥈", "🥉"];

// A group table. The left edge of each row is coloured by where the team is headed
// (promotion, playoff, relegation); `extra` adds a cell per row (admin controls).
export function LeagueStandings({
    rows,
    teams,
    outcomes,
    myTeamId,
    showMedals,
    extra,
}: {
    rows: StandingRow[];
    teams: Map<string, LeagueTeam>;
    outcomes: Record<string, string>;
    myTeamId?: string | null;
    showMedals: boolean;
    extra?: (row: StandingRow) => ReactNode;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[340px]">
                <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] border-b border-[#F5F5F7]">
                        <th className="text-left pl-3 pr-1 py-2 w-8">#</th>
                        <th className="text-left px-2 py-2">Team</th>
                        <th className="text-center px-1 py-2 w-7" title="Played">P</th>
                        <th className="text-center px-1 py-2 w-7" title="Won">W</th>
                        <th className="text-center px-1 py-2 w-12 hidden sm:table-cell" title="Sets won-lost">Sets</th>
                        <th className="text-center px-1 py-2 w-10 hidden sm:table-cell" title="Game difference">±G</th>
                        <th className="text-center px-2 py-2 w-9" title="Points">Pts</th>
                        {extra && <th className="px-2 py-2 hidden sm:table-cell" />}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => {
                        const team = teams.get(r.teamId);
                        const outcome = (outcomes[r.teamId] ?? "STAYED") as Outcome;
                        const info = OUTCOME_INFO[outcome];
                        const mine = r.teamId === myTeamId;
                        const gameDiff = r.gamesWon - r.gamesLost;
                        return (
                            <tr key={r.teamId} className={`border-b border-[#F5F5F7] last:border-0 ${mine ? "bg-[#FF4200]/5" : ""}`}>
                                <td className={`pl-2.5 pr-1 py-2.5 border-l-[3px] ${info.rowClass} font-bold text-[#8E8E93] tabular-nums`}>
                                    {showMedals && r.position <= 3 && !r.eliminated ? MEDALS[r.position - 1] : r.position}
                                </td>
                                <td className="px-2 py-2.5 min-w-0">
                                    <span className={`font-semibold ${r.eliminated ? "line-through text-[#8E8E93]" : "text-[#1A1A2E]"}`}>
                                        {team ? teamName(team) : "?"}
                                    </span>
                                    {mine && <span className="ml-1.5 text-[10px] font-bold uppercase text-[#FF4200]">You</span>}
                                    {r.eliminated && <span className="ml-1.5 text-[10px] font-bold uppercase text-red-500">Eliminated</span>}
                                    {outcome !== "STAYED" && !r.eliminated && (
                                        <span className={`ml-1.5 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${info.className}`}>{info.label}</span>
                                    )}
                                    {/* On a phone the extra controls go under the name instead of in a column. */}
                                    {extra && <div className="sm:hidden mt-1.5">{extra(r)}</div>}
                                </td>
                                <td className="text-center px-1 py-2.5 tabular-nums text-[#8E8E93]">{r.played}</td>
                                <td className="text-center px-1 py-2.5 tabular-nums text-[#8E8E93]">{r.won}</td>
                                <td className="text-center px-1 py-2.5 tabular-nums text-[#8E8E93] hidden sm:table-cell">{r.setsWon}-{r.setsLost}</td>
                                <td className="text-center px-1 py-2.5 tabular-nums text-[#8E8E93] hidden sm:table-cell">{gameDiff > 0 ? `+${gameDiff}` : gameDiff}</td>
                                <td className="text-center px-2 py-2.5 tabular-nums font-black text-[#1A1A2E]">{r.points}</td>
                                {extra && <td className="px-2 py-2.5 text-right whitespace-nowrap hidden sm:table-cell">{extra(r)}</td>}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export function OutcomeLegend() {
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8E8E93]">
            {(["PROMOTED", "PLAYOFF_UP", "PLAYOFF_DOWN", "RELEGATED"] as const).map(o => (
                <span key={o} className="flex items-center gap-1.5">
                    <span className={`w-1 h-3.5 rounded-full border-l-[3px] ${OUTCOME_INFO[o].rowClass}`} />
                    {OUTCOME_INFO[o].label}
                </span>
            ))}
            <span>3 pts win 2-0 · 2 pts win 2-1 · 1 pt loss 1-2</span>
        </div>
    );
}

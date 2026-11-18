import { Link } from "react-router-dom";
import { formatResult, formatScheduledAt, teamName, winnerSide, type LeagueMatch, type LeagueTeam } from "../../lib/league";

// One match in a fixture list, linking to its match page.
export function LeagueMatchLine({
    match,
    teams,
    myTeamId,
    to,
}: {
    match: LeagueMatch;
    teams: Map<string, LeagueTeam>;
    myTeamId?: string | null;
    to?: string;
}) {
    const t1 = teams.get(match.team1Id);
    const t2 = teams.get(match.team2Id);
    const winner = winnerSide(match);
    const mine = myTeamId === match.team1Id || myTeamId === match.team2Id;
    const result = formatResult(match);

    return (
        <Link
            to={to ?? `/league/match/${match.id}`}
            className={`flex items-center gap-3 px-4 py-3 border-b border-canvas last:border-0 hover:bg-canvas transition-colors ${mine ? "bg-[#FF4200]/5" : ""}`}
        >
            <div className="flex-1 min-w-0 text-sm">
                <p className={`truncate ${winner === 1 ? "font-bold text-ink" : "text-ink-2"} ${t1?.eliminated ? "line-through" : ""}`}>{t1 ? teamName(t1) : "?"}</p>
                <p className={`truncate ${winner === 2 ? "font-bold text-ink" : "text-ink-2"} ${t2?.eliminated ? "line-through" : ""}`}>{t2 ? teamName(t2) : "?"}</p>
            </div>
            <div className="shrink-0 text-right">
                {match.status === "CONFIRMED" ? (
                    <span className="text-sm font-bold text-ink tabular-nums">{result}</span>
                ) : match.status === "SUBMITTED" ? (
                    <>
                        <span className="block text-sm font-semibold text-muted tabular-nums">{result}</span>
                        <span className={`text-[10px] font-bold uppercase ${match.disputed ? "text-red-500" : "text-amber-600"}`}>
                            {match.disputed ? "Disputed" : "To confirm"}
                        </span>
                    </>
                ) : match.scheduledAt || match.venue ? (
                    <span className="block text-xs text-muted max-w-[9rem] sm:max-w-none">
                        {match.scheduledAt && <span className="block font-semibold text-ink">{formatScheduledAt(match.scheduledAt)}</span>}
                        {match.venue && <span className="block truncate">{match.venue}</span>}
                    </span>
                ) : (
                    <span className="text-xs text-faint">Not played</span>
                )}
            </div>
        </Link>
    );
}

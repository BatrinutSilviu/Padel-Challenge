import { Link } from "react-router-dom";
import { formatChallengerScore, type BracketSideMatches, type ChallengerMatch } from "../../lib/challenger";

export function ChallengerBracket({
    bracket,
    knockoutStarted,
}: {
    bracket: { golden: BracketSideMatches; silver: BracketSideMatches };
    knockoutStarted: boolean;
}) {
    if (!knockoutStarted) {
        return (
            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 shadow-sm text-sm text-[#8E8E93]">
                Knockout stage not started yet.
                <div className="mt-2 space-y-1 text-xs">
                    <p><span className="font-bold text-amber-600">Golden:</span> Group A #1 vs Group B #2 &middot; Group B #1 vs Group A #2</p>
                    <p><span className="font-bold text-gray-500">Silver:</span> Group A #3 vs Group B #4 &middot; Group A #4 vs Group B #3</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <BracketSection title="Golden Bracket" accent="border-amber-200 bg-amber-50 text-amber-700" side={bracket.golden} />
            <BracketSection title="Silver Bracket" accent="border-gray-200 bg-gray-50 text-gray-600" side={bracket.silver} />
        </div>
    );
}

function BracketSection({ title, accent, side }: { title: string; accent: string; side: BracketSideMatches }) {
    return (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
            <div className={`px-4 py-2.5 border-b ${accent}`}>
                <span className="font-bold text-sm">{title}</span>
            </div>
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Semifinals</p>
                    {side.semifinals.length > 0 ? (
                        side.semifinals.map(m => <BracketMatchCard key={m.id} match={m} />)
                    ) : (
                        <>
                            <BracketMatchCard placeholder="TBD" />
                            <BracketMatchCard placeholder="TBD" />
                        </>
                    )}
                </div>
                <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Final</p>
                    {side.final ? (
                        <BracketMatchCard match={side.final} />
                    ) : (
                        <BracketMatchCard placeholderLeft="Winner of SF1" placeholderRight="Winner of SF2" />
                    )}
                </div>
                <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">3rd Place Match</p>
                    {side.thirdPlace ? (
                        <BracketMatchCard match={side.thirdPlace} />
                    ) : (
                        <BracketMatchCard placeholderLeft="Loser of SF1" placeholderRight="Loser of SF2" />
                    )}
                </div>
            </div>
        </div>
    );
}

function BracketMatchCard({
    match,
    placeholder,
    placeholderLeft,
    placeholderRight,
}: {
    match?: ChallengerMatch;
    placeholder?: string;
    placeholderLeft?: string;
    placeholderRight?: string;
}) {
    if (!match) {
        return (
            <div className="border border-dashed border-[#E5E5EA] rounded-xl px-3 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="text-right text-xs text-[#B0B0B8] truncate">{placeholderLeft ?? placeholder ?? "TBD"}</div>
                <div className="text-[#E5E5EA] font-black text-sm">vs</div>
                <div className="text-left text-xs text-[#B0B0B8] truncate">{placeholderRight ?? placeholder ?? "TBD"}</div>
            </div>
        );
    }

    const team1Wins = match.team1Score > match.team2Score;
    const team2Wins = match.team2Score > match.team1Score;

    return (
        <div className="border border-[#E5E5EA] rounded-xl px-3 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="text-right">
                <Link to={`/player/${match.team1Player1.id}`} className={`text-sm font-semibold block truncate transition-colors ${team1Wins ? "text-[#FF4200]" : "text-[#1A1A2E] hover:text-[#FF4200]"}`}>{match.team1Player1.name}</Link>
                <Link to={`/player/${match.team1Player2.id}`} className={`text-sm font-semibold block truncate transition-colors ${team1Wins ? "text-[#FF4200]" : "text-[#1A1A2E] hover:text-[#FF4200]"}`}>{match.team1Player2.name}</Link>
            </div>
            <div className="text-center shrink-0 text-sm font-black tabular-nums text-[#1A1A2E]">
                {formatChallengerScore(match)}
            </div>
            <div className="text-left">
                <Link to={`/player/${match.team2Player1.id}`} className={`text-sm font-semibold block truncate transition-colors ${team2Wins ? "text-[#FF4200]" : "text-[#1A1A2E] hover:text-[#FF4200]"}`}>{match.team2Player1.name}</Link>
                <Link to={`/player/${match.team2Player2.id}`} className={`text-sm font-semibold block truncate transition-colors ${team2Wins ? "text-[#FF4200]" : "text-[#1A1A2E] hover:text-[#FF4200]"}`}>{match.team2Player2.name}</Link>
            </div>
        </div>
    );
}

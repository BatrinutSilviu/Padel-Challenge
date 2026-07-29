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
    const sf1 = side.semifinals[0];
    const sf2 = side.semifinals[1];

    return (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
            <div className={`px-4 py-2.5 border-b ${accent}`}>
                <span className="font-bold text-sm">{title}</span>
            </div>
            <div className="p-4 sm:p-6">
                {/* Elimination tree: the two semifinals feed into the Final */}
                <div className="flex flex-col md:flex-row md:items-stretch gap-6 md:gap-0">
                    <div className="flex-1 md:pr-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Semifinals</p>
                        <div className="flex flex-col gap-8">
                            <div className="relative">
                                {sf1 ? <BracketMatchCard match={sf1} /> : <BracketMatchCard placeholder="TBD" />}
                                <div aria-hidden className="hidden md:block absolute left-full top-1/2 w-4 h-[calc(50%+1rem)] border-t-2 border-r-2 border-[#D1D1D6] rounded-tr-xl" />
                            </div>
                            <div className="relative">
                                {sf2 ? <BracketMatchCard match={sf2} /> : <BracketMatchCard placeholder="TBD" />}
                                <div aria-hidden className="hidden md:block absolute left-full bottom-1/2 w-4 h-[calc(50%+1rem)] border-b-2 border-r-2 border-[#D1D1D6] rounded-br-xl" />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#FF4200] mb-3">Final</p>
                        {side.final ? (
                            <BracketMatchCard match={side.final} />
                        ) : (
                            <BracketMatchCard placeholderLeft="Winner of SF1" placeholderRight="Winner of SF2" />
                        )}
                    </div>
                </div>

                {/* 3rd place is a consolation match between the semifinal losers, not part of the tree */}
                <div className="mt-6 pt-5 border-t border-dashed border-[#E5E5EA]">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">3rd Place Match</p>
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

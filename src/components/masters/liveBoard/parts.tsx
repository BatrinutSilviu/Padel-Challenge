// Pieces every screen of the TV board uses.
import type { ReactNode } from "react";
import { isChallengerMatchScored, type ChallengerMatch, type ChallengerTeam } from "../../../lib/challenger";
import { teamsOf } from "./matches";

// Our logo, then our partners' (white artwork, made for dark backgrounds).
export function Brand() {
    return (
        <div className="flex items-center gap-3 shrink-0">
            <img src="/active.png" alt="Act!ve" className="h-9 w-auto" />
            <div className="w-px h-8 bg-white/20" />
            <span className="text-4xl font-black tracking-tighter leading-none">
                Padel<span className="text-[#FF4200]">.</span>
            </span>
            <div className="w-px h-12 bg-white/20 ml-3" />
            <img src="/partner-logo.svg" alt="Active Arena" className="h-16 w-auto ml-1" />
        </div>
    );
}

// The board's full-screen dark background and padding.
export function Screen({ children, className = "", onDoubleClick }: { children: ReactNode; className?: string; onDoubleClick?: () => void }) {
    return (
        <div
            onDoubleClick={onDoubleClick}
            className={`h-screen w-screen overflow-hidden flex flex-col gap-6 px-10 py-7 text-white select-none ${className}`}
            style={{ background: "radial-gradient(ellipse at top, #333366 0%, #1A1A3E 45%, #0B0B1E 100%)" }}
        >
            {children}
        </div>
    );
}

// A team as two lines, one player each.
export function TeamNames({ team, className = "" }: { team: ChallengerTeam; className?: string }) {
    return (
        <div className={`min-w-0 leading-tight ${className}`}>
            <p className="truncate">{team.player1.name}</p>
            <p className="truncate">{team.player2.name}</p>
        </div>
    );
}

// One team's line of a scoreboard: names (the match winner's in bold white), then a box
// per set with the set winner's games highlighted. A deciding tiebreak box is outlined.
export function SetsLine({ match, side, size = "sm" }: { match: ChallengerMatch; side: 1 | 2; size?: "sm" | "md" | "lg" }) {
    const team = teamsOf(match)[side - 1];
    const scored = isChallengerMatchScored(match);
    const won = scored && (side === 1 ? match.team1Score > match.team2Score : match.team2Score > match.team1Score);
    const sets = match.sets ?? [];
    const box = { sm: "min-w-[1.6rem] h-6 text-base", md: "min-w-[2.75rem] h-11 text-2xl", lg: "min-w-[3.5rem] h-14 text-3xl" }[size];
    const names = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[size];

    return (
        <div className={`flex items-center gap-1.5 ${size === "sm" ? "py-px" : "py-1.5"}`}>
            {size === "sm" ? (
                <p className={`flex-1 min-w-0 truncate ${names} ${!scored ? "font-semibold text-white/80" : won ? "font-extrabold text-white" : "font-medium text-white/40"}`}>
                    {team.player1.name} / {team.player2.name}
                </p>
            ) : (
                <TeamNames team={team} className={`flex-1 ${names} ${!scored ? "font-semibold text-white/90" : won ? "font-extrabold text-white" : "font-medium text-white/35"}`} />
            )}
            {sets.length === 0 ? (
                <span className={`flex items-center justify-center rounded-lg font-black bg-white/5 text-white/20 ${box}`}>–</span>
            ) : (
                sets.map(set => {
                    const mine = side === 1 ? set.team1Games : set.team2Games;
                    const theirs = side === 1 ? set.team2Games : set.team1Games;
                    const wonSet = mine > theirs;
                    return (
                        <span
                            key={set.setNumber}
                            className={`flex items-center justify-center rounded-lg px-1 font-black tabular-nums ${box} ${
                                set.isTiebreak ? "border border-[#9FD2DD]/40 " : ""
                            }${wonSet ? "bg-[#FF4200] text-white" : "bg-white/10 text-white/50"}`}
                        >
                            {set.isTiebreak ? <span className="text-[0.8em]">{mine}</span> : mine}
                        </span>
                    );
                })
            )}
        </div>
    );
}

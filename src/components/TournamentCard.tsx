import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DIVISION_BADGES, divisionLabel } from "../lib/divisions";
import { timeRangeLabel, tournamentTypeLabel } from "../lib/tournaments";

// A tournament in a list: its name, level and type, then the date and time, the location,
// the price and the free spots, each on its own line so they read at a glance on a phone.

export type CardTournament = {
    id: string;
    name: string;
    type: string;
    division: number;
    status: string;
    date: string | Date;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    entryFee?: number | null; // lei per person
    advanceFee?: number | null;
    maxPlayers: number | null;
    _count: { participants: number }; // confirmed players
};

// "Sun 22 Nov", with the year when it isn't this year. Dates are stored as midnight UTC.
function cardDate(value: string | Date): string {
    const d = new Date(value);
    const thisYear = d.getUTCFullYear() === new Date().getUTCFullYear();
    return d.toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "short", ...(thisYear ? {} : { year: "numeric" }), timeZone: "UTC",
    });
}

export function spotsLeft(t: CardTournament): number | null {
    return t.maxPlayers === null ? null : Math.max(0, t.maxPlayers - t._count.participants);
}

export function TournamentCard({ tournament: t, aside, highlight }: {
    tournament: CardTournament;
    aside?: ReactNode; // status or action, top right
    highlight?: boolean; // orange outline: open for sign-up
}) {
    const times = timeRangeLabel(t);
    const left = spotsLeft(t);
    const badge = DIVISION_BADGES[t.division];
    const upcoming = t.status === "UPCOMING";

    return (
        <Link
            to={`/tournament/${t.id}`}
            className={`block bg-white rounded-2xl border px-4 py-3.5 hover:shadow-sm transition-all ${
                highlight ? "border-[#FF4200]/30 hover:border-[#FF4200]"
                : t.status === "IN_PROGRESS" ? "border-l-[3px] border-l-[#FF4200] border-[#E5E5EA] hover:border-[#FF4200]/40"
                : "border-[#E5E5EA] hover:border-[#FF4200]/40"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-bold text-[#1A1A2E] leading-snug line-clamp-2">{t.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge?.className ?? "bg-[#F5F5F7] text-[#8E8E93]"}`}>
                            {divisionLabel(t.division)}
                        </span>
                        <span className="text-xs text-[#8E8E93] font-medium">{tournamentTypeLabel(t.type)}</span>
                    </div>
                </div>
                {aside && <div className="shrink-0">{aside}</div>}
            </div>
            <div className="mt-2.5 grid gap-1 text-sm text-[#3A3A4E]">
                <p className="flex items-center gap-2">
                    <span aria-hidden className="w-4 text-center">📅</span>
                    <span className="font-semibold">{cardDate(t.date)}</span>
                    {times && <span className="text-[#8E8E93]">· {times}</span>}
                </p>
                {t.location && (
                    <p className="flex items-center gap-2">
                        <span aria-hidden className="w-4 text-center">📍</span>
                        <span>{t.location}</span>
                    </p>
                )}
                {upcoming && t.entryFee != null && (
                    <p className="flex items-center gap-2">
                        <span aria-hidden className="w-4 text-center">💳</span>
                        <span>
                            <span className="font-semibold">{t.entryFee} lei</span>
                            <span className="text-[#8E8E93]"> / person{t.advanceFee != null ? ` · ${t.advanceFee} lei advance` : ""}</span>
                        </span>
                    </p>
                )}
                {upcoming && (
                    <p className="flex items-center gap-2">
                        <span aria-hidden className="w-4 text-center">👥</span>
                        {left === null ? (
                            <span>{t._count.participants} confirmed</span>
                        ) : left === 0 ? (
                            <span className="font-semibold text-[#8E8E93]">Full — waiting list open</span>
                        ) : (
                            <span>
                                <span className="font-bold text-[#FF4200]">{left} free spot{left !== 1 ? "s" : ""}</span>
                                <span className="text-[#8E8E93]"> of {t.maxPlayers}</span>
                            </span>
                        )}
                    </p>
                )}
            </div>
        </Link>
    );
}

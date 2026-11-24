import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DIVISION_BADGES, divisionLabel } from "../lib/divisions";
import { spotsLeft, timeRangeLabel, tournamentTypeLabel } from "../lib/tournaments";
import { ClockIcon, PinIcon } from "./ui/icons";

// A tournament in a list: the date block on the left; its name, level and type, the time and
// place, then the price and the free spots.

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
    womenOnly?: boolean;
    _count: { participants: number }; // confirmed players
};

// The date block: "SUN" / "22" / "NOV" (and the year under it when it isn't this year).
// Dates are stored as midnight UTC.
function dateParts(value: string | Date) {
    const d = new Date(value);
    const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });
    return {
        dow: part({ weekday: "short" }),
        day: part({ day: "numeric" }),
        month: part({ month: "short" }),
        year: d.getUTCFullYear() === new Date().getUTCFullYear() ? null : String(d.getUTCFullYear()),
    };
}

export function TournamentCard({ tournament: t, aside, highlight }: {
    tournament: CardTournament;
    aside?: ReactNode; // status or action, top right
    highlight?: boolean; // open for sign-up
}) {
    const times = timeRangeLabel(t);
    const left = spotsLeft(t);
    const badge = DIVISION_BADGES[t.division];
    const upcoming = t.status === "UPCOMING";
    const date = dateParts(t.date);

    return (
        <Link
            to={`/tournament/${t.id}`}
            className={`flex gap-4 bg-surface rounded-xl border px-4 py-4 transition-colors ${
                t.status === "IN_PROGRESS" ? "border-[#FF4200]/60 hover:border-[#FF4200]"
                : highlight ? "border-line hover:border-[#FF4200]/60"
                : "border-line hover:border-gray-300"
            }`}
        >
            <div className="w-12 shrink-0 flex flex-col items-center font-display uppercase leading-none border-r border-line pr-4 pt-0.5">
                <span className="text-xs font-semibold tracking-wider text-muted">{date.dow}</span>
                <span className="text-[32px] font-bold text-ink my-0.5">{date.day}</span>
                <span className="text-xs font-semibold tracking-wider text-muted">{date.month}</span>
                {date.year && <span className="text-[11px] font-semibold text-muted mt-1">{date.year}</span>}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="font-semibold text-ink leading-snug line-clamp-2 [overflow-wrap:anywhere]">{t.name}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${badge?.className ?? "bg-canvas text-muted"}`}>
                                {divisionLabel(t.division)}
                            </span>
                            {t.womenOnly && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-pink-50 text-pink-600">Women only</span>}
                            <span className="text-xs text-muted font-medium">{tournamentTypeLabel(t.type)}</span>
                        </div>
                    </div>
                    {aside && <div className="shrink-0">{aside}</div>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                    {times && <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" />{times}</span>}
                    {t.location && <span className="flex items-center gap-1.5"><PinIcon className="w-3.5 h-3.5" />{t.location}</span>}
                </div>
                {upcoming && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                        {t.entryFee != null ? (
                            <span>
                                <span className="font-semibold text-ink">{t.entryFee} lei</span>
                                <span className="text-muted"> / person{t.advanceFee != null ? ` · ${t.advanceFee} lei advance` : ""}</span>
                            </span>
                        ) : <span />}
                        {left === null ? (
                            <span className="text-ink-2">{t._count.participants} confirmed</span>
                        ) : left === 0 ? (
                            <span className="font-display uppercase tracking-wide font-semibold text-muted">Full · waiting list</span>
                        ) : (
                            <span className="font-display uppercase tracking-wide font-semibold text-emerald-600">
                                {left} of {t.maxPlayers} free
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Link>
    );
}

import { useState } from "react";
import { prizePlaces, tournamentFormatNotes, tournamentTypeDescription, tournamentTypeLabel, type TournamentPrizes } from "../lib/tournaments";

type FormatTournament = Parameters<typeof tournamentFormatNotes>[0];

// The prizes a tournament advertises — 1st to 3rd place, plus anything else on offer.
// Renders nothing when none are set.
export function PrizeList({ tournament }: { tournament: TournamentPrizes }) {
    const places = prizePlaces(tournament);
    if (places.length === 0 && !tournament.prizeNotes) return null;
    const medal: Record<string, string> = { "1st": "🥇", "2nd": "🥈", "3rd": "🥉" };
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-2">Prizes</p>
            {places.length > 0 && (
                <ul className="space-y-1">
                    {places.map(({ place, prize }) => (
                        <li key={place} className="flex items-start gap-2 text-sm text-[#1A1A2E]">
                            <span className="shrink-0" aria-hidden>{medal[place]}</span>
                            <span><span className="font-bold">{place}:</span> {prize}</span>
                        </li>
                    ))}
                </ul>
            )}
            {tournament.prizeNotes && (
                <p className={`text-sm text-[#1A1A2E] whitespace-pre-line ${places.length > 0 ? "mt-2" : ""}`}>{tournament.prizeNotes}</p>
            )}
        </div>
    );
}

// How the tournament's format works, as a short summary and a list of points.
// Collapsible, so it stays out of the way once the results are what matters.
export function HowItWorks({ tournament, defaultOpen = false }: { tournament: FormatTournament; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const notes = tournamentFormatNotes(tournament);
    if (notes.length === 0) return null;
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-3 text-left"
            >
                <span className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">
                    How {tournamentTypeLabel(tournament.type)} works
                </span>
                <svg className={`w-4 h-4 text-[#8E8E93] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="mt-2">
                    <p className="text-sm text-[#8E8E93]">{tournamentTypeDescription(tournament.type)}</p>
                    <ul className="mt-2 space-y-1 text-sm text-[#1A1A2E] list-disc pl-5">
                        {notes.map(note => <li key={note}>{note}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
}

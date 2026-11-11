import { useState } from "react";
import { placeLabel, prizeList, tournamentFormatNotes, tournamentTypeDescription, tournamentTypeLabel, type TournamentPrizes } from "../lib/tournaments";

type FormatTournament = Parameters<typeof tournamentFormatNotes>[0];

const MEDALS = ["🥇", "🥈", "🥉"];

// The prizes a tournament advertises — up to 5th place, each with who offers it, plus
// anything else on offer. Renders nothing when none are set.
export function PrizeList({ tournament }: { tournament: TournamentPrizes }) {
    const prizes = prizeList(tournament);
    if (prizes.length === 0 && !tournament.prizeNotes) return null;
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-2">Prizes</p>
            {prizes.length > 0 && (
                <ul className="space-y-1.5">
                    {prizes.map(p => (
                        <li key={p.place} className="flex items-start gap-2 text-sm text-[#1A1A2E]">
                            <span className="shrink-0 w-5 text-center" aria-hidden>
                                {MEDALS[p.place - 1] ?? <span className="text-xs font-bold text-[#8E8E93]">{p.place}</span>}
                            </span>
                            <span className="min-w-0">
                                <span className="font-bold">{placeLabel(p.place)}:</span> {p.prize}
                                {p.partner && <span className="block text-xs text-[#8E8E93]">offered by {p.partner}</span>}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {tournament.prizeNotes && (
                <p className={`text-sm text-[#1A1A2E] whitespace-pre-line ${prizes.length > 0 ? "mt-2" : ""}`}>{tournament.prizeNotes}</p>
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
                className="w-full flex items-center justify-between gap-3 text-left py-2 -my-2"
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

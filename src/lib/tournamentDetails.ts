// Editing a tournament's times and prizes in the admin forms.
import { MAX_PRIZE_PLACE, prizeList, type Prize } from "./tournaments";

// One prize row while editing: blank prize = none for that place; who = "US" (Act!ve
// offers it) or "PARTNER", with the partner's name.
export type PrizeText = { prize: string; who: "US" | "PARTNER"; partner: string };

// A tournament's start/end times ("HH:MM", local time) and prizes, edited as text.
// Blank means "not advertised".
export type DetailsText = {
    startTime: string;
    endTime: string;
    location: string;
    prizes: PrizeText[]; // one per place, 1st first
    prizeNotes: string;
};

const emptyPrizes = (): PrizeText[] => Array.from({ length: MAX_PRIZE_PLACE }, () => ({ prize: "", who: "US", partner: "" }));

export const EMPTY_DETAILS: DetailsText = { startTime: "", endTime: "", location: "", prizes: emptyPrizes(), prizeNotes: "" };

export type StoredDetails = { startTime: string | null; endTime: string | null; location: string | null; prizes?: unknown; prizeNotes: string | null };

export function detailsText(t: StoredDetails): DetailsText {
    const prizes = emptyPrizes();
    for (const p of prizeList(t)) {
        if (p.place >= 1 && p.place <= MAX_PRIZE_PLACE) {
            prizes[p.place - 1] = { prize: p.prize, who: p.partner ? "PARTNER" : "US", partner: p.partner ?? "" };
        }
    }
    return { startTime: t.startTime ?? "", endTime: t.endTime ?? "", location: t.location ?? "", prizes, prizeNotes: t.prizeNotes ?? "" };
}

// A partner prize needs the partner's name.
export function detailsError(d: DetailsText): string | null {
    const i = d.prizes.findIndex(p => p.prize.trim() && p.who === "PARTNER" && !p.partner.trim());
    return i >= 0 ? `Name the partner offering the prize for place ${i + 1}.` : null;
}

// What the create/update mutations take: blanks become null, blank prizes are left out.
export function detailsInput(d: DetailsText): { startTime: string | null; endTime: string | null; location: string | null; prizes: Prize[]; prizeNotes: string | null } {
    const orNull = (s: string) => (s.trim() === "" ? null : s.trim());
    return {
        startTime: orNull(d.startTime),
        endTime: orNull(d.endTime),
        location: orNull(d.location),
        prizes: d.prizes
            .map((p, i) => ({ place: i + 1, prize: p.prize.trim(), partner: p.who === "PARTNER" ? orNull(p.partner) : null }))
            .filter(p => p.prize !== ""),
        prizeNotes: orNull(d.prizeNotes),
    };
}

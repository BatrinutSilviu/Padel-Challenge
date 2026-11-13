// Editing a tournament's times and prizes in the admin forms.
import { placeLabel, prizeList, type Prize } from "./tournaments";

// One prize row while editing: blank prize = none for that place; who = "US" (Act!ve
// offers it) or "PARTNER", with the partner's name.
export type PrizeText = { label: string; prize: string; who: "US" | "PARTNER"; partner: string };

// A tournament's start/end times ("HH:MM", local time) and prizes, edited as text.
// Blank means "not advertised".
export type DetailsText = {
    startTime: string;
    endTime: string;
    location: string;
    entryFee: string; // lei per person
    advanceFee: string; // lei per person, paid to confirm a spot
    payTo: string[]; // the payment accounts players pay (from Settings); none = all of them
    prizes: PrizeText[]; // in the order shown; a row left without a prize is dropped
    prizeNotes: string;
    womenOnly: boolean; // only women can sign themselves up
};

// A new row: labelled by its position until the admin writes something else.
export const newPrize = (position: number): PrizeText => ({ label: `${placeLabel(position)} place`, prize: "", who: "US", partner: "" });
const emptyPrizes = (): PrizeText[] => [1, 2, 3].map(newPrize);

export const EMPTY_DETAILS: DetailsText = { startTime: "", endTime: "", location: "", entryFee: "", advanceFee: "", payTo: [], prizes: emptyPrizes(), prizeNotes: "", womenOnly: false };

export type StoredDetails = {
    startTime: string | null; endTime: string | null; location: string | null;
    entryFee: number | null; advanceFee: number | null; prizes?: unknown; prizeNotes: string | null;
    paymentAccountIds?: string[];
    womenOnly?: boolean;
};

export function detailsText(t: StoredDetails): DetailsText {
    const saved = prizeList(t).map(p => ({ label: p.label, prize: p.prize, who: p.partner ? "PARTNER" as const : "US" as const, partner: p.partner ?? "" }));
    const prizes = saved.length > 0 ? saved : emptyPrizes();
    const fee = (n: number | null) => (n === null ? "" : String(n));
    return {
        startTime: t.startTime ?? "", endTime: t.endTime ?? "", location: t.location ?? "",
        entryFee: fee(t.entryFee), advanceFee: fee(t.advanceFee), payTo: [...(t.paymentAccountIds ?? [])].sort(),
        prizes, prizeNotes: t.prizeNotes ?? "", womenOnly: !!t.womenOnly,
    };
}

const parseFee = (s: string) => (s.trim() === "" ? null : Number(s));

// Fees are whole lei, the advance no more than the price; a partner prize needs the partner's name.
export function detailsError(d: DetailsText): string | null {
    const fee = parseFee(d.entryFee), advance = parseFee(d.advanceFee);
    if ([fee, advance].some(n => n !== null && (!Number.isInteger(n) || n < 0))) return "The price and the advance must be whole numbers of lei.";
    if (fee !== null && advance !== null && advance > fee) return "The advance can't be more than the price per person.";
    const p = d.prizes.find(p => p.prize.trim() && p.who === "PARTNER" && !p.partner.trim());
    return p ? `Name the partner offering the prize "${p.label || p.prize}".` : null;
}

// What the create/update mutations take: blanks become null, blank prizes are left out.
export function detailsInput(d: DetailsText): {
    startTime: string | null; endTime: string | null; location: string | null;
    entryFee: number | null; advanceFee: number | null; paymentAccountIds: string[]; prizes: Prize[]; prizeNotes: string | null; womenOnly: boolean;
} {
    const orNull = (s: string) => (s.trim() === "" ? null : s.trim());
    return {
        startTime: orNull(d.startTime),
        endTime: orNull(d.endTime),
        location: orNull(d.location),
        entryFee: parseFee(d.entryFee),
        advanceFee: parseFee(d.advanceFee),
        paymentAccountIds: d.payTo,
        prizes: d.prizes
            .map(p => ({ label: p.label.trim(), prize: p.prize.trim(), partner: p.who === "PARTNER" ? orNull(p.partner) : null }))
            .filter(p => p.prize !== ""),
        prizeNotes: orNull(d.prizeNotes),
        womenOnly: d.womenOnly,
    };
}

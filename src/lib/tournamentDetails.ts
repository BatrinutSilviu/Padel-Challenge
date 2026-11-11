// Editing a tournament's times and prizes in the admin forms.

// A tournament's start/end times ("HH:MM", local time) and prizes, edited as text.
// Blank means "not advertised".
export type DetailsText = {
    startTime: string;
    endTime: string;
    prize1: string;
    prize2: string;
    prize3: string;
    prizeNotes: string;
};

export const EMPTY_DETAILS: DetailsText = { startTime: "", endTime: "", prize1: "", prize2: "", prize3: "", prizeNotes: "" };

export type StoredDetails = { [K in keyof DetailsText]: string | null };

export function detailsText(t: StoredDetails): DetailsText {
    return {
        startTime: t.startTime ?? "",
        endTime: t.endTime ?? "",
        prize1: t.prize1 ?? "",
        prize2: t.prize2 ?? "",
        prize3: t.prize3 ?? "",
        prizeNotes: t.prizeNotes ?? "",
    };
}

// What the create/update mutations take: blanks become null.
export function detailsInput(d: DetailsText): StoredDetails {
    const orNull = (s: string) => (s.trim() === "" ? null : s.trim());
    return {
        startTime: orNull(d.startTime),
        endTime: orNull(d.endTime),
        prize1: orNull(d.prize1),
        prize2: orNull(d.prize2),
        prize3: orNull(d.prize3),
        prizeNotes: orNull(d.prizeNotes),
    };
}

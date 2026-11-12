import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../../trpc";
import { FeeInputs } from "./FeeInputs";
import { accountTitle } from "../PaymentAccounts";
import { MAX_PRIZES, USUAL_LOCATIONS, prizeList, timeRangeLabel } from "../../lib/tournaments";
import { detailsError, detailsInput, detailsText, newPrize, type DetailsText, type PrizeText, type StoredDetails } from "../../lib/tournamentDetails";

// 16px on phones: iOS zooms the page into any smaller input on focus.
const field = "border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-full disabled:opacity-50";

export function TimeInputs({ value, onChange, disabled }: {
    value: DetailsText;
    onChange: (value: DetailsText) => void;
    disabled?: boolean;
}) {
    const time = (key: "startTime" | "endTime", label: string) => (
        <label className="flex-1 sm:flex-none">
            <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
            <input
                type="time"
                value={value[key]}
                onChange={e => onChange({ ...value, [key]: e.target.value })}
                disabled={disabled}
                className={`${field} sm:w-32`}
            />
        </label>
    );
    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                {time("startTime", "Starts")}
                {time("endTime", "Ends")}
            </div>
            <label className="block">
                <span className="block text-xs font-medium text-gray-500 mb-1">Location</span>
                <input
                    value={value.location}
                    onChange={e => onChange({ ...value, location: e.target.value })}
                    disabled={disabled}
                    maxLength={200}
                    list="usual-locations"
                    placeholder="e.g. X3 Padel"
                    className={`${field} sm:max-w-xs`}
                />
                <datalist id="usual-locations">
                    {USUAL_LOCATIONS.map(l => <option key={l} value={l} />)}
                </datalist>
            </label>
        </div>
    );
}

// The prizes: as many rows as needed, each with its own label ("1st place", "1st place
// Golden", "Best newcomer"…), what's won and who offers it — Act!ve or a partner (named),
// which the management app needs to know: partners' prizes aren't our cost.
const BRACKET_LABELS = ["1st place Golden", "2nd place Golden", "3rd place Golden", "1st place Silver", "2nd place Silver", "3rd place Silver"];

export function PrizeInputs({ value, onChange, disabled }: {
    value: DetailsText;
    onChange: (value: DetailsText) => void;
    disabled?: boolean;
}) {
    const setPrizes = (prizes: PrizeText[]) => onChange({ ...value, prizes });
    const setPrize = (i: number, change: Partial<PrizeText>) => setPrizes(value.prizes.map((p, j) => (j === i ? { ...p, ...change } : p)));
    const remove = (i: number) => setPrizes(value.prizes.filter((_, j) => j !== i));
    const move = (i: number, by: -1 | 1) => {
        const list = [...value.prizes];
        [list[i], list[i + by]] = [list[i + by], list[i]];
        setPrizes(list);
    };
    // Golden & silver brackets: relabel the rows (keeping what's typed) and add any missing.
    const useBracketLabels = () => setPrizes(BRACKET_LABELS.map((label, i) => ({ ...(value.prizes[i] ?? newPrize(i + 1)), label })));
    // Back to the default: "1st place", "2nd place", … by position, keeping what's typed;
    // empty rows past the first three go.
    const usePlaceLabels = () => setPrizes(
        value.prizes
            .filter((p, i) => i < 3 || p.prize.trim() !== "")
            .map((p, i) => ({ ...p, label: newPrize(i + 1).label })),
    );
    const isBracket = value.prizes.some(p => BRACKET_LABELS.includes(p.label));
    const small = "text-xs font-medium px-2.5 py-2 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40";

    return (
        <div className="space-y-3">
            {value.prizes.map((p, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-2.5 space-y-2">
                    <input
                        value={p.label}
                        onChange={e => setPrize(i, { label: e.target.value })}
                        disabled={disabled}
                        maxLength={80}
                        placeholder="e.g. 1st place Golden"
                        aria-label="Prize label"
                        className={`${field} font-semibold`}
                    />
                    <input
                        value={p.prize}
                        onChange={e => setPrize(i, { prize: e.target.value })}
                        disabled={disabled}
                        maxLength={200}
                        placeholder="What's won, e.g. 300 lei + trophy"
                        aria-label="Prize"
                        className={field}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        {p.prize.trim() !== "" && (
                            <>
                            <span className="text-xs text-gray-500">Offered by</span>
                            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-medium">
                                {(["US", "PARTNER"] as const).map(who => (
                                    <button
                                        key={who}
                                        type="button"
                                        onClick={() => setPrize(i, { who })}
                                        disabled={disabled}
                                        className={`px-3 py-2 ${p.who === who ? "bg-[#FF4200] text-white" : "bg-white text-gray-600"}`}
                                    >
                                        {who === "US" ? "Act!ve" : "A partner"}
                                    </button>
                                ))}
                            </div>
                            </>
                        )}
                        <div className="flex gap-1.5 ml-auto">
                            <button type="button" onClick={() => move(i, -1)} disabled={disabled || i === 0} className={small} aria-label="Move up">↑</button>
                            <button type="button" onClick={() => move(i, 1)} disabled={disabled || i === value.prizes.length - 1} className={small} aria-label="Move down">↓</button>
                            <button type="button" onClick={() => remove(i)} disabled={disabled} className={`${small} text-red-600 border-red-200`} aria-label="Remove prize">✕</button>
                        </div>
                        {p.prize.trim() !== "" && p.who === "PARTNER" && (
                            <input
                                value={p.partner}
                                onChange={e => setPrize(i, { partner: e.target.value })}
                                disabled={disabled}
                                maxLength={100}
                                placeholder="Partner's name"
                                className={`${field} basis-full`}
                            />
                        )}
                    </div>
                </div>
            ))}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setPrizes([...value.prizes, newPrize(value.prizes.length + 1)])}
                    disabled={disabled || value.prizes.length >= MAX_PRIZES}
                    className="text-sm font-medium px-3 py-2 rounded-lg border border-[#FF4200] text-[#FF4200] disabled:opacity-40"
                >
                    + Add prize
                </button>
                <button
                    type="button"
                    onClick={usePlaceLabels}
                    disabled={disabled}
                    className={`text-sm font-medium px-3 py-2 rounded-lg border ${!isBracket ? "border-gray-800 text-gray-800" : "border-gray-300 text-gray-600"}`}
                >
                    1st, 2nd, 3rd…
                </button>
                <button
                    type="button"
                    onClick={useBracketLabels}
                    disabled={disabled}
                    className={`text-sm font-medium px-3 py-2 rounded-lg border ${isBracket ? "border-gray-800 text-gray-800" : "border-gray-300 text-gray-600"}`}
                >
                    Golden & Silver brackets
                </button>
            </div>
            <label className="block">
                <span className="block text-xs font-medium text-gray-500 mb-1">Anything else</span>
                <textarea
                    value={value.prizeNotes}
                    onChange={e => onChange({ ...value, prizeNotes: e.target.value })}
                    disabled={disabled}
                    maxLength={1000}
                    rows={2}
                    placeholder="e.g. a raffle among all players"
                    className={field}
                />
            </label>
        </div>
    );
}

// Who players pay: any of the payment accounts from Settings, picked in a dropdown with a
// checkbox per account (as in the hikes app). None picked shows every active account.
export function PayToSelect({ value, onChange, disabled }: {
    value: DetailsText;
    onChange: (value: DetailsText) => void;
    disabled?: boolean;
}) {
    const { data: accounts } = trpc.paymentAccount.list.useQuery();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    // Close when tapping outside.
    useEffect(() => {
        if (!open) return;
        const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [open]);

    const options = (accounts ?? []).filter(a => a.isActive || value.payTo.includes(a.id));
    if (options.length === 0) {
        return <p className="text-xs text-gray-400">Add who players pay in Admin → Settings → Payment accounts.</p>;
    }
    const label = (a: (typeof options)[number]) => `${accountTitle(a)} · ${a.accountHolder}`;
    const chosen = options.filter(a => value.payTo.includes(a.id));
    const summary = chosen.length === 0 ? "All accounts" : chosen.map(label).join(", ");
    const toggle = (id: string) => onChange({
        ...value,
        payTo: (value.payTo.includes(id) ? value.payTo.filter(x => x !== id) : [...value.payTo, id]).sort(),
    });

    return (
        <div ref={ref} className="relative sm:max-w-sm">
            <span className="block text-xs font-medium text-gray-500 mb-1">Players pay to</span>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`${field} flex items-center justify-between gap-2 text-left`}
            >
                <span className={`truncate ${chosen.length === 0 ? "text-gray-500" : ""}`}>{summary}</span>
                <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            {open && (
                <div role="listbox" aria-multiselectable className="mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-sm py-1">
                    {options.map(a => (
                        <label key={a.id} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={value.payTo.includes(a.id)}
                                onChange={() => toggle(a.id)}
                                className="w-4 h-4 accent-[#FF4200] shrink-0"
                            />
                            <span className="min-w-0">
                                <span className="block truncate">{label(a)}</span>
                                {(a.paymentHandle || a.iban) && <span className="block text-xs text-gray-400 font-mono truncate">{a.paymentHandle ?? a.iban}</span>}
                            </span>
                        </label>
                    ))}
                    <p className="px-3 pt-1 pb-2 text-xs text-gray-400 border-t border-gray-100 mt-1">None ticked shows all of them.</p>
                </div>
            )}
        </div>
    );
}

// The admin's card for changing a tournament's times and prizes after it's been
// created, whatever its status.
// Two cards on each tournament's admin page, whatever its status: "Price & payment"
// (price, advance, who players pay) and "Time, place & prizes". Each saves its own fields.
export function TournamentDetailsEditor({ tournament, section }: {
    tournament: StoredDetails & { id: string; payTo?: { type: string; bankName: string | null; accountHolder: string }[] };
    section: "payment" | "general";
}) {
    const qc = useQueryClient();
    // The texts plus the accounts players pay into (none picked = every active one).
    const stored = detailsText(tournament);
    const storedKey = JSON.stringify(stored);
    const [value, setValue] = useState(stored);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");
    // Pick up changes saved elsewhere (or by this form) once they're refetched.
    useEffect(() => { setValue(JSON.parse(storedKey)); }, [storedKey]);
    const changed = JSON.stringify(value) !== storedKey;

    const update = trpc.tournament.updateDetails.useMutation({
        onSuccess: () => {
            setError("");
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.getById, { id: tournament.id }) });
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.list) });
        },
        onError: e => setError(e.message),
    });

    const times = timeRangeLabel(tournament);
    const prizeCount = prizeList(tournament).length + (tournament.prizeNotes ? 1 : 0);
    const isPayment = section === "payment";
    const payToText = (tournament.payTo ?? []).map(a => `${accountTitle(a as Parameters<typeof accountTitle>[0])} ${a.accountHolder.split(" ")[0]}`).join(", ");
    const summary = isPayment
        ? [
            tournament.entryFee !== null ? `${tournament.entryFee} lei` : "no price",
            tournament.advanceFee !== null ? `${tournament.advanceFee} lei advance` : null,
            payToText ? `pay to ${payToText}` : "no payment accounts",
        ].filter(Boolean).join(" · ")
        : `${times || "No times set"} · ${tournament.location || "no location"} · ${prizeCount > 0 ? "prizes set" : "no prizes"}`;
    // Only this card's fields go out, so the other card's unsaved edits are never overwritten.
    function input() {
        const all = detailsInput(value);
        return isPayment
            ? { entryFee: all.entryFee, advanceFee: all.advanceFee, paymentAccountIds: all.paymentAccountIds }
            : { startTime: all.startTime, endTime: all.endTime, location: all.location, prizes: all.prizes, prizeNotes: all.prizeNotes };
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-sm font-medium text-gray-700"
            >
                <span className="text-left min-w-0">
                    {isPayment ? "Price & payment" : "Time, place & prizes"}
                    <span className="block text-xs font-normal text-gray-400">{summary}</span>
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            {open && (
                <div className="border-t border-gray-100 px-4 sm:px-5 py-4 space-y-4">
                    {!isPayment && (
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Time (local) and place</p>
                        <TimeInputs value={value} onChange={setValue} disabled={update.isPending} />
                    </div>
                    )}
                    {isPayment && (
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Price per person (lei)</p>
                        <FeeInputs
                            entryFee={value.entryFee}
                            advanceFee={value.advanceFee}
                            onEntryFee={entryFee => setValue({ ...value, entryFee })}
                            onAdvanceFee={advanceFee => setValue({ ...value, advanceFee })}
                            disabled={update.isPending}
                        />
                        <div className="mt-3">
                            <PayToSelect value={value} onChange={setValue} disabled={update.isPending} />
                        </div>
                    </div>
                    )}
                    {!isPayment && (
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Prizes</p>
                        <PrizeInputs value={value} onChange={setValue} disabled={update.isPending} />
                    </div>
                    )}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {changed && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const problem = detailsError(value);
                                    if (problem) return setError(problem);
                                    update.mutate({ id: tournament.id, ...input() });
                                }}
                                disabled={update.isPending}
                                className="text-sm font-medium px-4 py-2 rounded-lg bg-[#FF4200] text-white hover:bg-[#CC3500] disabled:opacity-50"
                            >
                                {update.isPending ? "Saving…" : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setValue(stored); setError(""); }}
                                disabled={update.isPending}
                                className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:border-gray-400 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

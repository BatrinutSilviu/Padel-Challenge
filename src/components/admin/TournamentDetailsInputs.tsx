import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../../trpc";
import { USUAL_LOCATIONS, placeLabel, prizeList, timeRangeLabel } from "../../lib/tournaments";
import { detailsError, detailsInput, detailsText, type DetailsText, type PrizeText, type StoredDetails } from "../../lib/tournamentDetails";

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

// Prizes for places 1–5. Each is offered by Act!ve or by a partner (named), which the
// management app needs to know: partners' prizes aren't our cost.
export function PrizeInputs({ value, onChange, disabled }: {
    value: DetailsText;
    onChange: (value: DetailsText) => void;
    disabled?: boolean;
}) {
    const setPrize = (i: number, change: Partial<PrizeText>) =>
        onChange({ ...value, prizes: value.prizes.map((p, j) => (j === i ? { ...p, ...change } : p)) });
    return (
        <div className="space-y-3">
            {value.prizes.map((p, i) => (
                <div key={i} className="space-y-1.5">
                    <label className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 w-8 shrink-0">{placeLabel(i + 1)}</span>
                        <input
                            value={p.prize}
                            onChange={e => setPrize(i, { prize: e.target.value })}
                            disabled={disabled}
                            maxLength={200}
                            placeholder="Optional"
                            className={field}
                        />
                    </label>
                    {p.prize.trim() !== "" && (
                        <div className="flex flex-wrap items-center gap-2 pl-10">
                            <span className="text-xs text-gray-500">Offered by</span>
                            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-medium">
                                {(["US", "PARTNER"] as const).map(who => (
                                    <button
                                        key={who}
                                        type="button"
                                        onClick={() => setPrize(i, { who })}
                                        disabled={disabled}
                                        className={`px-3 py-1.5 ${p.who === who ? "bg-[#FF4200] text-white" : "bg-white text-gray-600"}`}
                                    >
                                        {who === "US" ? "Act!ve" : "A partner"}
                                    </button>
                                ))}
                            </div>
                            {p.who === "PARTNER" && (
                                <input
                                    value={p.partner}
                                    onChange={e => setPrize(i, { partner: e.target.value })}
                                    disabled={disabled}
                                    maxLength={100}
                                    placeholder="Partner's name"
                                    className={`${field} flex-1 min-w-[10rem]`}
                                />
                            )}
                        </div>
                    )}
                </div>
            ))}
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

// The admin's card for changing a tournament's times and prizes after it's been
// created, whatever its status.
export function TournamentDetailsEditor({ tournament }: {
    tournament: StoredDetails & { id: string };
}) {
    const qc = useQueryClient();
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

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-sm font-medium text-gray-700"
            >
                <span className="text-left">
                    Time, place & prizes
                    <span className="block text-xs font-normal text-gray-400">
                        {times || "No times set"} · {tournament.location || "no location"} · {prizeCount > 0 ? "prizes set" : "no prizes"}
                    </span>
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
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Time (local) and place</p>
                        <TimeInputs value={value} onChange={setValue} disabled={update.isPending} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Prizes</p>
                        <PrizeInputs value={value} onChange={setValue} disabled={update.isPending} />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {changed && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const problem = detailsError(value);
                                    if (problem) return setError(problem);
                                    update.mutate({ id: tournament.id, ...detailsInput(value) });
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

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../../trpc";
import { timeRangeLabel } from "../../lib/tournaments";
import { detailsInput, detailsText, type DetailsText, type StoredDetails } from "../../lib/tournamentDetails";

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
        <div className="flex gap-3">
            {time("startTime", "Starts")}
            {time("endTime", "Ends")}
        </div>
    );
}

export function PrizeInputs({ value, onChange, disabled }: {
    value: DetailsText;
    onChange: (value: DetailsText) => void;
    disabled?: boolean;
}) {
    const prize = (key: "prize1" | "prize2" | "prize3", label: string) => (
        <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 w-8 shrink-0">{label}</span>
            <input
                value={value[key]}
                onChange={e => onChange({ ...value, [key]: e.target.value })}
                disabled={disabled}
                maxLength={200}
                placeholder="Optional"
                className={field}
            />
        </label>
    );
    return (
        <div className="space-y-2">
            {prize("prize1", "1st")}
            {prize("prize2", "2nd")}
            {prize("prize3", "3rd")}
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
    const prizeCount = [tournament.prize1, tournament.prize2, tournament.prize3, tournament.prizeNotes].filter(Boolean).length;

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-sm font-medium text-gray-700"
            >
                <span className="text-left">
                    Times & prizes
                    <span className="block text-xs font-normal text-gray-400">
                        {times || "No times set"} · {prizeCount > 0 ? "prizes set" : "no prizes"}
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
                        <p className="text-sm font-medium text-gray-700 mb-2">Time (local)</p>
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
                                onClick={() => update.mutate({ id: tournament.id, ...detailsInput(value) })}
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

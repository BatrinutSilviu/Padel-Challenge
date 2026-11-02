import { useState } from "react";
import { DAYS, DAY_LABELS, TIME_OPTIONS, VENUES, formatMinutes, type Day, type TimeRange, type Venue } from "../lib/league";

export type Profile = {
    phone: string | null;
    availability: TimeRange[];
    venues: string[];
    note: string | null;
};

// Phone number and when/where a player likes to play. Players fill it in on /profile;
// admins fill it in for players without an account.
export function ProfileForm({
    profile,
    pending,
    error,
    submitLabel = "Save",
    onSubmit,
    onCancel,
}: {
    profile: Profile;
    pending: boolean;
    error?: string;
    submitLabel?: string;
    onSubmit: (p: { phone: string | null; availability: TimeRange[]; venues: Venue[]; note: string | null }) => void;
    onCancel?: () => void;
}) {
    const [phone, setPhone] = useState(profile.phone ?? "");
    const [availability, setAvailability] = useState<TimeRange[]>(profile.availability);
    // Clubs saved before the venue list existed are dropped.
    const [venues, setVenues] = useState<string[]>(profile.venues.filter(v => (VENUES as readonly string[]).includes(v)));
    const [note, setNote] = useState(profile.note ?? "");

    const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
        set(list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

    const badRange = availability.some(r => r.to <= r.from);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (badRange) return;
        onSubmit({
            phone: phone.trim() || null,
            availability,
            venues: VENUES.filter(v => venues.includes(v)),
            note: note.trim() || null,
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Phone number</label>
                <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0740 123 456"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                />
                <p className="text-xs text-gray-400">Only the players of your league matches can see it, on the match page.</p>
            </div>

            <div className="space-y-2">
                <div>
                    <p className="text-sm font-medium text-gray-700">When I can play</p>
                    <p className="text-xs text-gray-400">Tap a day, then set the hours. Add more than one range if you have a gap.</p>
                </div>
                <AvailabilityEditor value={availability} onChange={setAvailability} />
                {badRange && <p className="text-sm text-amber-700">Each range has to end after it starts.</p>}
            </div>

            <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">Where I like to play</p>
                <div className="flex flex-wrap gap-1.5">
                    {VENUES.map(v => (
                        <Chip key={v} active={venues.includes(v)} onClick={() => toggle(venues, setVenues, v)}>{v}</Chip>
                    ))}
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Anything else <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder="e.g. I can usually book a court, I prefer indoor courts…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm border border-gray-300 text-gray-600 font-medium hover:bg-gray-50">
                        Cancel
                    </button>
                )}
                <button type="submit" disabled={pending || badRange} className="flex-1 py-3 rounded-xl text-sm bg-[#FF4200] text-white font-semibold hover:bg-[#CC3500] disabled:opacity-50">
                    {pending ? "Saving…" : submitLabel}
                </button>
            </div>
        </form>
    );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                active ? "bg-[#FF4200] text-white shadow-sm" : "bg-[#F5F5F7] text-[#8E8E93] hover:text-[#1A1A2E]"
            }`}
        >
            {children}
        </button>
    );
}

// One row per day; a day with no ranges is off. Turning a day on starts it at 18:00–22:00.
function AvailabilityEditor({ value, onChange }: { value: TimeRange[]; onChange: (v: TimeRange[]) => void }) {
    const setDay = (day: Day, ranges: TimeRange[]) => onChange([...value.filter(r => r.day !== day), ...ranges]);

    return (
        <div className="divide-y divide-[#F5F5F7] border border-[#E5E5EA] rounded-xl">
            {DAYS.map(day => {
                const ranges = value.filter(r => r.day === day);
                const on = ranges.length > 0;
                return (
                    <div key={day} className="flex items-start gap-3 px-3 py-2">
                        <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => setDay(day, on ? [] : [{ day, from: 18 * 60, to: 22 * 60 }])}
                            className={`w-14 shrink-0 py-1.5 rounded-lg text-sm font-bold transition-all ${on ? "bg-[#FF4200] text-white" : "bg-[#F5F5F7] text-[#8E8E93] hover:text-[#1A1A2E]"}`}
                        >
                            {DAY_LABELS[day]}
                        </button>
                        {on ? (
                            <div className="flex-1 min-w-0 space-y-1.5">
                                {ranges.map((r, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <TimeSelect value={r.from} onChange={from => setDay(day, ranges.map((x, j) => (j === i ? { ...x, from } : x)))} label={`${DAY_LABELS[day]} from`} />
                                        <span className="text-gray-400">–</span>
                                        <TimeSelect value={r.to} onChange={to => setDay(day, ranges.map((x, j) => (j === i ? { ...x, to } : x)))} label={`${DAY_LABELS[day]} until`} />
                                        <button
                                            type="button"
                                            aria-label="Remove these hours"
                                            onClick={() => setDay(day, ranges.filter((_, j) => j !== i))}
                                            className="w-8 h-8 shrink-0 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const last = ranges[ranges.length - 1];
                                        const from = Math.min(last.to + 60, 23 * 60);
                                        setDay(day, [...ranges, { day, from, to: Math.min(from + 120, 24 * 60) }]);
                                    }}
                                    className="text-xs font-semibold text-[#FF4200] hover:underline"
                                >
                                    + more hours
                                </button>
                            </div>
                        ) : (
                            <span className="py-1.5 text-sm text-[#C7C7CC]">Can't play</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function TimeSelect({ value, onChange, label }: { value: number; onChange: (m: number) => void; label: string }) {
    const options = TIME_OPTIONS.includes(value) ? TIME_OPTIONS : [...TIME_OPTIONS, value].sort((a, b) => a - b);
    return (
        <select
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            aria-label={label}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4200] tabular-nums"
        >
            {options.map(m => <option key={m} value={m}>{formatMinutes(m)}</option>)}
        </select>
    );
}

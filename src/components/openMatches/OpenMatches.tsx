import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../../trpc";
import type { RouterOutputs } from "../../backendRouter";
import { useAuth } from "../../contexts/useAuth";
import { divisionLabel, DIVISION_BADGES } from "../../lib/divisions";
import { useLevelRules } from "../../lib/levels";
import { ClockIcon, PinIcon } from "../ui/icons";

// Open matches (backend routers/openMatch): a player sets up a match — venue, time, a level
// or a coefficient range — and others in the range join until there are four.

type OpenMatch = RouterOutputs["openMatch"]["list"][number];

const DURATIONS = [60, 90, 120];

function dateParts(d: Date) {
    const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", o);
    return { dow: part({ weekday: "short" }), day: part({ day: "numeric" }), month: part({ month: "short" }) };
}
function timeLabel(d: Date) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
const fmt = (c: number) => (Math.round(c * 100) / 100).toString();

export function OpenMatches() {
    const { token } = useAuth();
    const isAdmin = !!localStorage.getItem("admin_token");
    const { data, isPending } = trpc.openMatch.list.useQuery(undefined, { refetchInterval: 60_000 });
    const [creating, setCreating] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm text-muted max-w-xl">
                    Matches players have set up and are looking for partners for. Join one in your range, or set up your own —
                    the player who sets it up books the court.
                </p>
                {token ? (
                    !creating && (
                        <button
                            onClick={() => setCreating(true)}
                            className="shrink-0 px-4 py-2.5 rounded-lg bg-[#FF4200] text-white text-sm font-semibold hover:bg-[#CC3500] transition-colors"
                        >
                            Set up a match
                        </button>
                    )
                ) : (
                    <Link
                        to={`/login?redirect=${encodeURIComponent("/?tab=matches")}`}
                        className="shrink-0 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-ink hover:border-gray-400"
                    >
                        Log in to set up or join
                    </Link>
                )}
            </div>

            {creating && <CreateOpenMatch onDone={() => setCreating(false)} />}

            {isPending && <p className="text-muted">Loading…</p>}
            {!isPending && (data ?? []).length === 0 && (
                <div className="bg-surface rounded-xl border border-line px-5 py-8 text-center text-muted">
                    No open matches right now.{token ? " Set one up and others can join." : ""}
                </div>
            )}
            <div className="space-y-3">
                {(data ?? []).map(m => <OpenMatchCard key={m.id} match={m} loggedIn={!!token} isAdmin={isAdmin} />)}
            </div>
        </div>
    );
}

function OpenMatchCard({ match: m, loggedIn, isAdmin }: { match: OpenMatch; loggedIn: boolean; isAdmin: boolean }) {
    const utils = trpc.useUtils();
    const [error, setError] = useState("");
    const opts = { onSuccess: () => { setError(""); void utils.openMatch.list.invalidate(); }, onError: (e: { message: string }) => setError(e.message) };
    const join = trpc.openMatch.join.useMutation(opts);
    const leave = trpc.openMatch.leave.useMutation(opts);
    const cancel = trpc.openMatch.cancel.useMutation(opts);
    const adminCancel = trpc.openMatch.adminCancel.useMutation(opts);
    const busy = join.isPending || leave.isPending || cancel.isPending || adminCancel.isPending;

    const starts = new Date(m.startsAt);
    const ends = new Date(starts.getTime() + m.durationMinutes * 60_000);
    const date = dateParts(starts);
    const free = m.spots - m.players.length;
    const badge = m.division !== null ? DIVISION_BADGES[m.division] : null;

    return (
        <div className={`flex gap-4 bg-surface rounded-xl border px-4 py-4 ${m.joined ? "border-[#FF4200]/50" : "border-line"}`}>
            <div className="w-12 shrink-0 flex flex-col items-center font-display uppercase leading-none border-r border-line pr-4 pt-0.5">
                <span className="text-xs font-semibold tracking-wider text-muted">{date.dow}</span>
                <span className="text-[32px] font-bold text-ink my-0.5">{date.day}</span>
                <span className="text-xs font-semibold tracking-wider text-muted">{date.month}</span>
            </div>
            <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {badge ? (
                                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>{divisionLabel(m.division!)}</span>
                            ) : (
                                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">Custom range</span>
                            )}
                            <span className="text-xs text-muted">coefficient {fmt(m.minCoefficient)}–{fmt(m.maxCoefficient)}</span>
                            {m.started && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#FF4200]/15 text-[#FF4200]">Playing now</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
                            <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5 text-muted" />{timeLabel(starts)}–{timeLabel(ends)}</span>
                            <span className="flex items-center gap-1.5"><PinIcon className="w-3.5 h-3.5 text-muted" />{m.venue}</span>
                        </div>
                    </div>
                    <span className={`shrink-0 font-display uppercase tracking-wide text-sm font-semibold ${free > 0 ? "text-emerald-600" : "text-muted"}`}>
                        {free > 0 ? `${free} of ${m.spots} free` : "Full"}
                    </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {m.players.map(p => (
                        <Link
                            key={p.playerId}
                            to={`/player/${p.player.id}`}
                            className="text-sm px-2.5 py-1 rounded-md bg-canvas border border-line text-ink hover:border-gray-300"
                        >
                            {p.player.name}
                            {p.playerId === m.createdById && <span className="text-xs text-muted"> · set it up</span>}
                        </Link>
                    ))}
                    {Array.from({ length: free }, (_, i) => (
                        <span key={i} className="text-sm px-2.5 py-1 rounded-md border border-dashed border-gray-300 text-muted">Open spot</span>
                    ))}
                </div>

                {m.note && <p className="text-sm text-ink-2 whitespace-pre-line">{m.note}</p>}

                <div className="flex flex-wrap items-center gap-2">
                    {loggedIn && !m.joined && !m.started && (
                        m.cannotJoin ? (
                            <span className="text-xs text-muted">{m.cannotJoin}</span>
                        ) : (
                            <button
                                onClick={() => join.mutate({ id: m.id })}
                                disabled={busy}
                                className="px-4 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-semibold hover:bg-[#CC3500] disabled:opacity-40"
                            >
                                Join
                            </button>
                        )
                    )}
                    {m.joined && !m.mine && !m.started && (
                        <button
                            onClick={() => leave.mutate({ id: m.id })}
                            disabled={busy}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-ink hover:border-gray-400 disabled:opacity-40"
                        >
                            Leave
                        </button>
                    )}
                    {m.mine && (
                        <button
                            onClick={() => { if (confirm("Cancel this match? The players who joined will see it's gone.")) cancel.mutate({ id: m.id }); }}
                            disabled={busy}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-red-600 hover:border-red-300 disabled:opacity-40"
                        >
                            Cancel match
                        </button>
                    )}
                    {isAdmin && !m.mine && (
                        <button
                            onClick={() => { if (confirm("Take this match down?")) adminCancel.mutate({ id: m.id }); }}
                            disabled={busy}
                            className="px-3 py-2 rounded-lg border border-[#9FD2DD]/50 text-sm font-semibold text-[#9FD2DD] disabled:opacity-40"
                        >
                            Take down (admin)
                        </button>
                    )}
                    {m.joined && <span className="text-xs text-emerald-600 font-semibold">You're in</span>}
                    {error && <span className="text-xs text-red-600">{error}</span>}
                </div>
            </div>
        </div>
    );
}

// Tomorrow, as yyyy-mm-dd in local time.
function tomorrow(): string {
    const d = new Date(Date.now() + 86_400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CreateOpenMatch({ onDone }: { onDone: () => void }) {
    const utils = trpc.useUtils();
    const { data: rules } = useLevelRules();
    const { data: tournaments } = trpc.tournament.list.useQuery();
    // The player's own level is the default (the players list is already loaded on the home page).
    const { playerId } = useAuth();
    const { data: players } = trpc.player.list.useQuery();
    // Venues from the tournaments, to pick from (or type another).
    const venues = useMemo(
        () => [...new Set((tournaments ?? []).map(t => t.location).filter((v): v is string => !!v))].sort(),
        [tournaments],
    );

    const [venue, setVenue] = useState("");
    const [date, setDate] = useState(tomorrow());
    const [time, setTime] = useState("19:00");
    const [duration, setDuration] = useState(90);
    const [level, setLevel] = useState<string>("");
    const [min, setMin] = useState("");
    const [max, setMax] = useState("");
    const [note, setNote] = useState("");
    const [error, setError] = useState("");

    const myDivision = players?.find(p => p.id === playerId)?.division;
    const chosenLevel = level === "" ? (myDivision ? String(myDivision) : "4") : level;
    const levels = [...(rules?.levels.levels ?? [])].sort((a, b) => a.division - b.division);
    const picked = levels.find(l => String(l.division) === chosenLevel);

    const create = trpc.openMatch.create.useMutation({
        onSuccess: () => { void utils.openMatch.list.invalidate(); onDone(); },
        onError: e => setError(e.message),
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        const startsAt = new Date(`${date}T${time}`);
        if (isNaN(startsAt.getTime())) return setError("Pick a date and a time.");
        if (chosenLevel === "custom") {
            const lo = Number(min), hi = Number(max);
            if (min === "" || max === "" || isNaN(lo) || isNaN(hi)) return setError("Give the lowest and the highest coefficient.");
            create.mutate({ venue, startsAt, durationMinutes: duration, division: null, minCoefficient: lo, maxCoefficient: hi, note: note || undefined });
        } else {
            create.mutate({ venue, startsAt, durationMinutes: duration, division: Number(chosenLevel), note: note || undefined });
        }
    }

    const input = "w-full bg-canvas border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm text-ink focus:outline-none focus:border-[#FF4200]";
    return (
        <form onSubmit={submit} className="bg-surface rounded-xl border border-line p-4 sm:p-5 space-y-4">
            <h3 className="font-display text-lg font-semibold uppercase tracking-wider text-ink">Set up a match</h3>
            <div className="grid sm:grid-cols-2 gap-3">
                <label className="space-y-1 text-sm text-ink-2 sm:col-span-2">
                    <span className="block font-semibold">Venue</span>
                    <input list="open-match-venues" required minLength={2} maxLength={80} value={venue} onChange={e => setVenue(e.target.value)} placeholder="X3 Padel" className={input} />
                    <datalist id="open-match-venues">{venues.map(v => <option key={v} value={v} />)}</datalist>
                </label>
                <label className="space-y-1 text-sm text-ink-2">
                    <span className="block font-semibold">Date</span>
                    <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={input} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-sm text-ink-2">
                        <span className="block font-semibold">Start</span>
                        <input type="time" required step={900} value={time} onChange={e => setTime(e.target.value)} className={input} />
                    </label>
                    <label className="space-y-1 text-sm text-ink-2">
                        <span className="block font-semibold">Length</span>
                        <select value={duration} onChange={e => setDuration(Number(e.target.value))} className={input}>
                            {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                        </select>
                    </label>
                </div>
                <label className="space-y-1 text-sm text-ink-2 sm:col-span-2">
                    <span className="block font-semibold">Who can join</span>
                    <select value={chosenLevel} onChange={e => setLevel(e.target.value)} className={input}>
                        {levels.map(l => (
                            <option key={l.division} value={String(l.division)}>
                                {divisionLabel(l.division)} — coefficient {fmt(l.allowedMin)}–{fmt(l.allowedMax)}
                            </option>
                        ))}
                        <option value="custom">Custom coefficient range…</option>
                    </select>
                    {picked && <span className="block text-xs text-muted">Players with a coefficient in {fmt(picked.allowedMin)}–{fmt(picked.allowedMax)} can join; players without one yet, if it's their level.</span>}
                </label>
                {chosenLevel === "custom" && (
                    <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                        <label className="space-y-1 text-sm text-ink-2">
                            <span className="block font-semibold">Lowest coefficient</span>
                            <input type="number" min={0} max={10} step={0.1} value={min} onChange={e => setMin(e.target.value)} className={input} />
                        </label>
                        <label className="space-y-1 text-sm text-ink-2">
                            <span className="block font-semibold">Highest coefficient</span>
                            <input type="number" min={0} max={10} step={0.1} value={max} onChange={e => setMax(e.target.value)} className={input} />
                        </label>
                    </div>
                )}
                <label className="space-y-1 text-sm text-ink-2 sm:col-span-2">
                    <span className="block font-semibold">Note <span className="font-normal text-muted">(optional)</span></span>
                    <textarea rows={2} maxLength={300} value={note} onChange={e => setNote(e.target.value)} placeholder="Court 3 is booked, we split the cost" className={input} />
                </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={create.isPending} className="px-4 py-2.5 rounded-lg bg-[#FF4200] text-white text-sm font-semibold hover:bg-[#CC3500] disabled:opacity-40">
                    {create.isPending ? "Setting up…" : "Set up the match"}
                </button>
                <button type="button" onClick={onDone} className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-ink">
                    Cancel
                </button>
            </div>
        </form>
    );
}

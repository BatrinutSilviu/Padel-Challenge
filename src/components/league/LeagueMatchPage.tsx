import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { toast } from "sonner";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/useAuth";
import {
    DAY_LABELS, VENUES, formatRange, rangesByDay, formatResult, formatScheduledAt, formatWeekRange, teamName, tierLabel,
    weekRange, winnerSide, type LeagueMatchDetails, type Venue,
} from "../../lib/league";
import { LeagueScoreForm } from "./LeagueScoreForm";

export function LeagueMatchPage() {
    const { id } = useParams<{ id: string }>();
    const { data: match, isPending, error } = trpc.league.match.useQuery({ id: id! });

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-4">
                {isPending ? <p className="text-[#8E8E93]">Loading…</p>
                    : error || !match ? <p className="text-red-600">Match not found.</p>
                    : <MatchView match={match} />}
            </main>
        </div>
    );
}

function MatchView({ match }: { match: LeagueMatchDetails }) {
    const { token } = useAuth();
    const winner = winnerSide(match);
    const playing = match.league.status === "IN_PROGRESS";
    const names: [string, string] = [teamName(match.team1), teamName(match.team2)];

    return (
        <>
            <Link to={`/league/${match.league.id}`} className="text-[#8E8E93] hover:text-[#FF4200] transition-colors text-sm font-semibold">← {match.league.name}</Link>

            <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 shadow-sm space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">
                    {match.group
                        ? <>{tierLabel(match.group.tier.level)} · Group {match.group.name} · Week {match.week} · {formatWeekRange(match.league.startDate, match.week!)}</>
                        : <>Playoff{match.playoffKind ? ` · ${match.playoffKind === "PROMOTION" ? "promotion" : "relegation"}` : ""}</>}
                </p>
                <div className="space-y-2">
                    {([1, 2] as const).map(side => {
                        const team = side === 1 ? match.team1 : match.team2;
                        const sets = side === 1 ? match.team1Sets : match.team2Sets;
                        return (
                            <div key={side} className="flex items-center justify-between gap-3">
                                <p className={`text-base min-w-0 ${winner === side ? "font-black text-[#1A1A2E]" : "font-semibold text-[#3A3A4E]"} ${team.eliminated ? "line-through" : ""}`}>
                                    {names[side - 1]}
                                    {match.mySide === side && <span className="ml-2 text-[10px] font-bold uppercase text-[#FF4200]">You</span>}
                                </p>
                                {match.status !== "PENDING" && !match.walkoverWinner && (
                                    <span className={`text-xl font-black tabular-nums ${winner === side ? "text-[#FF4200]" : "text-[#C7C7CC]"}`}>{sets}</span>
                                )}
                            </div>
                        );
                    })}
                </div>
                <ResultLine match={match} />
                {(match.scheduledAt || match.venue) && match.status !== "CONFIRMED" && (
                    <p className="text-sm text-[#1A1A2E] bg-[#F5F5F7] rounded-xl px-3 py-2">
                        📅 {match.scheduledAt ? formatScheduledAt(match.scheduledAt) : "Time not set"}
                        {match.venue && <> · 📍 {match.venue}</>}
                    </p>
                )}
            </div>

            {match.mySide && playing && <ScoreSection match={match} names={names} />}
            {match.mySide && playing && match.status !== "CONFIRMED" && <ScheduleSection match={match} />}
            {match.contacts && <ContactsSection match={match} />}

            {!match.mySide && playing && (
                <p className="text-sm text-[#8E8E93] text-center">
                    {token ? "Only the four players of this match can report the score and see contact details."
                        : <>Playing this match? <Link to={`/login?redirect=/league/match/${match.id}`} className="text-[#FF4200] font-semibold hover:underline">Log in</Link> to see your opponents' contact details and report the score.</>}
                </p>
            )}
        </>
    );
}

function ResultLine({ match }: { match: LeagueMatchDetails }) {
    const eliminated = match.team1.eliminated || match.team2.eliminated;
    let text: string;
    if (eliminated) text = "A team was eliminated — this match counts 6-0 6-0 for the other team.";
    else if (match.walkoverWinner) text = `Walkover to ${teamName(match.walkoverWinner === 1 ? match.team1 : match.team2)} (6-0 6-0).`;
    else if (match.status === "CONFIRMED") text = `${formatResult(match)} · confirmed`;
    else if (match.status === "SUBMITTED") text = `${formatResult(match)} · reported by ${teamName(match.submittedBySide === 1 ? match.team1 : match.team2)}, waiting for the other team to confirm${match.disputed ? " (the teams reported different scores — an admin will check)" : ""}`;
    else text = "Not played yet.";
    return <p className={`text-sm ${match.disputed && match.status === "SUBMITTED" ? "text-red-600" : "text-[#8E8E93]"}`}>{text}</p>;
}

function useInvalidateMatch(matchId: string) {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.match, { id: matchId }) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.getById) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.myOpenMatches) });
    };
}

function ScoreSection({ match, names }: { match: LeagueMatchDetails; names: [string, string] }) {
    const invalidate = useInvalidateMatch(match.id);
    const [editing, setEditing] = useState(false);
    const submit = trpc.league.submitScore.useMutation({
        onSuccess: m => {
            invalidate();
            setEditing(false);
            toast.success(m.status === "CONFIRMED" ? "Score confirmed" : "Score reported — the other team needs to confirm it");
        },
    });
    const confirm = trpc.league.confirmScore.useMutation({
        onSuccess: () => { invalidate(); toast.success("Score confirmed"); },
    });

    if (match.status === "CONFIRMED" || match.team1.eliminated || match.team2.eliminated) {
        return match.status === "CONFIRMED" ? (
            <p className="text-xs text-center text-[#8E8E93]">Something wrong with the result? Ask an admin to correct it.</p>
        ) : null;
    }

    const theyReported = match.status === "SUBMITTED" && match.submittedBySide !== match.mySide;
    const iReported = match.status === "SUBMITTED" && match.submittedBySide === match.mySide;
    const form = (label: string, onCancel?: () => void) => (
        <LeagueScoreForm
            teamNames={names}
            initialSets={match.status === "SUBMITTED" ? match.sets : undefined}
            submitLabel={label}
            pending={submit.isPending}
            error={submit.error?.message}
            onSubmit={sets => submit.mutate({ matchId: match.id, sets })}
            onCancel={onCancel}
        />
    );

    return (
        <section className="bg-white rounded-2xl border border-[#E5E5EA] p-5 shadow-sm space-y-3">
            <h2 className="font-black text-[#1A1A2E]">Score</h2>
            {theyReported && !editing ? (
                <>
                    <p className="text-sm text-[#3A3A4E]">
                        Your opponents reported <span className="font-bold text-[#1A1A2E]">{formatResult(match)}</span> ({names[0]} first). Is that right?
                    </p>
                    {confirm.error && <p className="text-sm text-red-500">{confirm.error.message}</p>}
                    <div className="flex gap-2">
                        <button onClick={() => setEditing(true)} className="flex-1 py-3 rounded-xl text-sm border border-gray-300 text-gray-600 font-medium hover:bg-gray-50">
                            No, report the right score
                        </button>
                        <button onClick={() => confirm.mutate({ matchId: match.id })} disabled={confirm.isPending} className="flex-1 py-3 rounded-xl text-sm bg-[#FF4200] text-white font-semibold hover:bg-[#CC3500] disabled:opacity-50">
                            {confirm.isPending ? "Confirming…" : "Yes, confirm"}
                        </button>
                    </div>
                </>
            ) : theyReported ? (
                <>
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        Your score replaces theirs and they'll need to confirm it. The match is flagged for an admin to check.
                    </p>
                    {form("Report this score", () => setEditing(false))}
                </>
            ) : iReported && !editing ? (
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-[#3A3A4E]">You reported <span className="font-bold text-[#1A1A2E]">{formatResult(match)}</span>. Waiting for your opponents to confirm.</p>
                    <button onClick={() => setEditing(true)} className="shrink-0 text-sm font-semibold text-[#FF4200] hover:underline">Change</button>
                </div>
            ) : (
                form("Report score", iReported ? () => setEditing(false) : undefined)
            )}
        </section>
    );
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
function toLocalInput(d: string | null): string {
    if (!d) return "";
    const date = new Date(d);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ScheduleSection({ match }: { match: LeagueMatchDetails }) {
    const invalidate = useInvalidateMatch(match.id);
    const [when, setWhen] = useState(toLocalInput(match.scheduledAt));
    const [venue, setVenue] = useState(match.venue ?? "");
    const save = trpc.league.setSchedule.useMutation({
        onSuccess: () => { invalidate(); toast.success("Saved — both teams can see it"); },
    });
    // How many of the four players listed each club as one they like.
    const fans = (v: string) => (match.contacts ?? []).filter(c => c.venues.includes(v)).length;

    let outsideWeek = false;
    if (when && match.week) {
        const { from, to } = weekRange(match.league.startDate, match.week);
        const day = new Date(when);
        const dayUtc = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
        outsideWeek = dayUtc < from.getTime() || dayUtc > to.getTime();
    }
    const changed = when !== toLocalInput(match.scheduledAt) || venue !== (match.venue ?? "");

    return (
        <section className="bg-white rounded-2xl border border-[#E5E5EA] p-5 shadow-sm space-y-3">
            <div>
                <h2 className="font-black text-[#1A1A2E]">When & where</h2>
                <p className="text-xs text-[#8E8E93]">Once you've agreed with your opponents, note it here so everyone sees it.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
                <input
                    type="datetime-local"
                    value={when}
                    onChange={e => setWhen(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                />
                <select
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    aria-label="Club"
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4200] ${venue ? "text-[#1A1A2E]" : "text-[#8E8E93]"}`}
                >
                    <option value="">Choose the club…</option>
                    {VENUES.map(v => (
                        <option key={v} value={v}>{v}{fans(v) > 0 ? ` (★ ${fans(v)} player${fans(v) > 1 ? "s" : ""})` : ""}</option>
                    ))}
                </select>
            </div>
            {outsideWeek && <p className="text-xs text-amber-700">That's outside week {match.week} ({formatWeekRange(match.league.startDate, match.week!)}).</p>}
            {save.error && <p className="text-sm text-red-500">{save.error.message}</p>}
            <button
                onClick={() => save.mutate({ matchId: match.id, scheduledAt: when ? new Date(when).toISOString() : null, venue: (venue || null) as Venue | null })}
                disabled={!changed || save.isPending}
                className="w-full py-2.5 rounded-xl text-sm bg-[#333366] text-white font-semibold hover:bg-[#3D3D75] disabled:opacity-40"
            >
                {save.isPending ? "Saving…" : "Save"}
            </button>
        </section>
    );
}

// wa.me needs the number in international format; local numbers are Romanian (07… → 407…).
function whatsappLink(phone: string): string {
    let digits = phone.replace(/\D/g, "");
    if (phone.trim().startsWith("+")) { /* already international */ }
    else if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = `40${digits.slice(1)}`;
    return `https://wa.me/${digits}`;
}

function ContactsSection({ match }: { match: LeagueMatchDetails }) {
    const contacts = match.contacts!;
    const { playerId } = useAuth();
    const me = contacts.find(c => c.playerId === playerId);
    const filledIn = contacts.filter(c => c.availability.length > 0);
    const shared = match.sharedAvailability ?? [];
    const teamOf = (id: string) => ([match.team1.player1Id, match.team1.player2Id].includes(id) ? 1 : 2);

    return (
        <section className="bg-white rounded-2xl border border-[#E5E5EA] p-5 shadow-sm space-y-4">
            <div>
                <h2 className="font-black text-[#1A1A2E]">Players</h2>
                <p className="text-xs text-[#8E8E93]">🔒 Phone numbers are only shown to the four players of this match.</p>
            </div>

            {filledIn.length >= 2 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm">
                    {shared.length > 0 ? (
                        <>
                            <p className="font-bold text-emerald-800">Everyone is free:</p>
                            <ul className="text-emerald-800 tabular-nums">
                                {rangesByDay(shared).map(([day, rs]) => (
                                    <li key={day}><span className="inline-block w-10 font-semibold">{DAY_LABELS[day]}</span>{rs.map(formatRange).join(", ")}</li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <p className="text-emerald-800">There's no 1h30 slot when everyone is free — give each other a call.</p>
                    )}
                    {filledIn.length < contacts.length && <p className="text-xs text-emerald-700 mt-0.5">({contacts.length - filledIn.length} player{contacts.length - filledIn.length > 1 ? "s haven't" : " hasn't"} filled in their availability)</p>}
                </div>
            )}

            <div className="divide-y divide-[#F5F5F7]">
                {contacts.map(c => (
                    <div key={c.playerId} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                            <p className="font-semibold text-[#1A1A2E] min-w-0">
                                {c.name}
                                <span className="ml-2 text-[10px] font-bold uppercase text-[#8E8E93]">{teamOf(c.playerId) === match.mySide ? "Your team" : "Opponent"}</span>
                            </p>
                            {c.phone && c.playerId !== playerId && (
                                <div className="flex gap-1.5 shrink-0">
                                    <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] text-[#1A1A2E] hover:bg-[#E5E5EA]">📞 {c.phone}</a>
                                    <a href={whatsappLink(c.phone)} target="_blank" rel="noreferrer" className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">WhatsApp</a>
                                </div>
                            )}
                        </div>
                        {!c.phone && c.playerId !== playerId && (
                            <p className="text-xs text-[#8E8E93]">{c.hasAccount ? "No phone number added yet." : "No account yet — no phone number."}</p>
                        )}
                        <Availability c={c} />
                    </div>
                ))}
            </div>

            {me && (!me.phone || me.availability.length === 0) && (
                <Link to="/league/availability" className="block text-center text-sm font-semibold px-4 py-3 rounded-xl border border-[#FF4200] text-[#FF4200] hover:bg-[#FF4200]/5">
                    {!me.phone ? "Add your phone number and availability" : "Add when and where you can play"}
                </Link>
            )}
        </section>
    );
}

function Availability({ c }: { c: NonNullable<LeagueMatchDetails["contacts"]>[number] }) {
    if (c.availability.length === 0 && c.venues.length === 0 && !c.note) {
        return <p className="text-xs text-[#C7C7CC]">No availability added.</p>;
    }
    const chip = "text-xs font-semibold px-2 py-0.5 rounded-md";
    return (
        <div className="space-y-1">
            <div className="flex flex-wrap gap-1">
                {rangesByDay(c.availability).map(([day, rs]) => (
                    <span key={day} className={`${chip} bg-[#333366]/10 text-[#333366] tabular-nums`}>{DAY_LABELS[day]} {rs.map(formatRange).join(", ")}</span>
                ))}
            </div>
            {c.venues.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {c.venues.map(v => <span key={v} className={`${chip} bg-[#F5F5F7] text-[#3A3A4E]`}>📍 {v}</span>)}
                </div>
            )}
            {c.note && <p className="text-xs text-[#8E8E93] italic">“{c.note}”</p>}
        </div>
    );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../../trpc";
import type { RouterOutputs } from "../../backendRouter";
import { divisionLabel } from "../../lib/divisions";
import { tournamentTypeLabel } from "../../lib/tournaments";
import { LineChart } from "./LineChart";

// The match statistics on a player's profile (backend lib/playerStats), like padeltour.ro's:
// wins and losses, sets, form, records per level and format, partners, opponents, titles,
// and the level coefficient and ranking points over time.

type Stats = RouterOutputs["player"]["stats"];
type Award = RouterOutputs["player"]["getById"]["rankingAwards"][number];

const WINDOW_DAYS = 365;
const pct = (w: number, l: number) => (w + l > 0 ? Math.round((w / (w + l)) * 100) : 0);
const shortDate = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted mb-3">{children}</h2>;
}

export function PlayerStats({ playerId, awards }: { playerId: string; awards: Award[] | null }) {
    const { data: s, isPending } = trpc.player.stats.useQuery({ id: playerId });
    if (isPending) return <p className="text-muted text-sm">Loading statistics…</p>;
    if (!s) return null;
    return (
        <>
            {s.matches > 0 && <Overview s={s} />}
            {(s.levelHistory.length > 0 || (awards?.length ?? 0) > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {s.levelHistory.length > 0 && <LevelChart s={s} />}
                    {awards && awards.length > 0 && <PointsChart awards={awards} />}
                </div>
            )}
            {s.matches > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <PeopleList title="Frequent partners" people={s.partners} what="together" />
                    <PeopleList title="Frequent opponents" people={s.opponents} what="head to head" />
                </div>
            )}
            {s.titles.list.length > 0 && <Titles s={s} />}
            {s.levelHistory.length > 0 && <LevelByTournament s={s} />}
        </>
    );
}

function Tile({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "bad" }) {
    return (
        <div className="bg-canvas rounded-xl px-3 py-2.5">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-ink"}`}>{value}</p>
        </div>
    );
}

function Overview({ s }: { s: Stats }) {
    return (
        <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5 space-y-4">
            <SectionTitle>Matches</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 -mt-1">
                <Tile label="Matches" value={s.matches} />
                <Tile label="Wins" value={s.wins} tone="good" />
                <Tile label="Losses" value={s.losses} tone="bad" />
                <Tile label="Win rate" value={`${pct(s.wins, s.losses)}%`} />
                {s.sets ? <Tile label="Sets won" value={`${pct(s.sets.won, s.sets.lost)}%`} /> : <Tile label="Draws" value={s.draws} />}
            </div>
            {s.sets && <p className="text-xs text-muted -mt-2">Sets: {s.sets.won}–{s.sets.lost} in Challengers and Masters.{s.draws > 0 && ` ${s.draws} drawn Americano matches.`}</p>}

            <div>
                <p className="text-xs text-muted mb-1.5">Form · last {s.form.length} matches, newest first</p>
                <div className="flex gap-1.5" aria-label={`Last matches: ${s.form.join(" ")}`}>
                    {s.form.map((o, i) => (
                        <span
                            key={i}
                            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                                o === "W" ? "bg-emerald-50 text-emerald-600" : o === "L" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            {o}
                        </span>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <RecordList title="By level" rows={s.byLevel.map(r => ({ key: String(r.division), label: divisionLabel(r.division), ...r }))} />
                <RecordList title="By format" rows={s.byFormat.map(r => ({ key: r.type, label: tournamentTypeLabel(r.type), ...r }))} />
            </div>
        </section>
    );
}

function RecordList({ title, rows }: { title: string; rows: { key: string; label: string; wins: number; losses: number }[] }) {
    return (
        <div>
            <p className="text-xs text-muted mb-1.5">{title}</p>
            <div className="space-y-1.5">
                {rows.map(r => (
                    <div key={r.key} className="flex items-center gap-3 text-sm">
                        <span className="w-32 shrink-0 text-ink-2 truncate">{r.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden>
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${pct(r.wins, r.losses)}%` }} />
                        </div>
                        <span className="w-24 shrink-0 text-right tabular-nums text-ink">{r.wins}–{r.losses} · {pct(r.wins, r.losses)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PeopleList({ title, people, what }: { title: string; people: Stats["partners"] | Stats["opponents"]; what: string }) {
    const [all, setAll] = useState(false);
    const shown = all ? people : people.slice(0, 5);
    return (
        <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
            <SectionTitle>{title}</SectionTitle>
            <p className="text-xs text-muted -mt-2 mb-2">Matches and record {what}</p>
            <div className="divide-y divide-canvas">
                {shown.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                        <Link to={`/player/${p.id}`} className="flex-1 min-w-0 truncate font-semibold text-ink hover:text-[#FF4200]">{p.name}</Link>
                        <span className="text-xs text-muted shrink-0">{p.matches} {p.matches === 1 ? "match" : "matches"}</span>
                        <span className="w-20 text-right shrink-0 tabular-nums text-ink">{p.wins}–{p.losses} · {pct(p.wins, p.losses)}%</span>
                    </div>
                ))}
            </div>
            {people.length > 5 && (
                <button onClick={() => setAll(!all)} className="mt-2 text-sm font-semibold text-[#9FD2DD] hover:text-[#FF4200]">
                    {all ? "Show fewer" : `Show all (${people.length})`}
                </button>
            )}
        </section>
    );
}

function Titles({ s }: { s: Stats }) {
    const medal = (place: number) => (place === 1 ? "Gold" : place === 2 ? "Silver" : "Bronze");
    return (
        <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
            <SectionTitle>Titles</SectionTitle>
            <div className="grid grid-cols-3 gap-2.5 mb-3">
                <Tile label="Gold · 1st" value={s.titles.gold} />
                <Tile label="Silver · 2nd" value={s.titles.silver} />
                <Tile label="Bronze · 3rd" value={s.titles.bronze} />
            </div>
            <div className="divide-y divide-canvas">
                {s.titles.list.map(t => (
                    <Link key={t.id} to={`/tournament/${t.id}`} className="flex items-center gap-3 py-2 text-sm hover:text-[#FF4200]">
                        <span className={`w-14 shrink-0 text-xs font-semibold ${t.place === 1 ? "text-amber-600" : t.place === 2 ? "text-gray-600" : "text-orange-600"}`}>{medal(t.place)}</span>
                        <span className="flex-1 min-w-0 truncate text-ink">{t.name}</span>
                        <span className="text-xs text-muted shrink-0">{shortDate(t.date)}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function LevelChart({ s }: { s: Stats }) {
    const h = s.levelHistory;
    const first = h[0];
    const last = h[h.length - 1];
    const change = Math.round((last.after - first.before) * 100) / 100;
    const points = [
        { x: new Date(first.date).getTime() - 1, y: first.before, label: `Start · ${divisionLabel(first.division)}` },
        ...h.map(e => ({ x: new Date(e.date).getTime(), y: e.after, label: `${e.name} · ${shortDate(e.date)}` })),
    ];
    return (
        <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>Level coefficient</SectionTitle>
                <span className="text-sm tabular-nums text-ink-2">
                    {first.before.toFixed(2)} → <b className="text-ink">{last.after.toFixed(2)}</b>{" "}
                    <span className={change >= 0 ? "text-emerald-600" : "text-red-600"}>{change >= 0 ? "+" : ""}{change.toFixed(2)}</span>
                </span>
            </div>
            <p className="text-xs text-muted -mt-2 mb-2">After each tournament</p>
            <LineChart points={points} color="#9FD2DD" format={v => v.toFixed(2)} title="Level coefficient after each tournament" />
        </section>
    );
}

// Ranking points that counted on each day a result came in: the last 12 months' results.
function PointsChart({ awards }: { awards: Award[] }) {
    const sorted = [...awards].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const dayMs = 86_400_000;
    const points = sorted.map(a => {
        const at = new Date(a.date).getTime();
        const total = sorted
            .filter(b => { const t = new Date(b.date).getTime(); return t <= at && t > at - WINDOW_DAYS * dayMs; })
            .reduce((sum, b) => sum + b.countedPoints, 0);
        return { x: at, y: Math.round(total), label: `${a.name} · ${shortDate(a.date)}` };
    });
    return (
        <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>Ranking points</SectionTitle>
                <span className="text-sm tabular-nums font-bold text-ink">{points[points.length - 1].y} pts</span>
            </div>
            <p className="text-xs text-muted -mt-2 mb-2">Points counting after each result (last 12 months)</p>
            <LineChart points={points} color="#FF6A33" format={v => String(Math.round(v))} title="Ranking points over time" />
        </section>
    );
}

function LevelByTournament({ s }: { s: Stats }) {
    const [all, setAll] = useState(false);
    const rows = [...s.levelHistory].reverse();
    const shown = all ? rows : rows.slice(0, 6);
    return (
        <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
            <SectionTitle>Level by tournament</SectionTitle>
            <div className="divide-y divide-canvas">
                {shown.map(e => {
                    const d = Math.round((e.after - e.before) * 100) / 100;
                    return (
                        <Link key={e.tournamentId} to={`/tournament/${e.tournamentId}`} className="flex items-center gap-3 py-2 text-sm hover:bg-canvas -mx-2 px-2 rounded">
                            <div className="flex-1 min-w-0">
                                <p className="truncate font-semibold text-ink">{e.name}</p>
                                <p className="text-xs text-muted">{shortDate(e.date)} · {divisionLabel(e.division)} · {e.matches} matches</p>
                            </div>
                            <span className="text-xs tabular-nums text-muted shrink-0">{e.before.toFixed(2)} → {e.after.toFixed(2)}</span>
                            <span className={`w-12 text-right font-bold tabular-nums shrink-0 ${d >= 0 ? "text-emerald-600" : "text-red-600"}`}>{d >= 0 ? "+" : ""}{d.toFixed(2)}</span>
                        </Link>
                    );
                })}
            </div>
            {rows.length > 6 && (
                <button onClick={() => setAll(!all)} className="mt-2 text-sm font-semibold text-[#9FD2DD] hover:text-[#FF4200]">
                    {all ? "Show fewer" : `Show all (${rows.length})`}
                </button>
            )}
            <p className="text-xs text-muted mt-2">A new player starts in the middle of the level of their first tournament.</p>
        </section>
    );
}

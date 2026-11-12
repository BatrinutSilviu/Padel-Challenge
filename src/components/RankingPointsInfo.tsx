import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import { divisionLabel } from "../lib/divisions";
import { TOURNAMENT_TYPE_LABELS, type TournamentType } from "../lib/tournaments";
import { tierLabel } from "../lib/league";

// Ranking points (backend lib/rankingPoints): every place in a tournament earns points from
// a pool of 10 per player, times coefficients for the type and division; the ranking is the
// sum over the last 12 months.

const TYPE_ORDER = ["AMERICANO", "TEAM_AMERICANO", "KING_OF_THE_COURT", "AMERICANO_CHAMPIONS", "CHALLENGER", "MASTERS"];

export function RankingPointsInfo() {
    const [open, setOpen] = useState(false);
    const { data } = trpc.ranking.coefficients.useQuery(undefined, { enabled: open });

    return (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl shadow-sm">
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                <span>
                    <span className="block text-sm font-bold text-[#1A1A2E]">🏆 How ranking points work</span>
                    <span className="block text-xs text-[#8E8E93]">Players are ranked by points from their tournaments in the last 12 months.</span>
                </span>
                <span className="text-[#8E8E93] text-sm">{open ? "▲" : "▼"}</span>
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-3 text-sm text-[#3A3A4E]">
                    <p>
                        Every tournament shares <b>10 points per player</b> between its places — a tournament of 16 players
                        gives out 160. The winner gets the most and each place gets {data ? Math.round(data.rules.decay * 100) : 85}% of
                        the place above it. Teammates and players who share a place split those places' points.
                    </p>
                    <p>
                        The points are then multiplied by a coefficient for the <b>type of tournament</b> — the longer and
                        harder, the higher — and one for the <b>division</b>. The Act!ve Padel League counts each group as a
                        tournament, with the league's coefficient and the tier's.
                    </p>
                    {data && (
                        <div className="grid sm:grid-cols-3 gap-3 text-xs">
                            <CoefTable title="Tournament type" rows={[
                                ...TYPE_ORDER.map(t => [TOURNAMENT_TYPE_LABELS[t as TournamentType] ?? t, data.current.type[t]] as [string, number]),
                                ["Act!ve Padel League", data.current.league],
                            ]} />
                            <CoefTable title="Level" rows={Object.entries(data.current.division).map(([d, v]) => [divisionLabel(Number(d)), v])} />
                            <CoefTable title="League tier" rows={Object.entries(data.current.leagueTier).map(([l, v]) => [tierLabel(Number(l)), v])} />
                        </div>
                    )}
                    <p className="text-xs text-[#8E8E93]">
                        Example: winning a 16-player Americano in a division with coefficient 1.4 gives 26 × 1.0 × 1.4 = 36 points.
                        The top and bottom 15% of each division by points are promoted and relegated.
                    </p>
                </div>
            )}
        </div>
    );
}

function CoefTable({ title, rows }: { title: string; rows: [string, number][] }) {
    return (
        <div className="bg-[#F5F5F7] rounded-xl p-3">
            <p className="font-bold uppercase tracking-wide text-[10px] text-[#8E8E93] mb-1">{title}</p>
            {rows.map(([label, v]) => (
                <p key={label} className="flex justify-between gap-2"><span>{label}</span><span className="font-bold tabular-nums">×{v}</span></p>
            ))}
        </div>
    );
}

type Award = {
    kind: "TOURNAMENT" | "LEAGUE";
    id: string;
    name: string;
    date: string | Date;
    type: string;
    division: number | null;
    tierLevel: number | null;
    groupName: string | null;
    place: number;
    fieldSize: number;
    basePoints: number;
    coefficient: number;
    points: number;
};

// Where a player's ranking points come from, newest first.
export function RankingBreakdown({ awards, total }: { awards: Award[]; total: number }) {
    return (
        <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Ranking points · last 12 months</h2>
            {awards.length === 0 ? (
                <p className="text-[#8E8E93] text-sm">No ranking points in the last 12 months.</p>
            ) : (
                <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
                    {awards.map((a, i) => (
                        <Link
                            key={`${a.id}-${i}`}
                            to={a.kind === "LEAGUE" ? `/league/${a.id}` : `/tournament/${a.id}`}
                            className="flex items-center gap-3 px-4 py-3 border-b border-[#F5F5F7] last:border-0 hover:bg-[#F5F5F7]"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#1A1A2E] truncate">{a.name}</p>
                                <p className="text-xs text-[#8E8E93]">
                                    {new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    {" · "}#{a.place} of {a.kind === "LEAGUE" ? `group ${a.groupName} (${a.fieldSize / 2} teams)` : `${a.fieldSize} players`}
                                    {" · "}{a.kind === "LEAGUE" ? `${tierLabel(a.tierLevel!)}` : divisionLabel(a.division!)}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-black text-[#FF4200] tabular-nums">+{Math.round(a.points)}</p>
                                <p className="text-[10px] text-[#8E8E93] tabular-nums">{a.basePoints} × {Math.round(a.coefficient * 100) / 100}</p>
                            </div>
                        </Link>
                    ))}
                    <div className="flex justify-between px-4 py-3 bg-[#F5F5F7] text-sm font-bold">
                        <span>Total</span>
                        <span className="text-[#FF4200] tabular-nums">{Math.round(total)} pts</span>
                    </div>
                </div>
            )}
        </section>
    );
}

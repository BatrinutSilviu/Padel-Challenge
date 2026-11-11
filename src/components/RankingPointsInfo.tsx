import { useState } from "react";
import { Link } from "react-router-dom";
import { divisionLabel } from "../lib/divisions";
import { tierLabel } from "../lib/league";
import { POINTS_FORMAT_LABELS, useLevelRules } from "../lib/levels";

// Ranking points (backend lib/rankingPoints): every format has a fixed table of points per
// place, times the level's multiplier. Points from lower levels count less once a player
// has moved up. The ranking is the sum over the last 12 months.

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

export function RankingPointsInfo() {
    const [open, setOpen] = useState(false);
    const { data } = useLevelRules(open);

    // Highest level first, as players think of them.
    const levels = data ? [...data.levels.levels].reverse() : [];
    const weight = data?.levels.lowerLevelWeight ?? 0.5;

    return (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl shadow-sm">
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                <span>
                    <span className="block text-sm font-bold text-[#1A1A2E]">🏆 How ranking points and levels work</span>
                    <span className="block text-xs text-[#8E8E93]">Points per finishing place, times the level. Last 12 months.</span>
                </span>
                <span className="text-[#8E8E93] text-sm">{open ? "▲" : "▼"}</span>
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-3 text-sm text-[#3A3A4E]">
                    <p>
                        Every format has a fixed <b>table of points per place</b>. The points are multiplied by the
                        <b> level's multiplier</b>, so the harder the level, the more a place is worth. In team formats
                        both players get their team's points. Players or teams sharing a place share those places' points.
                        In a bigger field than the table, the points are spread out between the first and the last place.
                    </p>
                    <p>
                        Your total counts the points from your current level and above in full. Points from lower levels
                        count {Math.round(weight * 100)}% per level below, so moving up doesn't carry a lead you built against weaker players.
                    </p>
                    {data && (
                        <>
                            <div className="bg-[#F5F5F7] rounded-xl p-3 overflow-x-auto">
                                <p className="font-bold uppercase tracking-wide text-[10px] text-[#8E8E93] mb-1">Levels</p>
                                <table className="w-full text-xs tabular-nums min-w-[320px]">
                                    <thead className="text-[#8E8E93]">
                                        <tr><th className="text-left font-semibold">Level</th><th className="text-right font-semibold">Coefficient</th><th className="text-right font-semibold">Can sign up</th><th className="text-right font-semibold">Points ×</th></tr>
                                    </thead>
                                    <tbody>
                                        {levels.map(l => (
                                            <tr key={l.division}>
                                                <td>{divisionLabel(l.division)}</td>
                                                <td className="text-right">{l.min}–{l.max}</td>
                                                <td className="text-right">{l.allowedMin}–{l.allowedMax}</td>
                                                <td className="text-right font-bold">×{l.multiplier}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-[#F5F5F7] rounded-xl p-3 overflow-x-auto">
                                <p className="font-bold uppercase tracking-wide text-[10px] text-[#8E8E93] mb-1">Points per place (before the level multiplier)</p>
                                <table className="w-full text-xs tabular-nums">
                                    <tbody>
                                        {Object.entries(data.tables).map(([format, table]) => (
                                            <tr key={format} className="align-top">
                                                <td className="pr-3 py-0.5 whitespace-nowrap">{POINTS_FORMAT_LABELS[format] ?? format}</td>
                                                <td className="py-0.5 text-[#8E8E93]">
                                                    {table.map((v, i) => <span key={i} className="inline-block mr-2"><span className="text-[10px]">{ordinal(i + 1)}</span> <b className="text-[#1A1A2E]">{v}</b></span>)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-[#8E8E93]">
                                League points are the league table × {data.coefficients.league} × the tier's coefficient
                                ({Object.entries(data.coefficients.leagueTier).map(([t, v]) => `${tierLabel(Number(t))} ×${v}`).join(", ")}).
                                Friendly matches don't earn points.
                            </p>
                            <p className="text-xs text-[#8E8E93]">
                                The <b>level coefficient</b> (0–10) measures skill from match results: beating stronger opponents
                                raises it more, losing to weaker ones lowers it more. In Americano formats it counts the share of
                                games won. You can sign up for a level when your coefficient is in its range.
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

type Award = {
    kind: "TOURNAMENT" | "LEAGUE";
    id: string;
    name: string;
    date: string | Date;
    type: string;
    format: string;
    division: number | null;
    tierLevel: number | null;
    groupName: string | null;
    place: number;
    fieldSize: number;
    basePoints: number;
    coefficient: number;
    points: number;
    weight: number;
    countedPoints: number;
};

type LevelTotal = { division: number | null; points: number; weight: number; counted: number };

// Where a player's ranking points come from: per level, then each result, newest first.
export function RankingBreakdown({ awards, byLevel, total, currentDivision }: {
    awards: Award[];
    byLevel: LevelTotal[];
    total: number;
    currentDivision: number;
}) {
    return (
        <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Ranking points · last 12 months</h2>
            {awards.length === 0 ? (
                <p className="text-[#8E8E93] text-sm">No ranking points in the last 12 months.</p>
            ) : (
                <div className="space-y-3">
                    <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
                        {byLevel.map(l => (
                            <div key={l.division ?? "league"} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#F5F5F7] text-sm">
                                <span className="text-[#1A1A2E] font-semibold">
                                    {l.division === null ? "Act!ve Padel League" : divisionLabel(l.division)}
                                    {l.division === currentDivision && <span className="ml-2 text-[10px] font-bold uppercase text-[#FF4200]">current</span>}
                                </span>
                                <span className="tabular-nums text-right">
                                    {l.weight < 1 && <span className="text-xs text-[#8E8E93] mr-2">{Math.round(l.points)} × {l.weight}</span>}
                                    <b>{Math.round(l.counted)}</b>
                                </span>
                            </div>
                        ))}
                        <div className="flex justify-between px-4 py-3 bg-[#F5F5F7] text-sm font-bold">
                            <span>Total</span>
                            <span className="text-[#FF4200] tabular-nums">{Math.round(total)} pts</span>
                        </div>
                    </div>
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
                                        {" · "}{a.kind === "LEAGUE" ? tierLabel(a.tierLevel!) : `${divisionLabel(a.division!)} · ${POINTS_FORMAT_LABELS[a.format] ?? a.format}`}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-black text-[#FF4200] tabular-nums">+{Math.round(a.countedPoints)}</p>
                                    <p className="text-[10px] text-[#8E8E93] tabular-nums">
                                        {a.basePoints} × {Math.round(a.coefficient * 100) / 100}{a.weight < 1 && ` × ${a.weight}`}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

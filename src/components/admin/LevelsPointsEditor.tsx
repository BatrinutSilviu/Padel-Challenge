import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "../../trpc";
import { divisionLabel } from "../../lib/divisions";
import { tierLabel } from "../../lib/league";
import { POINTS_FORMAT_LABELS, useLevelRules } from "../../lib/levels";

type Rules = NonNullable<ReturnType<typeof useLevelRules>["data"]>;
type LevelSettings = Rules["levels"];

const LEVEL_FIELDS = [
    { key: "min", label: "Band from" },
    { key: "max", label: "to" },
    { key: "allowedMin", label: "Sign-up from" },
    { key: "allowedMax", label: "to" },
    { key: "multiplier", label: "Points ×" },
] as const;

const RULE_FIELDS = [
    { key: "eloPerLevel", label: "Rating per level", hint: "Elo points one level spans underneath the coefficient" },
    { key: "provisionalMatches", label: "Provisional matches", hint: "New players move faster until they've played this many" },
    { key: "provisionalKMultiplier", label: "Provisional speed ×", hint: "How much faster" },
    { key: "lowerLevelWeight", label: "Lower-level weight", hint: "Points from one level below count this much (two levels: squared)" },
] as const;

const inputClass = "w-full border border-gray-300 rounded-lg px-2 py-1.5 text-base sm:text-sm text-right tabular-nums";

// Admin: everything the level coefficient and ranking points run on (backend lib/levels,
// lib/rankingPoints). Saving the levels replays every player's coefficient; points are
// worked out from the results every time, so they change straight away.
export function LevelsPointsEditor() {
    const qc = useQueryClient();
    const { data } = useLevelRules();
    const [msg, setMsg] = useState("");
    const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 5000); };
    const onSuccess = (m: string) => () => { qc.invalidateQueries(); flash(m); };
    const onError = (e: { message: string }) => flash(`Error: ${e.message}`);

    const saveLevels = trpc.ranking.setLevelSettings.useMutation({ onSuccess: onSuccess("Saved — every player's coefficient is recalculated."), onError });
    const saveTables = trpc.ranking.setPointsTables.useMutation({ onSuccess: onSuccess("Saved — everyone's ranking points are updated."), onError });
    const saveCoefs = trpc.ranking.setCoefficients.useMutation({ onSuccess: onSuccess("Saved — league points are updated."), onError });

    // Text while editing, so half-typed numbers don't jump around.
    const [levels, setLevels] = useState<Record<string, string>>({});
    const [tables, setTables] = useState<Record<string, string>>({});
    const [coefs, setCoefs] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!data) return;
        const l: Record<string, string> = {};
        for (const lv of data.levels.levels) for (const f of LEVEL_FIELDS) l[`${lv.division}.${f.key}`] = String(lv[f.key]);
        for (const f of RULE_FIELDS) l[f.key] = String(data.levels[f.key]);
        setLevels(l);
        setTables(Object.fromEntries(Object.entries(data.tables).map(([k, v]) => [k, v.join(", ")])));
        setCoefs({ league: String(data.coefficients.league), ...Object.fromEntries(Object.entries(data.coefficients.leagueTier).map(([t, v]) => [`leagueTier:${t}`, String(v)])) });
    }, [data]);

    if (!data) return <div className="bg-white rounded-xl border border-gray-200 p-5 text-sm text-gray-400">Loading levels and points…</div>;

    function levelSettingsFromForm(): LevelSettings | string {
        const num = (k: string) => Number(levels[k]);
        const bad = Object.entries(levels).find(([, v]) => v.trim() === "" || isNaN(Number(v)));
        if (bad) return "Every level field needs a number.";
        return {
            levels: data!.levels.levels.map(lv => ({
                division: lv.division,
                min: num(`${lv.division}.min`), max: num(`${lv.division}.max`),
                allowedMin: num(`${lv.division}.allowedMin`), allowedMax: num(`${lv.division}.allowedMax`),
                multiplier: num(`${lv.division}.multiplier`),
            })),
            eloPerLevel: num("eloPerLevel"),
            provisionalMatches: Math.round(num("provisionalMatches")),
            provisionalKMultiplier: num("provisionalKMultiplier"),
            lowerLevelWeight: num("lowerLevelWeight"),
        };
    }

    function tablesFromForm(): Rules["tables"] | string {
        const out: Record<string, number[]> = {};
        for (const [format, text] of Object.entries(tables)) {
            const values = text.split(/[,\s]+/).filter(Boolean).map(Number);
            if (values.length === 0 || values.some(v => isNaN(v) || v < 0)) return `${POINTS_FORMAT_LABELS[format] ?? format}: enter points separated by commas.`;
            out[format] = values;
        }
        return out as Rules["tables"];
    }

    const levelRows = [...data.levels.levels].reverse();

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6">
            <div>
                <h2 className="text-base font-semibold text-gray-800">Levels, coefficients and points</h2>
                <p className="text-sm text-gray-500">
                    Each division is a level covering a band of the 0–10 coefficient. Players can sign themselves up when their
                    coefficient is inside the level's sign-up range; admins can still add anyone. Ranking points are the format's
                    points for the place × the level's multiplier.
                </p>
            </div>

            <section className="space-y-3">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                        <thead>
                            <tr className="text-xs text-gray-500">
                                <th className="text-left font-semibold pb-1">Level</th>
                                {LEVEL_FIELDS.map(f => <th key={f.key} className="text-right font-semibold pb-1 px-1">{f.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {levelRows.map(lv => (
                                <tr key={lv.division}>
                                    <td className="pr-2 py-1 text-gray-700 whitespace-nowrap">{divisionLabel(lv.division)}</td>
                                    {LEVEL_FIELDS.map(f => (
                                        <td key={f.key} className="px-1 py-1 w-24">
                                            <input
                                                type="number" step="0.1"
                                                value={levels[`${lv.division}.${f.key}`] ?? ""}
                                                onChange={e => setLevels({ ...levels, [`${lv.division}.${f.key}`]: e.target.value })}
                                                className={inputClass}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="grid sm:grid-cols-4 gap-3">
                    {RULE_FIELDS.map(f => (
                        <label key={f.key} className="text-xs text-gray-600 space-y-1" title={f.hint}>
                            <span className="block font-semibold">{f.label}</span>
                            <input type="number" step="0.05" value={levels[f.key] ?? ""} onChange={e => setLevels({ ...levels, [f.key]: e.target.value })} className={inputClass} />
                            <span className="block text-gray-400">{f.hint}</span>
                        </label>
                    ))}
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => {
                            const s = levelSettingsFromForm();
                            if (typeof s === "string") return flash(`Error: ${s}`);
                            saveLevels.mutate(s);
                        }}
                        disabled={saveLevels.isPending}
                        className="px-4 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-semibold disabled:opacity-40"
                    >
                        {saveLevels.isPending ? "Recalculating…" : "Save levels"}
                    </button>
                    <button
                        onClick={() => { if (confirm("Put the levels back to their defaults?")) saveLevels.mutate(null); }}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600"
                    >
                        Reset levels
                    </button>
                </div>
            </section>

            <section className="space-y-3 pt-4 border-t border-gray-100">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Points per place</h3>
                    <p className="text-xs text-gray-500">1st, 2nd, 3rd, … separated by commas. Team formats count teams. Larger fields stretch the table between its first and last value.</p>
                </div>
                <div className="space-y-2">
                    {Object.keys(data.tables).map(format => (
                        <label key={format} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                            <span className="sm:w-64 shrink-0 text-gray-700">
                                {POINTS_FORMAT_LABELS[format] ?? format}
                                {data.teamFormats.includes(format) && <span className="text-xs text-gray-400"> · per team</span>}
                            </span>
                            <input
                                value={tables[format] ?? ""}
                                onChange={e => setTables({ ...tables, [format]: e.target.value })}
                                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-base sm:text-sm tabular-nums"
                            />
                        </label>
                    ))}
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => {
                            const t = tablesFromForm();
                            if (typeof t === "string") return flash(`Error: ${t}`);
                            saveTables.mutate(t);
                        }}
                        disabled={saveTables.isPending}
                        className="px-4 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-semibold disabled:opacity-40"
                    >
                        {saveTables.isPending ? "Saving…" : "Save points tables"}
                    </button>
                    <button
                        onClick={() => { if (confirm("Put every points table back to its default?")) saveTables.mutate(null); }}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600"
                    >
                        Reset tables
                    </button>
                </div>
            </section>

            <section className="space-y-3 pt-4 border-t border-gray-100">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">League</h3>
                    <p className="text-xs text-gray-500">League points are the league table × the league coefficient × the tier's.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.keys(coefs).map(key => (
                        <label key={key} className="text-xs text-gray-600 space-y-1">
                            <span className="block font-semibold">{key === "league" ? "League ×" : `${tierLabel(Number(key.split(":")[1]))} ×`}</span>
                            <input type="number" step="0.05" value={coefs[key]} onChange={e => setCoefs({ ...coefs, [key]: e.target.value })} className={inputClass} />
                        </label>
                    ))}
                </div>
                <button
                    onClick={() => {
                        const entries = Object.entries(coefs);
                        if (entries.some(([, v]) => v.trim() === "" || isNaN(Number(v)) || Number(v) < 0 || Number(v) > 20)) return flash("Error: league coefficients must be between 0 and 20.");
                        saveCoefs.mutate(entries.map(([key, v]) => ({ key, value: Number(v) })));
                    }}
                    disabled={saveCoefs.isPending}
                    className="px-4 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-semibold disabled:opacity-40"
                >
                    {saveCoefs.isPending ? "Saving…" : "Save league coefficients"}
                </button>
            </section>

            {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>{msg}</p>}
        </div>
    );
}

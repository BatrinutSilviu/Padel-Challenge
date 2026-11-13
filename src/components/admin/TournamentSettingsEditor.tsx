import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "../../trpc";
import { divisionLabel } from "../../lib/divisions";
import { TOURNAMENT_TYPE_LABELS, capacityOptions, challengerFormatOf, type TournamentType } from "../../lib/tournaments";
import { field } from "./formStyles";

// The admin's card for changing a tournament's setup after it's been created — the same
// choices as the create form (backend tournament.updateSettings):
//  - name, date and level, always;
//  - the format, only while it's a sign-up sheet that hasn't started (capacity, fees and
//    the Challenger / Masters layout are in the sign-up settings);
//  - points per game, until the first score is entered;
//  - King of the Court's number of rounds, until it's completed.

const TYPES: TournamentType[] = ["AMERICANO", "AMERICANO_CHAMPIONS", "TEAM_AMERICANO", "CHALLENGER", "KING_OF_THE_COURT", "MASTERS"];
const POINTS_TYPES = ["AMERICANO", "AMERICANO_CHAMPIONS", "TEAM_AMERICANO", "AMERICANO_GIRLS"];

type SettingsTournament = {
    id: string;
    name: string;
    date: string | Date;
    division: number;
    type: string;
    status: string;
    pointsPerGame: number;
    totalRounds: number | null;
    maxPlayers: number | null;
    challengerFormat: string | null;
    rounds?: { matches: { team1Score: number; team2Score: number }[] }[];
};

const chip = (active: boolean) => `px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
    active ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
}`;

export function TournamentSettingsEditor({ tournament: t }: { tournament: SettingsTournament }) {
    const qc = useQueryClient();
    const stored = {
        name: t.name,
        date: new Date(t.date).toISOString().slice(0, 10), // stored as midnight UTC
        division: t.division,
        type: t.type,
        pointsPerGame: t.pointsPerGame,
        totalRounds: t.totalRounds ?? 7,
    };
    const storedKey = JSON.stringify(stored);
    const [value, setValue] = useState(stored);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    useEffect(() => { setValue(JSON.parse(storedKey)); }, [storedKey]);

    const rounds = t.rounds ?? [];
    const started = t.status !== "UPCOMING" || rounds.length > 0;
    const scored = rounds.some(r => r.matches.some(m => m.team1Score !== 0 || m.team2Score !== 0));
    const changed = JSON.stringify(value) !== storedKey;

    const update = trpc.tournament.updateSettings.useMutation({
        onSuccess: () => {
            setError("");
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            // The level, date and format show up across the site.
            qc.invalidateQueries();
        },
        onError: e => setError(e.message),
    });

    function save() {
        if (!value.name.trim()) return setError("The name is required.");
        if (!value.date) return setError("Pick a date.");
        const typeChanged = value.type !== t.type;
        // A new format may not take the current number of spots: keep it if it can, else
        // take the format's first option (change it in the sign-up settings afterwards).
        const options = capacityOptions(value.type, challengerFormatOf(t));
        const maxPlayers = typeChanged && t.maxPlayers !== null && !options.includes(t.maxPlayers) ? options[0] : undefined;
        update.mutate({
            id: t.id,
            ...(value.name.trim() !== t.name ? { name: value.name.trim() } : {}),
            ...(value.date !== stored.date ? { date: value.date } : {}),
            ...(value.division !== t.division ? { division: value.division } : {}),
            ...(typeChanged ? { type: value.type as Exclude<TournamentType, "AMERICANO_GIRLS">, ...(maxPlayers ? { maxPlayers } : {}) } : {}),
            ...(value.pointsPerGame !== t.pointsPerGame ? { pointsPerGame: value.pointsPerGame } : {}),
            ...(value.type === "KING_OF_THE_COURT" && value.totalRounds !== stored.totalRounds ? { totalRounds: value.totalRounds } : {}),
        });
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-sm font-medium text-gray-700"
            >
                <span className="text-left">
                    Settings
                    <span className="block text-xs font-normal text-gray-400">
                        Name, date, level{started ? "" : ", format"}{scored ? "" : ", points per game"}
                    </span>
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            {open && (
                <div className="border-t border-gray-100 px-4 sm:px-5 py-4 space-y-4">
                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-1">Name</span>
                        <input value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} maxLength={200} className={field} />
                    </label>
                    <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-1">Date</span>
                        <input type="date" value={value.date} onChange={e => setValue({ ...value, date: e.target.value })} className={`${field} sm:w-48`} />
                    </label>
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Level</p>
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6].map(d => (
                                <button key={d} type="button" onClick={() => setValue({ ...value, division: d })} className={chip(value.division === d)}>
                                    {d === 6 ? "Beginner" : `${d} — ${divisionLabel(d)}`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Format</p>
                        {started ? (
                            <p className="text-sm text-gray-500">
                                {TOURNAMENT_TYPE_LABELS[t.type as TournamentType] ?? t.type} — the format can't change once the tournament has started.
                            </p>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-2">
                                    {TYPES.map(type => (
                                        <button key={type} type="button" onClick={() => setValue({ ...value, type })} className={chip(value.type === type)}>
                                            {TOURNAMENT_TYPE_LABELS[type]}
                                        </button>
                                    ))}
                                </div>
                                {value.type !== t.type && (
                                    <p className="text-xs text-amber-600 mt-1.5">
                                        Check the spots and the format's options in the sign-up settings after saving.
                                        {["AMERICANO", "AMERICANO_CHAMPIONS"].includes(value.type) && " Partners players signed up with are unlinked."}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                    {POINTS_TYPES.includes(value.type) && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Points per game</p>
                            {scored ? (
                                <p className="text-sm text-gray-500">{t.pointsPerGame} — scores have been entered, so it can't change.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {[16, 24, 32, 40].map(p => (
                                        <button key={p} type="button" onClick={() => setValue({ ...value, pointsPerGame: p })} className={chip(value.pointsPerGame === p)}>
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {value.type === "KING_OF_THE_COURT" && t.status !== "COMPLETED" && (
                        <label className="block">
                            <span className="block text-sm font-medium text-gray-700 mb-1">Number of rounds</span>
                            <input
                                type="number" min={Math.max(1, rounds.length)} max={15}
                                value={value.totalRounds}
                                onChange={e => setValue({ ...value, totalRounds: Math.max(1, Math.min(15, Number(e.target.value) || 1)) })}
                                className={`${field} w-24`}
                            />
                        </label>
                    )}
                    {t.status === "COMPLETED" && (value.date !== stored.date || value.division !== t.division) && (
                        <p className="text-xs text-gray-500">Saving recalculates everyone's Elo, since this tournament's results move.</p>
                    )}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {saved && !changed && <p className="text-sm text-green-600">Saved.</p>}
                    {changed && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={save}
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

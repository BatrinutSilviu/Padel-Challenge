import { useState } from "react";
import { trpc } from "../../../../trpc";
import { DIVISION_NAMES } from "../../../../lib/divisions";
import { TOURNAMENT_TYPE_LABELS } from "../../../../lib/tournaments";
import type { RouterOutputs } from "../../../../backendRouter";
import { ChoiceButton } from "../../formControls";

// Rankedin only has Americanos to import.
const IMPORTABLE_TYPES = ["AMERICANO", "AMERICANO_CHAMPIONS"] as const;

// What happens to a Rankedin player with no exact match here: linked to one of ours, or
// created (the admin has to pick their gender first).
type Resolution =
    | { kind: "link"; localPlayerId: string; localName: string }
    | { kind: "create"; gender?: "MALE" | "FEMALE" };

type UnmatchedPlayer = RouterOutputs["tournament"]["previewRankedinImport"]["unmatched"][number];

// Imports a finished Americano from Rankedin, matches and scores included: paste its URL,
// check what was found, and say who each unknown player is before importing.
export function ImportRankedinForm({ onImported, onBack }: { onImported: () => void; onBack?: () => void }) {
    const [url, setUrl] = useState("");
    const [division, setDivision] = useState(4);
    const [type, setType] = useState<typeof IMPORTABLE_TYPES[number]>("AMERICANO");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [name, setName] = useState("");
    const [resolutions, setResolutions] = useState<Record<number, Resolution>>({});
    const [error, setError] = useState("");
    const [imported, setImported] = useState(false);
    const utils = trpc.useUtils();

    const preview = trpc.tournament.previewRankedinImport.useMutation({
        onSuccess: (data) => {
            setName(data.name);
            if (data.date) setDate(data.date);
            setResolutions({});
            setError("");
        },
        onError: (e) => setError(e.message),
    });

    const importMutation = trpc.tournament.importFromRankedin.useMutation({
        onSuccess: () => {
            utils.tournament.list.invalidate();
            setImported(true);
        },
        onError: (e) => setError(e.message),
    });

    const previewData = preview.data;

    function setResolution(rankedinId: number, res: Resolution) {
        setResolutions(prev => ({ ...prev, [rankedinId]: res }));
    }

    function handlePreview(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        preview.mutate({ url: url.trim() });
    }

    function handleImport(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!previewData) return;
        if (!name.trim()) return setError("Tournament name is required.");

        for (const p of previewData.unmatched) {
            const res = resolutions[p.rankedinId];
            if (!res) return setError(`Resolve player: ${p.displayName}`);
            if (res.kind === "create" && !res.gender) return setError(`Select gender for: ${p.displayName}`);
        }

        importMutation.mutate({
            tournamentId: previewData.tournamentId,
            name: name.trim(),
            date,
            division,
            type,
            playerResolutions: previewData.unmatched.map(p => {
                const res = resolutions[p.rankedinId]!;
                return res.kind === "link"
                    ? { rankedinId: p.rankedinId, localPlayerId: res.localPlayerId }
                    : { rankedinId: p.rankedinId, gender: res.gender };
            }),
        });
    }

    if (imported) {
        return (
            <div className="max-w-2xl">
                <div className="bg-white rounded-xl border border-green-200 p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                    </div>
                    <div>
                        <p className="text-base font-semibold text-gray-800">Tournament imported successfully</p>
                        <p className="text-sm text-gray-400 mt-1">Its results now count towards the rankings.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onImported}
                        className="bg-[#FF4200] text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-[#CC3500] transition-colors"
                    >
                        View Tournaments
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-2xl">
            {/* URL fetch card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-800">Import from Rankedin</h2>
                        <p className="text-sm text-gray-400 mt-0.5">Paste an americano tournament URL to import all matches and scores.</p>
                    </div>
                    {onBack && (
                        <button type="button" onClick={onBack}
                            className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>
                            Back
                        </button>
                    )}
                </div>

                <form onSubmit={handlePreview}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rankedin URL</label>
                    {/* Stack on mobile, row on sm+ */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            value={url}
                            onChange={e => { setUrl(e.target.value); preview.reset(); }}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] focus:border-transparent bg-white placeholder-gray-400 min-w-0"
                            placeholder="https://www.rankedin.com/en/americano/71474/…"
                            type="url"
                        />
                        <button
                            type="submit"
                            disabled={preview.isPending || !url.trim()}
                            className="w-full sm:w-auto bg-[#FF4200] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                        >
                            {preview.isPending ? "Fetching…" : "Preview"}
                        </button>
                    </div>
                    {error && !previewData && (
                        <p className="mt-2 text-sm text-red-500">{error}</p>
                    )}
                </form>
            </div>

            {/* Import details card — appears after preview */}
            {previewData && (
                <form onSubmit={handleImport} className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">

                    {/* Stats strip */}
                    <div className="px-4 sm:px-6 py-4 flex gap-6">
                        <Stat label="Matches" value={previewData.totalMatches} />
                        <Stat label="Pts / game" value={previewData.pointsPerGame} />
                        <Stat label="Players" value={previewData.matched.length + previewData.unmatched.length} />
                    </div>

                    {/* Tournament details */}
                    <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tournament details</p>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input value={name} onChange={e => setName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] focus:border-transparent bg-white" />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] focus:border-transparent bg-white" />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Level</label>
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5, 6].map(d => (
                                    <ChoiceButton key={d} selected={division === d} onClick={() => setDivision(d)}>
                                        {DIVISION_NAMES[d]}
                                    </ChoiceButton>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Type</label>
                            <div className="flex flex-wrap gap-2">
                                {IMPORTABLE_TYPES.map(t => (
                                    <ChoiceButton key={t} selected={type === t} onClick={() => setType(t)}>
                                        {TOURNAMENT_TYPE_LABELS[t]}
                                    </ChoiceButton>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Players */}
                    <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Players</p>

                        {previewData.matched.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-600">
                                    Found in database
                                    <span className="ml-2 text-xs font-normal text-gray-400">({previewData.matched.length})</span>
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {previewData.matched.map(p => (
                                        <div key={p.rankedinId} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-green-200 bg-green-50">
                                            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                                            <div className="min-w-0">
                                                <span className="text-sm font-medium text-green-800">{p.localName}</span>
                                                {p.localName !== p.displayName && (
                                                    <span className="block text-xs text-green-500 truncate">{p.displayName}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {previewData.unmatched.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-600">
                                    No exact match found
                                    <span className="ml-2 text-xs font-normal text-amber-500">({previewData.unmatched.length}) — review each player</span>
                                </p>
                                <div className="space-y-3">
                                    {previewData.unmatched.map(p => (
                                        <UnmatchedPlayerCard
                                            key={p.rankedinId}
                                            player={p}
                                            resolution={resolutions[p.rankedinId]}
                                            onResolve={res => setResolution(p.rankedinId, res)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={importMutation.isPending}
                            className="w-full sm:w-auto bg-[#FF4200] text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                        >
                            {importMutation.isPending ? "Importing…" : "Import Tournament"}
                        </button>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                </form>
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-800">{value}</span>
            <span className="text-xs text-gray-400 mt-0.5">{label}</span>
        </div>
    );
}

// A Rankedin player with no exact match here: link them to one of the similar players we
// have, or create them as new.
function UnmatchedPlayerCard({ player: p, resolution: res, onResolve }: {
    player: UnmatchedPlayer;
    resolution: Resolution | undefined;
    onResolve: (resolution: Resolution) => void;
}) {
    const isLinked = res?.kind === "link";
    const isCreate = res?.kind === "create";
    return (
        <div className={`rounded-xl border px-3 sm:px-4 py-3.5 space-y-3 transition-colors ${isLinked ? "border-green-300 bg-green-50" : isCreate ? "border-blue-200 bg-blue-50/40" : "border-amber-200 bg-amber-50/50"}`}>
            {/* Header row — name + status badge */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-gray-800">{p.displayName}</span>
                {isLinked && <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Linked</span>}
                {isCreate && <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">New player</span>}
                {!res && <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Needs review</span>}
            </div>

            {/* Candidates */}
            {p.candidates.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Similar players in database</p>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                        {p.candidates.map(c => {
                            const chosen = isLinked && res.kind === "link" && res.localPlayerId === c.id;
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => onResolve(chosen ? { kind: "create" } : { kind: "link", localPlayerId: c.id, localName: c.name })}
                                    className={`inline-flex items-center gap-2 w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg border text-sm transition-colors ${chosen ? "bg-green-600 text-white border-green-600" : "bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:bg-green-50"}`}
                                >
                                    {chosen && <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                                    <span className="font-medium">{c.name}</span>
                                    <span className={`text-xs ml-auto sm:ml-0 ${chosen ? "text-green-200" : "text-gray-400"}`}>Div {c.division === 6 ? "Beg" : c.division} · {Math.round(c.similarity * 100)}%</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create new row */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => onResolve({ kind: "create" })}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${isCreate ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-dashed border-gray-400 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200] bg-white"}`}
                >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                    {p.candidates.length > 0 ? "Create as new" : "Create new player"}
                </button>
                {(isCreate || (!isLinked && p.candidates.length === 0)) && (
                    <div className="flex gap-1.5">
                        {(["MALE", "FEMALE"] as const).map(g => {
                            const gender = res?.kind === "create" ? res.gender : undefined;
                            return (
                                <button key={g} type="button"
                                    onClick={() => onResolve({ kind: "create", gender: g })}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${gender === g ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 bg-white text-gray-600 hover:border-[#FF4200]"}`}>
                                    {g === "MALE" ? "Male" : "Female"}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

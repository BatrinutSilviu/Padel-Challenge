import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { toast } from "sonner";
import { NavBar } from "../NavBar";
import { PlayerPicker } from "../PlayerPicker";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/AuthContext";

export function RecordMatchPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { playerId } = useAuth();

    const { data: me } = trpc.player.getById.useQuery({ id: playerId! }, { enabled: !!playerId });
    const { data: allPlayers } = trpc.player.list.useQuery();

    const [partnerId, setPartnerId] = useState("");
    const [opponent1Id, setOpponent1Id] = useState("");
    const [opponent2Id, setOpponent2Id] = useState("");
    const [sets, setSets] = useState<{ team1: string; team2: string }[]>([{ team1: "", team2: "" }]);
    const [error, setError] = useState("");

    const MAX_SETS = 5;

    function updateSet(i: number, team: "team1" | "team2", value: string) {
        setSets(prev => prev.map((s, idx) => (idx === i ? { ...s, [team]: value } : s)));
    }

    function addSet() {
        setSets(prev => (prev.length >= MAX_SETS ? prev : [...prev, { team1: "", team2: "" }]));
    }

    function removeSet(i: number) {
        setSets(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
    }

    const create = trpc.individualMatch.create.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.player.list) });
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.player.getById) });
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.individualMatch.list) });
            toast.success("Match recorded — Elo updated!");
            navigate("/matches");
        },
        onError: (e) => {
            setError(e.message);
            toast.error(e.message);
        },
    });

    const parsedSets = sets.map(s => ({ team1: parseInt(s.team1), team2: parseInt(s.team2) }));
    const setsValid = parsedSets.every(s => !isNaN(s.team1) && !isNaN(s.team2) && s.team1 >= 0 && s.team2 >= 0 && s.team1 !== s.team2);
    const setsWon1 = setsValid ? parsedSets.filter(s => s.team1 > s.team2).length : 0;
    const setsWon2 = setsValid ? parsedSets.length - setsWon1 : 0;
    const tied = setsValid && setsWon1 === setsWon2;
    const scoresValid = setsValid && !tied;
    const someSetStarted = sets.some(s => s.team1 !== "" || s.team2 !== "");
    const playersValid = !!partnerId && !!opponent1Id && !!opponent2Id &&
        new Set([playerId, partnerId, opponent1Id, opponent2Id]).size === 4;
    const canSubmit = scoresValid && playersValid && !create.isPending;

    const excludeSelf = new Set(playerId ? [playerId] : []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!canSubmit) return;
        create.mutate({
            partnerId,
            opponent1Id,
            opponent2Id,
            sets: parsedSets.map(s => ({ team1Games: s.team1, team2Games: s.team2 })),
        });
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8">
                <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight mb-5">Record a match</h1>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Your team</p>
                        <div className="flex gap-2">
                            <div className="flex-1 min-w-0 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 truncate">
                                {me?.name ?? "You"}
                            </div>
                            <PlayerPicker
                                value={partnerId}
                                onChange={setPartnerId}
                                players={allPlayers ?? []}
                                excludeIds={new Set([...excludeSelf, opponent1Id, opponent2Id].filter(Boolean))}
                                placeholder="Partner"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Opponents</p>
                        <div className="flex gap-2">
                            <PlayerPicker
                                value={opponent1Id}
                                onChange={setOpponent1Id}
                                players={allPlayers ?? []}
                                excludeIds={new Set([...excludeSelf, partnerId, opponent2Id].filter(Boolean))}
                                placeholder="Opponent 1"
                            />
                            <PlayerPicker
                                value={opponent2Id}
                                onChange={setOpponent2Id}
                                players={allPlayers ?? []}
                                excludeIds={new Set([...excludeSelf, partnerId, opponent1Id].filter(Boolean))}
                                placeholder="Opponent 2"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Sets</p>
                            {scoresValid && (
                                <p className="text-xs font-bold text-[#FF4200]">{setsWon1} – {setsWon2}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            {sets.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg pl-3 pr-1.5 py-1.5">
                                    <span className="text-xs font-bold text-gray-400 w-10 shrink-0">Set {i + 1}</span>
                                    <div className="flex items-center justify-center gap-2 flex-1">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={s.team1}
                                            onChange={e => updateSet(i, "team1", e.target.value)}
                                            placeholder="0"
                                            className="w-14 text-center border border-gray-300 rounded-lg px-2 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                                        />
                                        <span className="text-gray-300 font-bold">:</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={s.team2}
                                            onChange={e => updateSet(i, "team2", e.target.value)}
                                            placeholder="0"
                                            className="w-14 text-center border border-gray-300 rounded-lg px-2 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSet(i)}
                                        disabled={sets.length <= 1}
                                        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                                        aria-label={`Remove set ${i + 1}`}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        {sets.length < MAX_SETS && (
                            <button
                                type="button"
                                onClick={addSet}
                                className="w-full text-sm font-semibold text-[#FF4200] border border-dashed border-[#FF4200]/40 rounded-lg py-2.5 hover:bg-[#FF4200]/5 transition-colors"
                            >
                                + Add set
                            </button>
                        )}

                        {!scoresValid && someSetStarted && (
                            <p className="text-xs text-center text-gray-400">
                                {tied ? "Sets are tied — add a deciding set" : "Enter a final, non-tied score for each set"}
                            </p>
                        )}
                    </div>

                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                    >
                        {create.isPending ? "Saving…" : "Save match"}
                    </button>
                </form>
            </main>
        </div>
    );
}

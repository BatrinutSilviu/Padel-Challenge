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
    const [team1Score, setTeam1Score] = useState("");
    const [team2Score, setTeam2Score] = useState("");
    const [error, setError] = useState("");

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

    const n1 = parseInt(team1Score);
    const n2 = parseInt(team2Score);
    const scoresValid = !isNaN(n1) && !isNaN(n2) && n1 >= 0 && n2 >= 0 && n1 !== n2;
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
            team1Score: n1,
            team2Score: n2,
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
                        <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Score</p>
                        <div className="flex items-center justify-center gap-3">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={team1Score}
                                onChange={e => setTeam1Score(e.target.value)}
                                placeholder="0"
                                className="w-16 text-center border border-gray-300 rounded-lg px-2 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                            />
                            <span className="text-gray-300 font-bold text-lg">:</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={team2Score}
                                onChange={e => setTeam2Score(e.target.value)}
                                placeholder="0"
                                className="w-16 text-center border border-gray-300 rounded-lg px-2 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                            />
                        </div>
                        {!scoresValid && (team1Score || team2Score) && (
                            <p className="text-xs text-center text-gray-400">Enter a final, non-tied score</p>
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

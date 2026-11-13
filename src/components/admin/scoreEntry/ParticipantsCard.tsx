import { useState } from "react";
import { trpc } from "../../../trpc";
import type { TournamentData } from "../../../lib/tournaments";
import { PlayerPicker } from "../../PlayerPicker";

// The players in a started tournament, folded away by default. Any of them can be replaced
// by another player, who takes over their matches and scores.
export function ParticipantsCard({ tournament }: { tournament: TournamentData }) {
    const utils = trpc.useUtils();
    const id = tournament.id;
    const isCompleted = tournament.status === "COMPLETED";
    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [replacingId, setReplacingId] = useState<string | null>(null);
    const allPlayersQuery = trpc.division.allPlayers.useQuery();

    const swapParticipant = trpc.tournament.swapParticipant.useMutation({
        onSuccess: () => {
            utils.tournament.getById.invalidate({ id });
            if (isCompleted) {
                utils.player.list.invalidate();
                utils.division.allPlayers.invalidate();
            }
            setReplacingId(null);
        },
    });

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                type="button"
                onClick={() => setParticipantsOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-sm font-medium text-gray-700"
            >
                <span>Participants ({tournament.participants.length})</span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${participantsOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            {participantsOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {tournament.participants.map(p => (
                        <div key={p.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                            <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{p.player.name}</span>
                            {replacingId === p.playerId ? (
                                <div className="flex items-center gap-2 shrink-0">
                                    <PlayerPicker
                                        value=""
                                        onChange={(newId) => {
                                            if (!newId) return;
                                            const newPlayerName = allPlayersQuery.data?.find(x => x.id === newId)?.name ?? "the new player";
                                            const message = isCompleted
                                                ? `Replace ${p.player.name} with ${newPlayerName}? This tournament is completed — all its matches will be reassigned to ${newPlayerName} — the ranking points move with them.`
                                                : `Replace ${p.player.name} with ${newPlayerName}? Any scores already recorded for ${p.player.name} will transfer to ${newPlayerName}.`;
                                            if (!confirm(message)) return;
                                            swapParticipant.mutate({ tournamentId: id, oldPlayerId: p.playerId, newPlayerId: newId });
                                        }}
                                        players={allPlayersQuery.data ?? []}
                                        excludeIds={new Set(tournament.participants.map(x => x.playerId))}
                                        placeholder="Choose replacement"
                                        division={tournament.division}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setReplacingId(null)}
                                        className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setReplacingId(p.playerId)}
                                    disabled={swapParticipant.isPending}
                                    className="text-xs font-medium text-[#FF4200] hover:underline shrink-0 disabled:opacity-50"
                                >
                                    Replace
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {swapParticipant.error && (
                <p className="px-4 sm:px-5 pb-3 text-xs text-red-500">{swapParticipant.error.message}</p>
            )}
        </div>
    );
}

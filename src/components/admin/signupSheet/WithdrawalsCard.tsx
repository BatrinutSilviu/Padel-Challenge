import { trpc } from "../../../trpc";

// Who left the sign-up sheet (or was removed) and when, so the admin can tell whether
// someone who left had already paid, and whether they've signed up again.
export function WithdrawalsCard({ tournamentId, signedUpIds }: { tournamentId: string; signedUpIds: string[] }) {
    const withdrawalsQuery = trpc.tournament.withdrawals.useQuery({ id: tournamentId });
    const withdrawals = withdrawalsQuery.data ?? [];
    if (withdrawals.length === 0) return null;
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Withdrawn</span>
                <span className="text-sm font-semibold text-gray-500">{withdrawals.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
                {withdrawals.map(w => (
                    <div key={w.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate">{w.player.name}</p>
                            <p className="text-xs text-gray-400">
                                {w.byAdmin ? "Removed by admin" : "Withdrew"} · {new Date(w.withdrawnAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                        {(signedUpIds.includes(w.playerId) || w.wasConfirmed) && (
                            <div className="flex flex-wrap gap-1.5 shrink-0">
                                {signedUpIds.includes(w.playerId) && (
                                    <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">Signed up again</span>
                                )}
                                {w.wasConfirmed && (
                                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Was confirmed</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

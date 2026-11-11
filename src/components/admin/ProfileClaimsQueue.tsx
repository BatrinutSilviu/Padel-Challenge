import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../../trpc";
import { divisionLabel } from "../../lib/divisions";

// Players asking to link their new account to a profile an admin created. Approving
// links the profile (and its history) to the account at once; rejecting lets them pick
// another profile or create a new one. Renders nothing while the queue is empty.
export function ProfileClaimsQueue() {
    const qc = useQueryClient();
    const [error, setError] = useState("");
    const { data: claims } = trpc.profileClaim.list.useQuery();

    function refresh() {
        setError("");
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.profileClaim.list) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.profileClaim.pendingCount) });
    }
    const approve = trpc.profileClaim.approve.useMutation({ onSuccess: refresh, onError: e => { setError(e.message); refresh(); } });
    const reject = trpc.profileClaim.reject.useMutation({ onSuccess: refresh, onError: e => { setError(e.message); refresh(); } });
    const busy = approve.isPending || reject.isPending;

    if (!claims || claims.length === 0) return null;

    return (
        <section className="bg-white rounded-xl border border-amber-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">Profile claims</h2>
                    <p className="text-xs text-gray-400">
                        These accounts say they're an existing player. Approve only if you know it's them — they get the profile's results.
                    </p>
                </div>
                <span className="text-sm font-semibold text-amber-600 shrink-0">{claims.length}</span>
            </div>
            {error && <p className="px-5 pt-3 text-sm text-red-500">{error}</p>}
            <div className="divide-y divide-gray-100">
                {claims.map(c => (
                    <div key={c.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
                        <div className="min-w-0 space-y-1">
                            <p className="text-sm text-gray-800">
                                <span className="font-semibold break-all">{c.email}</span>
                                {c.viaGoogle && <span className="text-xs text-gray-400"> · Google</span>}
                                <span className="text-gray-400"> wants to be </span>
                                <Link to={`/player/${c.player.id}`} target="_blank" className="font-semibold text-[#FF4200] hover:underline">
                                    {c.player.name}
                                </Link>
                            </p>
                            <p className="text-xs text-gray-500">
                                {divisionLabel(c.player.division)} · {c.player.gender === "MALE" ? "Male" : "Female"}
                                {" · "}{c.player.tournaments} tournament{c.player.tournaments !== 1 ? "s" : ""}
                                {c.player.leagueTeams > 0 && ` · ${c.player.leagueTeams} league team${c.player.leagueTeams !== 1 ? "s" : ""}`}
                                {" · "}profile since {new Date(c.player.createdAt).toLocaleDateString()}
                            </p>
                            {c.player.recent.length > 0 && (
                                <p className="text-xs text-gray-400">
                                    Recent: {c.player.recent.map(t => `${t.name}${t.finalRank ? ` (#${t.finalRank})` : ""}`).join(", ")}
                                </p>
                            )}
                            <p className="text-xs text-gray-400">Asked {new Date(c.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2 shrink-0 self-start">
                            <button
                                onClick={() => approve.mutate({ id: c.id })}
                                disabled={busy}
                                className="text-sm font-medium px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => { if (confirm(`Reject ${c.email}'s claim on ${c.player.name}?`)) reject.mutate({ id: c.id }); }}
                                disabled={busy}
                                className="text-sm font-medium px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 disabled:opacity-50 transition-colors"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

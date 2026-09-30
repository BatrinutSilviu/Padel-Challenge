import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../trpc";
import { useAuth } from "../contexts/AuthContext";
import { mastersFormatNotes, mastersFormatOf } from "../lib/masters";

type TournamentData = NonNullable<ReturnType<typeof trpc.tournament.getById.useQuery>["data"]>;

// The player-facing sign-up sheet: shown on a tournament that hasn't been started
// yet, so anyone with an account can take one of the spots themselves.
export function TournamentSignup({ tournament }: { tournament: TournamentData }) {
    const { token, playerId } = useAuth();
    const qc = useQueryClient();
    const [error, setError] = useState("");

    function refresh() {
        setError("");
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.getById, { id: tournament.id }) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.list) });
    }

    const join = trpc.tournament.join.useMutation({ onSuccess: refresh, onError: e => setError(e.message) });
    const leave = trpc.tournament.leave.useMutation({ onSuccess: refresh, onError: e => setError(e.message) });

    const taken = tournament.participants.length;
    const capacity = tournament.maxPlayers;
    const spotsLeft = capacity === null ? null : Math.max(0, capacity - taken);
    const isRegistered = !!playerId && tournament.participants.some(p => p.playerId === playerId);
    const isFull = spotsLeft === 0;
    const busy = join.isPending || leave.isPending;

    return (
        <section className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-5 border-b border-[#F5F5F7]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-black text-[#1A1A2E]">Sign-up</h2>
                        <p className="text-sm text-[#8E8E93] font-medium mt-0.5">
                            {!tournament.registrationOpen
                                ? "Sign-up is closed — the draw is being finalised."
                                : spotsLeft === null
                                ? `${taken} player${taken !== 1 ? "s" : ""} signed up`
                                : isFull
                                ? "All spots are taken."
                                : `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
                        </p>
                    </div>
                    <span className={`text-sm font-black px-3 py-1.5 rounded-full whitespace-nowrap ${
                        isFull ? "bg-[#FF4200] text-white" : "bg-[#FF4200]/10 text-[#FF4200]"
                    }`}>
                        {taken}{capacity !== null && ` / ${capacity}`}
                    </span>
                </div>

                {capacity !== null && (
                    <div className="w-full bg-[#F5F5F7] rounded-full h-2 mt-4">
                        <div
                            className="h-2 rounded-full bg-[#FF4200] transition-all"
                            style={{ width: `${Math.min(100, (taken / capacity) * 100)}%` }}
                        />
                    </div>
                )}

                <div className="mt-4">
                    {!token ? (
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center w-full sm:w-auto bg-[#FF4200] text-white rounded-xl px-5 py-3 text-sm font-bold hover:bg-[#CC3500] transition-colors"
                        >
                            Log in to sign up
                        </Link>
                    ) : isRegistered ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600">
                                <span className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-xs">✓</span>
                                You're in
                            </span>
                            <button
                                onClick={() => leave.mutate({ id: tournament.id })}
                                disabled={busy}
                                className="text-sm font-bold px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#8E8E93] hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition-colors self-start"
                            >
                                {leave.isPending ? "Withdrawing…" : "Withdraw"}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => join.mutate({ id: tournament.id })}
                            disabled={busy || isFull || !tournament.registrationOpen}
                            className="w-full sm:w-auto bg-[#FF4200] text-white rounded-xl px-5 py-3 text-sm font-bold hover:bg-[#CC3500] disabled:opacity-40 disabled:hover:bg-[#FF4200] transition-colors"
                        >
                            {join.isPending
                                ? "Signing up…"
                                : isFull
                                ? "Tournament full"
                                : !tournament.registrationOpen
                                ? "Sign-up closed"
                                : "Join tournament"}
                        </button>
                    )}
                </div>

                {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
            </div>

            {(tournament.entryFee !== null || tournament.type === "MASTERS") && (
                <div className="px-5 sm:px-6 py-4 border-b border-[#F5F5F7] space-y-3">
                    {tournament.entryFee !== null && (
                        <p className="text-sm text-[#1A1A2E]">
                            <span className="font-bold">Entry fee:</span> {tournament.entryFee} lei / person
                        </p>
                    )}
                    {tournament.type === "MASTERS" && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-2">How it's played</p>
                            <ul className="space-y-1 text-sm text-[#1A1A2E] list-disc pl-5">
                                {mastersFormatNotes(mastersFormatOf(tournament)).map(note => <li key={note}>{note}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {taken === 0 ? (
                <p className="px-5 sm:px-6 py-6 text-sm text-[#8E8E93]">Nobody has signed up yet — be the first.</p>
            ) : (
                <ol className="divide-y divide-[#F5F5F7]">
                    {tournament.participants.map((p, i) => (
                        <li key={p.id} className="px-5 sm:px-6 py-3 flex items-center gap-3">
                            <span className="text-xs font-black text-[#C7C7CC] w-5 shrink-0 tabular-nums">{i + 1}</span>
                            <Link
                                to={`/player/${p.player.id}`}
                                className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] transition-colors truncate"
                            >
                                {p.player.name}
                            </Link>
                            {p.playerId === playerId && (
                                <span className="text-xs font-bold text-[#FF4200] bg-[#FF4200]/10 px-2 py-0.5 rounded-full shrink-0">You</span>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}

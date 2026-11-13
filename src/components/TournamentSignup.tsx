import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../trpc";
import { useAuth } from "../contexts/AuthContext";
import { isTeamBasedType, type TournamentData } from "../lib/tournaments";
import { HowItWorks, PrizeList } from "./TournamentDetails";
import { AccountStatusNotice } from "./auth/AccountStatus";
import { toast } from "sonner";
import { PayTo } from "./PaymentAccounts";
import { PrivacyConsent } from "./PrivacyPage";
import { PlayerPicker } from "./PlayerPicker";
import { cleanPlayerName, playerNameError } from "../lib/playerName";

// The player-facing sign-up sheet: shown on a tournament that hasn't been started
// yet. Anyone with an account can sign up; they wait on the waiting list until an
// admin confirms they've paid, and only confirmed players take one of the spots.
// In team formats a player can sign up together with a partner.
export function TournamentSignup({ tournament }: { tournament: TournamentData }) {
    const { token, playerId, account } = useAuth();
    // Accounts made before sign-up asked for it agree to the privacy policy once, here.
    const needsConsent = !!account && !account.privacyConsentAt;
    const [consent, setConsent] = useState(false);
    const qc = useQueryClient();
    const [error, setError] = useState("");
    const [partnerId, setPartnerId] = useState("");
    // A partner who isn't in the database yet — created when the sign-up goes through.
    const [partnerName, setPartnerName] = useState("");

    function refresh() {
        setError("");
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.getById, { id: tournament.id }) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.list) });
    }

    const acceptPrivacy = trpc.auth.acceptPrivacy.useMutation({
        onSuccess: () => qc.invalidateQueries({ queryKey: getQueryKey(trpc.auth.me) }),
    });
    // What a player pays to get a spot: the advance, or the full price when there's no advance.
    const payNow = tournament.advanceFee ?? tournament.entryFee;
    const join = trpc.tournament.join.useMutation({
        onSuccess: () => {
            setPartnerId(""); setPartnerName(""); refresh();
            toast.success(payNow !== null
                ? `You're on the waiting list — pay the ${payNow} lei ${tournament.advanceFee !== null ? "advance" : "entry fee"} to confirm your spot.`
                : "You're on the waiting list — an admin will confirm your spot.");
        },
        onError: e => setError(e.message),
    });
    const leave = trpc.tournament.leave.useMutation({ onSuccess: refresh, onError: e => setError(e.message) });

    const confirmed = tournament.participants.filter(p => p.confirmed);
    const waiting = tournament.participants.filter(p => !p.confirmed);
    const taken = confirmed.length;
    const capacity = tournament.maxPlayers;
    const spotsLeft = capacity === null ? null : Math.max(0, capacity - taken);
    const me = playerId ? tournament.participants.find(p => p.playerId === playerId) : undefined;
    const isFull = spotsLeft === 0;
    const busy = join.isPending || leave.isPending;

    const teamBased = isTeamBasedType(tournament.type);
    const allPlayersQuery = trpc.division.allPlayers.useQuery(undefined, { enabled: teamBased && !!token && !me });
    const signedUpIds = new Set(tournament.participants.map(p => p.playerId));
    const nameOf = new Map(tournament.participants.map(p => [p.playerId, p.player.name]));
    const partnerNameError = partnerName ? playerNameError(partnerName) : null;
    const hasPartner = !!partnerId || !!partnerName;
    const myPartnerName = me?.partnerId ? nameOf.get(me.partnerId) : undefined;
    const broughtPartner = !!me?.partnerId && tournament.participants.some(
        p => p.playerId === me.partnerId && p.registeredById === me.playerId,
    );

    return (
        // No overflow-hidden: it would clip the partner picker's dropdown.
        <section className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm">
            <div className="px-5 sm:px-6 py-5 border-b border-[#F5F5F7]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-black text-[#1A1A2E]">Sign-up</h2>
                        <p className="text-sm text-[#8E8E93] font-medium mt-0.5">
                            {!tournament.registrationOpen
                                ? "Sign-up is closed — the draw is being finalised."
                                : spotsLeft === null
                                ? `${taken} player${taken !== 1 ? "s" : ""} confirmed`
                                : isFull
                                ? "All spots are confirmed — you can still join the waiting list as a reserve."
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
                            to={`/login?redirect=${encodeURIComponent(`/tournament/${tournament.id}`)}`}
                            className="inline-flex items-center justify-center w-full sm:w-auto bg-[#FF4200] text-white rounded-xl px-5 py-3 text-sm font-bold hover:bg-[#CC3500] transition-colors"
                        >
                            Log in to sign up
                        </Link>
                    ) : account && !account.playerId ? (
                        // Logged in, but the account doesn't play as a player yet.
                        <AccountStatusNotice />
                    ) : me ? (
                        <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {me.confirmed ? (
                                <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600">
                                    <span className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-xs">✓</span>
                                    You're in{myPartnerName && ` with ${myPartnerName}`}
                                </span>
                            ) : (
                                <span className="inline-flex items-start gap-2 text-sm font-bold text-amber-600">
                                    <span className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center text-xs shrink-0">⏳</span>
                                    <span>
                                        You're on the waiting list{myPartnerName && ` with ${myPartnerName}`}
                                        {payNow !== null && (
                                            <span className="block text-sm font-black text-[#1A1A2E] mt-1">
                                                Pay the {payNow} lei {tournament.advanceFee !== null ? "advance" : "entry fee"} to confirm your spot
                                            </span>
                                        )}
                                        <span className="block text-xs font-medium text-[#8E8E93] mt-0.5">
                                            {tournament.advanceFee !== null && tournament.entryFee !== null && tournament.entryFee > tournament.advanceFee
                                                ? `The other ${tournament.entryFee - tournament.advanceFee} lei of the ${tournament.entryFee} lei total are paid on the day. `
                                                : ""}
                                            {payNow !== null ? "An admin confirms your spot once the payment arrives — see How to pay below." : "An admin confirms your spot."}
                                        </span>
                                    </span>
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    if (broughtPartner && !confirm(`Withdrawing also removes ${myPartnerName}, who you signed up. Continue?`)) return;
                                    leave.mutate({ id: tournament.id });
                                }}
                                disabled={busy}
                                className="text-sm font-bold px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#8E8E93] hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition-colors self-start"
                            >
                                {leave.isPending ? "Withdrawing…" : "Withdraw"}
                            </button>
                            </div>
                            {teamBased && (
                                <TeamUp tournament={tournament} me={me} nameOf={nameOf} onChange={refresh} onError={setError} />
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tournament.womenOnly && (
                                <p className="text-sm font-semibold text-pink-600 bg-pink-50 rounded-lg px-3 py-2">
                                    Women only — only women can sign up{teamBased ? ", and a partner you bring must be a woman too" : ""}.
                                </p>
                            )}
                            {teamBased && tournament.registrationOpen && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-1.5">
                                        Team partner <span className="normal-case tracking-normal font-medium">(optional)</span>
                                    </p>
                                    <div className="flex sm:max-w-sm">
                                        {partnerName ? (
                                            <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-300 text-sm bg-white">
                                                <span className="truncate text-gray-800">{cleanPlayerName(partnerName)}</span>
                                                <span className="text-xs text-[#8E8E93] shrink-0">new player</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setPartnerName("")}
                                                    aria-label="Remove partner"
                                                    className="ml-auto -my-2 -mr-2 p-2 text-[#8E8E93] hover:text-red-500 shrink-0"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <PlayerPicker
                                                value={partnerId}
                                                onChange={setPartnerId}
                                                players={allPlayersQuery.data ?? []}
                                                excludeIds={new Set([...signedUpIds, ...(playerId ? [playerId] : [])])}
                                                placeholder="Sign up with a friend"
                                                allowAdd={false}
                                                onAddName={name => { setPartnerId(""); setPartnerName(name); }}
                                            />
                                        )}
                                    </div>
                                    {partnerNameError && <p className="text-xs text-red-500 mt-1.5">{partnerNameError}</p>}
                                    <p className="text-xs text-[#8E8E93] mt-1.5">
                                        {!hasPartner && "Can't find them? Type their full name to add them as a new player. "}
                                        {hasPartner
                                            ? "You'll both go on the waiting list as a team — each spot is confirmed once it's paid."
                                            : "No partner? Sign up alone and you'll be paired up with someone."}
                                    </p>
                                </div>
                            )}
                            {needsConsent && tournament.registrationOpen && (
                                <PrivacyConsent checked={consent} onChange={setConsent} />
                            )}
                            <button
                                onClick={async () => {
                                    if (needsConsent) {
                                        try { await acceptPrivacy.mutateAsync(); } catch (e) { return setError((e as Error).message); }
                                    }
                                    join.mutate({
                                        id: tournament.id,
                                        ...(partnerId ? { partnerId } : partnerName ? { partnerName: cleanPlayerName(partnerName) } : {}),
                                    });
                                }}
                                disabled={busy || acceptPrivacy.isPending || !tournament.registrationOpen || !!partnerNameError || (needsConsent && !consent)}
                                className="w-full sm:w-auto bg-[#FF4200] text-white rounded-xl px-5 py-3 text-sm font-bold hover:bg-[#CC3500] disabled:opacity-40 disabled:hover:bg-[#FF4200] transition-colors"
                            >
                                {join.isPending
                                    ? "Signing up…"
                                    : !tournament.registrationOpen
                                    ? "Sign-up closed"
                                    : hasPartner
                                    ? (isFull ? "Join waiting list as a team" : "Sign up as a team")
                                    : isFull
                                    ? "Join waiting list"
                                    : "Join tournament"}
                            </button>
                        </div>
                    )}
                </div>

                {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
            </div>

            <div className="px-5 sm:px-6 py-4 border-b border-[#F5F5F7] space-y-4">
                {/* The advance is what players pay to get in; the total comes second. */}
                {(tournament.entryFee !== null || tournament.advanceFee !== null) && (
                    <div className="space-y-0.5">
                        {tournament.advanceFee !== null ? (
                            <>
                                <p className="text-base text-[#1A1A2E]">
                                    <span className="font-black">Advance: {tournament.advanceFee} lei</span> / person — pay it to confirm your spot
                                </p>
                                {tournament.entryFee !== null && (
                                    <p className="text-sm text-[#8E8E93]">
                                        Total price {tournament.entryFee} lei / person · the other {tournament.entryFee - tournament.advanceFee} lei are paid on the day
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-base text-[#1A1A2E]">
                                <span className="font-black">Price: {tournament.entryFee} lei</span> / person — pay it to confirm your spot
                            </p>
                        )}
                    </div>
                )}
                <PayTo
                    accounts={tournament.payTo}
                    entryFee={tournament.entryFee}
                    advanceFee={tournament.advanceFee}
                    tournamentName={tournament.name}
                />
                <PrizeList tournament={tournament} />
                {/* Open on the sign-up sheet: it's what players read to decide whether to join. */}
                <HowItWorks tournament={tournament} defaultOpen />
            </div>

            {tournament.participants.length === 0 ? (
                <p className="px-5 sm:px-6 py-6 text-sm text-[#8E8E93]">Nobody has signed up yet — be the first.</p>
            ) : (
                <>
                    <PlayerList title="Confirmed" players={confirmed} playerId={playerId} nameOf={nameOf} openSpots={spotsLeft} />
                    {waiting.length > 0 && (
                        <PlayerList title="Waiting list" players={waiting} playerId={playerId} nameOf={nameOf} />
                    )}
                </>
            )}
        </section>
    );
}

function PlayerList({ title, players, playerId, nameOf, openSpots }: {
    title: string;
    players: TournamentData["participants"];
    playerId: string | null | undefined;
    nameOf: Map<string, string>;
    // Confirmed list only: how many spots are still free (null = no limit).
    openSpots?: number | null;
}) {
    return (
        <div className="border-b border-[#F5F5F7] last:border-b-0">
            <p className="px-5 sm:px-6 pt-4 pb-1 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">
                {title} <span className="text-[#C7C7CC]">· {players.length}</span>
            </p>
            {players.length > 0 && (
                <ol className="divide-y divide-[#F5F5F7]">
                    {players.map((p, i) => (
                        <li key={p.id} className="px-5 sm:px-6 py-3 flex items-center gap-3">
                            <span className="text-xs font-black text-[#C7C7CC] w-5 shrink-0 tabular-nums">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Link
                                        to={`/player/${p.player.id}`}
                                        className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] transition-colors truncate"
                                    >
                                        {p.player.name}
                                    </Link>
                                    {p.playerId === playerId && (
                                        <span className="text-xs font-bold text-[#FF4200] bg-[#FF4200]/10 px-2 py-0.5 rounded-full shrink-0">You</span>
                                    )}
                                </div>
                                {p.partnerId && nameOf.has(p.partnerId) && (
                                    <p className="text-xs text-[#8E8E93] truncate">with {nameOf.get(p.partnerId)}</p>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
            {openSpots != null && openSpots > 0 && (
                <p className="px-5 sm:px-6 py-3 text-sm font-semibold text-[#FF4200] border-t border-dashed border-[#F5F5F7]">
                    {openSpots} empty spot{openSpots !== 1 ? "s" : ""}
                </p>
            )}
            {players.length === 0 && openSpots == null && (
                <p className="px-5 sm:px-6 py-3 text-sm text-[#8E8E93]">Nobody is confirmed yet.</p>
            )}
        </div>
    );
}

// Teaming up after signing up: a confirmed player without a partner asks another
// confirmed player on the sheet, who has to accept. Requests to the player come first;
// with a partner, the player can leave the team (both stay on the list).
function TeamUp({ tournament, me, nameOf, onChange, onError }: {
    tournament: TournamentData;
    me: TournamentData["participants"][number];
    nameOf: Map<string, string>;
    onChange: () => void;
    onError: (message: string) => void;
}) {
    const [pick, setPick] = useState("");
    const opts = { onSuccess: () => { setPick(""); onChange(); }, onError: (e: { message: string }) => onError(e.message) };
    const ask = trpc.tournament.requestPartner.useMutation({
        ...opts,
        onSuccess: r => { setPick(""); onChange(); toast.success(r.paired ? "You're a team now." : "Request sent — they have to accept it."); },
    });
    const answer = trpc.tournament.answerPartnerRequest.useMutation({
        ...opts,
        onSuccess: r => { onChange(); if (r.paired) toast.success("You're a team now."); },
    });
    const cancel = trpc.tournament.cancelPartnerRequest.useMutation(opts);
    const split = trpc.tournament.leaveTeam.useMutation(opts);
    const busy = ask.isPending || answer.isPending || cancel.isPending || split.isPending;

    const box = "rounded-xl border border-[#E5E5EA] bg-[#F5F5F7]/60 p-3 sm:p-4 space-y-2.5";
    const button = "text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 transition-colors";

    if (me.partnerId) {
        return (
            <div className={box}>
                <p className="text-sm text-[#3A3A4E]">Your partner: <span className="font-bold text-[#1A1A2E]">{nameOf.get(me.partnerId)}</span></p>
                <button
                    onClick={() => { if (confirm(`Leave the team with ${nameOf.get(me.partnerId!)}? You both stay signed up, without a partner.`)) split.mutate({ id: tournament.id }); }}
                    disabled={busy}
                    className={`${button} border border-[#E5E5EA] bg-white text-[#8E8E93] hover:border-red-300 hover:text-red-500`}
                >
                    Leave team
                </button>
            </div>
        );
    }
    if (!me.confirmed) {
        return <p className="text-xs text-[#8E8E93]">Once your spot is confirmed you can team up with someone else on the list.</p>;
    }

    const incoming = tournament.participants.filter(p => p.partnerRequestId === me.playerId && !p.partnerId);
    const asked = me.partnerRequestId ? nameOf.get(me.partnerRequestId) : undefined;
    // Who can be asked: confirmed, without a partner, not already asking me.
    const candidates = tournament.participants.filter(p =>
        p.playerId !== me.playerId && p.confirmed && !p.partnerId && p.partnerRequestId !== me.playerId);

    return (
        <div className={box}>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Team partner</p>
            {incoming.map(p => (
                <div key={p.playerId} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg border border-[#FF4200]/30 px-3 py-2.5">
                    <p className="text-sm text-[#1A1A2E] flex-1 min-w-0"><span className="font-bold">{p.player.name}</span> wants to team up with you</p>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => answer.mutate({ id: tournament.id, fromPlayerId: p.playerId, accept: true })} disabled={busy}
                            className={`${button} flex-1 sm:flex-none bg-[#FF4200] text-white hover:bg-[#CC3500]`}>Accept</button>
                        <button onClick={() => answer.mutate({ id: tournament.id, fromPlayerId: p.playerId, accept: false })} disabled={busy}
                            className={`${button} flex-1 sm:flex-none border border-[#E5E5EA] bg-white text-[#8E8E93]`}>Decline</button>
                    </div>
                </div>
            ))}
            {asked ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="text-sm text-[#3A3A4E] flex-1">⏳ Waiting for <span className="font-bold text-[#1A1A2E]">{asked}</span> to accept</p>
                    <button onClick={() => cancel.mutate({ id: tournament.id })} disabled={busy}
                        className={`${button} self-start border border-[#E5E5EA] bg-white text-[#8E8E93]`}>Cancel request</button>
                </div>
            ) : candidates.length === 0 ? (
                incoming.length === 0 && <p className="text-sm text-[#8E8E93]">Nobody else confirmed is free to team up with yet. Without a partner you'll be paired up with someone.</p>
            ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                    <select
                        value={pick}
                        onChange={e => setPick(e.target.value)}
                        aria-label="Player to team up with"
                        className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                    >
                        <option value="">Team up with…</option>
                        {candidates.map(p => <option key={p.playerId} value={p.playerId}>{p.player.name}</option>)}
                    </select>
                    <button onClick={() => ask.mutate({ id: tournament.id, partnerId: pick })} disabled={busy || !pick}
                        className={`${button} bg-[#FF4200] text-white hover:bg-[#CC3500]`}>Ask to team up</button>
                </div>
            )}
            {!asked && candidates.length > 0 && (
                <p className="text-xs text-[#8E8E93]">They have to accept. No partner? You'll be paired up with someone.</p>
            )}
        </div>
    );
}

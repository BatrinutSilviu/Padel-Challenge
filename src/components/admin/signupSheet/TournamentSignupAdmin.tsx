import { useState } from "react";
import { Link } from "react-router-dom";
import { NavBar } from "../../NavBar";
import { trpc } from "../../../trpc";
import { divisionLabel } from "../../../lib/divisions";
import { bySignupTime, capacityOptions, challengerFormatOf, signedUpAt, playerCountError, tournamentTypeLabel, tournamentWhen, type TournamentData } from "../../../lib/tournaments";
import { PlayerPicker } from "../../PlayerPicker";
import { mastersFormatOf } from "../../../lib/masters";
import { MastersFormatPicker } from "../MastersFormatPicker";
import { ChallengerFormatPicker } from "../ChallengerFormatPicker";
import { TournamentDetailsEditor } from "../TournamentDetailsInputs";
import { ChatJumpLink, TournamentChat } from "../../TournamentChat";
import { TournamentSettingsEditor } from "../TournamentSettingsEditor";
import { useTeamAllocation } from "./useTeamAllocation";
import { TeamAllocationCard } from "./TeamAllocationCard";
import { WithdrawalsCard } from "./WithdrawalsCard";

// Admin view of a tournament that players are still signing up for: confirm the
// players on the waiting list once they've paid, then allocate the confirmed
// players to teams and groups and generate the draw.
export function TournamentSignupAdmin({ tournament }: { tournament: TournamentData }) {
    const utils = trpc.useUtils();
    const [error, setError] = useState("");

    const allPlayersQuery = trpc.division.allPlayers.useQuery();
    const allocation = useTeamAllocation(tournament);
    const { byPlayerId, teamBased, numTeams, teamSlots, teamsComplete } = allocation;
    // Both lists in sign-up order, oldest first.
    const registered = [...allocation.registered].sort(bySignupTime);
    const waiting = tournament.participants.filter(p => !p.confirmed).sort(bySignupTime);
    const allSignedUpIds = tournament.participants.map(p => p.playerId);

    function refresh() {
        setError("");
        utils.tournament.getById.invalidate({ id: tournament.id });
        utils.tournament.list.invalidate();
        utils.tournament.withdrawals.invalidate({ id: tournament.id });
        utils.tournament.awaitingConfirmation.invalidate();
    }

    const onError = (e: { message: string }) => setError(e.message);
    const addParticipant = trpc.tournament.addParticipant.useMutation({ onSuccess: refresh, onError });
    const removeParticipant = trpc.tournament.removeParticipant.useMutation({ onSuccess: refresh, onError });
    const setConfirmed = trpc.tournament.setParticipantConfirmed.useMutation({ onSuccess: refresh, onError });
    const updateRegistration = trpc.tournament.updateRegistration.useMutation({ onSuccess: refresh, onError });
    // Once started the tournament is IN_PROGRESS, so the refetch swaps this whole
    // view out for the score entry screen.
    const start = trpc.tournament.start.useMutation({
        onSuccess: () => {
            allocation.forgetDraft();
            refresh();
        },
        onError,
    });

    const isMasters = tournament.type === "MASTERS";
    const mastersFormat = mastersFormatOf(tournament);
    // Challenger and Masters teams fill the groups in team order.
    const teamsPerGroup = isMasters ? mastersFormat.teamsPerGroup : tournament.type === "CHALLENGER" ? 4 : null;
    const challengerFormat = challengerFormatOf(tournament);
    const countError = playerCountError(tournament.type, registered.length, mastersFormat, challengerFormat);
    const canStart = !countError && teamsComplete && !start.isPending;

    // Name, with the partner they signed up with underneath — stacked rather than
    // side by side so both stay readable next to the row's buttons on a phone.
    const nameCell = (p: TournamentData["participants"][number]) => {
        const partner = p.partnerId ? byPlayerId.get(p.partnerId) : undefined;
        return (
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{p.player.name}</p>
                <p className="text-xs text-gray-400 truncate">
                    {partner && <>with {partner.player.name}{!partner.confirmed && p.confirmed && " (waiting)"} · </>}
                    <span className="tabular-nums" title="Signed up">{signedUpAt(p.registeredAt)}</span>
                </p>
            </div>
        );
    };

    function handleStart() {
        setError("");
        start.mutate({
            id: tournament.id,
            ...(teamBased ? { teams: teamSlots.map(([p1, p2]) => ({ player1Id: p1, player2Id: p2 })) } : {}),
        });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-3xl mx-auto px-3 sm:px-4 pt-6 pb-24 sm:py-8 space-y-5">

                <div>
                    <Link to="/admin" className="text-sm text-[#FF4200] hover:underline">← Admin</Link>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <h1 className="text-lg sm:text-xl font-bold text-gray-800">{tournament.name}</h1>
                        <span className="text-sm text-gray-400">
                            {divisionLabel(tournament.division)} · {tournamentTypeLabel(tournament.type)} · {tournamentWhen(tournament)}
                        </span>
                    </div>
                </div>

                <TournamentSettingsEditor tournament={tournament} />
                <TournamentDetailsEditor tournament={tournament} section="payment" />
                <TournamentDetailsEditor tournament={tournament} section="general" />
                <div className="px-1"><ChatJumpLink tournamentId={tournament.id} /></div>

                {/* Sign-up settings */}
                <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-700">Sign-ups</p>
                            <p className="text-xs text-gray-400">
                                {tournament.registrationOpen
                                    ? "Players can join the waiting list from the tournament page."
                                    : "Closed — only you can change the list."}
                            </p>
                        </div>
                        <button
                            onClick={() => updateRegistration.mutate({ id: tournament.id, registrationOpen: !tournament.registrationOpen })}
                            disabled={updateRegistration.isPending}
                            className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors shrink-0 disabled:opacity-50 ${
                                tournament.registrationOpen
                                    ? "border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500"
                                    : "border-sky-300 text-sky-600 hover:bg-sky-50"
                            }`}
                        >
                            {tournament.registrationOpen ? "Close sign-ups" : "Re-open sign-ups"}
                        </button>
                    </div>

                    {tournament.type === "CHALLENGER" && (
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">After the groups</p>
                        <ChallengerFormatPicker
                            value={challengerFormat}
                            onChange={format => updateRegistration.mutate({ id: tournament.id, challengerFormat: format })}
                            disabled={updateRegistration.isPending}
                        />
                    </div>
                    )}

                    {isMasters ? (
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Group stage</p>
                        <MastersFormatPicker
                            value={mastersFormat}
                            onChange={format => updateRegistration.mutate({ id: tournament.id, ...format })}
                            disabled={updateRegistration.isPending}
                        />
                    </div>
                    ) : (
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Spots</p>
                        <div className="flex flex-wrap gap-2">
                            {capacityOptions(tournament.type, challengerFormat).map(n => (
                                <button
                                    key={n}
                                    onClick={() => updateRegistration.mutate({ id: tournament.id, maxPlayers: n })}
                                    disabled={updateRegistration.isPending}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                                        tournament.maxPlayers === n
                                            ? "bg-[#FF4200] text-white border-[#FF4200]"
                                            : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                    )}
                </div>

                {/* Waiting list */}
                {waiting.length > 0 && (
                    <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <span className="text-sm font-semibold text-gray-700">Waiting list</span>
                                <p className="text-xs text-gray-400">
                                    Confirm a player once they've paid{tournament.advanceFee !== null ? ` the ${tournament.advanceFee} lei advance` : ""} — only confirmed players are in the draw.
                                </p>
                            </div>
                            <span className="text-sm font-semibold text-amber-600 shrink-0">{waiting.length}</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {waiting.map((p, i) => (
                                <div key={p.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-gray-300 w-5 shrink-0 tabular-nums">{i + 1}</span>
                                        {nameCell(p)}
                                    </div>
                                    {/* Own row on a phone, with buttons big enough to tap. */}
                                    <div className="flex items-center gap-2 pl-8 sm:pl-0 shrink-0">
                                        {p.partnerId && byPlayerId.get(p.partnerId)?.confirmed === false && (
                                            <button
                                                onClick={() => setConfirmed.mutate({ id: tournament.id, playerIds: [p.playerId, p.partnerId!], confirmed: true })}
                                                disabled={setConfirmed.isPending}
                                                title="One of them paid for the whole team"
                                                className="flex-1 sm:flex-none text-xs font-semibold px-3 py-2.5 sm:py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 whitespace-nowrap"
                                            >
                                                Confirm both
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setConfirmed.mutate({ id: tournament.id, playerIds: [p.playerId], confirmed: true })}
                                            disabled={setConfirmed.isPending}
                                            className="flex-1 sm:flex-none text-xs font-semibold px-3 py-2.5 sm:py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
                                        >
                                            Confirm paid
                                        </button>
                                        <button
                                            onClick={() => removeParticipant.mutate({ id: tournament.id, playerId: p.playerId })}
                                            disabled={removeParticipant.isPending}
                                            className="text-xs font-medium px-2 py-2.5 sm:py-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Confirmed */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Confirmed</span>
                        <span className="text-sm font-semibold text-gray-500">
                            {registered.length}{tournament.maxPlayers !== null && ` / ${tournament.maxPlayers}`}
                        </span>
                    </div>
                    {registered.length === 0 ? (
                        <p className="px-4 sm:px-5 py-4 text-sm text-gray-400">Nobody is confirmed yet.</p>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {registered.map((p, i) => (
                                <div key={p.id} className="px-4 sm:px-5 py-2 sm:py-3 flex items-center gap-1 sm:gap-3">
                                    <span className="text-xs font-semibold text-gray-300 w-5 shrink-0 tabular-nums mr-2 sm:mr-0">{i + 1}</span>
                                    {nameCell(p)}
                                    <button
                                        onClick={() => setConfirmed.mutate({ id: tournament.id, playerIds: [p.playerId], confirmed: false })}
                                        disabled={setConfirmed.isPending}
                                        className="text-xs font-medium px-2 py-2.5 sm:p-0 text-gray-400 hover:text-amber-600 shrink-0 disabled:opacity-50"
                                    >
                                        Unconfirm
                                    </button>
                                    <button
                                        onClick={() => removeParticipant.mutate({ id: tournament.id, playerId: p.playerId })}
                                        disabled={removeParticipant.isPending}
                                        className="text-xs font-medium px-2 py-2.5 sm:p-0 text-gray-400 hover:text-red-500 shrink-0 disabled:opacity-50"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex items-center gap-2">
                        <span className="text-xs text-gray-400 shrink-0">Add player</span>
                        <PlayerPicker
                            value=""
                            onChange={(playerId) => { if (playerId) addParticipant.mutate({ id: tournament.id, playerId }); }}
                            players={allPlayersQuery.data ?? []}
                            excludeIds={new Set(allSignedUpIds)}
                            placeholder="Pick a player"
                            division={tournament.division}
                        />
                    </div>
                </div>

                {/* Withdrawn */}
                <WithdrawalsCard tournamentId={tournament.id} signedUpIds={allSignedUpIds} />

                {/* Teams and groups */}
                {teamBased && numTeams > 0 && <TeamAllocationCard allocation={allocation} teamsPerGroup={teamsPerGroup} />}

                {countError && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                        {countError} — {registered.length} confirmed.
                        {waiting.length > 0 && ` ${waiting.length} still on the waiting list.`}
                    </p>
                )}
                {error && (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
                )}

                <button
                    onClick={handleStart}
                    disabled={!canStart}
                    className="w-full sm:w-auto bg-[#FF4200] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                >
                    {start.isPending ? "Starting…" : "Start Tournament & Generate Schedule"}
                </button>
                {waiting.length > 0 && (
                    <p className="text-xs text-gray-400">Players still on the waiting list are dropped when the tournament starts.</p>
                )}
                <TournamentChat tournamentId={tournament.id} tournamentName={tournament.name} />
            </main>
        </div>
    );
}

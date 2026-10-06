import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { divisionLabel } from "../../lib/divisions";
import { capacityOptions, isTeamBasedType, playerCountError, tournamentTypeLabel } from "../../lib/tournaments";
import { PlayerPicker } from "../PlayerPicker";
import { mastersFormatOf } from "../../lib/masters";
import { MastersFormatPicker } from "./MastersFormatPicker";
import { MastersGroupHeading, TeamNumber } from "./TeamNumber";

type TournamentData = NonNullable<ReturnType<typeof trpc.tournament.getById.useQuery>["data"]>;

// Admin view of a tournament that players are still signing up for: confirm the
// players on the waiting list once they've paid, then generate the draw from the
// confirmed players.
export function TournamentSignupAdmin({ tournament }: { tournament: TournamentData }) {
    const qc = useQueryClient();
    const [error, setError] = useState("");

    const allPlayersQuery = trpc.division.allPlayers.useQuery();
    const withdrawalsQuery = trpc.tournament.withdrawals.useQuery({ id: tournament.id });
    const withdrawals = withdrawalsQuery.data ?? [];
    // Only confirmed players make the draw; the rest are waiting to pay.
    const registered = tournament.participants.filter(p => p.confirmed);
    const waiting = tournament.participants.filter(p => !p.confirmed);
    const registeredIds = registered.map(p => p.playerId);
    const allSignedUpIds = tournament.participants.map(p => p.playerId);
    const byPlayerId = new Map(tournament.participants.map(p => [p.playerId, p]));
    // Partners who signed up together and are both confirmed get paired up first.
    const partnerOf = (id: string) => {
        const partnerId = byPlayerId.get(id)?.partnerId;
        return partnerId && registeredIds.includes(partnerId) ? partnerId : null;
    };
    const idKey = registeredIds.join(",");
    const pairKey = registered.map(p => p.partnerId ?? "").join(",");
    const teamBased = isTeamBasedType(tournament.type);
    const numTeams = Math.floor(registered.length / 2);

    const [teamSlots, setTeamSlots] = useState<[string, string][]>([]);

    // Keep the pairing grid in step with the sign-up list: assignments that are
    // still valid stay put, partners who signed up together take the first empty
    // teams, and everyone else drops into the remaining gaps in sign-up order.
    useEffect(() => {
        if (!teamBased) return;
        setTeamSlots(prev => {
            const slots: [string, string][] = Array.from({ length: numTeams }, (_, i) => {
                const [a, b] = prev[i] ?? ["", ""];
                return [registeredIds.includes(a) ? a : "", registeredIds.includes(b) ? b : ""];
            });
            const assigned = new Set(slots.flat().filter(Boolean));
            for (const slot of slots) {
                if (slot[0] || slot[1]) continue;
                const a = registeredIds.find(id => !assigned.has(id) && partnerOf(id) && !assigned.has(partnerOf(id)!));
                if (!a) break;
                slot[0] = a;
                slot[1] = partnerOf(a)!;
                assigned.add(slot[0]).add(slot[1]);
            }
            const unassigned = registeredIds.filter(id => !assigned.has(id));
            let next = 0;
            for (const slot of slots) {
                if (!slot[0] && next < unassigned.length) slot[0] = unassigned[next++];
                if (!slot[1] && next < unassigned.length) slot[1] = unassigned[next++];
            }
            return slots;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idKey, pairKey, numTeams, teamBased]);

    function refresh() {
        setError("");
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.getById, { id: tournament.id }) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.list) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.withdrawals, { id: tournament.id }) });
    }

    const onError = (e: { message: string }) => setError(e.message);
    const addParticipant = trpc.tournament.addParticipant.useMutation({ onSuccess: refresh, onError });
    const removeParticipant = trpc.tournament.removeParticipant.useMutation({ onSuccess: refresh, onError });
    const setConfirmed = trpc.tournament.setParticipantConfirmed.useMutation({ onSuccess: refresh, onError });
    const updateRegistration = trpc.tournament.updateRegistration.useMutation({ onSuccess: refresh, onError });
    // Once started the tournament is IN_PROGRESS, so the refetch swaps this whole
    // view out for the score entry screen.
    const start = trpc.tournament.start.useMutation({ onSuccess: refresh, onError });

    const isMasters = tournament.type === "MASTERS";
    const mastersFormat = mastersFormatOf(tournament);
    const countError = playerCountError(tournament.type, registered.length, mastersFormat);
    const teamsComplete = !teamBased || (teamSlots.length === numTeams && teamSlots.every(([a, b]) => a && b && a !== b));
    const canStart = !countError && teamsComplete && !start.isPending;

    // Shuffles the teams, but players who signed up together stay partners.
    function shufflePairs() {
        const shuffle = <T,>(xs: T[]) => {
            for (let i = xs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [xs[i], xs[j]] = [xs[j], xs[i]];
            }
            return xs;
        };
        const fixed: [string, string][] = [];
        const seen = new Set<string>();
        for (const id of registeredIds) {
            const partner = partnerOf(id);
            if (partner && !seen.has(id)) {
                fixed.push([id, partner]);
                seen.add(id).add(partner);
            }
        }
        const singles = shuffle(registeredIds.filter(id => !seen.has(id)));
        const drawn: [string, string][] = [];
        for (let i = 0; i + 1 < singles.length; i += 2) drawn.push([singles[i], singles[i + 1]]);
        setTeamSlots(shuffle([...fixed, ...drawn]).slice(0, numTeams));
    }

    // Name, with the partner they signed up with underneath — stacked rather than
    // side by side so both stay readable next to the row's buttons on a phone.
    const nameCell = (p: TournamentData["participants"][number]) => {
        const partner = p.partnerId ? byPlayerId.get(p.partnerId) : undefined;
        return (
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{p.player.name}</p>
                {partner && (
                    <p className="text-xs text-gray-400 truncate">
                        with {partner.player.name}{!partner.confirmed && p.confirmed && " (waiting)"}
                    </p>
                )}
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
                            {divisionLabel(tournament.division)} · {tournamentTypeLabel(tournament.type)} · {new Date(tournament.date).toLocaleDateString()}
                        </span>
                    </div>
                </div>

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
                            {capacityOptions(tournament.type).map(n => (
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
                                <p className="text-xs text-gray-400">Confirm a player once they've paid — only confirmed players are in the draw.</p>
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
                {withdrawals.length > 0 && (
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
                                    {(allSignedUpIds.includes(w.playerId) || w.wasConfirmed) && (
                                        <div className="flex flex-wrap gap-1.5 shrink-0">
                                            {allSignedUpIds.includes(w.playerId) && (
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
                )}

                {/* Teams */}
                {teamBased && numTeams > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-700">Teams</p>
                                <p className="text-xs text-gray-400">
                                    Partners who signed up together are paired up, the rest in sign-up order — change any pair before starting.
                                    {isMasters && " Groups are filled in team order."}
                                </p>
                            </div>
                            {!isMasters && <button
                                onClick={shufflePairs}
                                className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200] transition-colors shrink-0"
                            >
                                Shuffle
                            </button>}
                        </div>
                        {teamSlots.map(([p1, p2], i) => {
                            const assignedIds = new Set(teamSlots.flat().filter(Boolean));
                            const pickerPlayers = registered.map(p => p.player);
                            return (
                                <Fragment key={i}>
                                {isMasters && <MastersGroupHeading index={i} teamsPerGroup={mastersFormat.teamsPerGroup} />}
                                <div className="flex items-center gap-2">
                                    <TeamNumber index={i} />
                                    <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                                        <PlayerPicker
                                            value={p1}
                                            onChange={id => setTeamSlots(prev => prev.map((t, idx) => idx === i ? [id, t[1]] : t))}
                                            players={pickerPlayers}
                                            excludeIds={new Set([...assignedIds].filter(id => id !== p1))}
                                            placeholder="Player 1"
                                        />
                                        <PlayerPicker
                                            value={p2}
                                            onChange={id => setTeamSlots(prev => prev.map((t, idx) => idx === i ? [t[0], id] : t))}
                                            players={pickerPlayers}
                                            excludeIds={new Set([...assignedIds].filter(id => id !== p2))}
                                            placeholder="Player 2"
                                            align="right"
                                        />
                                    </div>
                                </div>
                                </Fragment>
                            );
                        })}
                    </div>
                )}

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
            </main>
        </div>
    );
}

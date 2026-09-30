import { useEffect, useState } from "react";
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

type TournamentData = NonNullable<ReturnType<typeof trpc.tournament.getById.useQuery>["data"]>;

// Admin view of a tournament that players are still signing up for: manage the
// list, then generate the draw from whoever registered.
export function TournamentSignupAdmin({ tournament }: { tournament: TournamentData }) {
    const qc = useQueryClient();
    const [error, setError] = useState("");

    const allPlayersQuery = trpc.division.allPlayers.useQuery();
    const registered = tournament.participants;
    const registeredIds = registered.map(p => p.playerId);
    const idKey = registeredIds.join(",");
    const teamBased = isTeamBasedType(tournament.type);
    const numTeams = Math.floor(registered.length / 2);

    const [teamSlots, setTeamSlots] = useState<[string, string][]>([]);

    // Keep the pairing grid in step with the sign-up list: assignments that are
    // still valid stay put, players who joined (or were freed by a withdrawal)
    // drop into the first empty slots in sign-up order.
    useEffect(() => {
        if (!teamBased) return;
        setTeamSlots(prev => {
            const slots: [string, string][] = Array.from({ length: numTeams }, (_, i) => {
                const [a, b] = prev[i] ?? ["", ""];
                return [registeredIds.includes(a) ? a : "", registeredIds.includes(b) ? b : ""];
            });
            const assigned = new Set(slots.flat().filter(Boolean));
            const unassigned = registeredIds.filter(id => !assigned.has(id));
            let next = 0;
            for (const slot of slots) {
                if (!slot[0] && next < unassigned.length) slot[0] = unassigned[next++];
                if (!slot[1] && next < unassigned.length) slot[1] = unassigned[next++];
            }
            return slots;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idKey, numTeams, teamBased]);

    function refresh() {
        setError("");
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.getById, { id: tournament.id }) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.list) });
    }

    const onError = (e: { message: string }) => setError(e.message);
    const addParticipant = trpc.tournament.addParticipant.useMutation({ onSuccess: refresh, onError });
    const removeParticipant = trpc.tournament.removeParticipant.useMutation({ onSuccess: refresh, onError });
    const updateRegistration = trpc.tournament.updateRegistration.useMutation({ onSuccess: refresh, onError });
    // Once started the tournament is IN_PROGRESS, so the refetch swaps this whole
    // view out for the score entry screen.
    const start = trpc.tournament.start.useMutation({ onSuccess: refresh, onError });

    const isMasters = tournament.type === "MASTERS";
    const mastersFormat = mastersFormatOf(tournament);
    const countError = playerCountError(tournament.type, registered.length, mastersFormat);
    const teamsComplete = !teamBased || (teamSlots.length === numTeams && teamSlots.every(([a, b]) => a && b && a !== b));
    const canStart = !countError && teamsComplete && !start.isPending;

    function shufflePairs() {
        const shuffled = [...registeredIds];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setTeamSlots(Array.from({ length: numTeams }, (_, i) => [shuffled[i * 2], shuffled[i * 2 + 1]]));
    }

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
                                    ? "Players can claim a spot from the tournament page."
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

                {/* Signed up */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Signed up</span>
                        <span className="text-sm font-semibold text-gray-500">
                            {registered.length}{tournament.maxPlayers !== null && ` / ${tournament.maxPlayers}`}
                        </span>
                    </div>
                    {registered.length === 0 ? (
                        <p className="px-4 sm:px-5 py-4 text-sm text-gray-400">Nobody has signed up yet.</p>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {registered.map((p, i) => (
                                <div key={p.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                                    <span className="text-xs font-semibold text-gray-300 w-5 shrink-0 tabular-nums">{i + 1}</span>
                                    <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{p.player.name}</span>
                                    <button
                                        onClick={() => removeParticipant.mutate({ id: tournament.id, playerId: p.playerId })}
                                        disabled={removeParticipant.isPending}
                                        className="text-xs font-medium text-gray-400 hover:text-red-500 shrink-0 disabled:opacity-50"
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
                            excludeIds={new Set(registeredIds)}
                            placeholder="Pick a player"
                            division={tournament.division}
                        />
                    </div>
                </div>

                {/* Teams */}
                {teamBased && numTeams > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-700">Teams</p>
                                <p className="text-xs text-gray-400">Paired in sign-up order — change any pair before starting.</p>
                            </div>
                            <button
                                onClick={shufflePairs}
                                className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200] transition-colors shrink-0"
                            >
                                Shuffle
                            </button>
                        </div>
                        {teamSlots.map(([p1, p2], i) => {
                            const assignedIds = new Set(teamSlots.flat().filter(Boolean));
                            const pickerPlayers = registered.map(p => p.player);
                            return (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-sm font-medium text-gray-500 w-14 shrink-0 pt-2.5">Team {i + 1}</span>
                                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
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
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {countError && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                        {countError} — {registered.length} signed up.
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
            </main>
        </div>
    );
}

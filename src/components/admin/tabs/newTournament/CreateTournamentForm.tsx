import { useState } from "react";
import { trpc } from "../../../../trpc";
import { DIVISION_NAMES, divisionLabel } from "../../../../lib/divisions";
import { TOURNAMENT_TYPE_LABELS, capacityOptions, isTeamBasedType, tournamentTypeDescription, type ChallengerFormat } from "../../../../lib/tournaments";
import { RECOMMENDED_MASTERS_FORMAT, STAGE_INFO, mastersKnockoutStages, mastersTeamCount, type MastersFormat } from "../../../../lib/masters";
import { EMPTY_DETAILS, detailsError, detailsInput } from "../../../../lib/tournamentDetails";
import { AddPlayerInline } from "../../../AddPlayerInline";
import { MastersFormatPicker } from "../../MastersFormatPicker";
import { ChallengerFormatPicker } from "../../ChallengerFormatPicker";
import { FeeInputs } from "../../FeeInputs";
import { PayToSelect, PrizeInputs, TimeInputs } from "../../TournamentDetailsInputs";
import { ChoiceButton, Field } from "../../formControls";
import { compactField } from "../../formStyles";
import { TeamSlotsInput, type TeamSlot } from "./TeamSlotsInput";

// The formats an admin can create here (the retired Girls division's Americano is gone).
const CREATABLE_TYPES = ["AMERICANO", "AMERICANO_CHAMPIONS", "CHALLENGER", "TEAM_AMERICANO", "KING_OF_THE_COURT", "MASTERS"] as const;
type CreatableType = typeof CREATABLE_TYPES[number];

export function CreateTournamentForm({ onCreated, onImport }: { onCreated: () => void; onImport: () => void }) {
    const [division, setDivision] = useState(1);
    const [name, setName] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [type, setType] = useState<CreatableType>("AMERICANO");
    // Start/end time and prizes, advertised on the tournament page.
    const [details, setDetails] = useState(EMPTY_DETAILS);
    const [pointsPerGame, setPointsPerGame] = useState(32);
    const [maxPlayers, setMaxPlayers] = useState(8);
    // Sign-up mode: create the tournament empty and let players claim the spots
    // themselves; the draw is generated later, when an admin starts it.
    const [signupMode, setSignupMode] = useState(false);
    const [capacity, setCapacity] = useState(8);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [playerFilter, setPlayerFilter] = useState("");
    // Team formats (Team Americano, Challenger, Masters, King of the Court)
    const [numTeams, setNumTeams] = useState(4);
    const [teamSlots, setTeamSlots] = useState<TeamSlot[]>(() => Array.from({ length: 4 }, () => ["", ""]));
    const [mastersFormat, setMastersFormat] = useState<MastersFormat>(RECOMMENDED_MASTERS_FORMAT);
    const [challengerFormat, setChallengerFormat] = useState<ChallengerFormat>("BRACKETS");
    // King of the Court: the field's text and the last valid number of rounds typed into it.
    const [totalRounds, setTotalRounds] = useState(7);
    const [totalRoundsInput, setTotalRoundsInput] = useState("7");
    const [error, setError] = useState("");
    const [addingPlayer, setAddingPlayer] = useState(false);

    const divisionPlayersQuery = trpc.division.players.useQuery({ division });
    const allPlayersQuery = trpc.division.allPlayers.useQuery();

    const divisionPlayers = divisionPlayersQuery.data ?? [];
    const allPlayers = allPlayersQuery.data ?? [];
    const q = playerFilter.trim().toLowerCase();
    // In sign-up mode the list is a head start on the spots, not the full draw.
    const playerCap = signupMode ? capacity : maxPlayers;
    const selectedPlayers = allPlayers.filter(p => selectedIds.includes(p.id));
    const unselectedPlayers = (() => {
        if (selectedIds.length >= playerCap) return [];
        if (q) return allPlayers.filter(p => p.name.toLowerCase().includes(q) && !selectedIds.includes(p.id));
        return divisionPlayers.filter(p => !selectedIds.includes(p.id));
    })();

    // Every format has its own create call; they all end the same way.
    const handlers = { onSuccess: onCreated, onError: (e: { message: string }) => setError(e.message) };
    const create = trpc.tournament.create.useMutation(handlers);
    const createTeamAmericano = trpc.tournament.createTeamAmericano.useMutation(handlers);
    const createChallenger = trpc.tournament.createChallenger.useMutation(handlers);
    const createMasters = trpc.tournament.createMasters.useMutation(handlers);
    const createKingOfTheCourt = trpc.tournament.createKingOfTheCourt.useMutation(handlers);
    const createOpen = trpc.tournament.createOpen.useMutation(handlers);

    const capacities = capacityOptions(type, challengerFormat);
    const isPending = create.isPending || createTeamAmericano.isPending || createChallenger.isPending
        || createMasters.isPending || createKingOfTheCourt.isPending || createOpen.isPending;

    function changeNumTeams(n: number) {
        setNumTeams(n);
        setTeamSlots(prev => Array.from({ length: n }, (_, i) => prev[i] ?? ["", ""]));
    }

    function selectType(t: CreatableType) {
        setType(t);
        if (t === "CHALLENGER") changeNumTeams(8);
        if (t === "MASTERS") {
            changeNumTeams(mastersTeamCount(mastersFormat));
            setCapacity(mastersTeamCount(mastersFormat) * 2);
            return;
        }
        const allowed = capacityOptions(t, challengerFormat);
        if (!allowed.includes(capacity)) setCapacity(allowed[0]);
    }

    // Placement matches pair the two groups, so they need all 8 teams.
    function changeChallengerFormat(format: ChallengerFormat) {
        setChallengerFormat(format);
        if (format === "PLACEMENT") {
            changeNumTeams(8);
            setCapacity(16);
        }
    }

    function changeMastersFormat(format: MastersFormat) {
        setMastersFormat(format);
        const teams = mastersTeamCount(format);
        changeNumTeams(teams);
        setCapacity(teams * 2);
        setSelectedIds(prev => prev.slice(0, teams * 2));
    }

    function updateTeamSlot(i: number, slot: 0 | 1, playerId: string) {
        setTeamSlots(prev => prev.map((t, idx) => idx === i ? (slot === 0 ? [playerId, t[1]] : [t[0], playerId]) : t));
    }

    function togglePlayer(id: string) {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= playerCap) return prev;
            if (playerFilter) setPlayerFilter("");
            return [...prev, id];
        });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!name.trim()) return setError("Tournament name is required.");
        const detailsProblem = detailsError(details);
        if (detailsProblem) return setError(detailsProblem);
        const tournament = { name: name.trim(), date, ...detailsInput(details), division };
        if (signupMode) {
            createOpen.mutate({
                ...tournament, type, pointsPerGame, totalRounds, maxPlayers: capacity, playerIds: selectedIds,
                ...(type === "MASTERS" ? mastersFormat : {}),
                ...(type === "CHALLENGER" ? { challengerFormat } : {}),
            });
            return;
        }
        if (type === "TEAM_AMERICANO") {
            const problem = teamsError(teamSlots);
            if (problem) return setError(problem);
            createTeamAmericano.mutate({ ...tournament, pointsPerGame, teams: toTeams(teamSlots) });
        } else if (type === "CHALLENGER") {
            if (teamSlots.length !== 4 && teamSlots.length !== 8) return setError("Challenger requires 4 or 8 teams.");
            const problem = teamsError(teamSlots);
            if (problem) return setError(problem);
            createChallenger.mutate({ ...tournament, pointsPerGame: 32, format: challengerFormat, teams: toTeams(teamSlots) });
        } else if (type === "MASTERS") {
            const teamsNeeded = mastersTeamCount(mastersFormat);
            if (teamSlots.length !== teamsNeeded) return setError(`${mastersFormat.groupCount} groups of ${mastersFormat.teamsPerGroup} needs ${teamsNeeded} teams.`);
            const problem = teamsError(teamSlots);
            if (problem) return setError(problem);
            createMasters.mutate({ ...tournament, ...mastersFormat, teams: toTeams(teamSlots) });
        } else if (type === "KING_OF_THE_COURT") {
            const problem = teamsError(teamSlots);
            if (problem) return setError(problem);
            createKingOfTheCourt.mutate({ ...tournament, totalRounds, teams: toTeams(teamSlots) });
        } else {
            if (selectedIds.length !== maxPlayers) return setError(`Select exactly ${maxPlayers} players.`);
            create.mutate({ ...tournament, type, pointsPerGame, playerIds: selectedIds });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-5 max-w-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-800">Create Tournament</h2>
                <button
                    type="button"
                    onClick={onImport}
                    className="inline-flex items-center gap-1.5 text-sm font-medium border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:border-[#FF4200] hover:text-[#FF4200] transition-colors shrink-0"
                >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                    Import from Rankedin
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={compactField}
                        placeholder="e.g. Division 1 — Round 5"
                    />
                </Field>
                <Field label="Date">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={compactField} />
                </Field>
            </div>

            <Field label="Time (local) and place — optional">
                <TimeInputs value={details} onChange={setDetails} />
            </Field>

            <Field label="Level">
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map(d => (
                        <ChoiceButton key={d} selected={division === d} onClick={() => { setDivision(d); setSelectedIds([]); setPlayerFilter(""); }}>
                            {DIVISION_NAMES[d]}
                        </ChoiceButton>
                    ))}
                </div>
            </Field>

            <Field label="Type">
                <div className="flex flex-wrap gap-2">
                    {CREATABLE_TYPES.map(t => (
                        <ChoiceButton key={t} selected={type === t} onClick={() => selectType(t)}>
                            {TOURNAMENT_TYPE_LABELS[t]}
                        </ChoiceButton>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">{tournamentTypeDescription(type)}</p>
            </Field>

            <Field label="Players">
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: false, label: "Set the full line-up now" },
                        { value: true, label: "Let players sign up" },
                    ].map(({ value, label }) => (
                        <ChoiceButton key={label} selected={signupMode === value} onClick={() => { setSignupMode(value); setError(""); }}>
                            {label}
                        </ChoiceButton>
                    ))}
                </div>
            </Field>

            {type !== "CHALLENGER" && type !== "KING_OF_THE_COURT" && type !== "MASTERS" && (
                <Field label="Points per game">
                    <div className="flex flex-wrap gap-2">
                        {[16, 24, 32, 40].map(p => (
                            <ChoiceButton key={p} selected={pointsPerGame === p} onClick={() => setPointsPerGame(p)}>
                                {p}
                            </ChoiceButton>
                        ))}
                    </div>
                </Field>
            )}

            {type === "KING_OF_THE_COURT" && (
                <Field label="Number of rounds">
                    <div className="pt-2">
                        <input
                            type="number"
                            min={1}
                            max={15}
                            value={totalRoundsInput}
                            onChange={e => {
                                const raw = e.target.value;
                                setTotalRoundsInput(raw);
                                const parsed = Number(raw);
                                if (raw !== "" && Number.isInteger(parsed) && parsed >= 1 && parsed <= 15) {
                                    setTotalRounds(parsed);
                                }
                            }}
                            onBlur={() => {
                                const clamped = Math.max(1, Math.min(15, Number(totalRoundsInput) || 1));
                                setTotalRounds(clamped);
                                setTotalRoundsInput(String(clamped));
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-16"
                        />
                    </div>
                </Field>
            )}

            {type === "CHALLENGER" && (
                <Field label="After the groups">
                    <ChallengerFormatPicker value={challengerFormat} onChange={changeChallengerFormat} />
                </Field>
            )}

            {type === "MASTERS" && (
                <Field label="Group stage">
                    <MastersFormatPicker value={mastersFormat} onChange={changeMastersFormat} />
                </Field>
            )}

            {signupMode && type !== "MASTERS" && (
                <Field label="Spots">
                    <div className="flex flex-wrap gap-2">
                        {capacities.map(n => (
                            <ChoiceButton key={n} selected={capacity === n} onClick={() => { setCapacity(n); setSelectedIds(prev => prev.slice(0, n)); }}>
                                {n}
                            </ChoiceButton>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Players claim the open spots from the tournament page — add anyone you already
                        know is coming below. You generate the draw afterwards from the Sign-ups
                        list{isTeamBasedType(type) ? ", pairing them into teams then." : "."}
                    </p>
                </Field>
            )}

            <Field label="Prizes (optional)">
                <PrizeInputs value={details} onChange={setDetails} />
            </Field>

            <Field label="Price per person (lei) — optional">
                <div className="space-y-3">
                    <FeeInputs
                        entryFee={details.entryFee}
                        advanceFee={details.advanceFee}
                        onEntryFee={entryFee => setDetails({ ...details, entryFee })}
                        onAdvanceFee={advanceFee => setDetails({ ...details, advanceFee })}
                    />
                    <PayToSelect value={details} onChange={setDetails} />
                </div>
            </Field>

            {(!signupMode && isTeamBasedType(type)) ? (
                <>
                    {type !== "MASTERS" && (
                        <Field label="Number of teams">
                            <div className="flex gap-2">
                                {(type === "CHALLENGER" ? (challengerFormat === "PLACEMENT" ? [8] : [4, 8]) : [4, 6, 8]).map(n => (
                                    <ChoiceButton key={n} selected={numTeams === n} onClick={() => changeNumTeams(n)}>
                                        {n}
                                    </ChoiceButton>
                                ))}
                            </div>
                        </Field>
                    )}

                    <TeamSlotsInput
                        teamSlots={teamSlots}
                        onChange={updateTeamSlot}
                        players={allPlayers}
                        division={division}
                        summary={teamsSummary(type, numTeams, mastersFormat, challengerFormat, totalRounds)}
                        teamsPerGroup={type === "MASTERS" ? mastersFormat.teamsPerGroup : undefined}
                    />
                </>
            ) : (
                <>
                    {!signupMode && (
                        <Field label="Number of players">
                            <div className="flex gap-2">
                                {[8, 12, 16].map(n => (
                                    <ChoiceButton key={n} selected={maxPlayers === n} onClick={() => { setMaxPlayers(n); setSelectedIds([]); }}>
                                        {n}
                                    </ChoiceButton>
                                ))}
                            </div>
                        </Field>
                    )}

                    <div className="space-y-1">
                        <div className="sticky top-[50px] z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 py-2 bg-white border-b border-gray-100 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                                {signupMode ? "Add players now (optional)" : "Players"}
                            </span>
                            <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                                selectedIds.length === playerCap
                                    ? "bg-[#FF4200] text-white"
                                    : selectedIds.length > 0
                                    ? "bg-[#FF4200]/10 text-[#FF4200]"
                                    : "bg-gray-100 text-gray-600"
                            }`}>
                                {selectedIds.length} / {playerCap}
                            </span>
                        </div>
                        <PlayerSearch value={playerFilter} onChange={setPlayerFilter} />
                        {addingPlayer ? (
                            <div className="mb-2">
                                <AddPlayerInline
                                    defaultName={playerFilter}
                                    defaultDivision={division}
                                    onCreated={(p) => {
                                        setAddingPlayer(false);
                                        setPlayerFilter("");
                                        togglePlayer(p.id);
                                    }}
                                    onCancel={() => setAddingPlayer(false)}
                                />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAddingPlayer(true)}
                                className="text-sm font-medium text-[#FF4200] hover:underline mb-1 py-2"
                            >
                                + Add new player
                            </button>
                        )}
                        {divisionPlayersQuery.isPending && <p className="text-gray-500 text-sm">Loading…</p>}
                        {!signupMode && !q && divisionPlayers.length < maxPlayers && !divisionPlayersQuery.isPending && (
                            <p className="text-amber-600 text-sm">{divisionLabel(division)} only has {divisionPlayers.length} players — need {maxPlayers}.</p>
                        )}
                        {q && unselectedPlayers.length === 0 && !allPlayersQuery.isPending && (
                            <p className="text-gray-500 text-sm">No players match "{playerFilter}".</p>
                        )}
                        {selectedPlayers.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-1">
                                {selectedPlayers.map(p => (
                                    <PlayerButton key={p.id} player={p} selected otherDivision={p.division !== division} onClick={() => togglePlayer(p.id)} />
                                ))}
                            </div>
                        )}
                        {unselectedPlayers.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                                {unselectedPlayers.map(p => (
                                    <PlayerButton key={p.id} player={p} selected={false} otherDivision={p.division !== division} onClick={() => togglePlayer(p.id)} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto bg-[#FF4200] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
            >
                {isPending ? "Creating…" : signupMode ? "Open Sign-ups" : "Create & Generate Schedule"}
            </button>
        </form>
    );
}

// The first problem with the teams as entered: an empty slot, or a player twice in one team.
function teamsError(teamSlots: TeamSlot[]): string | null {
    for (let i = 0; i < teamSlots.length; i++) {
        const [p1, p2] = teamSlots[i];
        if (!p1 || !p2) return `Team ${i + 1} is incomplete — select both players.`;
        if (p1 === p2) return `Team ${i + 1} has the same player in both slots.`;
    }
    return null;
}

function toTeams(teamSlots: TeamSlot[]) {
    return teamSlots.map(([p1, p2]) => ({ player1Id: p1, player2Id: p2 }));
}

// What the chosen teams make up, shown above the team rows.
function teamsSummary(type: CreatableType, numTeams: number, masters: MastersFormat, challengerFormat: ChallengerFormat, totalRounds: number): string {
    if (type === "MASTERS") {
        const final = masters.groupCount === 1
            ? "play the Final"
            : `to the ${STAGE_INFO[mastersKnockoutStages(masters.groupCount)[0]].title.toLowerCase()}`;
        return `${numTeams} teams · ${masters.groupCount} × ${masters.teamsPerGroup} · groups in team order · top 2 ${final}`;
    }
    if (type === "CHALLENGER") {
        return numTeams === 8
            ? `8 teams · 2 groups of 4 · groups assigned randomly · ${challengerFormat === "PLACEMENT" ? "placement matches" : "golden/silver brackets"}`
            : "4 teams · 1 group · final + 3rd place match";
    }
    if (type === "KING_OF_THE_COURT") return `${numTeams / 2} courts · ${totalRounds} rounds`;
    return `${(numTeams * (numTeams - 1)) / 2} matches · ${numTeams - 1} rounds`;
}

// Searches players across every level (the list below shows the chosen level's players otherwise).
function PlayerSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <div className="relative mb-2 pt-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Search across all divisions…"
                className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] focus:border-transparent bg-white placeholder-gray-400"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>
            )}
        </div>
    );
}

// A player to tick on or off the line-up; one from another level says which.
function PlayerButton({ player, selected, otherDivision, onClick }: {
    player: { name: string; division: number };
    selected: boolean;
    otherDivision: boolean;
    onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick}
            className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-colors ${selected ? "bg-[#FF4200]/10 border-[#FF4200] text-[#333366] font-medium" : "border-gray-200 text-gray-700 hover:border-[#FF4200]/50"}`}>
            {selected && <span className="mr-1">✓</span>}
            {player.name}
            {otherDivision && <span className="ml-1.5 text-xs font-normal text-gray-400">({divisionLabel(player.division)})</span>}
        </button>
    );
}

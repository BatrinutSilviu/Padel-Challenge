import { Fragment } from "react";
import { PlayerPicker } from "../../PlayerPicker";
import { GroupHeading, TeamNumber } from "../TeamNumber";
import type { useTeamAllocation } from "./useTeamAllocation";

// Putting the confirmed players into teams (and so groups) before the draw: by hand, by
// tapping the players not in a team yet, or with a random draw.
export function TeamAllocationCard({ allocation, teamsPerGroup }: {
    allocation: ReturnType<typeof useTeamAllocation>;
    teamsPerGroup: number | null;
}) {
    const { registered, byPlayerId, partnerOf, teamSlots, allocated, unallocated, splitPairs, randomDraw, shuffleGroups, clear, placePlayer, placeInFirstFree } = allocation;
    return (
        <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-gray-700">{teamsPerGroup ? "Teams & groups" : "Teams"}</p>
                    <p className="text-xs text-gray-400">
                        Once everyone is confirmed, pick the teams by hand or draw them at random.
                        Players who signed up together always stay partners.
                        {teamsPerGroup && " Groups are filled in team order."}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                        onClick={randomDraw}
                        className="flex-1 sm:flex-none text-sm font-medium px-3 py-2 sm:py-1.5 rounded-lg border border-[#FF4200] text-[#FF4200] hover:bg-[#FF4200]/5 transition-colors whitespace-nowrap"
                    >
                        Random draw
                    </button>
                    {teamsPerGroup && (
                        <button
                            onClick={shuffleGroups}
                            disabled={allocated.size === 0}
                            title="Keep the teams, draw their groups"
                            className="flex-1 sm:flex-none text-sm font-medium px-3 py-2 sm:py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200] transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                            Shuffle groups
                        </button>
                    )}
                    <button
                        onClick={clear}
                        disabled={allocated.size === 0}
                        className="text-sm font-medium px-3 py-2 sm:py-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {unallocated.length > 0 && (
                <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                    <p className="text-xs text-gray-500 mb-2">
                        Not in a team yet ({unallocated.length}) — tap a player to put them in the next free team.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {unallocated.map(p => {
                            const partner = partnerOf(p.playerId);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => placeInFirstFree(p.playerId)}
                                    className="text-xs font-medium px-2.5 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:border-[#FF4200] hover:text-[#FF4200]"
                                >
                                    {p.player.name}
                                    {partner && <span className="text-gray-400"> + {byPlayerId.get(partner)?.player.name}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {teamSlots.map(([p1, p2], i) => {
                const pickerPlayers = registered.map(p => p.player);
                return (
                    <Fragment key={i}>
                    {teamsPerGroup && <GroupHeading index={i} teamsPerGroup={teamsPerGroup} />}
                    <div className="flex items-center gap-2">
                        <TeamNumber index={i} />
                        <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                            <PlayerPicker
                                value={p1}
                                onChange={id => placePlayer(i, 0, id)}
                                players={pickerPlayers}
                                excludeIds={new Set([...allocated].filter(id => id !== p1))}
                                placeholder="Player 1"
                                allowAdd={false}
                            />
                            <PlayerPicker
                                value={p2}
                                onChange={id => placePlayer(i, 1, id)}
                                players={pickerPlayers}
                                excludeIds={new Set([...allocated].filter(id => id !== p2))}
                                placeholder="Player 2"
                                align="right"
                                allowAdd={false}
                            />
                        </div>
                    </div>
                    </Fragment>
                );
            })}

            {splitPairs.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {splitPairs.map(p => `${p.player.name} and ${byPlayerId.get(p.partnerId!)?.player.name}`).join(", ")}
                    {" "}signed up together — put them in the same team.
                </p>
            )}
        </div>
    );
}

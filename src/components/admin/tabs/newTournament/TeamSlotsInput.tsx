import { Fragment } from "react";
import { PlayerPicker } from "../../../PlayerPicker";
import { GroupHeading, TeamNumber } from "../../TeamNumber";

// Two player ids per team; "" while a slot is still empty.
export type TeamSlot = [string, string];

type Player = { id: string; name: string; division: number };

// The teams of a team format, one row of two player pickers per team. A player can be in
// only one team. Masters groups are filled in team order, so their rows get group headings.
export function TeamSlotsInput({ teamSlots, onChange, players, division, summary, teamsPerGroup }: {
    teamSlots: TeamSlot[];
    onChange: (team: number, slot: 0 | 1, playerId: string) => void;
    players: Player[];
    division: number;
    summary: string;
    teamsPerGroup?: number;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Teams</span>
                <span className="text-xs text-gray-400">{summary}</span>
            </div>
            {teamSlots.map(([p1, p2], i) => {
                const assignedIds = new Set(teamSlots.flat().filter(Boolean));
                return (
                    <Fragment key={i}>
                    {teamsPerGroup !== undefined && <GroupHeading index={i} teamsPerGroup={teamsPerGroup} />}
                    <div className="flex items-center gap-2">
                        <TeamNumber index={i} />
                        <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                            <PlayerPicker value={p1} onChange={id => onChange(i, 0, id)} players={players} excludeIds={new Set([...assignedIds].filter(id => id !== p1))} placeholder="Player 1" division={division} />
                            <PlayerPicker value={p2} onChange={id => onChange(i, 1, id)} players={players} excludeIds={new Set([...assignedIds].filter(id => id !== p2))} placeholder="Player 2" division={division} align="right" />
                        </div>
                    </div>
                    </Fragment>
                );
            })}
        </div>
    );
}

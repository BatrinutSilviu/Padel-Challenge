import { useEffect, useState } from "react";
import { isTeamBasedType, type TournamentData } from "../../../lib/tournaments";

type TeamSlot = [string, string];

function shuffle<T>(xs: T[]): T[] {
    for (let i = xs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
}

// The teams a sign-up sheet's confirmed players are put in before the draw, for team
// formats. Confirming a player doesn't put them in a team or group: the admin allocates
// everyone at the end, by hand or with a random draw. The draft is kept in this browser so
// a half-done allocation survives a reload. Partners who signed up together and are both
// confirmed always stay together.
export function useTeamAllocation(tournament: TournamentData) {
    // Only confirmed players make the draw; the rest are waiting to pay.
    const registered = tournament.participants.filter(p => p.confirmed);
    const registeredIds = registered.map(p => p.playerId);
    const byPlayerId = new Map(tournament.participants.map(p => [p.playerId, p]));
    // Partners who signed up together and are both confirmed get paired up first.
    const partnerOf = (id: string) => {
        const partnerId = byPlayerId.get(id)?.partnerId;
        return partnerId && registeredIds.includes(partnerId) ? partnerId : null;
    };
    const idKey = registeredIds.join(",");
    const teamBased = isTeamBasedType(tournament.type);
    const numTeams = Math.floor(registered.length / 2);

    const draftKey = `teamAllocation:${tournament.id}`;
    const [teamSlots, setTeamSlots] = useState<TeamSlot[]>(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(draftKey) ?? "[]");
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    });
    useEffect(() => {
        try { localStorage.setItem(draftKey, JSON.stringify(teamSlots)); } catch { /* storage unavailable */ }
    }, [draftKey, teamSlots]);

    // Keep the grid in step with the confirmed list: one row per team, and anyone
    // who's no longer confirmed leaves their slot empty. Nobody is added here.
    useEffect(() => {
        if (!teamBased) return;
        setTeamSlots(prev => Array.from({ length: numTeams }, (_, i) => {
            const [a, b] = prev[i] ?? ["", ""];
            return [registeredIds.includes(a) ? a : "", registeredIds.includes(b) ? b : ""];
        }));
        // registeredIds is a new array every render; idKey stands in for it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idKey, numTeams, teamBased]);

    const allocated = new Set(teamSlots.flat().filter(Boolean));
    const unallocated = registered.filter(p => !allocated.has(p.playerId));
    // Partners who signed up together but have been put in different teams.
    const splitPairs = registered.filter(p => {
        const partner = partnerOf(p.playerId);
        if (!partner || p.playerId > partner || !allocated.has(p.playerId) || !allocated.has(partner)) return false;
        return !teamSlots.some(t => t.includes(p.playerId) && t.includes(partner));
    });
    const teamsComplete = !teamBased || (teamSlots.length === numTeams && teamSlots.every(([a, b]) => a && b && a !== b) && splitPairs.length === 0);

    // Random teams in a random order (so random groups too), but players who signed
    // up together stay partners.
    function randomDraw() {
        const fixed: TeamSlot[] = [];
        const seen = new Set<string>();
        for (const id of registeredIds) {
            const partner = partnerOf(id);
            if (partner && !seen.has(id)) {
                fixed.push([id, partner]);
                seen.add(id).add(partner);
            }
        }
        const singles = shuffle(registeredIds.filter(id => !seen.has(id)));
        const drawn: TeamSlot[] = [];
        for (let i = 0; i + 1 < singles.length; i += 2) drawn.push([singles[i], singles[i + 1]]);
        setTeamSlots(shuffle([...fixed, ...drawn]).slice(0, numTeams));
    }

    // Keeps the teams as they are and only draws which group each one plays in.
    function shuffleGroups() {
        setTeamSlots(prev => shuffle([...prev]));
    }

    function clear() {
        setTeamSlots(prev => prev.map(() => ["", ""]));
    }

    // Puts a player in a team slot; a player with a confirmed partner brings the
    // partner along into the other slot of the same team.
    function placePlayer(team: number, slot: 0 | 1, id: string) {
        setTeamSlots(prev => {
            const partner = id ? partnerOf(id) : null;
            const moving = new Set([id, partner].filter(Boolean));
            const next = prev.map(t => t.map(x => moving.has(x) ? "" : x) as TeamSlot);
            next[team][slot] = id;
            if (partner) next[team][slot === 0 ? 1 : 0] = partner;
            return next;
        });
    }

    // Drops a player (and their partner) into the first team with room for them.
    function placeInFirstFree(id: string) {
        const needsPair = !!partnerOf(id);
        const team = teamSlots.findIndex(([a, b]) => needsPair ? !a && !b : !a || !b);
        if (team === -1) return;
        placePlayer(team, teamSlots[team][0] ? 1 : 0, id);
    }

    // Once the tournament starts the draft has served its purpose.
    function forgetDraft() {
        try { localStorage.removeItem(draftKey); } catch { /* storage unavailable */ }
    }

    return {
        registered, byPlayerId, partnerOf, teamBased, numTeams,
        teamSlots, allocated, unallocated, splitPairs, teamsComplete,
        randomDraw, shuffleGroups, clear, placePlayer, placeInFirstFree, forgetDraft,
    };
}

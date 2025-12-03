import { EventList } from './EventList';
import { EventDetails } from './EventDetails';
import { MatchTracker } from './MatchTracker';
import { TeamManager } from './TeamManager';
import { useState } from 'react';
import {trpc} from "../trpc";

export type Event = {
    id: string;
    name: string;
    date: string;
    location: string;
    maxTeams: number;
    enrolledTeams: string[];
    status: 'upcoming' | 'past';
    matches?: Match[];
};

export type Match = {
    id: string;
    eventId: string;
    team1: string;
    team2: string;
    score1: number;
    score2: number;
    completed: boolean;
};

export type Team = {
    id: string;
    name: string;
    player1: string;
    player2: string;
};

export function Home() {
    const eventsInfo = trpc.getEvents.useQuery();
    const teamsInfo = trpc.getTeams.useQuery();

    const [view, setView] = useState<'events' | 'matches' | 'teams'>('events');
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    if (eventsInfo.isPending || teamsInfo.isPending) {
        return <div>Loading...</div>;
    }

    const handleEnroll = (eventId: string, teamId: string) => {
        setEvents(eventsInfo.data.map(event => {
            if (event.id === eventId && !event.enrolledTeams.includes(teamId)) {
                return { ...event, enrolledTeams: [...event.enrolledTeams, teamId] };
            }

            return event;
        }));
    };

    const handleUnenroll = (eventId: string, teamId: string) => {
        setEvents(eventsInfo.data.map(event => {
            if (event.id === eventId) {
                return { ...event, enrolledTeams: event.enrolledTeams.filter(id => id !== teamId) };
            }

            return event;
        }));
    };

    const handleUpdateScore = (matchId: string, score1: number, score2: number, completed: boolean) => {
        setEvents(eventsInfo.data.map(event => {
            if (event.matches) {
                return {
                    ...event,
                    matches: event.matches.map(match =>
                        match.id === matchId ? { ...match, score1, score2, completed } : match
                    ),
                };
            }

            return event;
        }));
    };

    const handleAddTeam = (team: Team) => {
        setTeams([...teams, team]);
    };

    const handleDeleteTeam = (teamId: string) => {
        setTeams(teamsInfo.data.filter(team => team.id !== teamId));
        // Remove team from enrolled events
        setEvents(eventsInfo.data.map(event => ({
            ...event,
            enrolledTeams: event.enrolledTeams.filter(id => id !== teamId),
        })));
    };

    const selectedEvent = eventsInfo.data.find(event => event.id === selectedEventId);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-emerald-600">Padel Events</h1>
                </div>
            </header>

            <nav className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setView('events')}
                            className={`py-4 border-b-2 transition-colors ${
                                view === 'events'
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Events
                        </button>
                        <button
                            onClick={() => setView('matches')}
                            className={`py-4 border-b-2 transition-colors ${
                                view === 'matches'
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Matches
                        </button>
                        <button
                            onClick={() => setView('teams')}
                            className={`py-4 border-b-2 transition-colors ${
                                view === 'teams'
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Teams
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {view === 'events' && !selectedEventId && (
                    <EventList
                        events={eventsInfo.data}
                        teams={teamsInfo.data}
                        onSelectEvent={setSelectedEventId}
                        onEnroll={handleEnroll}
                        onUnenroll={handleUnenroll}
                    />
                )}

                {view === 'events' && selectedEventId && selectedEvent && (
                    <EventDetails
                        event={selectedEvent}
                        teams={teamsInfo.data}
                        onBack={() => setSelectedEventId(null)}
                        onEnroll={handleEnroll}
                        onUnenroll={handleUnenroll}
                        onUpdateScore={handleUpdateScore}
                    />
                )}

                {view === 'matches' && (
                    <MatchTracker
                        events={eventsInfo.data}
                        teams={teamsInfo.data}
                        onUpdateScore={handleUpdateScore}
                    />
                )}

                {view === 'teams' && (
                    <TeamManager
                        teams={teamsInfo.data}
                        onAddTeam={handleAddTeam}
                        onDeleteTeam={handleDeleteTeam}
                    />
                )}
            </main>
        </div>
    );
}
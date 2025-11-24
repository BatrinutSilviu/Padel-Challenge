import { useState } from 'react';
import { EventList } from './components/EventList';
import { EventDetails } from './components/EventDetails';
import { MatchTracker } from './components/MatchTracker';
import { TeamManager } from './components/TeamManager';
import {AuthPage} from "./components/AuthPage";

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

export default function App() {
  const [view, setView] = useState<'events' | 'matches' | 'teams'>('events');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([
    { id: 't1', name: 'Thunder Duo', player1: 'John Smith', player2: 'Mike Johnson' },
    { id: 't2', name: 'Net Masters', player1: 'Sarah Williams', player2: 'Emily Davis' },
    { id: 't3', name: 'Ace Partners', player1: 'David Brown', player2: 'Chris Wilson' },
    { id: 't4', name: 'Court Kings', player1: 'Alex Martinez', player2: 'Ryan Taylor' },
  ]);

  const [events, setEvents] = useState<Event[]>([
    {
      id: 'e1',
      name: 'Spring Championship',
      date: '2025-11-28T10:00:00',
      location: 'Central Tennis Club',
      maxTeams: 8,
      enrolledTeams: ['t1', 't2', 't3', 't4'],
      status: 'upcoming',
      matches: [
        { id: 'm1', eventId: 'e1', team1: 't1', team2: 't2', score1: 0, score2: 0, completed: false },
        { id: 'm2', eventId: 'e1', team1: 't3', team2: 't4', score1: 0, score2: 0, completed: false },
      ],
    },
    {
      id: 'e2',
      name: 'Winter Classic',
      date: '2025-12-15T09:00:00',
      location: 'Riverside Courts',
      maxTeams: 6,
      enrolledTeams: ['t1', 't3'],
      status: 'upcoming',
    },
    {
      id: 'e3',
      name: 'Fall Tournament',
      date: '2025-10-15T10:00:00',
      location: 'Central Tennis Club',
      maxTeams: 8,
      enrolledTeams: ['t1', 't2', 't3', 't4'],
      status: 'past',
      matches: [
        { id: 'm3', eventId: 'e3', team1: 't1', team2: 't2', score1: 6, score2: 4, completed: true },
        { id: 'm4', eventId: 'e3', team1: 't3', team2: 't4', score1: 7, score2: 5, completed: true },
        { id: 'm5', eventId: 'e3', team1: 't1', team2: 't3', score1: 6, score2: 3, completed: true },
      ],
    },
  ]);

  const handleEnroll = (eventId: string, teamId: string) => {
    setEvents(events.map(event => {
      if (event.id === eventId && !event.enrolledTeams.includes(teamId)) {
        return { ...event, enrolledTeams: [...event.enrolledTeams, teamId] };
      }
      return event;
    }));
  };

  const handleUnenroll = (eventId: string, teamId: string) => {
    setEvents(events.map(event => {
      if (event.id === eventId) {
        return { ...event, enrolledTeams: event.enrolledTeams.filter(id => id !== teamId) };
      }
      return event;
    }));
  };

  const handleUpdateScore = (matchId: string, score1: number, score2: number, completed: boolean) => {
    setEvents(events.map(event => {
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
    setTeams(teams.filter(t => t.id !== teamId));
    // Remove team from enrolled events
    setEvents(events.map(event => ({
      ...event,
      enrolledTeams: event.enrolledTeams.filter(id => id !== teamId),
    })));
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-emerald-600">Tennis Doubles Events</h1>
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
            events={events}
            teams={teams}
            onSelectEvent={setSelectedEventId}
            onEnroll={handleEnroll}
            onUnenroll={handleUnenroll}
          />
        )}

        {view === 'events' && selectedEventId && selectedEvent && (
          <EventDetails
            event={selectedEvent}
            teams={teams}
            onBack={() => setSelectedEventId(null)}
            onEnroll={handleEnroll}
            onUnenroll={handleUnenroll}
            onUpdateScore={handleUpdateScore}
          />
        )}

        {view === 'matches' && (
          <MatchTracker
            events={events}
            teams={teams}
            onUpdateScore={handleUpdateScore}
          />
        )}

        {view === 'teams' && (
          <TeamManager
            teams={teams}
            onAddTeam={handleAddTeam}
            onDeleteTeam={handleDeleteTeam}
          />
        )}
      </main>
    </div>
  );
}

export function login() {
    return <AuthPage />;
}
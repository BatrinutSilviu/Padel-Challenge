import { Calendar, MapPin, Users } from 'lucide-react';
import type { Event, Team } from '../App';

type EventListProps = {
  events: Event[];
  teams: Team[];
  onSelectEvent: (eventId: string) => void;
  onEnroll: (eventId: string, teamId: string) => void;
  onUnenroll: (eventId: string, teamId: string) => void;
};

export function EventList({ events, teams, onSelectEvent, onEnroll, onUnenroll }: EventListProps) {
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.date) >= now).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const pastEvents = events.filter(e => new Date(e.date) < now).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown Team';
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-gray-900 mb-4">Upcoming Events</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {upcomingEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              teams={teams}
              formatDate={formatDate}
              getTeamName={getTeamName}
              onSelectEvent={onSelectEvent}
              onEnroll={onEnroll}
              onUnenroll={onUnenroll}
            />
          ))}
          {upcomingEvents.length === 0 && (
            <p className="text-gray-500 col-span-2">No upcoming events</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-gray-900 mb-4">Past Events</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {pastEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              teams={teams}
              formatDate={formatDate}
              getTeamName={getTeamName}
              onSelectEvent={onSelectEvent}
              onEnroll={onEnroll}
              onUnenroll={onUnenroll}
            />
          ))}
          {pastEvents.length === 0 && (
            <p className="text-gray-500 col-span-2">No past events</p>
          )}
        </div>
      </section>
    </div>
  );
}

function EventCard({ 
  event, 
  teams, 
  formatDate, 
  getTeamName, 
  onSelectEvent, 
  onEnroll, 
  onUnenroll 
}: { 
  event: Event;
  teams: Team[];
  formatDate: (date: string) => string;
  getTeamName: (teamId: string) => string;
  onSelectEvent: (eventId: string) => void;
  onEnroll: (eventId: string, teamId: string) => void;
  onUnenroll: (eventId: string, teamId: string) => void;
}) {
  const isPast = new Date(event.date) < new Date();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-gray-900 mb-2">{event.name}</h3>
          {isPast && (
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded">
              Completed
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(event.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span>{event.enrolledTeams.length} / {event.maxTeams} teams enrolled</span>
        </div>
      </div>

      {!isPast && teams.length > 0 && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Enroll Team</label>
          <div className="flex gap-2">
            <select
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              onChange={(e) => {
                if (e.target.value) {
                  onEnroll(event.id, e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="">Select a team...</option>
              {teams
                .filter(team => !event.enrolledTeams.includes(team.id))
                .map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {event.enrolledTeams.length > 0 && (
        <div className="mb-4">
          <p className="text-gray-700 mb-2">Enrolled Teams:</p>
          <div className="flex flex-wrap gap-2">
            {event.enrolledTeams.map(teamId => (
              <span
                key={teamId}
                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full"
              >
                {getTeamName(teamId)}
                {!isPast && (
                  <button
                    onClick={() => onUnenroll(event.id, teamId)}
                    className="ml-1 hover:text-emerald-900"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onSelectEvent(event.id)}
        className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
      >
        View Details
      </button>
        <button
            onClick={() => onSelectEvent(event.id)}
            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors my-4"
        >
            Enroll
        </button>
    </div>
  );
}

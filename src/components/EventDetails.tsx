import { ArrowLeft, Calendar, MapPin, Users, Trophy } from 'lucide-react';
import type { Event, Team } from '../App';

type EventDetailsProps = {
  event: Event;
  teams: Team[];
  onBack: () => void;
  onEnroll: (eventId: string, teamId: string) => void;
  onUnenroll: (eventId: string, teamId: string) => void;
  onUpdateScore: (matchId: string, score1: number, score2: number, completed: boolean) => void;
};

export function EventDetails({ 
  event, 
  teams, 
  onBack, 
  onEnroll, 
  onUnenroll,
  onUpdateScore 
}: EventDetailsProps) {
  const isPast = new Date(event.date) < new Date();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTeam = (teamId: string) => {
    return teams.find(t => t.id === teamId);
  };

  const getTeamName = (teamId: string) => {
    return getTeam(teamId)?.name || 'Unknown Team';
  };

  const completedMatches = event.matches?.filter(m => m.completed) || [];
  const upcomingMatches = event.matches?.filter(m => !m.completed) || [];

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-gray-900">{event.name}</h1>
          {isPast && (
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded">
              Completed
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-500">Date & Time</p>
              <p className="text-gray-900">{formatDate(event.date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-500">Location</p>
              <p className="text-gray-900">{event.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-500">Teams</p>
              <p className="text-gray-900">{event.enrolledTeams.length} / {event.maxTeams}</p>
            </div>
          </div>
        </div>

        {!isPast && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-gray-900 mb-4">Enroll Your Team</h3>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              onChange={(e) => {
                if (e.target.value) {
                  onEnroll(event.id, e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="">Select a team to enroll...</option>
              {teams
                .filter(team => !event.enrolledTeams.includes(team.id))
                .map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.player1} & {team.player2})
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-gray-900 mb-4">Enrolled Teams</h3>
          {event.enrolledTeams.length === 0 ? (
            <p className="text-gray-500">No teams enrolled yet</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {event.enrolledTeams.map(teamId => {
                const team = getTeam(teamId);
                return team ? (
                  <div key={teamId} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-gray-900">{team.name}</h4>
                        <p className="text-gray-600">{team.player1}</p>
                        <p className="text-gray-600">{team.player2}</p>
                      </div>
                      {!isPast && (
                        <button
                          onClick={() => onUnenroll(event.id, teamId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>

        {event.matches && event.matches.length > 0 && (
          <div>
            <h3 className="text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Matches
            </h3>

            {upcomingMatches.length > 0 && (
              <div className="mb-6">
                <h4 className="text-gray-700 mb-3">Upcoming / In Progress</h4>
                <div className="space-y-3">
                  {upcomingMatches.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      getTeam={getTeam}
                      getTeamName={getTeamName}
                      onUpdateScore={onUpdateScore}
                      isPast={isPast}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedMatches.length > 0 && (
              <div>
                <h4 className="text-gray-700 mb-3">Completed</h4>
                <div className="space-y-3">
                  {completedMatches.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      getTeam={getTeam}
                      getTeamName={getTeamName}
                      onUpdateScore={onUpdateScore}
                      isPast={isPast}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ 
  match, 
  getTeam, 
  getTeamName, 
  onUpdateScore, 
  isPast 
}: { 
  match: any;
  getTeam: (id: string) => Team | undefined;
  getTeamName: (id: string) => string;
  onUpdateScore: (matchId: string, score1: number, score2: number, completed: boolean) => void;
  isPast: boolean;
}) {
  const team1 = getTeam(match.team1);
  const team2 = getTeam(match.team2);

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-gray-900">{getTeamName(match.team1)}</p>
              <p className="text-gray-500">{team1?.player1} & {team1?.player2}</p>
            </div>
            {!match.completed && !isPast ? (
              <input
                type="number"
                min="0"
                value={match.score1}
                onChange={(e) => onUpdateScore(match.id, parseInt(e.target.value) || 0, match.score2, false)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
              />
            ) : (
              <span className="text-gray-900 px-3">{match.score1}</span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900">{getTeamName(match.team2)}</p>
              <p className="text-gray-500">{team2?.player1} & {team2?.player2}</p>
            </div>
            {!match.completed && !isPast ? (
              <input
                type="number"
                min="0"
                value={match.score2}
                onChange={(e) => onUpdateScore(match.id, match.score1, parseInt(e.target.value) || 0, false)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
              />
            ) : (
              <span className="text-gray-900 px-3">{match.score2}</span>
            )}
          </div>
        </div>

        {!match.completed && !isPast && (
          <button
            onClick={() => onUpdateScore(match.id, match.score1, match.score2, true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            Complete
          </button>
        )}

        {match.completed && (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded whitespace-nowrap">
            Final
          </span>
        )}
      </div>
    </div>
  );
}

import { Trophy } from 'lucide-react';
import type { Event, Team } from '../App';

type MatchTrackerProps = {
  events: Event[];
  teams: Team[];
  onUpdateScore: (matchId: string, score1: number, score2: number, completed: boolean) => void;
};

export function MatchTracker({ events, teams, onUpdateScore }: MatchTrackerProps) {
  const allMatches = events.flatMap(event => 
    (event.matches || []).map(match => ({ ...match, eventName: event.name, eventDate: event.date }))
  );

  const activeMatches = allMatches.filter(m => !m.completed);
  const completedMatches = allMatches.filter(m => m.completed).sort((a, b) => 
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  const getTeam = (teamId: string) => {
    return teams.find(t => t.id === teamId);
  };

  const getTeamName = (teamId: string) => {
    return getTeam(teamId)?.name || 'Unknown Team';
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-emerald-600" />
          <h2 className="text-gray-900">Match Tracker</h2>
        </div>
      </div>

      <section>
        <h3 className="text-gray-900 mb-4">Active Matches</h3>
        {activeMatches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No active matches</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeMatches.map(match => (
              <div key={match.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-gray-900">{match.eventName}</h4>
                    <p className="text-gray-500">{new Date(match.eventDate).toLocaleDateString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded">
                    In Progress
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900">{getTeamName(match.team1)}</p>
                      <p className="text-gray-500">
                        {getTeam(match.team1)?.player1} & {getTeam(match.team1)?.player2}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={match.score1}
                      onChange={(e) => onUpdateScore(match.id, parseInt(e.target.value) || 0, match.score2, false)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-gray-900">{getTeamName(match.team2)}</p>
                      <p className="text-gray-500">
                        {getTeam(match.team2)?.player1} & {getTeam(match.team2)?.player2}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={match.score2}
                      onChange={(e) => onUpdateScore(match.id, match.score1, parseInt(e.target.value) || 0, false)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center"
                    />
                  </div>

                  <button
                    onClick={() => onUpdateScore(match.id, match.score1, match.score2, true)}
                    className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    Complete Match
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-gray-900 mb-4">Completed Matches</h3>
        {completedMatches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No completed matches</p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedMatches.map(match => {
              const team1 = getTeam(match.team1);
              const team2 = getTeam(match.team2);
              const winner = match.score1 > match.score2 ? match.team1 : match.team2;

              return (
                <div key={match.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-gray-900">{match.eventName}</h4>
                      <p className="text-gray-500">{new Date(match.eventDate).toLocaleDateString()}</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded">
                      Final
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className={`flex items-center justify-between p-3 rounded ${
                      winner === match.team1 ? 'bg-emerald-50' : 'bg-gray-50'
                    }`}>
                      <div>
                        <p className="text-gray-900">
                          {getTeamName(match.team1)}
                          {winner === match.team1 && <span className="ml-2 text-emerald-600">🏆</span>}
                        </p>
                        <p className="text-gray-500">
                          {team1?.player1} & {team1?.player2}
                        </p>
                      </div>
                      <span className="text-gray-900 px-3">{match.score1}</span>
                    </div>

                    <div className={`flex items-center justify-between p-3 rounded ${
                      winner === match.team2 ? 'bg-emerald-50' : 'bg-gray-50'
                    }`}>
                      <div>
                        <p className="text-gray-900">
                          {getTeamName(match.team2)}
                          {winner === match.team2 && <span className="ml-2 text-emerald-600">🏆</span>}
                        </p>
                        <p className="text-gray-500">
                          {team2?.player1} & {team2?.player2}
                        </p>
                      </div>
                      <span className="text-gray-900 px-3">{match.score2}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

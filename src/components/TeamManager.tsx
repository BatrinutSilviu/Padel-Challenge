import { useState } from 'react';
import { UserPlus, Trash2, Users } from 'lucide-react';
import type { Team } from '../App';

type TeamManagerProps = {
  teams: Team[];
  onAddTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
};

export function TeamManager({ teams, onAddTeam, onDeleteTeam }: TeamManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamName && player1 && player2) {
      const newTeam: Team = {
        id: `t${Date.now()}`,
        name: teamName,
        player1,
        player2,
      };
      onAddTeam(newTeam);
      setTeamName('');
      setPlayer1('');
      setPlayer2('');
      setShowAddForm(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-emerald-600" />
          <h2 className="text-gray-900">Team Manager</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Team
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-gray-900 mb-4">Create New Team</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="Enter team name"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Player 1</label>
              <input
                type="text"
                value={player1}
                onChange={(e) => setPlayer1(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="Enter player name"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Player 2</label>
              <input
                type="text"
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="Enter player name"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                Create Team
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setTeamName('');
                  setPlayer1('');
                  setPlayer2('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <div key={team.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-gray-900">{team.name}</h3>
              <button
                onClick={() => onDeleteTeam(team.id)}
                className="text-red-600 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
                  1
                </div>
                <p className="text-gray-700">{team.player1}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
                  2
                </div>
                <p className="text-gray-700">{team.player2}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No teams yet. Create your first team to get started!</p>
        </div>
      )}
    </div>
  );
}

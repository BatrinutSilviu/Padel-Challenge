export type BadgeType =
  | 'AMERICANO_CHAMPION'
  | 'QUEEN_OF_COURT'
  | 'DIVISION_LEADER'
  | 'ON_FIRE'
  | 'CHALLENGER_CHAMPION'
  | 'MOST_TOURNAMENTS'
  | 'MOST_POINTS'
  | 'MOST_TOP3'
  | 'AMERICANO_5'
  | 'AMERICANO_10'
  | 'AMERICANO_20'
  | 'AMERICANO_50';

export const BADGE_META: Record<BadgeType, { emoji: string; label: string; description: string; className: string }> = {
  AMERICANO_CHAMPION:  { emoji: '👑', label: 'Americano Champion',  description: 'Won an Americano Champions tournament', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  QUEEN_OF_COURT:      { emoji: '👸', label: 'Queen of the Court',  description: 'Highest ELO among female players',       className: 'bg-pink-50 text-pink-700 border-pink-200'   },
  DIVISION_LEADER:     { emoji: '🏆', label: 'Division Leader',     description: 'Highest ELO in their division',          className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  ON_FIRE:             { emoji: '🔥', label: 'On Fire',             description: '3 consecutive top-3 finishes',           className: 'bg-orange-50 text-orange-700 border-orange-200' },
  CHALLENGER_CHAMPION: { emoji: '⚡', label: 'Challenger Champion', description: 'Won a Challenger tournament',            className: 'bg-blue-50 text-blue-700 border-blue-200'   },
  MOST_TOURNAMENTS:    { emoji: '🎾', label: 'Court Regular',       description: 'Most tournaments played',               className: 'bg-teal-50 text-teal-700 border-teal-200'   },
  MOST_POINTS:         { emoji: '💯', label: 'Top Scorer',          description: 'Most total points across all tournaments', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  MOST_TOP3:           { emoji: '🥇', label: 'Podium King',         description: 'Most top-3 finishes across all tournaments', className: 'bg-lime-50 text-lime-700 border-lime-200' },
  AMERICANO_5:         { emoji: '🎯', label: '5 Americanos',        description: 'Participated in 5 Americano tournaments',   className: 'bg-sky-50 text-sky-700 border-sky-200'     },
  AMERICANO_10:        { emoji: '⭐', label: '10 Americanos',       description: 'Participated in 10 Americano tournaments',  className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  AMERICANO_20:        { emoji: '🌟', label: '20 Americanos',       description: 'Participated in 20 Americano tournaments',  className: 'bg-purple-50 text-purple-700 border-purple-200' },
  AMERICANO_50:        { emoji: '💎', label: '50 Americanos',       description: 'Participated in 50 Americano tournaments',  className: 'bg-rose-50 text-rose-700 border-rose-200'   },
};

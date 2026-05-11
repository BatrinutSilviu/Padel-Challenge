export type BadgeType =
  | 'AMERICANO_CHAMPION'
  | 'QUEEN_OF_COURT'
  | 'DIVISION_LEADER'
  | 'ON_FIRE'
  | 'CHALLENGER_CHAMPION'
  | 'MOST_TOURNAMENTS';

export const BADGE_META: Record<BadgeType, { emoji: string; label: string; description: string; className: string }> = {
  AMERICANO_CHAMPION:  { emoji: '👑', label: 'Americano Champion',  description: 'Won an Americano Champions tournament', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  QUEEN_OF_COURT:      { emoji: '👸', label: 'Queen of the Court',  description: 'Best-ranked female player overall',      className: 'bg-pink-50 text-pink-700 border-pink-200'   },
  DIVISION_LEADER:     { emoji: '🏆', label: 'Division Leader',     description: 'Ranked #1 in their division',            className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  ON_FIRE:             { emoji: '🔥', label: 'On Fire',             description: '3 consecutive top-3 finishes',           className: 'bg-orange-50 text-orange-700 border-orange-200' },
  CHALLENGER_CHAMPION: { emoji: '⚡', label: 'Challenger Champion', description: 'Won a Challenger tournament',            className: 'bg-blue-50 text-blue-700 border-blue-200'   },
  MOST_TOURNAMENTS:    { emoji: '🎾', label: 'Court Regular',       description: 'Most tournaments played',               className: 'bg-teal-50 text-teal-700 border-teal-200'   },
};

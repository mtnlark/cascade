export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  hidden?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Score achievements
  { id: 'score_100', name: 'Getting Started', description: 'Score 100 points', icon: '🎯' },
  { id: 'score_500', name: 'Rising Star', description: 'Score 500 points', icon: '⭐' },
  { id: 'score_1000', name: 'High Scorer', description: 'Score 1,000 points', icon: '🏆' },
  { id: 'score_2500', name: 'Point Master', description: 'Score 2,500 points', icon: '💎' },
  { id: 'score_5000', name: 'Legendary', description: 'Score 5,000 points', icon: '👑' },

  // Combo achievements
  { id: 'combo_3', name: 'Combo Starter', description: 'Get a 3x combo', icon: '🔥' },
  { id: 'combo_5', name: 'Chain Reactor', description: 'Get a 5x combo', icon: '⚡' },
  { id: 'combo_7', name: 'Cascade Master', description: 'Get a 7x combo', icon: '🌊' },
  { id: 'combo_10', name: 'Unstoppable', description: 'Get a 10x combo', icon: '💥', hidden: true },

  // Tile clearing achievements
  { id: 'tiles_50', name: 'Tile Collector', description: 'Clear 50 tiles in one game', icon: '🧱' },
  { id: 'tiles_100', name: 'Demolisher', description: 'Clear 100 tiles in one game', icon: '🔨' },
  { id: 'tiles_200', name: 'Tile Titan', description: 'Clear 200 tiles in one game', icon: '🗿' },

  // Streak achievements
  { id: 'streak_3', name: 'Consistent', description: 'Maintain a 3-day streak', icon: '📅' },
  { id: 'streak_7', name: 'Weekly Warrior', description: 'Maintain a 7-day streak', icon: '🗓️' },
  { id: 'streak_14', name: 'Dedicated', description: 'Maintain a 14-day streak', icon: '💪' },
  { id: 'streak_30', name: 'True Fan', description: 'Maintain a 30-day streak', icon: '❤️', hidden: true },

  // Special tile achievements
  { id: 'special_5', name: 'Special Agent', description: 'Use 5 special tiles in one game', icon: '✨' },
  { id: 'special_10', name: 'Power Player', description: 'Use 10 special tiles in one game', icon: '🌟' },

  // Mode achievements
  { id: 'complete_daily', name: 'Daily Player', description: 'Complete a Daily Puzzle', icon: '📆' },
  { id: 'challenge_3', name: 'Challenger', description: 'Complete 3 challenges', icon: '🎪' },
  { id: 'challenge_all', name: 'Challenge Champion', description: 'Complete all challenges', icon: '🏅', hidden: true },

  // Chain achievements
  { id: 'chain_6', name: 'Big Clear', description: 'Clear 6+ tiles in one match', icon: '💫' },
  { id: 'chain_10', name: 'Massive Clear', description: 'Clear 10+ tiles in one match', icon: '🌠', hidden: true },
];

export interface GameStats {
  score: number;
  maxCombo: number;
  tilesCleared: number;
  longestChain: number;
  specialTilesUsed: number;
  mode: string;
}

export interface StreakInfo {
  currentStreak: number;
}

export interface ChallengeInfo {
  completedCount: number;
  totalChallenges: number;
}

/**
 * Check which achievements have been newly unlocked based on game stats.
 * Returns array of newly unlocked achievement IDs.
 */
export function checkAchievements(
  stats: GameStats,
  streak: StreakInfo,
  challenges: ChallengeInfo,
  unlockedIds: string[]
): string[] {
  const newlyUnlocked: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !unlockedIds.includes(id)) {
      newlyUnlocked.push(id);
    }
  };

  // Score achievements
  check('score_100', stats.score >= 100);
  check('score_500', stats.score >= 500);
  check('score_1000', stats.score >= 1000);
  check('score_2500', stats.score >= 2500);
  check('score_5000', stats.score >= 5000);

  // Combo achievements
  check('combo_3', stats.maxCombo >= 3);
  check('combo_5', stats.maxCombo >= 5);
  check('combo_7', stats.maxCombo >= 7);
  check('combo_10', stats.maxCombo >= 10);

  // Tile clearing achievements
  check('tiles_50', stats.tilesCleared >= 50);
  check('tiles_100', stats.tilesCleared >= 100);
  check('tiles_200', stats.tilesCleared >= 200);

  // Streak achievements
  check('streak_3', streak.currentStreak >= 3);
  check('streak_7', streak.currentStreak >= 7);
  check('streak_14', streak.currentStreak >= 14);
  check('streak_30', streak.currentStreak >= 30);

  // Special tile achievements
  check('special_5', stats.specialTilesUsed >= 5);
  check('special_10', stats.specialTilesUsed >= 10);

  // Mode achievements
  check('complete_daily', stats.mode === 'daily');

  // Challenge achievements
  check('challenge_3', challenges.completedCount >= 3);
  check('challenge_all', challenges.completedCount >= challenges.totalChallenges);

  // Chain achievements
  check('chain_6', stats.longestChain >= 6);
  check('chain_10', stats.longestChain >= 10);

  return newlyUnlocked;
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

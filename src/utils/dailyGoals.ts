export interface DailyGoal {
  id: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
  reward: number;  // Bonus points
}

interface GoalTemplate {
  id: string;
  descriptionTemplate: string;
  targetRange: [number, number];  // [min, max]
  rewardMultiplier: number;
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  { id: 'clear_tiles', descriptionTemplate: 'Clear {target} tiles', targetRange: [30, 80], rewardMultiplier: 1 },
  { id: 'combos', descriptionTemplate: 'Get {target} combos', targetRange: [3, 8], rewardMultiplier: 20 },
  { id: 'score', descriptionTemplate: 'Score {target} points', targetRange: [200, 600], rewardMultiplier: 0.5 },
  { id: 'chain', descriptionTemplate: 'Clear {target}+ in one match', targetRange: [4, 7], rewardMultiplier: 30 },
  { id: 'special', descriptionTemplate: 'Use {target} special tiles', targetRange: [2, 5], rewardMultiplier: 25 },
  { id: 'multi_combo', descriptionTemplate: 'Reach {target}x combo', targetRange: [3, 6], rewardMultiplier: 40 },
];

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Get a seed for today's date
 */
export function getDailyGoalSeed(): number {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

/**
 * Generate 3 daily goals using seeded randomness
 */
export function getDailyGoals(seed?: number): DailyGoal[] {
  const actualSeed = seed ?? getDailyGoalSeed();
  const rng = seededRandom(actualSeed);

  // Shuffle templates
  const shuffled = [...GOAL_TEMPLATES].sort(() => rng() - 0.5);

  // Pick first 3
  const selectedTemplates = shuffled.slice(0, 3);

  return selectedTemplates.map(template => {
    const [min, max] = template.targetRange;
    // Round target to nice numbers
    const rawTarget = min + Math.floor(rng() * (max - min + 1));
    const target = roundToNice(rawTarget);
    const reward = Math.round(target * template.rewardMultiplier);

    return {
      id: template.id,
      description: template.descriptionTemplate.replace('{target}', `${target}`),
      target,
      progress: 0,
      completed: false,
      reward,
    };
  });
}

function roundToNice(n: number): number {
  if (n <= 10) return n;
  if (n <= 50) return Math.round(n / 5) * 5;
  return Math.round(n / 10) * 10;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Update goal progress based on game stats
 */
export function updateGoalProgress(
  goals: DailyGoal[],
  stats: {
    tilesCleared: number;
    comboCount: number;
    score: number;
    longestChain: number;
    specialTilesUsed: number;
    maxMultiplier: number;
  }
): DailyGoal[] {
  return goals.map(goal => {
    let progress = goal.progress;

    switch (goal.id) {
      case 'clear_tiles':
        progress = stats.tilesCleared;
        break;
      case 'combos':
        progress = stats.comboCount;
        break;
      case 'score':
        progress = stats.score;
        break;
      case 'chain':
        progress = stats.longestChain;
        break;
      case 'special':
        progress = stats.specialTilesUsed;
        break;
      case 'multi_combo':
        progress = stats.maxMultiplier;
        break;
    }

    return {
      ...goal,
      progress,
      completed: progress >= goal.target,
    };
  });
}

/**
 * Calculate total bonus points from completed goals
 */
export function calculateGoalBonus(goals: DailyGoal[]): number {
  return goals
    .filter(g => g.completed)
    .reduce((sum, g) => sum + g.reward, 0);
}

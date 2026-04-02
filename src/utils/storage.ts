export type GameMode = 'endless' | 'daily' | 'practice' | 'challenge' | 'timed';

interface DailyStreak {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string; // ISO date string (YYYY-MM-DD)
}

interface ChallengeProgress {
  completed: number[]; // Array of completed challenge IDs
  stars: Record<number, number>; // Challenge ID -> stars earned (1-3)
}

interface AchievementData {
  unlocked: string[];  // Array of unlocked achievement IDs
  unlockedAt: Record<string, string>;  // Achievement ID -> ISO date string
}

interface DailyGoalsData {
  date: string;  // YYYY-MM-DD
  completed: string[];  // Array of completed goal IDs
  progress: Record<string, number>;  // Goal ID -> progress
}

interface StorageData {
  highScores: Record<GameMode, number>;
  settings: {
    crtFilter: boolean;
  };
  daily: DailyStreak;
  challenges: ChallengeProgress;
  achievements: AchievementData;
  dailyGoals: DailyGoalsData;
}

const STORAGE_KEY = 'cascade_data';

const defaultData: StorageData = {
  highScores: {
    endless: 0,
    daily: 0,
    practice: 0,
    challenge: 0,
    timed: 0,
  },
  settings: {
    crtFilter: false,
  },
  daily: {
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: '',
  },
  challenges: {
    completed: [],
    stars: {},
  },
  achievements: {
    unlocked: [],
    unlockedAt: {},
  },
  dailyGoals: {
    date: '',
    completed: [],
    progress: {},
  },
};

export class Storage {
  private data: StorageData;

  constructor() {
    this.data = this.load();
  }

  private load(): StorageData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...defaultData, ...JSON.parse(raw) };
      }
    } catch {
      // Ignore parse errors
    }
    return { ...defaultData };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore write errors (e.g., private browsing)
    }
  }

  getHighScore(mode: GameMode): number {
    return this.data.highScores[mode] ?? 0;
  }

  setHighScore(mode: GameMode, score: number): boolean {
    if (score > this.data.highScores[mode]) {
      this.data.highScores[mode] = score;
      this.save();
      return true;
    }
    return false;
  }

  getSetting<K extends keyof StorageData['settings']>(
    key: K
  ): StorageData['settings'][K] {
    return this.data.settings[key];
  }

  setSetting<K extends keyof StorageData['settings']>(
    key: K,
    value: StorageData['settings'][K]
  ): void {
    this.data.settings[key] = value;
    this.save();
  }

  // Daily streak methods
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  getStreak(): DailyStreak {
    const today = this.getTodayDate();
    const yesterday = this.getYesterdayDate();
    const lastPlayed = this.data.daily.lastPlayedDate;

    // If last played was before yesterday, streak is broken
    if (lastPlayed && lastPlayed !== today && lastPlayed !== yesterday) {
      // Reset streak if broken
      if (this.data.daily.currentStreak > 0) {
        this.data.daily.currentStreak = 0;
        this.save();
      }
    }

    return { ...this.data.daily };
  }

  recordDailyPlay(): { streakIncreased: boolean; newStreak: number } {
    const today = this.getTodayDate();
    const yesterday = this.getYesterdayDate();
    const lastPlayed = this.data.daily.lastPlayedDate;

    let streakIncreased = false;

    if (lastPlayed === today) {
      // Already played today, no change
      return { streakIncreased: false, newStreak: this.data.daily.currentStreak };
    }

    if (lastPlayed === yesterday) {
      // Continuing streak
      this.data.daily.currentStreak++;
      streakIncreased = true;
    } else if (!lastPlayed || lastPlayed < yesterday) {
      // Starting new streak
      this.data.daily.currentStreak = 1;
      streakIncreased = true;
    }

    // Update best streak
    if (this.data.daily.currentStreak > this.data.daily.bestStreak) {
      this.data.daily.bestStreak = this.data.daily.currentStreak;
    }

    this.data.daily.lastPlayedDate = today;
    this.save();

    return { streakIncreased, newStreak: this.data.daily.currentStreak };
  }

  isStreakAtRisk(): boolean {
    const today = this.getTodayDate();
    const lastPlayed = this.data.daily.lastPlayedDate;

    // Streak is at risk if we played yesterday but not today
    return lastPlayed === this.getYesterdayDate() && this.data.daily.currentStreak > 0;
  }

  // Challenge methods
  getChallengeProgress(): ChallengeProgress {
    return { ...this.data.challenges };
  }

  isChallengeCompleted(challengeId: number): boolean {
    return this.data.challenges.completed.includes(challengeId);
  }

  getChallengeStars(challengeId: number): number {
    return this.data.challenges.stars[challengeId] || 0;
  }

  completeChallenge(challengeId: number, stars: number): boolean {
    const existingStars = this.data.challenges.stars[challengeId] || 0;
    const isNewCompletion = !this.data.challenges.completed.includes(challengeId);

    if (isNewCompletion) {
      this.data.challenges.completed.push(challengeId);
    }

    // Only update stars if better than existing
    if (stars > existingStars) {
      this.data.challenges.stars[challengeId] = stars;
    }

    this.save();
    return isNewCompletion;
  }

  getCompletedChallengeCount(): number {
    return this.data.challenges.completed.length;
  }

  getTotalStars(): number {
    return Object.values(this.data.challenges.stars).reduce((sum, stars) => sum + stars, 0);
  }

  // Achievement methods
  getUnlockedAchievements(): string[] {
    return [...this.data.achievements.unlocked];
  }

  isAchievementUnlocked(id: string): boolean {
    return this.data.achievements.unlocked.includes(id);
  }

  unlockAchievement(id: string): boolean {
    if (this.data.achievements.unlocked.includes(id)) {
      return false; // Already unlocked
    }

    this.data.achievements.unlocked.push(id);
    this.data.achievements.unlockedAt[id] = new Date().toISOString();
    this.save();
    return true;
  }

  unlockAchievements(ids: string[]): string[] {
    const newlyUnlocked: string[] = [];

    for (const id of ids) {
      if (!this.data.achievements.unlocked.includes(id)) {
        this.data.achievements.unlocked.push(id);
        this.data.achievements.unlockedAt[id] = new Date().toISOString();
        newlyUnlocked.push(id);
      }
    }

    if (newlyUnlocked.length > 0) {
      this.save();
    }

    return newlyUnlocked;
  }

  getAchievementUnlockDate(id: string): string | null {
    return this.data.achievements.unlockedAt[id] || null;
  }

  getUnlockedAchievementCount(): number {
    return this.data.achievements.unlocked.length;
  }

  // Daily goals methods
  getDailyGoalsData(): DailyGoalsData {
    const today = this.getTodayDate();

    // Reset if it's a new day
    if (this.data.dailyGoals.date !== today) {
      this.data.dailyGoals = {
        date: today,
        completed: [],
        progress: {},
      };
      this.save();
    }

    return { ...this.data.dailyGoals };
  }

  isGoalCompleted(goalId: string): boolean {
    return this.data.dailyGoals.completed.includes(goalId);
  }

  getGoalProgress(goalId: string): number {
    return this.data.dailyGoals.progress[goalId] || 0;
  }

  updateGoalProgress(goalId: string, progress: number): boolean {
    const wasCompleted = this.isGoalCompleted(goalId);

    this.data.dailyGoals.progress[goalId] = progress;
    this.save();

    return !wasCompleted;
  }

  completeGoal(goalId: string): boolean {
    if (this.data.dailyGoals.completed.includes(goalId)) {
      return false;
    }

    this.data.dailyGoals.completed.push(goalId);
    this.save();
    return true;
  }

  getCompletedGoalCount(): number {
    const today = this.getTodayDate();
    if (this.data.dailyGoals.date !== today) {
      return 0;
    }
    return this.data.dailyGoals.completed.length;
  }
}

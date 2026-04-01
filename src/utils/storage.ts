export type GameMode = 'endless' | 'daily' | 'practice' | 'challenge';

interface DailyStreak {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string; // ISO date string (YYYY-MM-DD)
}

interface ChallengeProgress {
  completed: number[]; // Array of completed challenge IDs
  stars: Record<number, number>; // Challenge ID -> stars earned (1-3)
}

interface StorageData {
  highScores: Record<GameMode, number>;
  settings: {
    crtFilter: boolean;
  };
  daily: DailyStreak;
  challenges: ChallengeProgress;
}

const STORAGE_KEY = 'cascade_data';

const defaultData: StorageData = {
  highScores: {
    endless: 0,
    daily: 0,
    practice: 0,
    challenge: 0,
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
}

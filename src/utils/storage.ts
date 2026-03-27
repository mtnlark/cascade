export type GameMode = 'endless' | 'daily' | 'practice';

interface StorageData {
  highScores: Record<GameMode, number>;
  settings: {
    crtFilter: boolean;
  };
}

const STORAGE_KEY = 'cascade_data';

const defaultData: StorageData = {
  highScores: {
    endless: 0,
    daily: 0,
    practice: 0,
  },
  settings: {
    crtFilter: false,
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
}

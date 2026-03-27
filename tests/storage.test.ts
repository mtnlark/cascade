import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Storage } from '../src/utils/storage';

describe('Storage', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
    });
  });

  describe('highScores', () => {
    it('returns 0 for mode with no saved score', () => {
      const storage = new Storage();
      expect(storage.getHighScore('endless')).toBe(0);
    });

    it('saves and retrieves high score', () => {
      const storage = new Storage();
      storage.setHighScore('endless', 1000);
      expect(storage.getHighScore('endless')).toBe(1000);
    });

    it('only updates if new score is higher', () => {
      const storage = new Storage();
      storage.setHighScore('endless', 1000);
      storage.setHighScore('endless', 500);
      expect(storage.getHighScore('endless')).toBe(1000);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDailySeed, seededRandom } from '../src/utils/daily';

describe('daily', () => {
  describe('getDailySeed', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns same seed for same day', () => {
      vi.setSystemTime(new Date('2026-03-27T10:00:00Z'));
      const seed1 = getDailySeed();

      vi.setSystemTime(new Date('2026-03-27T23:59:59Z'));
      const seed2 = getDailySeed();

      expect(seed1).toBe(seed2);
    });

    it('returns different seed for different days', () => {
      vi.setSystemTime(new Date('2026-03-27'));
      const seed1 = getDailySeed();

      vi.setSystemTime(new Date('2026-03-28'));
      const seed2 = getDailySeed();

      expect(seed1).not.toBe(seed2);
    });
  });

  describe('seededRandom', () => {
    it('produces deterministic sequence', () => {
      const rng1 = seededRandom(12345);
      const rng2 = seededRandom(12345);

      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
    });

    it('produces values between 0 and 1', () => {
      const rng = seededRandom(99999);

      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });
});

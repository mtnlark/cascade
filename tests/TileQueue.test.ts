import { describe, it, expect } from 'vitest';
import { TileQueue } from '../src/game/TileQueue';

describe('TileQueue', () => {
  describe('initialization', () => {
    it('creates queue with specified size', () => {
      const queue = new TileQueue(3, 4);
      expect(queue.size).toBe(3);
      expect(queue.peek(0)).toBeDefined();
      expect(queue.peek(1)).toBeDefined();
      expect(queue.peek(2)).toBeDefined();
    });
  });

  describe('next', () => {
    it('returns first tile and adds new one to end', () => {
      const queue = new TileQueue(3, 4);
      const first = queue.peek(0);
      const second = queue.peek(1);

      const returned = queue.next();

      expect(returned).toEqual(first);
      expect(queue.peek(0)).toEqual(second);
      expect(queue.size).toBe(3);
    });
  });

  describe('seeded random', () => {
    it('produces deterministic sequence with seed', () => {
      const seed = () => {
        let s = 12345;
        return () => {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          return s / 0x7fffffff;
        };
      };

      const queue1 = new TileQueue(3, 4, seed());
      const queue2 = new TileQueue(3, 4, seed());

      expect(queue1.peek(0)).toEqual(queue2.peek(0));
      expect(queue1.peek(1)).toEqual(queue2.peek(1));
      expect(queue1.peek(2)).toEqual(queue2.peek(2));
    });
  });
});

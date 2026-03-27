import { describe, it, expect } from 'vitest';
import { ScoreManager } from '../src/game/ScoreManager';

describe('ScoreManager', () => {
  it('starts with zero score', () => {
    const sm = new ScoreManager();
    expect(sm.score).toBe(0);
  });

  it('calculates points for single chain', () => {
    const sm = new ScoreManager();

    // 4 tiles cleared, first chain (1x multiplier)
    const points = sm.addChain(4);

    expect(points).toBe(40); // 4 * 10 * 1
    expect(sm.score).toBe(40);
  });

  it('applies increasing multiplier for chain combos', () => {
    const sm = new ScoreManager();

    sm.addChain(4); // 40 points (1x)
    const points = sm.addChain(4); // 80 points (2x)

    expect(points).toBe(80);
    expect(sm.score).toBe(120);
  });

  it('resets multiplier when new turn starts', () => {
    const sm = new ScoreManager();

    sm.addChain(4); // 40 (1x)
    sm.addChain(4); // 80 (2x)
    sm.endTurn();
    const points = sm.addChain(4); // 40 (1x again)

    expect(points).toBe(40);
  });

  it('tracks current multiplier', () => {
    const sm = new ScoreManager();

    expect(sm.multiplier).toBe(1);
    sm.addChain(4);
    expect(sm.multiplier).toBe(2);
    sm.addChain(4);
    expect(sm.multiplier).toBe(3);
  });
});

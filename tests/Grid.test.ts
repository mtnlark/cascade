import { describe, it, expect } from 'vitest';
import { Grid } from '../src/game/Grid';

describe('Grid', () => {
  describe('initialization', () => {
    it('creates an empty grid with correct dimensions', () => {
      const grid = new Grid(6, 12);

      expect(grid.cols).toBe(6);
      expect(grid.rows).toBe(12);
      expect(grid.isEmpty()).toBe(true);
    });
  });

  describe('dropTile', () => {
    it('places tile at bottom of empty column', () => {
      const grid = new Grid(6, 12);

      const landedRow = grid.dropTile(0, 0); // color 0 in column 0

      expect(landedRow).toBe(11); // bottom row
      expect(grid.getCell(0, 11)).toBe(0);
    });

    it('stacks tiles on top of existing tiles', () => {
      const grid = new Grid(6, 12);

      grid.dropTile(0, 0);
      const landedRow = grid.dropTile(0, 1);

      expect(landedRow).toBe(10);
      expect(grid.getCell(0, 10)).toBe(1);
      expect(grid.getCell(0, 11)).toBe(0);
    });

    it('returns -1 when column is full', () => {
      const grid = new Grid(6, 3); // small grid for testing

      grid.dropTile(0, 0);
      grid.dropTile(0, 0);
      grid.dropTile(0, 0);
      const result = grid.dropTile(0, 0);

      expect(result).toBe(-1);
    });
  });
});

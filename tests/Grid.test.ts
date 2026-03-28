import { describe, it, expect } from 'vitest';
import { Grid } from '../src/game/Grid';
import { createNormalTile, createRainbowTile, createBombTile } from '../src/game/TileData';

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

      const landedRow = grid.dropTile(0, createNormalTile(0));

      expect(landedRow).toBe(11);
      expect(grid.getCellColor(0, 11)).toBe(0);
    });

    it('stacks tiles on top of existing tiles', () => {
      const grid = new Grid(6, 12);

      grid.dropTile(0, createNormalTile(0));
      const landedRow = grid.dropTile(0, createNormalTile(1));

      expect(landedRow).toBe(10);
      expect(grid.getCellColor(0, 10)).toBe(1);
      expect(grid.getCellColor(0, 11)).toBe(0);
    });

    it('returns -1 when column is full', () => {
      const grid = new Grid(6, 3);

      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(0, createNormalTile(0));
      const result = grid.dropTile(0, createNormalTile(0));

      expect(result).toBe(-1);
    });
  });

  describe('findConnectedGroup', () => {
    it('finds a single tile as a group of 1', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(1);
      expect(group).toContainEqual({ col: 0, row: 11 });
    });

    it('finds horizontally connected tiles', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(0));
      grid.dropTile(2, createNormalTile(0));

      const group = grid.findConnectedGroup(1, 11);

      expect(group).toHaveLength(3);
    });

    it('finds vertically connected tiles', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(0, createNormalTile(0));

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(3);
    });

    it('finds L-shaped connected groups', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(0));
      grid.dropTile(1, createNormalTile(0));

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(3);
    });

    it('does not connect diagonally', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(1));
      grid.dropTile(1, createNormalTile(0));

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(1);
    });

    it('does not connect different colors', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(1));

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(1);
    });

    it('rainbow tile matches adjacent colors', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createRainbowTile());
      grid.dropTile(2, createNormalTile(0));

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(3);
    });
  });

  describe('clearGroup', () => {
    it('removes tiles at specified positions', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(0));

      grid.clearGroup([{ col: 0, row: 11 }, { col: 1, row: 11 }]);

      expect(grid.getCell(0, 11)).toBe(null);
      expect(grid.getCell(1, 11)).toBe(null);
    });
  });

  describe('applyGravity', () => {
    it('makes floating tiles fall down', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(0, createNormalTile(1));
      grid.dropTile(0, createNormalTile(2));

      grid.clearGroup([{ col: 0, row: 10 }]);
      const fallen = grid.applyGravity();

      expect(grid.getCellColor(0, 11)).toBe(0);
      expect(grid.getCellColor(0, 10)).toBe(2);
      expect(grid.getCell(0, 9)).toBe(null);
      expect(fallen).toHaveLength(1);
    });

    it('returns positions of tiles that moved', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(0, createNormalTile(1));
      grid.clearGroup([{ col: 0, row: 11 }]);

      const fallen = grid.applyGravity();

      expect(fallen).toContainEqual({ col: 0, fromRow: 10, toRow: 11 });
    });
  });

  describe('findAllMatches', () => {
    it('returns empty array when no matches exist', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(1));

      const matches = grid.findAllMatches(4);

      expect(matches).toHaveLength(0);
    });

    it('finds a group of 4 as a match', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(0));
      grid.dropTile(2, createNormalTile(0));
      grid.dropTile(3, createNormalTile(0));

      const matches = grid.findAllMatches(4);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toHaveLength(4);
    });

    it('finds multiple separate matches', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(0));
      grid.dropTile(2, createNormalTile(0));
      grid.dropTile(3, createNormalTile(0));
      grid.dropTile(5, createNormalTile(1));
      grid.dropTile(5, createNormalTile(1));
      grid.dropTile(5, createNormalTile(1));
      grid.dropTile(5, createNormalTile(1));

      const matches = grid.findAllMatches(4);

      expect(matches).toHaveLength(2);
    });

    it('does not count groups smaller than minSize', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(0));
      grid.dropTile(2, createNormalTile(0));

      const matches = grid.findAllMatches(4);

      expect(matches).toHaveLength(0);
    });
  });

  describe('resolveCascades', () => {
    it('clears matches and returns chain count', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(0));
      grid.dropTile(2, createNormalTile(0));
      grid.dropTile(3, createNormalTile(0));

      const result = grid.resolveCascades(4);

      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].cleared).toHaveLength(4);
      expect(grid.getCell(0, 11)).toBe(null);
    });

    it('handles chain reactions', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(0));
      grid.dropTile(2, createNormalTile(0));
      grid.dropTile(3, createNormalTile(1));

      grid.dropTile(3, createNormalTile(1));
      grid.dropTile(3, createNormalTile(1));
      grid.dropTile(3, createNormalTile(1));

      grid.dropTile(3, createNormalTile(0));

      const result = grid.resolveCascades(4);

      expect(result.chains.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty chains when no matches', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(1, createNormalTile(1));

      const result = grid.resolveCascades(4);

      expect(result.chains).toHaveLength(0);
    });
  });

  describe('isGameOver', () => {
    it('returns false when grid has space', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));

      expect(grid.isGameOver()).toBe(false);
    });

    it('returns true when all columns are full', () => {
      const grid = new Grid(2, 2);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(0, createNormalTile(1));
      grid.dropTile(1, createNormalTile(0));
      grid.dropTile(1, createNormalTile(1));

      expect(grid.isGameOver()).toBe(true);
    });

    it('returns false when at least one column has space', () => {
      const grid = new Grid(2, 2);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(0, createNormalTile(1));
      grid.dropTile(1, createNormalTile(0));

      expect(grid.isGameOver()).toBe(false);
    });
  });

  describe('canDropInColumn', () => {
    it('returns true for empty column', () => {
      const grid = new Grid(6, 12);
      expect(grid.canDropInColumn(0)).toBe(true);
    });

    it('returns false for full column', () => {
      const grid = new Grid(6, 2);
      grid.dropTile(0, createNormalTile(0));
      grid.dropTile(0, createNormalTile(0));

      expect(grid.canDropInColumn(0)).toBe(false);
    });
  });

  describe('undo', () => {
    it('saves state before drop and restores on undo', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createNormalTile(0));
      grid.saveState();
      grid.dropTile(1, createNormalTile(1));

      expect(grid.getCellColor(1, 11)).toBe(1);

      grid.undo();

      expect(grid.getCell(1, 11)).toBe(null);
      expect(grid.getCellColor(0, 11)).toBe(0);
    });

    it('returns false when no saved state', () => {
      const grid = new Grid(6, 12);

      const result = grid.undo();

      expect(result).toBe(false);
    });

    it('returns true when undo succeeds', () => {
      const grid = new Grid(6, 12);
      grid.saveState();
      grid.dropTile(0, createNormalTile(0));

      const result = grid.undo();

      expect(result).toBe(true);
    });
  });

  describe('bomb clearing', () => {
    it('clears 3x3 area around bomb when matched', () => {
      const grid = new Grid(6, 12);
      // Create tiles with bomb in the mix
      grid.dropTile(0, createNormalTile(1)); // row 11
      grid.dropTile(1, createNormalTile(1)); // row 11
      grid.dropTile(2, createNormalTile(1)); // row 11
      grid.dropTile(0, createNormalTile(0)); // row 10
      grid.dropTile(1, createBombTile(0));   // row 10 - bomb
      grid.dropTile(2, createNormalTile(0)); // row 10
      grid.dropTile(0, createNormalTile(0)); // row 9 - makes match of 3

      const result = grid.resolveCascades(3);

      // Should clear more than just the 3 matching tiles
      expect(result.totalCleared).toBeGreaterThan(3);
    });

    it('bomb hitting another bomb triggers chain', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, createBombTile(0));   // row 11
      grid.dropTile(1, createBombTile(0));   // row 11, in blast radius
      grid.dropTile(2, createNormalTile(0)); // row 11

      const result = grid.resolveCascades(3);

      // Both bombs should trigger
      expect(result.totalCleared).toBeGreaterThanOrEqual(3);
    });
  });
});

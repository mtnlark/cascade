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

  describe('findConnectedGroup', () => {
    it('finds a single tile as a group of 1', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(1);
      expect(group).toContainEqual({ col: 0, row: 11 });
    });

    it('finds horizontally connected tiles', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(1, 0);
      grid.dropTile(2, 0);

      const group = grid.findConnectedGroup(1, 11);

      expect(group).toHaveLength(3);
    });

    it('finds vertically connected tiles', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(0, 0);
      grid.dropTile(0, 0);

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(3);
    });

    it('finds L-shaped connected groups', () => {
      const grid = new Grid(6, 12);
      // Create L shape:
      // . X
      // X X
      grid.dropTile(0, 0); // bottom-left
      grid.dropTile(1, 0); // bottom-right
      grid.dropTile(1, 0); // top-right (stacks)

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(3);
    });

    it('does not connect diagonally', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(1, 1); // different color, blocks diagonal
      grid.dropTile(1, 0); // same color but diagonal from first

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(1);
    });

    it('does not connect different colors', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(1, 1); // different color

      const group = grid.findConnectedGroup(0, 11);

      expect(group).toHaveLength(1);
    });
  });

  describe('clearGroup', () => {
    it('removes tiles at specified positions', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(1, 0);

      grid.clearGroup([{ col: 0, row: 11 }, { col: 1, row: 11 }]);

      expect(grid.getCell(0, 11)).toBe(null);
      expect(grid.getCell(1, 11)).toBe(null);
    });
  });

  describe('applyGravity', () => {
    it('makes floating tiles fall down', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0); // row 11
      grid.dropTile(0, 1); // row 10
      grid.dropTile(0, 2); // row 9

      // Clear middle tile
      grid.clearGroup([{ col: 0, row: 10 }]);

      // Apply gravity
      const fallen = grid.applyGravity();

      expect(grid.getCell(0, 11)).toBe(0); // unchanged
      expect(grid.getCell(0, 10)).toBe(2); // fell from row 9
      expect(grid.getCell(0, 9)).toBe(null); // now empty
      expect(fallen).toHaveLength(1);
    });

    it('returns positions of tiles that moved', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(0, 1);
      grid.clearGroup([{ col: 0, row: 11 }]);

      const fallen = grid.applyGravity();

      expect(fallen).toContainEqual({ col: 0, fromRow: 10, toRow: 11 });
    });
  });

  describe('findAllMatches', () => {
    it('returns empty array when no matches exist', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(1, 1);

      const matches = grid.findAllMatches(4);

      expect(matches).toHaveLength(0);
    });

    it('finds a group of 4 as a match', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(1, 0);
      grid.dropTile(2, 0);
      grid.dropTile(3, 0);

      const matches = grid.findAllMatches(4);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toHaveLength(4);
    });

    it('finds multiple separate matches', () => {
      const grid = new Grid(6, 12);
      // Group 1: 4 of color 0
      grid.dropTile(0, 0);
      grid.dropTile(1, 0);
      grid.dropTile(2, 0);
      grid.dropTile(3, 0);
      // Group 2: 4 of color 1 (stacked)
      grid.dropTile(5, 1);
      grid.dropTile(5, 1);
      grid.dropTile(5, 1);
      grid.dropTile(5, 1);

      const matches = grid.findAllMatches(4);

      expect(matches).toHaveLength(2);
    });

    it('does not count groups smaller than minSize', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(1, 0);
      grid.dropTile(2, 0); // only 3

      const matches = grid.findAllMatches(4);

      expect(matches).toHaveLength(0);
    });
  });

  describe('resolveCascades', () => {
    it('clears matches and returns chain count', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(1, 0);
      grid.dropTile(2, 0);
      grid.dropTile(3, 0);

      const result = grid.resolveCascades(4);

      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].cleared).toHaveLength(4);
      expect(grid.getCell(0, 11)).toBe(null);
    });

    it('handles chain reactions', () => {
      const grid = new Grid(6, 12);
      // Set up a chain reaction:
      // Bottom: 3 red + 1 blue (no match)
      // When blue clears, 4th red falls and completes match

      // Bottom row: R R R B
      grid.dropTile(0, 0);
      grid.dropTile(1, 0);
      grid.dropTile(2, 0);
      grid.dropTile(3, 1);

      // Stack blues to make them match
      grid.dropTile(3, 1);
      grid.dropTile(3, 1);
      grid.dropTile(3, 1);

      // Put a red on top of blues
      grid.dropTile(3, 0);

      // Now we have:
      // Col 3: R (top), B, B, B, B (bottom row 11)
      // When blues clear, R falls to row 11, completing R R R R

      const result = grid.resolveCascades(4);

      expect(result.chains.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty chains when no matches', () => {
      const grid = new Grid(6, 12);
      grid.dropTile(0, 0);
      grid.dropTile(1, 1);

      const result = grid.resolveCascades(4);

      expect(result.chains).toHaveLength(0);
    });
  });
});

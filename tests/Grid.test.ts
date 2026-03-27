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
});

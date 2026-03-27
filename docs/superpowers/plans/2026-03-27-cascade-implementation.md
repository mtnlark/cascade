# Cascade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a relaxing, retro-styled falling-block puzzle game with chain reactions, playable in browser.

**Architecture:** Phaser 3 handles rendering and input; game logic lives in a pure TypeScript `Grid` class that's fully unit-testable. Scenes manage UI flow (Menu → Game → GameOver). State persisted to localStorage.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest (testing)

---

## File Structure

```
cascade/
├── src/
│   ├── main.ts                 # Phaser game config, entry point
│   ├── config.ts               # Game constants (grid size, colors, scoring)
│   ├── scenes/
│   │   ├── BootScene.ts        # Preload assets, transition to menu
│   │   ├── MenuScene.ts        # Title, mode selection
│   │   ├── GameScene.ts        # Main gameplay loop
│   │   └── GameOverScene.ts    # Final score, play again
│   ├── game/
│   │   ├── Grid.ts             # Pure game logic (testable)
│   │   ├── Tile.ts             # Phaser sprite for a tile
│   │   └── ScoreManager.ts     # Score calculation with multipliers
│   └── utils/
│       ├── storage.ts          # localStorage wrapper
│       └── daily.ts            # Daily puzzle seed generator
├── tests/
│   ├── Grid.test.ts
│   ├── ScoreManager.test.ts
│   ├── storage.test.ts
│   └── daily.test.ts
├── public/
│   └── (pixel font files later)
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.ts`

- [ ] **Step 1: Initialize npm and install dependencies**

Run:
```bash
cd /Users/levcraig/cascade
npm init -y
npm install phaser
npm install -D typescript vite vitest @types/node
```

Expected: `package.json` created with dependencies

- [ ] **Step 2: Create TypeScript config**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create Vite config**

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create index.html**

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cascade</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a2e;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    canvas { max-width: 100%; max-height: 100vh; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Create .gitignore**

Create `.gitignore`:
```
node_modules/
dist/
.DS_Store
*.log
.env
```

- [ ] **Step 6: Create minimal main.ts entry point**

Create `src/main.ts`:
```typescript
import Phaser from 'phaser';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);

console.log('Cascade initialized');
```

- [ ] **Step 7: Add npm scripts to package.json**

Update `package.json` scripts section:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] **Step 8: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts, browser shows dark purple background

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initial project setup with Phaser, TypeScript, Vite"
```

---

## Task 2: Game Config Constants

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Create config file with all game constants**

Create `src/config.ts`:
```typescript
export const GRID_COLS = 6;
export const GRID_ROWS = 12;

export const TILE_SIZE = 48;
export const GRID_PADDING = 16;

export const COLORS = [
  0x00d4ff, // Electric blue
  0xff6b9d, // Hot pink
  0x7fff00, // Lime green
  0xffd700, // Sunny yellow
  0xff8c00, // Bright orange
  0xda70d6, // Orchid purple (5th color for difficulty scaling)
] as const;

export const COLOR_NAMES = [
  'blue',
  'pink',
  'green',
  'yellow',
  'orange',
  'purple',
] as const;

export const INITIAL_COLOR_COUNT = 4;
export const MIN_MATCH_SIZE = 4;

export const POINTS_PER_TILE = 10;

export const DIFFICULTY_THRESHOLDS = [
  500,  // Add 5th color at 500 points
  1500, // Add 6th color at 1500 points
] as const;

export const BACKGROUND_COLOR = 0x1a1a2e;
export const GRID_BACKGROUND_COLOR = 0x16213e;
export const UI_TEXT_COLOR = '#ffffff';
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add game configuration constants"
```

---

## Task 3: Grid Logic - Data Structure

**Files:**
- Create: `src/game/Grid.ts`
- Create: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for Grid initialization**

Create `tests/Grid.test.ts`:
```typescript
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - Cannot find module '../src/game/Grid'

- [ ] **Step 3: Write minimal Grid class**

Create `src/game/Grid.ts`:
```typescript
export type CellState = number | null; // null = empty, number = color index

export class Grid {
  readonly cols: number;
  readonly rows: number;
  private cells: CellState[][];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = this.createEmptyGrid();
  }

  private createEmptyGrid(): CellState[][] {
    return Array.from({ length: this.cols }, () =>
      Array.from({ length: this.rows }, () => null)
    );
  }

  isEmpty(): boolean {
    return this.cells.every(col => col.every(cell => cell === null));
  }

  getCell(col: number, row: number): CellState {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return null;
    }
    return this.cells[col][row];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add Grid class with initialization"
```

---

## Task 4: Grid Logic - Tile Placement

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for dropping a tile**

Add to `tests/Grid.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - grid.dropTile is not a function

- [ ] **Step 3: Implement dropTile method**

Add to `src/game/Grid.ts` in the Grid class:
```typescript
dropTile(col: number, colorIndex: number): number {
  if (col < 0 || col >= this.cols) {
    return -1;
  }

  // Find the lowest empty row in this column
  for (let row = this.rows - 1; row >= 0; row--) {
    if (this.cells[col][row] === null) {
      this.cells[col][row] = colorIndex;
      return row;
    }
  }

  return -1; // Column is full
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add tile dropping to Grid"
```

---

## Task 5: Grid Logic - Connected Group Detection

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for finding connected groups**

Add to `tests/Grid.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - grid.findConnectedGroup is not a function

- [ ] **Step 3: Implement findConnectedGroup with flood-fill**

Add to `src/game/Grid.ts`:
```typescript
export interface Position {
  col: number;
  row: number;
}

// Add this method to the Grid class:
findConnectedGroup(startCol: number, startRow: number): Position[] {
  const color = this.getCell(startCol, startRow);
  if (color === null) {
    return [];
  }

  const visited = new Set<string>();
  const group: Position[] = [];
  const queue: Position[] = [{ col: startCol, row: startRow }];

  const key = (col: number, row: number) => `${col},${row}`;

  while (queue.length > 0) {
    const { col, row } = queue.shift()!;
    const k = key(col, row);

    if (visited.has(k)) continue;
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) continue;
    if (this.cells[col][row] !== color) continue;

    visited.add(k);
    group.push({ col, row });

    // Check orthogonal neighbors
    queue.push({ col: col - 1, row });
    queue.push({ col: col + 1, row });
    queue.push({ col, row: row - 1 });
    queue.push({ col, row: row + 1 });
  }

  return group;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add flood-fill connected group detection"
```

---

## Task 6: Grid Logic - Clear Groups and Gravity

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for clearing tiles**

Add to `tests/Grid.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - grid.clearGroup is not a function

- [ ] **Step 3: Implement clearGroup and applyGravity**

Add to `src/game/Grid.ts`:
```typescript
export interface FallenTile {
  col: number;
  fromRow: number;
  toRow: number;
}

// Add these methods to the Grid class:
clearGroup(positions: Position[]): void {
  for (const { col, row } of positions) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.cells[col][row] = null;
    }
  }
}

applyGravity(): FallenTile[] {
  const fallen: FallenTile[] = [];

  for (let col = 0; col < this.cols; col++) {
    // Work from bottom to top
    let writeRow = this.rows - 1;

    for (let readRow = this.rows - 1; readRow >= 0; readRow--) {
      const cell = this.cells[col][readRow];
      if (cell !== null) {
        if (readRow !== writeRow) {
          this.cells[col][writeRow] = cell;
          this.cells[col][readRow] = null;
          fallen.push({ col, fromRow: readRow, toRow: writeRow });
        }
        writeRow--;
      }
    }
  }

  return fallen;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add tile clearing and gravity"
```

---

## Task 7: Grid Logic - Cascade Detection

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for finding all matches**

Add to `tests/Grid.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - grid.findAllMatches is not a function

- [ ] **Step 3: Implement findAllMatches**

Add to `src/game/Grid.ts`:
```typescript
findAllMatches(minSize: number): Position[][] {
  const visited = new Set<string>();
  const matches: Position[][] = [];
  const key = (col: number, row: number) => `${col},${row}`;

  for (let col = 0; col < this.cols; col++) {
    for (let row = 0; row < this.rows; row++) {
      if (this.cells[col][row] === null) continue;
      if (visited.has(key(col, row))) continue;

      const group = this.findConnectedGroup(col, row);

      // Mark all cells in group as visited
      for (const pos of group) {
        visited.add(key(pos.col, pos.row));
      }

      if (group.length >= minSize) {
        matches.push(group);
      }
    }
  }

  return matches;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add match detection for cascades"
```

---

## Task 8: Grid Logic - Full Cascade Resolution

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for full cascade resolution**

Add to `tests/Grid.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - grid.resolveCascades is not a function

- [ ] **Step 3: Implement resolveCascades**

Add to `src/game/Grid.ts`:
```typescript
export interface CascadeChain {
  cleared: Position[];
  fallen: FallenTile[];
}

export interface CascadeResult {
  chains: CascadeChain[];
  totalCleared: number;
}

// Add to Grid class:
resolveCascades(minSize: number): CascadeResult {
  const chains: CascadeChain[] = [];
  let totalCleared = 0;

  while (true) {
    const matches = this.findAllMatches(minSize);
    if (matches.length === 0) break;

    // Combine all matches for this chain
    const allCleared: Position[] = matches.flat();
    totalCleared += allCleared.length;

    // Clear them
    this.clearGroup(allCleared);

    // Apply gravity
    const fallen = this.applyGravity();

    chains.push({
      cleared: allCleared,
      fallen,
    });
  }

  return { chains, totalCleared };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add full cascade resolution with chain tracking"
```

---

## Task 9: Grid Logic - Game Over Detection

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for game over detection**

Add to `tests/Grid.test.ts`:
```typescript
describe('isGameOver', () => {
  it('returns false when grid has space', () => {
    const grid = new Grid(6, 12);
    grid.dropTile(0, 0);

    expect(grid.isGameOver()).toBe(false);
  });

  it('returns true when all columns are full', () => {
    const grid = new Grid(2, 2); // tiny grid
    grid.dropTile(0, 0);
    grid.dropTile(0, 1);
    grid.dropTile(1, 0);
    grid.dropTile(1, 1);

    expect(grid.isGameOver()).toBe(true);
  });

  it('returns false when at least one column has space', () => {
    const grid = new Grid(2, 2);
    grid.dropTile(0, 0);
    grid.dropTile(0, 1);
    grid.dropTile(1, 0);
    // column 1 has one space

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
    grid.dropTile(0, 0);
    grid.dropTile(0, 0);

    expect(grid.canDropInColumn(0)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - grid.isGameOver is not a function

- [ ] **Step 3: Implement game over detection**

Add to `src/game/Grid.ts`:
```typescript
canDropInColumn(col: number): boolean {
  if (col < 0 || col >= this.cols) return false;
  return this.cells[col][0] === null;
}

isGameOver(): boolean {
  for (let col = 0; col < this.cols; col++) {
    if (this.canDropInColumn(col)) {
      return false;
    }
  }
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add game over detection"
```

---

## Task 10: Grid Logic - Undo Support

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for undo**

Add to `tests/Grid.test.ts`:
```typescript
describe('undo', () => {
  it('saves state before drop and restores on undo', () => {
    const grid = new Grid(6, 12);
    grid.dropTile(0, 0);
    grid.saveState();
    grid.dropTile(1, 1);

    expect(grid.getCell(1, 11)).toBe(1);

    grid.undo();

    expect(grid.getCell(1, 11)).toBe(null);
    expect(grid.getCell(0, 11)).toBe(0); // first drop still there
  });

  it('returns false when no saved state', () => {
    const grid = new Grid(6, 12);

    const result = grid.undo();

    expect(result).toBe(false);
  });

  it('returns true when undo succeeds', () => {
    const grid = new Grid(6, 12);
    grid.saveState();
    grid.dropTile(0, 0);

    const result = grid.undo();

    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - grid.saveState is not a function

- [ ] **Step 3: Implement undo functionality**

Add to `src/game/Grid.ts` (add property and methods to Grid class):
```typescript
// Add as class property:
private savedState: CellState[][] | null = null;

// Add methods:
saveState(): void {
  this.savedState = this.cells.map(col => [...col]);
}

undo(): boolean {
  if (this.savedState === null) {
    return false;
  }
  this.cells = this.savedState.map(col => [...col]);
  this.savedState = null;
  return true;
}

hasSavedState(): boolean {
  return this.savedState !== null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add undo support to Grid"
```

---

## Task 11: Score Manager

**Files:**
- Create: `src/game/ScoreManager.ts`
- Create: `tests/ScoreManager.test.ts`

- [ ] **Step 1: Write failing test for score calculation**

Create `tests/ScoreManager.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - Cannot find module '../src/game/ScoreManager'

- [ ] **Step 3: Implement ScoreManager**

Create `src/game/ScoreManager.ts`:
```typescript
import { POINTS_PER_TILE } from '../config';

export class ScoreManager {
  private _score: number = 0;
  private _multiplier: number = 1;

  get score(): number {
    return this._score;
  }

  get multiplier(): number {
    return this._multiplier;
  }

  addChain(tilesCleared: number): number {
    const points = tilesCleared * POINTS_PER_TILE * this._multiplier;
    this._score += points;
    this._multiplier++;
    return points;
  }

  endTurn(): void {
    this._multiplier = 1;
  }

  reset(): void {
    this._score = 0;
    this._multiplier = 1;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/ScoreManager.ts tests/ScoreManager.test.ts
git commit -m "feat: add ScoreManager with cascade multipliers"
```

---

## Task 12: Storage Utility

**Files:**
- Create: `src/utils/storage.ts`
- Create: `tests/storage.test.ts`

- [ ] **Step 1: Write failing test for storage**

Create `tests/storage.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - Cannot find module '../src/utils/storage'

- [ ] **Step 3: Implement Storage class**

Create `src/utils/storage.ts`:
```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/storage.ts tests/storage.test.ts
git commit -m "feat: add localStorage wrapper for high scores and settings"
```

---

## Task 13: Daily Puzzle Seed

**Files:**
- Create: `src/utils/daily.ts`
- Create: `tests/daily.test.ts`

- [ ] **Step 1: Write failing test for daily seed**

Create `tests/daily.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL - Cannot find module '../src/utils/daily'

- [ ] **Step 3: Implement daily seed utilities**

Create `src/utils/daily.ts`:
```typescript
export function getDailySeed(): number {
  const now = new Date();
  const dateString = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  return hashString(dateString);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Mulberry32 PRNG - simple and fast
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/daily.ts tests/daily.test.ts
git commit -m "feat: add daily puzzle seed generation"
```

---

## Task 14: Boot Scene

**Files:**
- Create: `src/scenes/BootScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create BootScene**

Create `src/scenes/BootScene.ts`:
```typescript
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Show loading text
    const { width, height } = this.cameras.main;
    this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Future: load pixel font, sprites, sounds here
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
```

- [ ] **Step 2: Update main.ts to use scenes**

Update `src/main.ts`:
```typescript
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { BACKGROUND_COLOR } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  backgroundColor: BACKGROUND_COLOR,
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
};

new Phaser.Game(config);
```

- [ ] **Step 3: Verify it runs (will show error for missing MenuScene)**

Run: `npm run dev`
Expected: Shows "Loading..." then console error about MenuScene (expected for now)

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BootScene.ts src/main.ts
git commit -m "feat: add BootScene for asset loading"
```

---

## Task 15: Menu Scene

**Files:**
- Create: `src/scenes/MenuScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create MenuScene**

Create `src/scenes/MenuScene.ts`:
```typescript
import Phaser from 'phaser';
import { UI_TEXT_COLOR } from '../config';
import { Storage, GameMode } from '../utils/storage';

export class MenuScene extends Phaser.Scene {
  private storage!: Storage;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.storage = new Storage();
    const { width, height } = this.cameras.main;

    // Title
    this.add.text(width / 2, 80, '★ CASCADE ★', {
      fontSize: '48px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Mode buttons
    const modes: { label: string; mode: GameMode; y: number }[] = [
      { label: 'ENDLESS', mode: 'endless', y: 220 },
      { label: 'DAILY PUZZLE', mode: 'daily', y: 300 },
      { label: 'PRACTICE', mode: 'practice', y: 380 },
    ];

    modes.forEach(({ label, mode, y }) => {
      const btn = this.add.text(width / 2, y, label, {
        fontSize: '28px',
        color: UI_TEXT_COLOR,
        backgroundColor: '#16213e',
        padding: { x: 32, y: 16 },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      // Show high score below button
      const highScore = this.storage.getHighScore(mode);
      if (highScore > 0) {
        this.add.text(width / 2, y + 40, `Best: ${highScore}`, {
          fontSize: '16px',
          color: '#888888',
        }).setOrigin(0.5);
      }

      btn.on('pointerover', () => btn.setStyle({ color: '#ffd700' }));
      btn.on('pointerout', () => btn.setStyle({ color: UI_TEXT_COLOR }));
      btn.on('pointerdown', () => {
        this.scene.start('GameScene', { mode });
      });
    });

    // Instructions
    this.add.text(width / 2, height - 60, 'Match 4+ tiles to clear them!', {
      fontSize: '16px',
      color: '#666666',
    }).setOrigin(0.5);
  }
}
```

- [ ] **Step 2: Register MenuScene in main.ts**

Update `src/main.ts`:
```typescript
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { BACKGROUND_COLOR } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  backgroundColor: BACKGROUND_COLOR,
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene],
};

new Phaser.Game(config);
```

- [ ] **Step 3: Verify menu displays**

Run: `npm run dev`
Expected: Menu shows with title and three mode buttons

- [ ] **Step 4: Commit**

```bash
git add src/scenes/MenuScene.ts src/main.ts
git commit -m "feat: add MenuScene with mode selection"
```

---

## Task 16: Tile Visual Object

**Files:**
- Create: `src/game/Tile.ts`

- [ ] **Step 1: Create Tile class**

Create `src/game/Tile.ts`:
```typescript
import Phaser from 'phaser';
import { TILE_SIZE, COLORS } from '../config';

export class Tile extends Phaser.GameObjects.Rectangle {
  readonly colorIndex: number;

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    colorIndex: number,
    gridX: number,
    gridY: number
  ) {
    const x = gridX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = gridY + row * TILE_SIZE + TILE_SIZE / 2;

    super(scene, x, y, TILE_SIZE - 4, TILE_SIZE - 4, COLORS[colorIndex]);

    this.colorIndex = colorIndex;
    this.setStrokeStyle(2, 0xffffff, 0.3);

    scene.add.existing(this);
  }

  animateDrop(targetRow: number, gridY: number, onComplete?: () => void): void {
    const targetY = gridY + targetRow * TILE_SIZE + TILE_SIZE / 2;

    this.scene.tweens.add({
      targets: this,
      y: targetY,
      duration: 150,
      ease: 'Bounce.easeOut',
      onComplete,
    });
  }

  animateClear(onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
    });
  }

  setGridPosition(col: number, row: number, gridX: number, gridY: number): void {
    this.x = gridX + col * TILE_SIZE + TILE_SIZE / 2;
    this.y = gridY + row * TILE_SIZE + TILE_SIZE / 2;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/Tile.ts
git commit -m "feat: add Tile visual object with animations"
```

---

## Task 17: Game Scene - Basic Rendering

**Files:**
- Create: `src/scenes/GameScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create GameScene with grid rendering**

Create `src/scenes/GameScene.ts`:
```typescript
import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { Tile } from '../game/Tile';
import { ScoreManager } from '../game/ScoreManager';
import { Storage, GameMode } from '../utils/storage';
import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  GRID_PADDING,
  COLORS,
  INITIAL_COLOR_COUNT,
  MIN_MATCH_SIZE,
  UI_TEXT_COLOR,
  GRID_BACKGROUND_COLOR,
} from '../config';

interface GameSceneData {
  mode: GameMode;
}

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private scoreManager!: ScoreManager;
  private storage!: Storage;
  private mode!: GameMode;

  private tiles: Map<string, Tile> = new Map();
  private gridX!: number;
  private gridY!: number;
  private colorCount: number = INITIAL_COLOR_COUNT;
  private nextColorIndex: number = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private nextPreview!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    this.mode = data.mode || 'endless';
  }

  create(): void {
    this.grid = new Grid(GRID_COLS, GRID_ROWS);
    this.scoreManager = new ScoreManager();
    this.storage = new Storage();
    this.tiles.clear();

    const { width, height } = this.cameras.main;

    // Calculate grid position (centered)
    const gridWidth = GRID_COLS * TILE_SIZE;
    const gridHeight = GRID_ROWS * TILE_SIZE;
    this.gridX = (width - gridWidth) / 2 - 40;
    this.gridY = (height - gridHeight) / 2 + 20;

    // Draw grid background
    this.add.rectangle(
      this.gridX + gridWidth / 2,
      this.gridY + gridHeight / 2,
      gridWidth + 8,
      gridHeight + 8,
      GRID_BACKGROUND_COLOR
    ).setStrokeStyle(2, 0x0f3460);

    // Draw column indicators
    for (let col = 0; col < GRID_COLS; col++) {
      const x = this.gridX + col * TILE_SIZE + TILE_SIZE / 2;
      this.add.rectangle(x, this.gridY - 20, TILE_SIZE - 8, 4, 0x0f3460);
    }

    // UI: Title
    this.add.text(GRID_PADDING, GRID_PADDING, '★ CASCADE ★', {
      fontSize: '20px',
      color: '#ffd700',
    });

    // UI: Score
    this.scoreText = this.add.text(width - GRID_PADDING, GRID_PADDING, 'Score: 0', {
      fontSize: '20px',
      color: UI_TEXT_COLOR,
    }).setOrigin(1, 0);

    // UI: Next tile preview
    const previewX = this.gridX + gridWidth + 50;
    const previewY = this.gridY + 60;

    this.add.text(previewX, previewY - 30, 'NEXT', {
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);

    this.nextPreview = this.add.rectangle(
      previewX,
      previewY + 20,
      TILE_SIZE - 4,
      TILE_SIZE - 4,
      COLORS[0]
    ).setStrokeStyle(2, 0xffffff, 0.3);

    // Generate first next tile
    this.generateNextTile();

    // Setup input
    this.setupInput();
  }

  private generateNextTile(): void {
    this.nextColorIndex = Phaser.Math.Between(0, this.colorCount - 1);
    this.nextPreview.setFillStyle(COLORS[this.nextColorIndex]);
  }

  private setupInput(): void {
    // Click on grid to drop
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const col = Math.floor((pointer.x - this.gridX) / TILE_SIZE);
      if (col >= 0 && col < GRID_COLS) {
        this.dropTile(col);
      }
    });

    // Keyboard controls
    this.input.keyboard?.on('keydown-LEFT', () => this.highlightColumn(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.highlightColumn(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.dropTileAtSelection());
    this.input.keyboard?.on('keydown-DOWN', () => this.dropTileAtSelection());
    this.input.keyboard?.on('keydown-Z', () => this.undoLastMove());
  }

  private selectedColumn: number = Math.floor(GRID_COLS / 2);

  private highlightColumn(delta: number): void {
    this.selectedColumn = Phaser.Math.Clamp(
      this.selectedColumn + delta,
      0,
      GRID_COLS - 1
    );
    // Visual feedback could be added here
  }

  private dropTileAtSelection(): void {
    this.dropTile(this.selectedColumn);
  }

  private dropTile(col: number): void {
    if (!this.grid.canDropInColumn(col)) return;

    // Save state for undo
    this.grid.saveState();

    const colorIndex = this.nextColorIndex;
    const landedRow = this.grid.dropTile(col, colorIndex);

    if (landedRow === -1) return;

    // Create visual tile
    const tile = new Tile(this, col, 0, colorIndex, this.gridX, this.gridY);
    this.tiles.set(`${col},${landedRow}`, tile);

    // Animate drop
    tile.animateDrop(landedRow, this.gridY, () => {
      this.resolveCascades();
    });

    this.generateNextTile();
  }

  private resolveCascades(): void {
    const result = this.grid.resolveCascades(MIN_MATCH_SIZE);

    if (result.chains.length === 0) {
      this.scoreManager.endTurn();
      this.checkGameOver();
      return;
    }

    // Process each chain with animation delay
    this.animateChains(result.chains, 0);
  }

  private animateChains(chains: Array<{ cleared: Array<{ col: number; row: number }>; fallen: Array<{ col: number; fromRow: number; toRow: number }> }>, index: number): void {
    if (index >= chains.length) {
      this.scoreManager.endTurn();
      this.checkGameOver();
      return;
    }

    const chain = chains[index];

    // Add score
    const points = this.scoreManager.addChain(chain.cleared.length);
    this.scoreText.setText(`Score: ${this.scoreManager.score}`);

    // Show multiplier text if > 1x
    if (this.scoreManager.multiplier > 2) {
      this.showMultiplierText(this.scoreManager.multiplier - 1);
    }

    // Animate cleared tiles
    let clearedCount = 0;
    chain.cleared.forEach(({ col, row }) => {
      const key = `${col},${row}`;
      const tile = this.tiles.get(key);
      if (tile) {
        tile.animateClear(() => {
          clearedCount++;
          if (clearedCount === chain.cleared.length) {
            // After clear animation, update fallen tiles
            this.updateFallenTiles(chain.fallen);
            // Continue to next chain
            this.time.delayedCall(200, () => {
              this.animateChains(chains, index + 1);
            });
          }
        });
        this.tiles.delete(key);
      }
    });
  }

  private updateFallenTiles(fallen: Array<{ col: number; fromRow: number; toRow: number }>): void {
    fallen.forEach(({ col, fromRow, toRow }) => {
      const oldKey = `${col},${fromRow}`;
      const newKey = `${col},${toRow}`;
      const tile = this.tiles.get(oldKey);
      if (tile) {
        this.tiles.delete(oldKey);
        this.tiles.set(newKey, tile);
        tile.animateDrop(toRow, this.gridY);
      }
    });
  }

  private showMultiplierText(multiplier: number): void {
    const { width, height } = this.cameras.main;
    const text = this.add.text(width / 2, height / 2, `${multiplier}x!`, {
      fontSize: '64px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      scale: 1.5,
      alpha: 0,
      duration: 500,
      onComplete: () => text.destroy(),
    });
  }

  private undoLastMove(): void {
    if (this.grid.undo()) {
      // Rebuild visual tiles from grid state
      this.rebuildTilesFromGrid();
    }
  }

  private rebuildTilesFromGrid(): void {
    // Destroy all current tiles
    this.tiles.forEach(tile => tile.destroy());
    this.tiles.clear();

    // Recreate from grid state
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        const colorIndex = this.grid.getCell(col, row);
        if (colorIndex !== null) {
          const tile = new Tile(this, col, row, colorIndex, this.gridX, this.gridY);
          this.tiles.set(`${col},${row}`, tile);
        }
      }
    }
  }

  private checkGameOver(): void {
    if (this.grid.isGameOver()) {
      this.storage.setHighScore(this.mode, this.scoreManager.score);
      this.scene.start('GameOverScene', {
        score: this.scoreManager.score,
        mode: this.mode,
        isHighScore: this.scoreManager.score >= this.storage.getHighScore(this.mode),
      });
    }
  }
}
```

- [ ] **Step 2: Register GameScene in main.ts**

Update `src/main.ts`:
```typescript
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { BACKGROUND_COLOR } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  backgroundColor: BACKGROUND_COLOR,
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene],
};

new Phaser.Game(config);
```

- [ ] **Step 3: Verify gameplay works**

Run: `npm run dev`
Expected: Can click to drop tiles, tiles stack, matches clear with animation

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.ts src/main.ts
git commit -m "feat: add GameScene with full gameplay loop"
```

---

## Task 18: Game Over Scene

**Files:**
- Create: `src/scenes/GameOverScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create GameOverScene**

Create `src/scenes/GameOverScene.ts`:
```typescript
import Phaser from 'phaser';
import { UI_TEXT_COLOR } from '../config';
import { GameMode } from '../utils/storage';

interface GameOverData {
  score: number;
  mode: GameMode;
  isHighScore: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const { width, height } = this.cameras.main;
    const { score, mode, isHighScore } = data;

    // Game Over text
    this.add.text(width / 2, 120, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff6b9d',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Score
    this.add.text(width / 2, 220, `Score: ${score}`, {
      fontSize: '36px',
      color: '#ffd700',
    }).setOrigin(0.5);

    // High score indicator
    if (isHighScore) {
      const newBest = this.add.text(width / 2, 280, '★ NEW BEST! ★', {
        fontSize: '24px',
        color: '#7fff00',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: newBest,
        scale: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 500,
      });
    }

    // Play Again button
    const playAgain = this.add.text(width / 2, 400, 'PLAY AGAIN', {
      fontSize: '28px',
      color: UI_TEXT_COLOR,
      backgroundColor: '#16213e',
      padding: { x: 32, y: 16 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playAgain.on('pointerover', () => playAgain.setStyle({ color: '#ffd700' }));
    playAgain.on('pointerout', () => playAgain.setStyle({ color: UI_TEXT_COLOR }));
    playAgain.on('pointerdown', () => {
      this.scene.start('GameScene', { mode });
    });

    // Menu button
    const menu = this.add.text(width / 2, 480, 'MENU', {
      fontSize: '24px',
      color: '#888888',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    menu.on('pointerover', () => menu.setStyle({ color: '#ffffff' }));
    menu.on('pointerout', () => menu.setStyle({ color: '#888888' }));
    menu.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene', { mode });
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }
}
```

- [ ] **Step 2: Register GameOverScene in main.ts**

Update `src/main.ts`:
```typescript
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { BACKGROUND_COLOR } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  backgroundColor: BACKGROUND_COLOR,
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
};

new Phaser.Game(config);
```

- [ ] **Step 3: Verify game over flow works**

Run: `npm run dev`
Expected: When grid fills up, shows Game Over screen with score and options

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameOverScene.ts src/main.ts
git commit -m "feat: add GameOverScene with play again flow"
```

---

## Task 19: Add Undo Button UI

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add visual undo button**

Add to `GameScene.create()` after next preview setup:
```typescript
// UI: Undo button
const undoBtn = this.add.text(previewX, previewY + 120, '[UNDO]', {
  fontSize: '16px',
  color: '#666666',
})
  .setOrigin(0.5)
  .setInteractive({ useHandCursor: true });

undoBtn.on('pointerover', () => undoBtn.setStyle({ color: '#ffffff' }));
undoBtn.on('pointerout', () => undoBtn.setStyle({ color: '#666666' }));
undoBtn.on('pointerdown', () => this.undoLastMove());
```

- [ ] **Step 2: Verify undo button works**

Run: `npm run dev`
Expected: Clicking UNDO reverses last move

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add visual undo button"
```

---

## Task 20: Daily Mode with Seeded Random

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Update GameScene to use seeded random for daily mode**

Update `GameScene` class to add seeded random support:

Add import at top:
```typescript
import { getDailySeed, seededRandom } from '../utils/daily';
```

Add property:
```typescript
private rng: (() => number) | null = null;
```

Update `create()` to initialize RNG:
```typescript
// After this.storage = new Storage(); add:
if (this.mode === 'daily') {
  this.rng = seededRandom(getDailySeed());
}
```

Update `generateNextTile()`:
```typescript
private generateNextTile(): void {
  if (this.rng) {
    this.nextColorIndex = Math.floor(this.rng() * this.colorCount);
  } else {
    this.nextColorIndex = Phaser.Math.Between(0, this.colorCount - 1);
  }
  this.nextPreview.setFillStyle(COLORS[this.nextColorIndex]);
}
```

- [ ] **Step 2: Verify daily mode gives same sequence**

Run: `npm run dev`
Expected: Daily mode always starts with same tile sequence (same day)

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add seeded random for daily puzzle mode"
```

---

## Task 21: Practice Mode (No Game Over)

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Update checkGameOver for practice mode**

Update `checkGameOver()`:
```typescript
private checkGameOver(): void {
  if (this.mode === 'practice') {
    // Practice mode: never ends, just show message if grid is full
    if (this.grid.isGameOver()) {
      this.showPracticeFullMessage();
    }
    return;
  }

  if (this.grid.isGameOver()) {
    this.storage.setHighScore(this.mode, this.scoreManager.score);
    this.scene.start('GameOverScene', {
      score: this.scoreManager.score,
      mode: this.mode,
      isHighScore: this.scoreManager.score >= this.storage.getHighScore(this.mode),
    });
  }
}

private showPracticeFullMessage(): void {
  const { width, height } = this.cameras.main;
  const text = this.add.text(width / 2, height / 2, 'Grid full! Use UNDO', {
    fontSize: '24px',
    color: '#ff6b9d',
    backgroundColor: '#1a1a2e',
    padding: { x: 16, y: 8 },
  }).setOrigin(0.5);

  this.tweens.add({
    targets: text,
    alpha: 0,
    delay: 2000,
    duration: 500,
    onComplete: () => text.destroy(),
  });
}
```

- [ ] **Step 2: Verify practice mode doesn't end**

Run: `npm run dev`
Expected: Practice mode shows message when full but doesn't go to game over

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: practice mode with no game over"
```

---

## Task 22: Difficulty Scaling

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Add difficulty scaling in endless mode**

Add to `GameScene` after score update in `animateChains()`:
```typescript
// After: this.scoreText.setText(`Score: ${this.scoreManager.score}`);
// Add:
this.updateDifficulty();
```

Add method:
```typescript
private updateDifficulty(): void {
  if (this.mode !== 'endless') return;

  const score = this.scoreManager.score;
  const thresholds = [500, 1500]; // From config.ts DIFFICULTY_THRESHOLDS

  let newColorCount = INITIAL_COLOR_COUNT;
  for (const threshold of thresholds) {
    if (score >= threshold) {
      newColorCount++;
    }
  }

  if (newColorCount > this.colorCount && newColorCount <= COLORS.length) {
    this.colorCount = newColorCount;
    this.showNewColorMessage();
  }
}

private showNewColorMessage(): void {
  const { width, height } = this.cameras.main;
  const text = this.add.text(width / 2, height / 3, 'NEW COLOR!', {
    fontSize: '32px',
    color: '#da70d6',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  this.tweens.add({
    targets: text,
    scale: 1.3,
    alpha: 0,
    duration: 1000,
    onComplete: () => text.destroy(),
  });
}
```

- [ ] **Step 2: Verify new colors appear at thresholds**

Run: `npm run dev`
Expected: At 500 points, 5th color appears; at 1500, 6th color

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: add difficulty scaling with new colors"
```

---

## Task 23: README and Deployment Setup

**Files:**
- Create: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Create README**

Create `README.md`:
```markdown
# Cascade

A relaxing, retro-styled falling-block puzzle game. Match 4+ tiles of the same color to clear them and trigger chain reactions!

## Play

Visit: [your-vercel-url-here]

Or run locally:

```bash
npm install
npm run dev
```

## How to Play

- **Click** a column to drop a tile
- **Arrow keys** + **Space/Down** for keyboard control
- **Z** or click **UNDO** to undo your last move
- Match **4 or more** tiles of the same color (connected horizontally or vertically) to clear them
- Chain reactions multiply your score!

## Game Modes

- **Endless**: Play until the grid fills up. New colors appear as you score higher.
- **Daily Puzzle**: Same sequence for everyone each day. Compare your best!
- **Practice**: Can't lose - experiment freely with undo.

## Tech Stack

- [Phaser 3](https://phaser.io/) - Game framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool
- [Vitest](https://vitest.dev/) - Testing

## Development

```bash
npm run dev      # Start dev server
npm run test     # Run tests in watch mode
npm run build    # Build for production
npm run preview  # Preview production build
```

## License

MIT
```

- [ ] **Step 2: Add license field to package.json**

Update `package.json` to include:
```json
{
  "license": "MIT"
}
```

- [ ] **Step 3: Verify build works**

Run: `npm run build`
Expected: Creates `dist/` folder with bundled files

- [ ] **Step 4: Commit**

```bash
git add README.md package.json
git commit -m "docs: add README and set MIT license"
```

---

## Task 24: Vercel Deployment

**Files:**
- Create: `vercel.json` (optional, for custom settings)

- [ ] **Step 1: Verify build output is correct for Vercel**

Run: `npm run build && ls -la dist/`
Expected: `index.html` and `assets/` folder present

- [ ] **Step 2: Deploy to Vercel**

Option A - Via CLI:
```bash
npx vercel
```

Option B - Connect GitHub repo to Vercel dashboard

- [ ] **Step 3: Test deployed version**

Expected: Game loads and plays correctly on Vercel URL

- [ ] **Step 4: Update README with live URL**

Update `README.md` with actual Vercel URL

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add live deployment URL"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: All features from spec have corresponding tasks
  - Core mechanics (grid, tiles, cascade): Tasks 3-10
  - Scoring with multipliers: Task 11
  - Game modes (endless, daily, practice): Tasks 20-21
  - Visual design: Tasks 14-18
  - Undo: Task 10, 19
  - Storage: Task 12
  - Deployment: Tasks 23-24

- [x] **Placeholder scan**: No TBD/TODO, all code complete

- [x] **Type consistency**:
  - `Grid` methods consistent across tasks
  - `Position`, `FallenTile`, `CascadeChain`, `CascadeResult` types defined once, used consistently
  - `GameMode` type shared between storage and scenes

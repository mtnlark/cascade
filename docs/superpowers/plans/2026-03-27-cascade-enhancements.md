# Cascade Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cascade more engaging by lowering match size to 3, adding a 3-tile preview queue, and introducing special tiles (Rainbow, Bomb, Color Bomb).

**Architecture:** Extend the Grid class to track tile types alongside colors. Create a TileQueue class to manage upcoming tiles including special types. Update Tile visuals to render special tiles distinctively.

**Tech Stack:** TypeScript, Phaser 3, Vitest

---

## File Structure

**New Files:**
- `src/game/TileData.ts` - Type definitions for tile data including special types
- `src/game/TileQueue.ts` - Manages upcoming tile generation with spawn rates
- `tests/TileQueue.test.ts` - Tests for tile queue

**Modified Files:**
- `src/config.ts` - Change MIN_MATCH_SIZE, add spawn rates
- `src/game/Grid.ts` - Support tile types, rainbow matching, special clearing
- `tests/Grid.test.ts` - Tests for new grid behavior
- `src/game/Tile.ts` - Visual rendering for special tiles
- `src/scenes/GameScene.ts` - Preview queue UI, integrate TileQueue

---

### Task 1: Update Config Constants

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Update MIN_MATCH_SIZE and add spawn rates**

```typescript
// In src/config.ts, change:
export const MIN_MATCH_SIZE = 3;

// Add after DIFFICULTY_THRESHOLDS:
export const SPECIAL_TILE_RATES = {
  normal: 0.85,
  rainbow: 0.05,
  bomb: 0.05,
  colorBomb: 0.05,
} as const;
```

- [ ] **Step 2: Verify tests still pass**

Run: `npm test`
Expected: All existing tests pass (match size change will require test updates in Task 2)

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat: lower match size to 3, add special tile spawn rates"
```

---

### Task 2: Create TileData Types

**Files:**
- Create: `src/game/TileData.ts`

- [ ] **Step 1: Create TileData type definitions**

```typescript
// src/game/TileData.ts
export type TileType = 'normal' | 'rainbow' | 'bomb' | 'colorBomb';

export interface TileData {
  colorIndex: number;  // For rainbow, this is the "display" color (cycles visually)
  type: TileType;
}

export function isSpecialTile(type: TileType): boolean {
  return type !== 'normal';
}

export function createNormalTile(colorIndex: number): TileData {
  return { colorIndex, type: 'normal' };
}

export function createRainbowTile(): TileData {
  return { colorIndex: -1, type: 'rainbow' };
}

export function createBombTile(colorIndex: number): TileData {
  return { colorIndex, type: 'bomb' };
}

export function createColorBombTile(colorIndex: number): TileData {
  return { colorIndex, type: 'colorBomb' };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/game/TileData.ts
git commit -m "feat: add TileData types for special tiles"
```

---

### Task 3: Create TileQueue Class

**Files:**
- Create: `src/game/TileQueue.ts`
- Create: `tests/TileQueue.test.ts`

- [ ] **Step 1: Write failing test for queue initialization**

```typescript
// tests/TileQueue.test.ts
import { describe, it, expect } from 'vitest';
import { TileQueue } from '../src/game/TileQueue';

describe('TileQueue', () => {
  describe('initialization', () => {
    it('creates queue with specified size', () => {
      const queue = new TileQueue(3, 4); // 3 tiles, 4 colors
      expect(queue.size).toBe(3);
      expect(queue.peek(0)).toBeDefined();
      expect(queue.peek(1)).toBeDefined();
      expect(queue.peek(2)).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/TileQueue.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement TileQueue class**

```typescript
// src/game/TileQueue.ts
import { TileData, TileType, createNormalTile, createRainbowTile, createBombTile, createColorBombTile } from './TileData';
import { SPECIAL_TILE_RATES } from '../config';

export class TileQueue {
  private queue: TileData[] = [];
  private colorCount: number;
  private rng: (() => number) | null;

  constructor(size: number, colorCount: number, rng: (() => number) | null = null) {
    this.colorCount = colorCount;
    this.rng = rng;

    for (let i = 0; i < size; i++) {
      this.queue.push(this.generateTile());
    }
  }

  get size(): number {
    return this.queue.length;
  }

  peek(index: number): TileData | undefined {
    return this.queue[index];
  }

  next(): TileData {
    const tile = this.queue.shift()!;
    this.queue.push(this.generateTile());
    return tile;
  }

  setColorCount(count: number): void {
    this.colorCount = count;
  }

  private generateTile(): TileData {
    const roll = this.random();
    const colorIndex = Math.floor(this.random() * this.colorCount);

    if (roll < SPECIAL_TILE_RATES.rainbow) {
      return createRainbowTile();
    } else if (roll < SPECIAL_TILE_RATES.rainbow + SPECIAL_TILE_RATES.bomb) {
      return createBombTile(colorIndex);
    } else if (roll < SPECIAL_TILE_RATES.rainbow + SPECIAL_TILE_RATES.bomb + SPECIAL_TILE_RATES.colorBomb) {
      return createColorBombTile(colorIndex);
    } else {
      return createNormalTile(colorIndex);
    }
  }

  private random(): number {
    return this.rng ? this.rng() : Math.random();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/TileQueue.test.ts`
Expected: PASS

- [ ] **Step 5: Add test for next() method**

```typescript
// Add to tests/TileQueue.test.ts
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
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/TileQueue.test.ts`
Expected: PASS

- [ ] **Step 7: Add test for seeded random**

```typescript
// Add to tests/TileQueue.test.ts
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
```

- [ ] **Step 8: Run tests**

Run: `npm test -- tests/TileQueue.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/game/TileQueue.ts tests/TileQueue.test.ts
git commit -m "feat: add TileQueue for managing upcoming tiles"
```

---

### Task 4: Extend Grid to Store Tile Types

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Update Grid CellState type**

```typescript
// In src/game/Grid.ts, replace the CellState type and add import:
import { TileData, TileType } from './TileData';

export type CellState = TileData | null;
```

- [ ] **Step 2: Update dropTile to accept TileData**

```typescript
// In src/game/Grid.ts, replace dropTile method:
dropTile(col: number, tile: TileData): number {
  if (col < 0 || col >= this.cols) {
    return -1;
  }

  for (let row = this.rows - 1; row >= 0; row--) {
    if (this.cells[col][row] === null) {
      this.cells[col][row] = tile;
      return row;
    }
  }

  return -1;
}
```

- [ ] **Step 3: Update getCell return type helper**

```typescript
// Add helper methods to Grid class:
getCellColor(col: number, row: number): number | null {
  const cell = this.getCell(col, row);
  return cell ? cell.colorIndex : null;
}

getCellType(col: number, row: number): TileType | null {
  const cell = this.getCell(col, row);
  return cell ? cell.type : null;
}
```

- [ ] **Step 4: Update findConnectedGroup for rainbow support**

```typescript
// In src/game/Grid.ts, replace findConnectedGroup:
findConnectedGroup(startCol: number, startRow: number): Position[] {
  const startCell = this.getCell(startCol, startRow);
  if (startCell === null) {
    return [];
  }

  const visited = new Set<string>();
  const group: Position[] = [];
  const queue: Position[] = [{ col: startCol, row: startRow }];

  const key = (col: number, row: number) => `${col},${row}`;

  // Determine the "target color" for matching
  // If starting cell is rainbow, find an adjacent non-rainbow color
  let targetColor = startCell.type === 'rainbow' ? this.findAdjacentColor(startCol, startRow) : startCell.colorIndex;

  if (targetColor === null && startCell.type === 'rainbow') {
    // Isolated rainbow, just return it
    return [{ col: startCol, row: startRow }];
  }

  while (queue.length > 0) {
    const { col, row } = queue.shift()!;
    const k = key(col, row);

    if (visited.has(k)) continue;
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) continue;

    const cell = this.cells[col][row];
    if (cell === null) continue;

    // Rainbow matches any color, otherwise must match target
    const matches = cell.type === 'rainbow' || cell.colorIndex === targetColor;
    if (!matches) continue;

    visited.add(k);
    group.push({ col, row });

    queue.push({ col: col - 1, row });
    queue.push({ col: col + 1, row });
    queue.push({ col, row: row - 1 });
    queue.push({ col, row: row + 1 });
  }

  return group;
}

private findAdjacentColor(col: number, row: number): number | null {
  const neighbors = [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 },
  ];

  for (const pos of neighbors) {
    const cell = this.getCell(pos.col, pos.row);
    if (cell && cell.type !== 'rainbow') {
      return cell.colorIndex;
    }
  }
  return null;
}
```

- [ ] **Step 5: Update tests to use TileData**

```typescript
// In tests/Grid.test.ts, add import:
import { createNormalTile } from '../src/game/TileData';

// Update all dropTile calls from:
grid.dropTile(0, 0);
// To:
grid.dropTile(0, createNormalTile(0));
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/Grid.test.ts`
Expected: Tests should pass after updating all dropTile calls

- [ ] **Step 7: Add rainbow matching test**

```typescript
// Add to tests/Grid.test.ts in findConnectedGroup describe:
import { createNormalTile, createRainbowTile } from '../src/game/TileData';

it('rainbow tile matches adjacent colors', () => {
  const grid = new Grid(6, 12);
  grid.dropTile(0, createNormalTile(0)); // blue at bottom
  grid.dropTile(1, createRainbowTile()); // rainbow next to it
  grid.dropTile(2, createNormalTile(0)); // blue on other side

  const group = grid.findConnectedGroup(0, 11);

  expect(group).toHaveLength(3);
});
```

- [ ] **Step 8: Run tests**

Run: `npm test -- tests/Grid.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: extend Grid to store TileData with rainbow matching"
```

---

### Task 5: Add Bomb Clearing Logic

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for bomb clearing**

```typescript
// Add to tests/Grid.test.ts:
import { createBombTile } from '../src/game/TileData';

describe('bomb clearing', () => {
  it('clears 3x3 area around bomb when matched', () => {
    const grid = new Grid(6, 12);
    // Create a 3x3 block of tiles with bomb in center
    grid.dropTile(0, createNormalTile(1)); // row 11
    grid.dropTile(1, createNormalTile(1)); // row 11
    grid.dropTile(2, createNormalTile(1)); // row 11
    grid.dropTile(0, createNormalTile(0)); // row 10
    grid.dropTile(1, createBombTile(0));   // row 10 - bomb
    grid.dropTile(2, createNormalTile(0)); // row 10
    grid.dropTile(0, createNormalTile(0)); // row 9 - matches bomb

    const result = grid.resolveCascades(3);

    // Should clear the bomb match (3 tiles) plus 3x3 area
    expect(result.totalCleared).toBeGreaterThan(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/Grid.test.ts`
Expected: FAIL (bomb doesn't have special behavior yet)

- [ ] **Step 3: Add getBombClearArea method**

```typescript
// Add to Grid class:
private getBombClearArea(col: number, row: number): Position[] {
  const positions: Position[] = [];
  for (let c = col - 1; c <= col + 1; c++) {
    for (let r = row - 1; r <= row + 1; r++) {
      if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
        if (this.cells[c][r] !== null) {
          positions.push({ col: c, row: r });
        }
      }
    }
  }
  return positions;
}
```

- [ ] **Step 4: Update resolveCascades to handle special tiles**

```typescript
// Replace resolveCascades method:
resolveCascades(minSize: number): CascadeResult {
  const chains: CascadeChain[] = [];
  let totalCleared = 0;

  while (true) {
    const matches = this.findAllMatches(minSize);
    if (matches.length === 0) break;

    const allCleared: Position[] = matches.flat();

    // Process special tiles in matches
    const specialClears = this.processSpecialTiles(allCleared);
    const combinedClears = this.mergePositions(allCleared, specialClears);

    totalCleared += combinedClears.length;
    this.clearGroup(combinedClears);
    const fallen = this.applyGravity();

    chains.push({
      cleared: combinedClears,
      fallen,
    });
  }

  return { chains, totalCleared };
}

private processSpecialTiles(positions: Position[]): Position[] {
  const extra: Position[] = [];

  // Process bombs first
  for (const pos of positions) {
    const cell = this.getCell(pos.col, pos.row);
    if (cell?.type === 'bomb') {
      extra.push(...this.getBombClearArea(pos.col, pos.row));
    }
  }

  return extra;
}

private mergePositions(a: Position[], b: Position[]): Position[] {
  const seen = new Set<string>();
  const result: Position[] = [];

  for (const pos of [...a, ...b]) {
    const key = `${pos.col},${pos.row}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(pos);
    }
  }

  return result;
}
```

- [ ] **Step 5: Run test**

Run: `npm test -- tests/Grid.test.ts`
Expected: PASS

- [ ] **Step 6: Add test for bomb chain reaction**

```typescript
// Add to bomb clearing describe:
it('bomb hitting another bomb triggers chain', () => {
  const grid = new Grid(6, 12);
  grid.dropTile(0, createBombTile(0));  // row 11
  grid.dropTile(1, createBombTile(0));  // row 11, in blast radius of first
  grid.dropTile(2, createNormalTile(0)); // row 11

  const result = grid.resolveCascades(3);

  // Both bombs should trigger
  expect(result.totalCleared).toBeGreaterThanOrEqual(3);
});
```

- [ ] **Step 7: Update processSpecialTiles for chain reactions**

```typescript
// Replace processSpecialTiles:
private processSpecialTiles(positions: Position[]): Position[] {
  const extra: Position[] = [];
  const processedBombs = new Set<string>();
  const bombQueue = positions.filter(p => this.getCell(p.col, p.row)?.type === 'bomb');

  while (bombQueue.length > 0) {
    const bomb = bombQueue.shift()!;
    const key = `${bomb.col},${bomb.row}`;
    if (processedBombs.has(key)) continue;
    processedBombs.add(key);

    const area = this.getBombClearArea(bomb.col, bomb.row);
    extra.push(...area);

    // Check if any cleared tiles are also bombs
    for (const pos of area) {
      const cell = this.getCell(pos.col, pos.row);
      if (cell?.type === 'bomb' && !processedBombs.has(`${pos.col},${pos.row}`)) {
        bombQueue.push(pos);
      }
    }
  }

  return extra;
}
```

- [ ] **Step 8: Run tests**

Run: `npm test -- tests/Grid.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add bomb tile clearing with chain reactions"
```

---

### Task 6: Add Color Bomb Clearing Logic

**Files:**
- Modify: `src/game/Grid.ts`
- Modify: `tests/Grid.test.ts`

- [ ] **Step 1: Write failing test for color bomb**

```typescript
// Add to tests/Grid.test.ts:
import { createColorBombTile } from '../src/game/TileData';

describe('color bomb clearing', () => {
  it('clears all tiles of matched color', () => {
    const grid = new Grid(6, 12);
    // Scatter blue tiles (color 0) around the grid
    grid.dropTile(0, createNormalTile(0)); // blue
    grid.dropTile(2, createNormalTile(0)); // blue
    grid.dropTile(4, createNormalTile(0)); // blue
    grid.dropTile(1, createNormalTile(1)); // pink
    grid.dropTile(3, createNormalTile(1)); // pink
    // Add color bomb that will match with blues
    grid.dropTile(0, createColorBombTile(0)); // color bomb, blue
    grid.dropTile(0, createNormalTile(0));    // blue to trigger match

    const result = grid.resolveCascades(3);

    // Should clear all blue tiles (color 0)
    // The pinks should remain
    expect(grid.getCell(1, 11)).not.toBeNull();
    expect(grid.getCell(3, 11)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/Grid.test.ts`
Expected: FAIL

- [ ] **Step 3: Add getColorBombClears method**

```typescript
// Add to Grid class:
private getColorBombClears(colorIndex: number): Position[] {
  const positions: Position[] = [];
  for (let col = 0; col < this.cols; col++) {
    for (let row = 0; row < this.rows; row++) {
      const cell = this.cells[col][row];
      if (cell && cell.colorIndex === colorIndex) {
        positions.push({ col, row });
      }
    }
  }
  return positions;
}
```

- [ ] **Step 4: Update processSpecialTiles to handle color bombs**

```typescript
// Update processSpecialTiles to add color bomb handling after bombs:
private processSpecialTiles(positions: Position[]): Position[] {
  const extra: Position[] = [];
  const processedBombs = new Set<string>();
  const bombQueue = positions.filter(p => this.getCell(p.col, p.row)?.type === 'bomb');

  // Process bombs with chain reactions
  while (bombQueue.length > 0) {
    const bomb = bombQueue.shift()!;
    const key = `${bomb.col},${bomb.row}`;
    if (processedBombs.has(key)) continue;
    processedBombs.add(key);

    const area = this.getBombClearArea(bomb.col, bomb.row);
    extra.push(...area);

    for (const pos of area) {
      const cell = this.getCell(pos.col, pos.row);
      if (cell?.type === 'bomb' && !processedBombs.has(`${pos.col},${pos.row}`)) {
        bombQueue.push(pos);
      }
    }
  }

  // Process color bombs (no chain reaction for color bombs)
  for (const pos of positions) {
    const cell = this.getCell(pos.col, pos.row);
    if (cell?.type === 'colorBomb') {
      // Find the matched color (from non-rainbow tiles in the match)
      const matchColor = this.findMatchColorInGroup(positions);
      if (matchColor !== null) {
        extra.push(...this.getColorBombClears(matchColor));
      }
    }
  }

  return extra;
}

private findMatchColorInGroup(positions: Position[]): number | null {
  for (const pos of positions) {
    const cell = this.getCell(pos.col, pos.row);
    if (cell && cell.type !== 'rainbow') {
      return cell.colorIndex;
    }
  }
  return null;
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/Grid.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/game/Grid.ts tests/Grid.test.ts
git commit -m "feat: add color bomb clearing logic"
```

---

### Task 7: Update Tile Visual for Special Types

**Files:**
- Modify: `src/game/Tile.ts`

- [ ] **Step 1: Update Tile constructor to accept TileType**

```typescript
// Replace src/game/Tile.ts entirely:
import Phaser from 'phaser';
import { TILE_SIZE, COLORS } from '../config';
import { TileType } from './TileData';

export class Tile extends Phaser.GameObjects.Container {
  readonly colorIndex: number;
  readonly tileType: TileType;
  private background: Phaser.GameObjects.Rectangle;
  private icon?: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    colorIndex: number,
    tileType: TileType,
    gridX: number,
    gridY: number
  ) {
    const x = gridX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = gridY + row * TILE_SIZE + TILE_SIZE / 2;

    super(scene, x, y);

    this.colorIndex = colorIndex;
    this.tileType = tileType;

    // Background rectangle
    const color = tileType === 'rainbow' ? 0xffffff : COLORS[colorIndex];
    this.background = scene.add.rectangle(0, 0, TILE_SIZE - 4, TILE_SIZE - 4, color);
    this.background.setStrokeStyle(2, 0xffffff, 0.3);
    this.add(this.background);

    // Add special tile icons
    if (tileType === 'rainbow') {
      this.setupRainbow(scene);
    } else if (tileType === 'bomb') {
      this.icon = scene.add.text(0, 0, '💣', { fontSize: '24px' }).setOrigin(0.5);
      this.add(this.icon);
    } else if (tileType === 'colorBomb') {
      this.icon = scene.add.text(0, 0, '⭐', { fontSize: '24px' }).setOrigin(0.5);
      this.add(this.icon);
    }

    scene.add.existing(this);
  }

  private setupRainbow(scene: Phaser.Scene): void {
    // Animate through colors
    let colorIndex = 0;
    scene.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        colorIndex = (colorIndex + 1) % COLORS.length;
        this.background.setFillStyle(COLORS[colorIndex]);
      },
    });

    this.icon = scene.add.text(0, 0, '🌈', { fontSize: '20px' }).setOrigin(0.5);
    this.add(this.icon);
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
git commit -m "feat: update Tile visuals for special tile types"
```

---

### Task 8: Add Preview Queue UI to GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`

- [ ] **Step 1: Import TileQueue and update tile creation**

```typescript
// At top of GameScene.ts, add imports:
import { TileQueue } from '../game/TileQueue';
import { TileData, TileType } from '../game/TileData';
```

- [ ] **Step 2: Replace single preview with queue**

```typescript
// In GameScene class, replace these properties:
// Remove: private nextColorIndex: number = 0;
// Remove: private nextPreview!: Phaser.GameObjects.Rectangle;

// Add:
private tileQueue!: TileQueue;
private previewTiles: Phaser.GameObjects.Container[] = [];
```

- [ ] **Step 3: Update create() to initialize queue and render preview**

```typescript
// In create(), replace the preview section (after grid background, around line 90-107):

// Initialize tile queue
this.tileQueue = new TileQueue(3, this.colorCount, this.rng);

// UI: Preview queue
const previewX = this.gridX + GRID_COLS * TILE_SIZE + 60;
const previewY = this.gridY + 30;

this.add.text(previewX, previewY - 25, 'NEXT', {
  fontSize: '16px',
  color: '#888888',
}).setOrigin(0.5);

this.renderPreviewQueue(previewX, previewY);
```

- [ ] **Step 4: Add renderPreviewQueue method**

```typescript
// Add new method to GameScene:
private renderPreviewQueue(x: number, startY: number): void {
  // Clear existing preview tiles
  this.previewTiles.forEach(t => t.destroy());
  this.previewTiles = [];

  const previewSize = TILE_SIZE * 0.7;
  const spacing = previewSize + 8;

  for (let i = 0; i < 3; i++) {
    const tileData = this.tileQueue.peek(i);
    if (!tileData) continue;

    const y = startY + i * spacing;
    const container = this.add.container(x, y);

    const color = tileData.type === 'rainbow' ? 0xffffff : COLORS[tileData.colorIndex];
    const rect = this.add.rectangle(0, 0, previewSize, previewSize, color);
    rect.setStrokeStyle(2, 0xffffff, 0.3);
    container.add(rect);

    // Add icon for special tiles
    if (tileData.type === 'bomb') {
      const icon = this.add.text(0, 0, '💣', { fontSize: '18px' }).setOrigin(0.5);
      container.add(icon);
    } else if (tileData.type === 'colorBomb') {
      const icon = this.add.text(0, 0, '⭐', { fontSize: '18px' }).setOrigin(0.5);
      container.add(icon);
    } else if (tileData.type === 'rainbow') {
      const icon = this.add.text(0, 0, '🌈', { fontSize: '16px' }).setOrigin(0.5);
      container.add(icon);
    }

    this.previewTiles.push(container);
  }
}
```

- [ ] **Step 5: Update dropTile to use queue**

```typescript
// In dropTile method, replace:
// const colorIndex = this.nextColorIndex;
// With:
const tileData = this.tileQueue.next();

// Update the Grid dropTile call:
const landedRow = this.grid.dropTile(col, tileData);

// Update Tile creation:
const tile = new Tile(this, col, 0, tileData.colorIndex, tileData.type, this.gridX, this.gridY);

// Replace this.generateNextTile() with:
const previewX = this.gridX + GRID_COLS * TILE_SIZE + 60;
const previewY = this.gridY + 30;
this.renderPreviewQueue(previewX, previewY);
```

- [ ] **Step 6: Update rebuildTilesFromGrid**

```typescript
// Update rebuildTilesFromGrid to handle TileData:
private rebuildTilesFromGrid(): void {
  this.tiles.forEach(tile => tile.destroy());
  this.tiles.clear();

  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const cellData = this.grid.getCell(col, row);
      if (cellData !== null) {
        const tile = new Tile(this, col, row, cellData.colorIndex, cellData.type, this.gridX, this.gridY);
        this.tiles.set(`${col},${row}`, tile);
      }
    }
  }
}
```

- [ ] **Step 7: Remove generateNextTile method**

Delete the old generateNextTile method entirely.

- [ ] **Step 8: Update updateDifficulty to sync queue**

```typescript
// In updateDifficulty, add after this.colorCount = newColorCount:
this.tileQueue.setColorCount(newColorCount);
```

- [ ] **Step 9: Test manually**

Run: `npm run dev`
Expected: Game shows 3-tile preview on right, special tiles appear randomly

- [ ] **Step 10: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat: integrate TileQueue with preview UI"
```

---

### Task 9: Final Integration Testing

**Files:**
- All modified files

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Manual testing checklist**

Run: `npm run dev`

Test each feature:
- [ ] Match 3 tiles clears them (not 4)
- [ ] Preview shows next 3 tiles
- [ ] Rainbow tiles match with any adjacent color
- [ ] Bomb tiles clear 3x3 area
- [ ] Color bomb tiles clear all tiles of that color
- [ ] Chain reactions work (bomb hits bomb)
- [ ] Undo works with special tiles
- [ ] Daily mode has deterministic special tiles

- [ ] **Step 3: Build for production**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes"
```

- [ ] **Step 5: Push to GitHub**

```bash
git push origin main
```

---

## Summary

This plan adds:
1. Lower match size (4 → 3) for more action
2. 3-tile preview queue for strategic planning
3. Rainbow tiles that match any color
4. Bomb tiles that clear 3x3 area
5. Color bomb tiles that clear all of one color

Total: 9 tasks, approximately 2-3 hours of implementation.

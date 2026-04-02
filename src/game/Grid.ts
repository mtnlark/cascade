import { TileData, TileType } from './TileData';

export type CellState = TileData | null;

export interface Position {
  col: number;
  row: number;
}

export interface FallenTile {
  col: number;
  fromRow: number;
  toRow: number;
}

export interface CascadeChain {
  cleared: Position[];
  fallen: FallenTile[];
  damaged: Position[];  // Stone tiles that were hit but not destroyed
}

export interface CascadeResult {
  chains: CascadeChain[];
  totalCleared: number;
}

export class Grid {
  readonly cols: number;
  readonly rows: number;
  private cells: CellState[][];
  private savedState: CellState[][] | null = null;

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

  getCellColor(col: number, row: number): number | null {
    const cell = this.getCell(col, row);
    return cell ? cell.colorIndex : null;
  }

  getCellType(col: number, row: number): TileType | null {
    const cell = this.getCell(col, row);
    return cell ? cell.type : null;
  }

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
    const targetColor = startCell.type === 'rainbow'
      ? this.findAdjacentColor(startCol, startRow)
      : startCell.colorIndex;

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

      // Skip locked tiles - they can't be matched
      if (cell.isLocked) continue;

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

  findAllMatches(minSize: number): Position[][] {
    const visited = new Set<string>();
    const matches: Position[][] = [];
    const key = (col: number, row: number) => `${col},${row}`;

    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        if (this.cells[col][row] === null) continue;
        if (visited.has(key(col, row))) continue;

        const group = this.findConnectedGroup(col, row);

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

  resolveCascades(minSize: number): CascadeResult {
    const chains: CascadeChain[] = [];
    let totalCleared = 0;

    while (true) {
      const matches = this.findAllMatches(minSize);
      if (matches.length === 0) break;

      const allMatched: Position[] = matches.flat();

      // Process special tiles to get additional clears
      const specialClears = this.processSpecialTiles(allMatched);
      const combinedMatches = this.mergePositions(allMatched, specialClears);

      // Process stone tiles - separate into cleared and damaged
      const { cleared, damaged } = this.processStones(combinedMatches);

      totalCleared += cleared.length;

      this.clearGroup(cleared);
      const fallen = this.applyGravity();

      chains.push({
        cleared,
        fallen,
        damaged,
      });
    }

    return { chains, totalCleared };
  }

  /**
   * Process stone tiles in matched positions.
   * Returns positions to clear and positions that were damaged.
   */
  private processStones(positions: Position[]): { cleared: Position[]; damaged: Position[] } {
    const cleared: Position[] = [];
    const damaged: Position[] = [];

    for (const pos of positions) {
      const cell = this.getCell(pos.col, pos.row);
      if (!cell) continue;

      if (cell.type === 'stone' && cell.health !== undefined && cell.health > 1) {
        // Damage the stone but don't clear it
        cell.health--;
        damaged.push(pos);
      } else {
        // Clear this tile
        cleared.push(pos);
      }
    }

    return { cleared, damaged };
  }

  /**
   * Tick all timer tiles, decrementing their counters.
   * Returns positions of tiles that expired (reached 0).
   */
  tickTimers(): Position[] {
    const expired: Position[] = [];

    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        const cell = this.cells[col][row];
        if (cell && cell.type === 'timer' && cell.turnsRemaining !== undefined) {
          cell.turnsRemaining--;
          if (cell.turnsRemaining <= 0) {
            expired.push({ col, row });
          }
        }
      }
    }

    return expired;
  }

  /**
   * Get all timer tiles currently on the grid.
   */
  getTimerTiles(): Array<{ col: number; row: number; turnsRemaining: number }> {
    const timers: Array<{ col: number; row: number; turnsRemaining: number }> = [];

    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {
        const cell = this.cells[col][row];
        if (cell && cell.type === 'timer' && cell.turnsRemaining !== undefined) {
          timers.push({ col, row, turnsRemaining: cell.turnsRemaining });
        }
      }
    }

    return timers;
  }

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

      // Check if any cleared tiles are also bombs (chain reaction)
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
      if (cell && cell.type !== 'rainbow' && cell.type !== 'colorBomb') {
        return cell.colorIndex;
      }
    }
    // If no normal tiles, use color bomb's color
    for (const pos of positions) {
      const cell = this.getCell(pos.col, pos.row);
      if (cell && cell.type === 'colorBomb') {
        return cell.colorIndex;
      }
    }
    return null;
  }

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

  canDropInColumn(col: number): boolean {
    if (col < 0 || col >= this.cols) return false;
    return this.cells[col][0] === null;
  }

  getColumnHeight(col: number): number {
    if (col < 0 || col >= this.cols) return 0;
    for (let row = 0; row < this.rows; row++) {
      if (this.cells[col][row] !== null) {
        return this.rows - row;
      }
    }
    return 0;
  }

  isGameOver(): boolean {
    for (let col = 0; col < this.cols; col++) {
      if (this.canDropInColumn(col)) {
        return false;
      }
    }
    return true;
  }

  saveState(): void {
    this.savedState = this.cells.map(col => col.map(cell => cell ? { ...cell } : null));
  }

  undo(): boolean {
    if (this.savedState === null) {
      return false;
    }
    this.cells = this.savedState.map(col => col.map(cell => cell ? { ...cell } : null));
    this.savedState = null;
    return true;
  }

  /**
   * Simulates dropping a tile and returns what would match without modifying state.
   * Used for match preview on hover.
   */
  simulateDrop(col: number, tile: TileData): { row: number; matches: Position[] } | null {
    if (!this.canDropInColumn(col)) {
      return null;
    }

    // Find where the tile would land
    let landingRow = -1;
    for (let row = this.rows - 1; row >= 0; row--) {
      if (this.cells[col][row] === null) {
        landingRow = row;
        break;
      }
    }

    if (landingRow === -1) {
      return null;
    }

    // Temporarily place the tile
    this.cells[col][landingRow] = tile;

    // Find what would match
    const group = this.findConnectedGroup(col, landingRow);

    // Remove the temporary tile
    this.cells[col][landingRow] = null;

    // Only return if it would form a valid match
    if (group.length >= 3) {
      return { row: landingRow, matches: group };
    }

    return { row: landingRow, matches: [] };
  }

  /**
   * Load a predefined layout of tiles.
   * Used for challenge mode starting grids.
   */
  loadLayout(layout: Array<{ col: number; row: number; tile: TileData }>): void {
    // Clear existing grid
    this.cells = this.createEmptyGrid();

    // Place tiles from layout
    for (const { col, row, tile } of layout) {
      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        this.cells[col][row] = { ...tile };
      }
    }
  }

  /**
   * Unlock tiles adjacent to the given positions.
   * Called after clearing tiles to unlock frozen neighbors.
   */
  unlockAdjacentTo(positions: Position[]): Position[] {
    const unlocked: Position[] = [];
    const checked = new Set<string>();

    for (const { col, row } of positions) {
      const neighbors = [
        { col: col - 1, row },
        { col: col + 1, row },
        { col, row: row - 1 },
        { col, row: row + 1 },
      ];

      for (const pos of neighbors) {
        const key = `${pos.col},${pos.row}`;
        if (checked.has(key)) continue;
        checked.add(key);

        const cell = this.getCell(pos.col, pos.row);
        if (cell && cell.isLocked) {
          cell.isLocked = false;
          unlocked.push(pos);
        }
      }
    }

    return unlocked;
  }
}

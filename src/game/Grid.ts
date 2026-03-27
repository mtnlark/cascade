export type CellState = number | null; // null = empty, number = color index

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
}

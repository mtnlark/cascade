export type CellState = number | null; // null = empty, number = color index

export interface Position {
  col: number;
  row: number;
}

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
}

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
}

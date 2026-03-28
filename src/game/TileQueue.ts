import { TileData, createNormalTile, createRainbowTile, createBombTile, createColorBombTile } from './TileData';
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

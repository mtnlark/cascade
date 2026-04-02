import { TileData, createNormalTile, createRainbowTile, createBombTile, createColorBombTile, createStoneTile, createTimerTile } from './TileData';
import { SPECIAL_TILE_RATES, TIMER_TILE_DURATION } from '../config';

export class TileQueue {
  private queue: TileData[] = [];
  private colorCount: number;
  private rng: (() => number) | null;
  private heldTile: TileData | null = null;

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

  getHeldTile(): TileData | null {
    return this.heldTile;
  }

  hold(): TileData {
    const current = this.queue[0];
    if (this.heldTile) {
      // Swap current with held
      this.queue[0] = this.heldTile;
    } else {
      // First hold: move current to hold, advance queue
      this.queue.shift();
      this.queue.push(this.generateTile());
    }
    this.heldTile = current;
    return this.queue[0];
  }

  private generateTile(): TileData {
    const roll = this.random();
    const colorIndex = Math.floor(this.random() * this.colorCount);

    let threshold = 0;

    threshold += SPECIAL_TILE_RATES.rainbow;
    if (roll < threshold) {
      return createRainbowTile();
    }

    threshold += SPECIAL_TILE_RATES.bomb;
    if (roll < threshold) {
      return createBombTile(colorIndex);
    }

    threshold += SPECIAL_TILE_RATES.colorBomb;
    if (roll < threshold) {
      return createColorBombTile(colorIndex);
    }

    threshold += SPECIAL_TILE_RATES.stone;
    if (roll < threshold) {
      return createStoneTile(colorIndex);
    }

    threshold += SPECIAL_TILE_RATES.timer;
    if (roll < threshold) {
      return createTimerTile(colorIndex, TIMER_TILE_DURATION);
    }

    return createNormalTile(colorIndex);
  }

  private random(): number {
    return this.rng ? this.rng() : Math.random();
  }
}

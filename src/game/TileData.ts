export type TileType = 'normal' | 'rainbow' | 'bomb' | 'colorBomb' | 'stone' | 'timer';

export interface TileData {
  colorIndex: number;
  type: TileType;
  health?: number;           // For stone tiles (starts at 2)
  turnsRemaining?: number;   // For timer tiles
  isLocked?: boolean;        // For locked/frozen tiles
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

export function createStoneTile(colorIndex: number): TileData {
  return { colorIndex, type: 'stone', health: 2 };
}

export function createTimerTile(colorIndex: number, turns: number = 5): TileData {
  return { colorIndex, type: 'timer', turnsRemaining: turns };
}

export function lockTile(tile: TileData): TileData {
  return { ...tile, isLocked: true };
}

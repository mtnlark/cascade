export type TileType = 'normal' | 'rainbow' | 'bomb' | 'colorBomb';

export interface TileData {
  colorIndex: number;
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

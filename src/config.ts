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

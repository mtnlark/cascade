// Render scale for high-DPI displays (2x for Retina)
export const RENDER_SCALE = 2;

export const GRID_COLS = 6;
export const GRID_ROWS = 12;

// All sizes are scaled for high-DPI rendering
export const TILE_SIZE = 56 * RENDER_SCALE;
export const GRID_PADDING = 20 * RENDER_SCALE;

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
export const MIN_MATCH_SIZE = 3;

export const POINTS_PER_TILE = 10;
export const PREVIEW_QUEUE_SIZE = 5;

export const DIFFICULTY_THRESHOLDS = [
  500,  // Add 5th color at 500 points
  1500, // Add 6th color at 1500 points
] as const;

export const SPECIAL_TILE_RATES = {
  rainbow: 0.05,
  bomb: 0.05,
  colorBomb: 0.05,
  stone: 0.03,
  timer: 0.02,
} as const;

export const TIMER_TILE_DURATION = 5;

// Game mode settings
export const TIMED_MODE_DURATION = 120; // seconds
export const DEFAULT_UNDO_COUNT = 3;
export const UNDO_WARNING_THRESHOLD = 1;
export const TIMER_WARNING_THRESHOLD = 10; // seconds

// Combo thresholds for visual effects
export const COMBO_THRESHOLD = 3;      // Standard combo
export const MEGA_COMBO_THRESHOLD = 5; // Mega combo with particles

// Score milestones for celebrations
export const SCORE_MILESTONES = [100, 500, 1000, 2500, 5000, 10000] as const;

// Danger zone: rows from top before column is "dangerous"
export const DANGER_ZONE_ROWS = 2;

export const BACKGROUND_COLOR = 0x1a1a2e;
export const GRID_BACKGROUND_COLOR = 0x16213e;
export const UI_TEXT_COLOR = '#ffffff';

// Helper for scaled font sizes
export const scaledFont = (size: number) => `${size * RENDER_SCALE}px`;

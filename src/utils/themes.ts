import { GameMode } from './storage';

export interface ModeTheme {
  accentColor: number;    // Phaser color value
  accentHex: string;      // CSS hex color
  labelText: string;      // Mode badge text
  bgColor?: number;       // Optional background tint
}

export const MODE_THEMES: Record<GameMode, ModeTheme> = {
  endless: {
    accentColor: 0x00d4ff,
    accentHex: '#00d4ff',
    labelText: 'ENDLESS',
  },
  daily: {
    accentColor: 0xffd700,
    accentHex: '#ffd700',
    labelText: 'DAILY',
  },
  practice: {
    accentColor: 0x7fff00,
    accentHex: '#7fff00',
    labelText: 'PRACTICE',
  },
  challenge: {
    accentColor: 0xff6b9d,
    accentHex: '#ff6b9d',
    labelText: 'CHALLENGE',
  },
  timed: {
    accentColor: 0xff8c00,
    accentHex: '#ff8c00',
    labelText: 'TIMED',
  },
};

export function getTheme(mode: GameMode): ModeTheme {
  return MODE_THEMES[mode] || MODE_THEMES.endless;
}

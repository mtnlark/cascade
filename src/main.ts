import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { ChallengeScene } from './scenes/ChallengeScene';
import { ChallengeSelectScene } from './scenes/ChallengeSelectScene';
import { AchievementsScene } from './scenes/AchievementsScene';
import { BACKGROUND_COLOR } from './config';

/*
 * High-DPI Rendering Strategy:
 * 1. Render internally at 2x resolution (1200x1600)
 * 2. All game coordinates are doubled
 * 3. FIT mode scales canvas to fit viewport
 * 4. Result: crisp pixels on Retina displays
 */
const DPR = 2; // Always render at 2x for crispness
const BASE_WIDTH = 600;
const BASE_HEIGHT = 800;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: BASE_WIDTH * DPR,
  height: BASE_HEIGHT * DPR,
  backgroundColor: BACKGROUND_COLOR,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    antialiasGL: true,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene, ChallengeScene, ChallengeSelectScene, AchievementsScene],
};

new Phaser.Game(config);

// Export the scale factor for use in game code
export const RENDER_SCALE = DPR;

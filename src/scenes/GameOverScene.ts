import Phaser from 'phaser';
import { UI_TEXT_COLOR } from '../config';
import { GameMode } from '../utils/storage';

interface GameOverData {
  score: number;
  mode: GameMode;
  isHighScore: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const { width, height } = this.cameras.main;
    const { score, mode, isHighScore } = data;

    // Game Over text
    this.add.text(width / 2, 120, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff6b9d',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Score
    this.add.text(width / 2, 220, `Score: ${score}`, {
      fontSize: '36px',
      color: '#ffd700',
    }).setOrigin(0.5);

    // High score indicator
    if (isHighScore) {
      const newBest = this.add.text(width / 2, 280, '★ NEW BEST! ★', {
        fontSize: '24px',
        color: '#7fff00',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: newBest,
        scale: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 500,
      });
    }

    // Play Again button
    const playAgain = this.add.text(width / 2, 400, 'PLAY AGAIN', {
      fontSize: '28px',
      color: UI_TEXT_COLOR,
      backgroundColor: '#16213e',
      padding: { x: 32, y: 16 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playAgain.on('pointerover', () => playAgain.setStyle({ color: '#ffd700' }));
    playAgain.on('pointerout', () => playAgain.setStyle({ color: UI_TEXT_COLOR }));
    playAgain.on('pointerdown', () => {
      this.scene.start('GameScene', { mode });
    });

    // Menu button
    const menu = this.add.text(width / 2, 480, 'MENU', {
      fontSize: '24px',
      color: '#888888',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    menu.on('pointerover', () => menu.setStyle({ color: '#ffffff' }));
    menu.on('pointerout', () => menu.setStyle({ color: '#888888' }));
    menu.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene', { mode });
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }
}

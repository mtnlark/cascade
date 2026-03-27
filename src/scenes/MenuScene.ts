import Phaser from 'phaser';
import { UI_TEXT_COLOR } from '../config';
import { Storage, GameMode } from '../utils/storage';

export class MenuScene extends Phaser.Scene {
  private storage!: Storage;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.storage = new Storage();
    const { width, height } = this.cameras.main;

    // Title
    this.add.text(width / 2, 80, '★ CASCADE ★', {
      fontSize: '48px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Mode buttons
    const modes: { label: string; mode: GameMode; y: number }[] = [
      { label: 'ENDLESS', mode: 'endless', y: 220 },
      { label: 'DAILY PUZZLE', mode: 'daily', y: 300 },
      { label: 'PRACTICE', mode: 'practice', y: 380 },
    ];

    modes.forEach(({ label, mode, y }) => {
      const btn = this.add.text(width / 2, y, label, {
        fontSize: '28px',
        color: UI_TEXT_COLOR,
        backgroundColor: '#16213e',
        padding: { x: 32, y: 16 },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      // Show high score below button
      const highScore = this.storage.getHighScore(mode);
      if (highScore > 0) {
        this.add.text(width / 2, y + 40, `Best: ${highScore}`, {
          fontSize: '16px',
          color: '#888888',
        }).setOrigin(0.5);
      }

      btn.on('pointerover', () => btn.setStyle({ color: '#ffd700' }));
      btn.on('pointerout', () => btn.setStyle({ color: UI_TEXT_COLOR }));
      btn.on('pointerdown', () => {
        this.scene.start('GameScene', { mode });
      });
    });

    // Instructions
    this.add.text(width / 2, height - 60, 'Match 4+ tiles to clear them!', {
      fontSize: '16px',
      color: '#666666',
    }).setOrigin(0.5);
  }
}

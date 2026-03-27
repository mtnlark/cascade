import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Show loading text
    const { width, height } = this.cameras.main;
    this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Future: load pixel font, sprites, sounds here
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}

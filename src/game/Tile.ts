import Phaser from 'phaser';
import { TILE_SIZE, COLORS } from '../config';

export class Tile extends Phaser.GameObjects.Rectangle {
  readonly colorIndex: number;

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    colorIndex: number,
    gridX: number,
    gridY: number
  ) {
    const x = gridX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = gridY + row * TILE_SIZE + TILE_SIZE / 2;

    super(scene, x, y, TILE_SIZE - 4, TILE_SIZE - 4, COLORS[colorIndex]);

    this.colorIndex = colorIndex;
    this.setStrokeStyle(2, 0xffffff, 0.3);

    scene.add.existing(this);
  }

  animateDrop(targetRow: number, gridY: number, onComplete?: () => void): void {
    const targetY = gridY + targetRow * TILE_SIZE + TILE_SIZE / 2;

    this.scene.tweens.add({
      targets: this,
      y: targetY,
      duration: 150,
      ease: 'Bounce.easeOut',
      onComplete,
    });
  }

  animateClear(onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
    });
  }

  setGridPosition(col: number, row: number, gridX: number, gridY: number): void {
    this.x = gridX + col * TILE_SIZE + TILE_SIZE / 2;
    this.y = gridY + row * TILE_SIZE + TILE_SIZE / 2;
  }
}

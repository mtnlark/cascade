import Phaser from 'phaser';
import { TILE_SIZE, COLORS } from '../config';
import { TileType } from './TileData';

export class Tile extends Phaser.GameObjects.Container {
  readonly colorIndex: number;
  readonly tileType: TileType;
  private background: Phaser.GameObjects.Rectangle;
  private icon?: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    colorIndex: number,
    tileType: TileType,
    gridX: number,
    gridY: number
  ) {
    const x = gridX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = gridY + row * TILE_SIZE + TILE_SIZE / 2;

    super(scene, x, y);

    this.colorIndex = colorIndex;
    this.tileType = tileType;

    // Background rectangle
    const color = tileType === 'rainbow' ? 0xffffff : COLORS[colorIndex];
    this.background = scene.add.rectangle(0, 0, TILE_SIZE - 4, TILE_SIZE - 4, color);
    this.background.setStrokeStyle(2, 0xffffff, 0.3);
    this.add(this.background);

    // Add special tile visuals
    if (tileType === 'rainbow') {
      this.setupRainbow(scene);
    } else if (tileType === 'bomb') {
      this.icon = scene.add.text(0, 0, '💣', { fontSize: '24px' }).setOrigin(0.5);
      this.add(this.icon);
    } else if (tileType === 'colorBomb') {
      this.icon = scene.add.text(0, 0, '⭐', { fontSize: '24px' }).setOrigin(0.5);
      this.add(this.icon);
    }

    scene.add.existing(this);
  }

  private setupRainbow(scene: Phaser.Scene): void {
    // Animate through colors
    let colorIdx = 0;
    scene.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        colorIdx = (colorIdx + 1) % COLORS.length;
        this.background.setFillStyle(COLORS[colorIdx]);
      },
    });

    this.icon = scene.add.text(0, 0, '🌈', { fontSize: '20px' }).setOrigin(0.5);
    this.add(this.icon);
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

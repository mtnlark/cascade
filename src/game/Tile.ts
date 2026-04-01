import Phaser from 'phaser';
import { TILE_SIZE, COLORS, RENDER_SCALE, scaledFont } from '../config';
import { TileType } from './TileData';

const S = RENDER_SCALE;

export class Tile extends Phaser.GameObjects.Container {
  readonly colorIndex: number;
  readonly tileType: TileType;
  private background: Phaser.GameObjects.Graphics;
  private shine: Phaser.GameObjects.Graphics;
  private icon?: Phaser.GameObjects.Text;
  private baseColor: number;

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
    this.baseColor = tileType === 'rainbow' ? 0xffffff : COLORS[colorIndex];

    const size = TILE_SIZE - 6 * S;
    const radius = 10 * S;

    // Create rounded rectangle background with gradient effect
    this.background = scene.add.graphics();
    this.drawTileBackground(this.baseColor, size, radius);
    this.add(this.background);

    // Add shine/highlight overlay
    this.shine = scene.add.graphics();
    this.shine.fillStyle(0xffffff, 0.25);
    this.shine.fillRoundedRect(-size / 2, -size / 2, size, size / 2.5, { tl: radius, tr: radius, bl: 0, br: 0 });
    this.add(this.shine);

    // Add special tile visuals
    if (tileType === 'rainbow') {
      this.setupRainbow(scene);
    } else if (tileType === 'bomb') {
      this.icon = scene.add.text(0, 2 * S, '💣', { fontSize: scaledFont(26) }).setOrigin(0.5);
      this.add(this.icon);
    } else if (tileType === 'colorBomb') {
      this.icon = scene.add.text(0, 2 * S, '⭐', { fontSize: scaledFont(26) }).setOrigin(0.5);
      this.add(this.icon);
      // Add pulsing glow for color bombs
      scene.tweens.add({
        targets: this,
        scaleX: 1.05,
        scaleY: 1.05,
        yoyo: true,
        repeat: -1,
        duration: 400,
        ease: 'Sine.easeInOut',
      });
    }

    scene.add.existing(this);
  }

  private drawTileBackground(color: number, size: number, radius: number): void {
    this.background.clear();

    // Main fill
    this.background.fillStyle(color, 1);
    this.background.fillRoundedRect(-size / 2, -size / 2, size, size, radius);

    // Inner shadow (darker at bottom)
    const darkerColor = Phaser.Display.Color.ValueToColor(color).darken(30).color;
    this.background.fillStyle(darkerColor, 0.4);
    this.background.fillRoundedRect(-size / 2, 0, size, size / 2, { tl: 0, tr: 0, bl: radius, br: radius });

    // Border
    this.background.lineStyle(2 * S, 0xffffff, 0.4);
    this.background.strokeRoundedRect(-size / 2, -size / 2, size, size, radius);
  }

  private setupRainbow(scene: Phaser.Scene): void {
    const size = TILE_SIZE - 6 * S;
    const radius = 10 * S;

    // Animate through colors
    let colorIdx = 0;
    scene.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        colorIdx = (colorIdx + 1) % COLORS.length;
        this.baseColor = COLORS[colorIdx];
        this.drawTileBackground(this.baseColor, size, radius);
      },
    });

    this.icon = scene.add.text(0, 2 * S, '🌈', { fontSize: scaledFont(22) }).setOrigin(0.5);
    this.add(this.icon);

    // Add subtle rotation animation
    scene.tweens.add({
      targets: this,
      angle: 3,
      yoyo: true,
      repeat: -1,
      duration: 300,
      ease: 'Sine.easeInOut',
    });
  }

  animateDrop(targetRow: number, gridY: number, onComplete?: () => void): void {
    const targetY = gridY + targetRow * TILE_SIZE + TILE_SIZE / 2;
    const dropDistance = Math.abs(targetY - this.y);

    this.scene.tweens.add({
      targets: this,
      y: targetY,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Apply squash/stretch impact effect
        this.animateLandingImpact(dropDistance);
        onComplete?.();
      },
    });
  }

  private animateLandingImpact(dropDistance: number): void {
    // Scale effect intensity based on drop distance
    const impactScale = Math.min(dropDistance / (TILE_SIZE * 4), 1);
    const squashY = 0.85 - (impactScale * 0.1);
    const stretchX = 1.15 + (impactScale * 0.1);

    // Squash on landing
    this.scene.tweens.add({
      targets: this,
      scaleY: squashY,
      scaleX: stretchX,
      duration: 50,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        // Return to normal with slight overshoot
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 80,
          ease: 'Back.easeOut',
        });
      },
    });

    // Create dust particles
    this.createLandingDust(impactScale);

    // Brief highlight flash
    const size = TILE_SIZE - 6 * S;
    const radius = 10 * S;
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 0.4);
    flash.fillRoundedRect(-size / 2, -size / 2, size, size, radius);
    this.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });
  }

  private createLandingDust(intensity: number): void {
    const particleCount = Math.floor(3 + intensity * 4);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8; // Spread upward
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xaaaaaa, 0.6);
      particle.fillCircle(0, 0, (2 + Math.random() * 2) * S);

      const size = TILE_SIZE - 6 * S;
      particle.setPosition(
        this.x + (Math.random() - 0.5) * size,
        this.y + size / 2
      );

      const distance = (15 + Math.random() * 20) * S * intensity;
      const targetX = particle.x + Math.cos(angle) * distance;
      const targetY = particle.y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 200 + Math.random() * 100,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  animateClear(onComplete?: () => void): void {
    // Use special animation for special tile types
    if (this.tileType === 'bomb') {
      this.animateBombClear(onComplete);
      return;
    }
    if (this.tileType === 'colorBomb') {
      this.animateColorBombClear(onComplete);
      return;
    }

    // Standard clear animation
    this.createClearParticles();

    const size = TILE_SIZE - 6 * S;
    const radius = 10 * S;

    // Flash white before clearing
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 0.8);
    flash.fillRoundedRect(-size / 2, -size / 2, size, size, radius);
    this.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
    });

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 250,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
    });
  }

  private animateBombClear(onComplete?: () => void): void {
    // Create expanding shockwave ring
    const ring = this.scene.add.graphics();
    ring.setPosition(this.x, this.y);
    ring.lineStyle(4 * S, 0xff4444, 1);
    ring.strokeCircle(0, 0, TILE_SIZE / 2);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    // Red/orange particle burst (16 particles)
    const colors = [0xff4444, 0xff6600, 0xff8800, 0xffaa00];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const particle = this.scene.add.graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.fillStyle(color, 1);
      particle.fillCircle(0, 0, (6 + Math.random() * 4) * S);
      particle.setPosition(this.x, this.y);

      const distance = (60 + Math.random() * 40) * S;
      const targetX = this.x + Math.cos(angle) * distance;
      const targetY = this.y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 350 + Math.random() * 100,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Flash overlay (covers 3x3 area)
    const flashSize = TILE_SIZE * 3;
    const flash = this.scene.add.graphics();
    flash.setPosition(this.x, this.y);
    flash.fillStyle(0xff4444, 0.5);
    flash.fillCircle(0, 0, flashSize / 2);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Tile destruction
    this.scene.tweens.add({
      targets: this,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 150,
      ease: 'Power3',
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
    });
  }

  private animateColorBombClear(onComplete?: () => void): void {
    // Star burst at color bomb position
    const starColors = [0xffd700, 0xff6b9d, 0x00d4ff, 0x7fff00];
    const starCount = 12;

    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2;
      const color = starColors[i % starColors.length];

      // Inner star burst
      const star = this.scene.add.graphics();
      star.fillStyle(color, 1);
      star.fillCircle(0, 0, 8 * S);
      star.setPosition(this.x, this.y);

      const distance = (80 + Math.random() * 30) * S;
      const targetX = this.x + Math.cos(angle) * distance;
      const targetY = this.y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: star,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 400 + Math.random() * 100,
        ease: 'Power2',
        onComplete: () => star.destroy(),
      });

      // Trailing particles
      for (let j = 0; j < 3; j++) {
        const trail = this.scene.add.graphics();
        trail.fillStyle(color, 0.6);
        trail.fillCircle(0, 0, (4 - j) * S);
        trail.setPosition(this.x, this.y);

        const trailDistance = distance * (0.4 + j * 0.2);
        const trailX = this.x + Math.cos(angle) * trailDistance;
        const trailY = this.y + Math.sin(angle) * trailDistance;

        this.scene.tweens.add({
          targets: trail,
          x: trailX,
          y: trailY,
          alpha: 0,
          delay: j * 50,
          duration: 300,
          ease: 'Power2',
          onComplete: () => trail.destroy(),
        });
      }
    }

    // Central flash
    const flash = this.scene.add.graphics();
    flash.setPosition(this.x, this.y);
    flash.fillStyle(0xffffff, 0.9);
    flash.fillCircle(0, 0, 30 * S);

    this.scene.tweens.add({
      targets: flash,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 250,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Tile destruction with spin
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.8,
      scaleY: 1.8,
      angle: 180,
      alpha: 0,
      duration: 200,
      ease: 'Power3',
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
    });
  }

  private createClearParticles(): void {
    const particleCount = 8;
    const color = this.baseColor;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const particle = this.scene.add.graphics();
      particle.fillStyle(color, 1);
      particle.fillCircle(0, 0, 6 * S);
      particle.setPosition(this.x, this.y);

      const distance = (40 + Math.random() * 30) * S;
      const targetX = this.x + Math.cos(angle) * distance;
      const targetY = this.y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 350,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  setGridPosition(col: number, row: number, gridX: number, gridY: number): void {
    this.x = gridX + col * TILE_SIZE + TILE_SIZE / 2;
    this.y = gridY + row * TILE_SIZE + TILE_SIZE / 2;
  }
}

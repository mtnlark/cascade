import Phaser from 'phaser';
import { TILE_SIZE, COLORS, RENDER_SCALE, scaledFont } from '../config';
import { TileType, TileData } from './TileData';

const S = RENDER_SCALE;

export class Tile extends Phaser.GameObjects.Container {
  readonly colorIndex: number;
  readonly tileType: TileType;
  private background: Phaser.GameObjects.Graphics;
  private shine: Phaser.GameObjects.Graphics;
  private icon?: Phaser.GameObjects.Text;
  private baseColor: number;

  // For stone tiles
  private crackOverlay?: Phaser.GameObjects.Graphics;
  private health: number = 2;

  // For timer tiles
  private timerText?: Phaser.GameObjects.Text;
  private turnsRemaining: number = 5;
  private warningTween?: Phaser.Tweens.Tween;

  // For locked tiles
  private lockOverlay?: Phaser.GameObjects.Graphics;
  private isLocked: boolean = false;

  constructor(
    scene: Phaser.Scene,
    col: number,
    row: number,
    colorIndex: number,
    tileType: TileType,
    gridX: number,
    gridY: number,
    tileData?: TileData
  ) {
    const x = gridX + col * TILE_SIZE + TILE_SIZE / 2;
    const y = gridY + row * TILE_SIZE + TILE_SIZE / 2;

    super(scene, x, y);

    this.colorIndex = colorIndex;
    this.tileType = tileType;

    // Handle extended tile properties
    if (tileData) {
      this.health = tileData.health ?? 2;
      this.turnsRemaining = tileData.turnsRemaining ?? 5;
      this.isLocked = tileData.isLocked ?? false;
    }

    // Stone tiles have a grayish tint
    if (tileType === 'stone') {
      this.baseColor = Phaser.Display.Color.ValueToColor(COLORS[colorIndex]).darken(30).color;
    } else {
      this.baseColor = tileType === 'rainbow' ? 0xffffff : COLORS[colorIndex];
    }

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
    } else if (tileType === 'stone') {
      this.setupStone(scene);
    } else if (tileType === 'timer') {
      this.setupTimer(scene);
    }

    // Add locked overlay if needed
    if (this.isLocked) {
      this.setupLocked(scene);
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

  private setupStone(scene: Phaser.Scene): void {
    // Add rock emoji
    this.icon = scene.add.text(0, 2 * S, '🪨', { fontSize: scaledFont(22) }).setOrigin(0.5);
    this.add(this.icon);

    // Add crack overlay (hidden initially, shown when damaged)
    this.crackOverlay = scene.add.graphics();
    this.add(this.crackOverlay);

    // If already damaged (health < 2), show cracks
    if (this.health < 2) {
      this.showCracks();
    }
  }

  private setupTimer(scene: Phaser.Scene): void {
    // Timer countdown text
    this.timerText = scene.add.text(0, 2 * S, `${this.turnsRemaining}`, {
      fontSize: scaledFont(28),
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4 * S,
    }).setOrigin(0.5);
    this.add(this.timerText);

    // Start warning pulse if already low
    if (this.turnsRemaining <= 2) {
      this.startWarningPulse(scene);
    }
  }

  private setupLocked(scene: Phaser.Scene): void {
    const size = TILE_SIZE - 6 * S;
    const radius = 10 * S;

    // Ice/frost overlay
    this.lockOverlay = scene.add.graphics();
    this.lockOverlay.fillStyle(0x88ccff, 0.4);
    this.lockOverlay.fillRoundedRect(-size / 2, -size / 2, size, size, radius);

    // Ice pattern lines
    this.lockOverlay.lineStyle(2 * S, 0xaaddff, 0.6);
    this.lockOverlay.beginPath();
    this.lockOverlay.moveTo(-size / 4, -size / 2);
    this.lockOverlay.lineTo(0, 0);
    this.lockOverlay.lineTo(size / 4, -size / 2);
    this.lockOverlay.strokePath();

    this.lockOverlay.beginPath();
    this.lockOverlay.moveTo(-size / 4, size / 2);
    this.lockOverlay.lineTo(0, 0);
    this.lockOverlay.lineTo(size / 4, size / 2);
    this.lockOverlay.strokePath();

    this.add(this.lockOverlay);

    // Add ice emoji
    const iceIcon = scene.add.text(size / 3, -size / 3, '🧊', { fontSize: scaledFont(14) }).setOrigin(0.5);
    this.add(iceIcon);
  }

  private showCracks(): void {
    if (!this.crackOverlay) return;

    const size = TILE_SIZE - 6 * S;
    this.crackOverlay.clear();
    this.crackOverlay.lineStyle(3 * S, 0x333333, 0.8);

    // Draw crack pattern
    this.crackOverlay.beginPath();
    this.crackOverlay.moveTo(-size / 6, -size / 3);
    this.crackOverlay.lineTo(0, 0);
    this.crackOverlay.lineTo(size / 4, size / 4);
    this.crackOverlay.strokePath();

    this.crackOverlay.beginPath();
    this.crackOverlay.moveTo(0, 0);
    this.crackOverlay.lineTo(-size / 5, size / 3);
    this.crackOverlay.strokePath();
  }

  private startWarningPulse(scene: Phaser.Scene): void {
    if (this.warningTween) return;

    // Tint red and pulse
    this.warningTween = scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      yoyo: true,
      repeat: -1,
      duration: 300,
      ease: 'Sine.easeInOut',
    });

    // Redraw background with red tint
    const size = TILE_SIZE - 6 * S;
    const radius = 10 * S;
    const warningColor = Phaser.Display.Color.ValueToColor(this.baseColor).brighten(20).color;
    this.drawTileBackground(warningColor, size, radius);
  }

  /**
   * Update the timer display and check for warning state
   */
  updateTimer(turnsRemaining: number): void {
    this.turnsRemaining = turnsRemaining;

    if (this.timerText) {
      this.timerText.setText(`${turnsRemaining}`);

      // Change color based on urgency
      if (turnsRemaining <= 1) {
        this.timerText.setStyle({ color: '#ff0000' });
      } else if (turnsRemaining <= 2) {
        this.timerText.setStyle({ color: '#ff6600' });
      }
    }

    // Start warning pulse when low
    if (turnsRemaining <= 2 && !this.warningTween) {
      this.startWarningPulse(this.scene);
    }
  }

  /**
   * Update stone health and show cracks if damaged
   */
  updateHealth(newHealth: number): void {
    this.health = newHealth;

    if (newHealth < 2) {
      this.showCracks();

      // Shake animation when damaged
      this.scene.tweens.add({
        targets: this,
        x: this.x + 3 * S,
        yoyo: true,
        repeat: 3,
        duration: 30,
      });
    }
  }

  /**
   * Unlock a locked tile with shatter animation
   */
  unlock(): void {
    if (!this.isLocked || !this.lockOverlay) return;

    this.isLocked = false;

    // Shatter animation
    const particles = 8;
    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2;
      const shard = this.scene.add.graphics();
      shard.fillStyle(0x88ccff, 0.8);
      shard.fillTriangle(0, 0, 8 * S, 0, 4 * S, 12 * S);
      shard.setPosition(this.x, this.y);
      shard.setAngle(angle * (180 / Math.PI));

      const distance = (30 + Math.random() * 20) * S;
      const targetX = this.x + Math.cos(angle) * distance;
      const targetY = this.y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: shard,
        x: targetX,
        y: targetY,
        alpha: 0,
        angle: shard.angle + Math.random() * 180,
        duration: 300,
        ease: 'Power2',
        onComplete: () => shard.destroy(),
      });
    }

    // Remove lock overlay
    this.lockOverlay.destroy();
    this.lockOverlay = undefined;
  }

  /**
   * Animate timer tile explosion
   */
  animateTimerExplosion(onComplete?: () => void): void {
    // Create explosion effect similar to bomb but with clock theme
    const ring = this.scene.add.graphics();
    ring.setPosition(this.x, this.y);
    ring.lineStyle(4 * S, 0xff4444, 1);
    ring.strokeCircle(0, 0, TILE_SIZE / 2);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    // Red flash
    const flash = this.scene.add.graphics();
    flash.setPosition(this.x, this.y);
    flash.fillStyle(0xff0000, 0.6);
    flash.fillCircle(0, 0, TILE_SIZE);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Tile destruction
    this.scene.tweens.add({
      targets: this,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      angle: 180,
      duration: 200,
      ease: 'Power3',
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
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
    if (this.tileType === 'timer') {
      this.animateTimerClear(onComplete);
      return;
    }
    if (this.tileType === 'stone') {
      this.animateStoneClear(onComplete);
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

  private animateStoneClear(onComplete?: () => void): void {
    // Crumbling stone animation
    const particleCount = 12;
    const colors = [0x666666, 0x888888, 0x555555, 0x777777];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const particle = this.scene.add.graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.fillStyle(color, 1);

      // Random rock shapes
      const size = (4 + Math.random() * 6) * S;
      particle.fillRect(-size / 2, -size / 2, size, size);
      particle.setPosition(this.x, this.y);
      particle.setAngle(Math.random() * 360);

      const distance = (40 + Math.random() * 30) * S;
      const targetX = this.x + Math.cos(angle) * distance;
      const targetY = this.y + Math.sin(angle) * distance + 30 * S; // Gravity effect

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        angle: particle.angle + Math.random() * 360,
        duration: 400 + Math.random() * 100,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Dust cloud
    const dust = this.scene.add.graphics();
    dust.setPosition(this.x, this.y);
    dust.fillStyle(0x999999, 0.5);
    dust.fillCircle(0, 0, 20 * S);

    this.scene.tweens.add({
      targets: dust,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => dust.destroy(),
    });

    // Tile destruction
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
        onComplete?.();
      },
    });
  }

  private animateTimerClear(onComplete?: () => void): void {
    // Timer defused animation (green flash, no explosion)
    const relief = this.scene.add.graphics();
    relief.setPosition(this.x, this.y);
    relief.fillStyle(0x00ff00, 0.4);
    relief.fillCircle(0, 0, TILE_SIZE * 0.6);

    this.scene.tweens.add({
      targets: relief,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => relief.destroy(),
    });

    // Show checkmark briefly
    const check = this.scene.add.text(this.x, this.y, '✓', {
      fontSize: scaledFont(24),
      color: '#00ff00',
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: check,
      y: this.y - 20 * S,
      alpha: 0,
      duration: 400,
      onComplete: () => check.destroy(),
    });

    this.createClearParticles();

    // Tile destruction
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
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

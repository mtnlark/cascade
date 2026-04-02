import Phaser from 'phaser';
import {
  RENDER_SCALE,
  TILE_SIZE,
  COMBO_THRESHOLD,
  MEGA_COMBO_THRESHOLD,
  scaledFont,
} from '../config';

const S = RENDER_SCALE;

/**
 * Animation utilities for game visual effects.
 * Extracted from GameScene to reduce file size and improve reusability.
 */
export class GameAnimations {
  constructor(private scene: Phaser.Scene) {}

  /**
   * Show multiplier/combo text with escalating visual intensity.
   */
  showMultiplierText(multiplier: number, tilesCleared: number): void {
    const { width, height } = this.scene.cameras.main;

    const container = this.scene.add.container(width / 2, height / 2);

    // Escalating visual intensity based on multiplier
    const intensity = Math.min(multiplier, 6);
    const glowColor = multiplier >= MEGA_COMBO_THRESHOLD ? 0xff6b9d : multiplier >= COMBO_THRESHOLD ? 0xffd700 : 0xffffff;
    const textColor = multiplier >= MEGA_COMBO_THRESHOLD ? '#ff6b9d' : multiplier >= COMBO_THRESHOLD ? '#ffd700' : '#ffffff';
    const glowRadius = (40 + intensity * 10) * S;
    const glowAlpha = 0.2 + (intensity * 0.05);

    // Glow background with escalating size
    const glow = this.scene.add.graphics();
    glow.fillStyle(glowColor, glowAlpha);
    glow.fillCircle(0, 0, glowRadius);
    if (multiplier >= COMBO_THRESHOLD) {
      glow.fillStyle(glowColor, glowAlpha * 0.5);
      glow.fillCircle(0, 0, glowRadius * 1.3);
    }
    container.add(glow);

    // Add particles for mega combos
    if (multiplier >= MEGA_COMBO_THRESHOLD) {
      const particleCount = 8 + (multiplier - 4) * 4;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const particle = this.scene.add.graphics();
        particle.fillStyle(glowColor, 0.8);
        particle.fillCircle(0, 0, (4 + Math.random() * 4) * S);
        container.add(particle);

        const distance = (80 + Math.random() * 40) * S;
        this.scene.tweens.add({
          targets: particle,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          alpha: 0,
          duration: 500,
          ease: 'Power2',
        });
      }
    }

    // Shadow text
    const fontSize = Math.min(48 + intensity * 8, 80);
    const shadow = this.scene.add.text(3 * S, 3 * S, `${multiplier}x`, {
      fontSize: scaledFont(fontSize),
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.4);
    container.add(shadow);

    // Main text with escalating color
    const text = this.scene.add.text(0, 0, `${multiplier}x`, {
      fontSize: scaledFont(fontSize),
      color: textColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    // Combo label
    const comboLabel = multiplier >= MEGA_COMBO_THRESHOLD ? 'MEGA COMBO!' : multiplier >= COMBO_THRESHOLD ? 'COMBO!' : 'CHAIN';
    const subtitle = this.scene.add.text(0, 35 * S, comboLabel, {
      fontSize: scaledFont(16 + intensity * 2),
      color: multiplier >= COMBO_THRESHOLD ? textColor : '#888888',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(subtitle);

    // Running tiles cleared counter
    const counter = this.scene.add.text(0, 60 * S, `${tilesCleared} tiles`, {
      fontSize: scaledFont(14),
      color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(counter);

    // Entrance animation
    container.setScale(0.5);
    container.setAlpha(0);

    const peakScale = 1 + (intensity * 0.1);

    this.scene.tweens.add({
      targets: container,
      scale: peakScale,
      alpha: 1,
      duration: 150 + intensity * 20,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: container,
          scale: peakScale + 0.3,
          alpha: 0,
          y: height / 2 - 50 * S,
          duration: 300 + intensity * 30,
          ease: 'Power2',
          onComplete: () => container.destroy(),
        });
      },
    });
  }

  /**
   * Show milestone celebration with banner and confetti.
   */
  showMilestoneCelebration(milestone: number): void {
    const { width, height } = this.scene.cameras.main;

    // Screen flash
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffd700, 0.3);
    flash.fillRect(0, 0, width, height);
    flash.setDepth(100);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Confetti burst
    this.createConfetti(width / 2, height / 3, milestone);

    // Milestone banner
    const container = this.scene.add.container(width / 2, height / 2 - 50 * S);
    container.setDepth(101);

    // Banner background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(-150 * S, -50 * S, 300 * S, 100 * S, 15 * S);
    bg.lineStyle(4 * S, 0xffd700, 1);
    bg.strokeRoundedRect(-150 * S, -50 * S, 300 * S, 100 * S, 15 * S);
    container.add(bg);

    // Milestone value
    const milestoneText = milestone >= 1000 ? `${milestone / 1000}K` : `${milestone}`;
    const valueText = this.scene.add.text(0, -15 * S, milestoneText, {
      fontSize: scaledFont(48),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(valueText);

    // Label
    const label = this.scene.add.text(0, 30 * S, 'MILESTONE!', {
      fontSize: scaledFont(20),
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(label);

    // Entrance animation
    container.setScale(0);
    container.setAlpha(0);

    this.scene.tweens.add({
      targets: container,
      scale: 1.1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(600, () => {
          this.scene.tweens.add({
            targets: container,
            scale: 0.8,
            alpha: 0,
            y: height / 2 - 100 * S,
            duration: 300,
            ease: 'Power2',
            onComplete: () => container.destroy(),
          });
        });
      },
    });
  }

  /**
   * Create confetti particle burst effect.
   */
  createConfetti(x: number, y: number, milestone: number): void {
    const colors = [0xffd700, 0xff6b9d, 0x00d4ff, 0x7fff00, 0xff8c00, 0xda70d6];
    const particleCount = 30 + Math.floor(milestone / 500) * 5;

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particle = this.scene.add.graphics();
      particle.setDepth(99);

      // Random shape: square or circle
      if (Math.random() > 0.5) {
        particle.fillStyle(color, 1);
        particle.fillRect(-4 * S, -4 * S, 8 * S, 8 * S);
      } else {
        particle.fillStyle(color, 1);
        particle.fillCircle(0, 0, 4 * S);
      }

      particle.setPosition(x, y);

      // Random trajectory
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      const targetX = x + Math.cos(angle) * speed * S;
      const targetY = y + Math.sin(angle) * speed * S + 200 * S; // Gravity effect

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        angle: Math.random() * 720 - 360,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 1000 + Math.random() * 500,
        ease: 'Power1',
        delay: Math.random() * 100,
        onComplete: () => particle.destroy(),
      });
    }
  }
}

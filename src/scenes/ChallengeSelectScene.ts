import Phaser from 'phaser';
import { COLORS, RENDER_SCALE, scaledFont, UI_TEXT_COLOR } from '../config';
import { Storage } from '../utils/storage';
import { CHALLENGES, Challenge } from './ChallengeScene';

const S = RENDER_SCALE;

export class ChallengeSelectScene extends Phaser.Scene {
  private storage!: Storage;

  constructor() {
    super({ key: 'ChallengeSelectScene' });
  }

  create(): void {
    this.storage = new Storage();
    const { width, height } = this.cameras.main;

    // Background decoration
    this.createBackgroundTiles();

    // Title
    this.add.text(width / 2 + 2 * S, 52 * S, 'CHALLENGES', {
      fontSize: scaledFont(36),
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.3);

    this.add.text(width / 2, 50 * S, 'CHALLENGES', {
      fontSize: scaledFont(36),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Progress summary
    const completedCount = this.storage.getCompletedChallengeCount();
    const totalStars = this.storage.getTotalStars();

    this.add.text(width / 2, 90 * S, `${completedCount}/${CHALLENGES.length} Complete | ${totalStars} Stars`, {
      fontSize: scaledFont(14),
      color: '#888888',
    }).setOrigin(0.5);

    // Challenge grid
    const gridCols = 2;
    const cardWidth = 250 * S;
    const cardHeight = 80 * S;
    const startX = (width - (gridCols * cardWidth + 20 * S)) / 2 + cardWidth / 2;
    const startY = 140 * S;

    CHALLENGES.forEach((challenge, index) => {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const x = startX + col * (cardWidth + 20 * S);
      const y = startY + row * (cardHeight + 15 * S);

      this.createChallengeCard(x, y, cardWidth, cardHeight, challenge);
    });

    // Back button
    const backBtn = this.add.text(30 * S, height - 30 * S, '< MENU', {
      fontSize: scaledFont(18),
      color: '#666666',
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setStyle({ color: '#ff6b9d' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ color: '#666666' }));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private createChallengeCard(
    x: number,
    y: number,
    width: number,
    height: number,
    challenge: Challenge
  ): void {
    const isCompleted = this.storage.isChallengeCompleted(challenge.id);
    const stars = this.storage.getChallengeStars(challenge.id);
    const isUnlocked = challenge.id === 1 || this.storage.isChallengeCompleted(challenge.id - 1);

    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.graphics();
    const bgColor = isUnlocked ? (isCompleted ? 0x1a3a2e : 0x16213e) : 0x0a0a15;
    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10 * S);

    const borderColor = isCompleted ? 0x7fff00 : (isUnlocked ? 0x0f3460 : 0x222222);
    bg.lineStyle(2 * S, borderColor, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10 * S);
    container.add(bg);

    // Challenge number
    const numBg = this.add.graphics();
    numBg.fillStyle(isUnlocked ? 0x0f3460 : 0x111111, 1);
    numBg.fillCircle(-width / 2 + 30 * S, 0, 20 * S);
    container.add(numBg);

    container.add(this.add.text(-width / 2 + 30 * S, 0, `${challenge.id}`, {
      fontSize: scaledFont(18),
      color: isUnlocked ? '#ffffff' : '#333333',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // Challenge name and description
    const textColor = isUnlocked ? '#ffffff' : '#444444';
    container.add(this.add.text(-width / 2 + 60 * S, -15 * S, challenge.name, {
      fontSize: scaledFont(16),
      color: textColor,
      fontStyle: 'bold',
    }));

    container.add(this.add.text(-width / 2 + 60 * S, 8 * S, challenge.description, {
      fontSize: scaledFont(12),
      color: isUnlocked ? '#888888' : '#333333',
    }));

    // Moves indicator
    container.add(this.add.text(-width / 2 + 60 * S, 26 * S, `${challenge.moves} moves`, {
      fontSize: scaledFont(10),
      color: isUnlocked ? '#666666' : '#222222',
    }));

    // Stars (if completed)
    if (isCompleted) {
      for (let i = 0; i < 3; i++) {
        const starX = width / 2 - 50 * S + i * 18 * S;
        container.add(this.add.text(starX, 0, i < stars ? '★' : '☆', {
          fontSize: scaledFont(16),
          color: i < stars ? '#ffd700' : '#444444',
        }).setOrigin(0.5));
      }
    }

    // Lock icon for locked challenges
    if (!isUnlocked) {
      container.add(this.add.text(width / 2 - 25 * S, 0, '🔒', {
        fontSize: scaledFont(20),
      }).setOrigin(0.5));
    }

    // Interactivity for unlocked challenges
    if (isUnlocked) {
      const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      container.add(hitArea);

      hitArea.on('pointerover', () => {
        this.tweens.add({
          targets: container,
          scale: 1.03,
          duration: 100,
        });
      });

      hitArea.on('pointerout', () => {
        this.tweens.add({
          targets: container,
          scale: 1,
          duration: 100,
        });
      });

      hitArea.on('pointerdown', () => {
        this.scene.start('ChallengeScene', { challengeId: challenge.id });
      });
    }
  }

  private createBackgroundTiles(): void {
    const { width, height } = this.cameras.main;

    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(50 * S, width - 50 * S);
      const startY = Phaser.Math.Between(height, height + 200 * S);
      const colorIndex = Phaser.Math.Between(0, COLORS.length - 1);
      const size = Phaser.Math.Between(25 * S, 35 * S);

      const tile = this.add.graphics();
      tile.fillStyle(COLORS[colorIndex], 0.08);
      tile.fillRoundedRect(-size / 2, -size / 2, size, size, 6 * S);
      tile.setPosition(x, startY);

      this.tweens.add({
        targets: tile,
        y: -50 * S,
        x: x + Phaser.Math.Between(-60 * S, 60 * S),
        angle: Phaser.Math.Between(-60, 60),
        duration: Phaser.Math.Between(10000, 15000),
        repeat: -1,
        delay: i * 500,
      });
    }
  }
}

import Phaser from 'phaser';
import { RENDER_SCALE, scaledFont, COLORS } from '../config';
import { Storage } from '../utils/storage';
import { ACHIEVEMENTS, Achievement } from '../game/achievements';

const S = RENDER_SCALE;

export class AchievementsScene extends Phaser.Scene {
  private storage!: Storage;
  private scrollY: number = 0;
  private maxScroll: number = 0;
  private container!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'AchievementsScene' });
  }

  create(): void {
    this.storage = new Storage();
    const { width, height } = this.cameras.main;
    const unlockedIds = this.storage.getUnlockedAchievements();

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    this.add.text(width / 2, 40 * S, 'ACHIEVEMENTS', {
      fontSize: scaledFont(32),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Progress counter
    const visibleAchievements = ACHIEVEMENTS.filter(a => !a.hidden || unlockedIds.includes(a.id));
    const unlockedCount = unlockedIds.length;
    const totalCount = ACHIEVEMENTS.length;

    this.add.text(width / 2, 80 * S, `${unlockedCount} / ${totalCount} Unlocked`, {
      fontSize: scaledFont(16),
      color: '#888888',
    }).setOrigin(0.5);

    // Create scrollable container
    this.container = this.add.container(0, 120 * S);

    // Achievement grid
    const cols = 2;
    const cardWidth = 280 * S;
    const cardHeight = 70 * S;
    const padding = 15 * S;
    const startX = (width - (cols * cardWidth + (cols - 1) * padding)) / 2;

    let row = 0;
    let col = 0;

    // Sort: unlocked first, then by index
    const sortedAchievements = [...ACHIEVEMENTS].sort((a, b) => {
      const aUnlocked = unlockedIds.includes(a.id);
      const bUnlocked = unlockedIds.includes(b.id);
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;
      return 0;
    });

    for (const achievement of sortedAchievements) {
      const isUnlocked = unlockedIds.includes(achievement.id);
      const isHidden = Boolean(achievement.hidden) && !isUnlocked;

      const x = startX + col * (cardWidth + padding);
      const y = row * (cardHeight + padding);

      this.createAchievementCard(x, y, cardWidth, cardHeight, achievement, isUnlocked, isHidden);

      col++;
      if (col >= cols) {
        col = 0;
        row++;
      }
    }

    // Calculate max scroll
    const contentHeight = (row + 1) * (cardHeight + padding);
    const viewHeight = height - 180 * S;
    this.maxScroll = Math.max(0, contentHeight - viewHeight);

    // Setup scroll input
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _dx: number[], _dy: number[], dz: number) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dz * 0.5, 0, this.maxScroll);
      this.container.y = 120 * S - this.scrollY;
    });

    // Touch/drag scrolling
    let dragStartY = 0;
    let dragStartScroll = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      dragStartScroll = this.scrollY;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const dy = dragStartY - pointer.y;
        this.scrollY = Phaser.Math.Clamp(dragStartScroll + dy, 0, this.maxScroll);
        this.container.y = 120 * S - this.scrollY;
      }
    });

    // Back button
    const backBtn = this.add.text(30 * S, height - 40 * S, '< BACK', {
      fontSize: scaledFont(18),
      color: '#666666',
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setStyle({ color: '#ffd700' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ color: '#666666' }));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Keyboard
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  private createAchievementCard(
    x: number,
    y: number,
    width: number,
    height: number,
    achievement: Achievement,
    isUnlocked: boolean,
    isHidden: boolean
  ): void {
    // Card background
    const bg = this.add.graphics();
    const bgColor = isUnlocked ? 0x1e3a5f : 0x16213e;
    const borderColor = isUnlocked ? 0xffd700 : 0x333333;

    bg.fillStyle(bgColor, 1);
    bg.fillRoundedRect(x, y, width, height, 10 * S);
    bg.lineStyle(2 * S, borderColor, isUnlocked ? 0.8 : 0.3);
    bg.strokeRoundedRect(x, y, width, height, 10 * S);
    this.container.add(bg);

    // Icon
    const icon = this.add.text(x + 35 * S, y + height / 2, isHidden ? '❓' : achievement.icon, {
      fontSize: scaledFont(28),
    }).setOrigin(0.5).setAlpha(isUnlocked ? 1 : 0.4);
    this.container.add(icon);

    // Name
    const name = this.add.text(x + 70 * S, y + 18 * S, isHidden ? '???' : achievement.name, {
      fontSize: scaledFont(14),
      color: isUnlocked ? '#ffffff' : '#666666',
      fontStyle: 'bold',
    });
    this.container.add(name);

    // Description
    const desc = this.add.text(x + 70 * S, y + 42 * S, isHidden ? 'Hidden achievement' : achievement.description, {
      fontSize: scaledFont(11),
      color: isUnlocked ? '#aaaaaa' : '#444444',
    });
    this.container.add(desc);

    // Checkmark for unlocked
    if (isUnlocked) {
      const check = this.add.text(x + width - 25 * S, y + height / 2, '✓', {
        fontSize: scaledFont(20),
        color: '#7fff00',
      }).setOrigin(0.5);
      this.container.add(check);
    }
  }
}

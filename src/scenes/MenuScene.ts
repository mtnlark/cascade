import Phaser from 'phaser';
import { UI_TEXT_COLOR, COLORS, RENDER_SCALE, scaledFont } from '../config';
import { Storage, GameMode } from '../utils/storage';
import { getDailyGoals, DailyGoal } from '../utils/dailyGoals';

const S = RENDER_SCALE; // Shorthand for scaling

export class MenuScene extends Phaser.Scene {
  private storage!: Storage;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.storage = new Storage();
    const { width, height } = this.cameras.main;

    // Animated background tiles
    this.createBackgroundTiles();

    // Title with shadow
    this.add.text(width / 2 + 2 * S, 82 * S, '★ CASCADE ★', {
      fontSize: scaledFont(48),
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.3);

    this.add.text(width / 2, 80 * S, '★ CASCADE ★', {
      fontSize: scaledFont(48),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, 130 * S, 'A Matching Puzzle Game', {
      fontSize: scaledFont(16),
      color: '#888888',
    }).setOrigin(0.5);

    // Mode buttons with descriptions
    const modes: { label: string; mode: GameMode; y: number; desc: string }[] = [
      { label: 'ENDLESS', mode: 'endless', y: 180 * S, desc: 'Climb the leaderboard. Difficulty increases!' },
      { label: 'DAILY PUZZLE', mode: 'daily', y: 255 * S, desc: 'Same puzzle for everyone today' },
      { label: 'TIMED', mode: 'timed', y: 370 * S, desc: '2 minutes to score big' },
      { label: 'PRACTICE', mode: 'practice', y: 445 * S, desc: 'Unlimited undos. No game over.' },
    ];

    modes.forEach(({ label, mode, y, desc }) => {
      const btnWidth = 260 * S;
      const btnHeight = 54 * S;
      const radius = 12 * S;

      // Button background
      const bg = this.add.graphics();
      bg.fillStyle(0x16213e, 1);
      bg.fillRoundedRect(width / 2 - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, radius);
      bg.lineStyle(2 * S, 0x0f3460, 1);
      bg.strokeRoundedRect(width / 2 - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, radius);

      // Button text
      const btn = this.add.text(width / 2, y - 6 * S, label, {
        fontSize: scaledFont(22),
        color: UI_TEXT_COLOR,
        fontStyle: 'bold',
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      // Mode description below label
      this.add.text(width / 2, y + 14 * S, desc, {
        fontSize: scaledFont(10),
        color: '#666666',
      }).setOrigin(0.5);

      // High score below button (smaller, to the side)
      const highScore = this.storage.getHighScore(mode);
      if (highScore > 0 && mode !== 'daily') {
        this.add.text(width / 2 + btnWidth / 2 + 15 * S, y, `★${highScore}`, {
          fontSize: scaledFont(12),
          color: '#ffd700',
        }).setOrigin(0, 0.5);
      }

      // Daily goals preview for daily mode (shown below the button)
      if (mode === 'daily') {
        this.createDailyGoalsPreview(width / 2, y + 38 * S);
      }

      btn.on('pointerover', () => btn.setStyle({ color: '#ffd700' }));
      btn.on('pointerout', () => btn.setStyle({ color: UI_TEXT_COLOR }));
      btn.on('pointerdown', () => {
        this.scene.start('GameScene', { mode });
      });
    });

    // Challenge mode button (special styling)
    const challengeY = 535 * S;
    const challengeBtnWidth = 220 * S;
    const challengeBtnHeight = 54 * S;
    const challengeRadius = 12 * S;

    const challengeBg = this.add.graphics();
    challengeBg.fillStyle(0x1a2744, 1);
    challengeBg.fillRoundedRect(width / 2 - challengeBtnWidth / 2, challengeY - challengeBtnHeight / 2, challengeBtnWidth, challengeBtnHeight, challengeRadius);
    challengeBg.lineStyle(2 * S, 0xffd700, 0.6);
    challengeBg.strokeRoundedRect(width / 2 - challengeBtnWidth / 2, challengeY - challengeBtnHeight / 2, challengeBtnWidth, challengeBtnHeight, challengeRadius);

    const challengeBtn = this.add.text(width / 2, challengeY, 'CHALLENGES', {
      fontSize: scaledFont(24),
      color: '#ffd700',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Show progress under challenge button
    const completedCount = this.storage.getCompletedChallengeCount();
    if (completedCount > 0) {
      this.add.text(width / 2, challengeY + 42 * S, `${completedCount}/10 Complete`, {
        fontSize: scaledFont(12),
        color: '#888888',
      }).setOrigin(0.5);
    }

    challengeBtn.on('pointerover', () => challengeBtn.setStyle({ color: '#ffffff' }));
    challengeBtn.on('pointerout', () => challengeBtn.setStyle({ color: '#ffd700' }));
    challengeBtn.on('pointerdown', () => {
      this.scene.start('ChallengeSelectScene');
    });

    // Achievements button (smaller, below challenges)
    this.createAchievementsButton(width / 2, 610 * S);

    // Daily streak badge
    this.createStreakBadge(width - 60 * S, 70 * S);

    // Instructions
    const instructionsBg = this.add.graphics();
    instructionsBg.fillStyle(0x16213e, 0.8);
    instructionsBg.fillRoundedRect(width / 2 - 160 * S, height - 90 * S, 320 * S, 50 * S, 10 * S);

    this.add.text(width / 2, height - 65 * S, '🎯 Match 3+ tiles to clear them!', {
      fontSize: scaledFont(16),
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  private createDailyGoalsPreview(x: number, y: number): void {
    const goals = getDailyGoals();
    const goalsData = this.storage.getDailyGoalsData();

    // Show up to 3 goals in a compact format
    goals.forEach((goal, i) => {
      const isCompleted = goalsData.completed.includes(goal.id);
      const goalY = y + i * 14 * S;

      // Checkmark or bullet
      const prefix = isCompleted ? '✓' : '○';
      const color = isCompleted ? '#7fff00' : '#666666';

      // Truncate long descriptions
      const desc = goal.description.length > 20
        ? goal.description.slice(0, 18) + '...'
        : goal.description;

      this.add.text(x, goalY, `${prefix} ${desc}`, {
        fontSize: scaledFont(10),
        color,
      }).setOrigin(0.5);
    });
  }

  private createAchievementsButton(x: number, y: number): void {
    const btnWidth = 180 * S;
    const btnHeight = 40 * S;
    const radius = 10 * S;

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.8);
    bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, radius);
    bg.lineStyle(1 * S, 0x444444, 0.6);
    bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, radius);

    // Get unlock count for badge
    const unlockedCount = this.storage.getUnlockedAchievementCount();

    // Button text
    const btn = this.add.text(x, y, `🏆 ACHIEVEMENTS`, {
      fontSize: scaledFont(14),
      color: '#888888',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Badge showing unlock count
    if (unlockedCount > 0) {
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(0xffd700, 0.9);
      badgeBg.fillCircle(x + 80 * S, y - 8 * S, 12 * S);

      this.add.text(x + 80 * S, y - 8 * S, `${unlockedCount}`, {
        fontSize: scaledFont(10),
        color: '#000000',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    btn.on('pointerover', () => btn.setStyle({ color: '#ffd700' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#888888' }));
    btn.on('pointerdown', () => {
      this.scene.start('AchievementsScene');
    });
  }

  private createStreakBadge(x: number, y: number): void {
    const streak = this.storage.getStreak();

    if (streak.currentStreak === 0 && streak.bestStreak === 0) {
      return; // Don't show badge if no streak history
    }

    const container = this.add.container(x, y);

    // Badge background
    const isAtRisk = this.storage.isStreakAtRisk();
    const bgColor = isAtRisk ? 0xff6b9d : 0x16213e;
    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 0.9);
    bg.fillRoundedRect(-40 * S, -30 * S, 80 * S, 60 * S, 10 * S);
    bg.lineStyle(2 * S, isAtRisk ? 0xff4444 : 0xffd700, 0.8);
    bg.strokeRoundedRect(-40 * S, -30 * S, 80 * S, 60 * S, 10 * S);
    container.add(bg);

    // Flame icon
    const flame = this.add.text(0, -10 * S, '🔥', {
      fontSize: scaledFont(24),
    }).setOrigin(0.5);
    container.add(flame);

    // Streak count
    const count = this.add.text(0, 15 * S, `${streak.currentStreak}`, {
      fontSize: scaledFont(18),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(count);

    // Pulse animation if at risk
    if (isAtRisk) {
      this.tweens.add({
        targets: container,
        scale: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 500,
        ease: 'Sine.easeInOut',
      });

      // Add "at risk" warning
      const warning = this.add.text(x, y + 45 * S, 'Play to keep streak!', {
        fontSize: scaledFont(10),
        color: '#ff6b9d',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: warning,
        alpha: 0.5,
        yoyo: true,
        repeat: -1,
        duration: 400,
      });
    }

    // Best streak tooltip on hover
    if (streak.bestStreak > streak.currentStreak) {
      const bestText = this.add.text(x, y + 40 * S, `Best: ${streak.bestStreak}`, {
        fontSize: scaledFont(10),
        color: '#666666',
      }).setOrigin(0.5).setAlpha(0.7);
    }
  }

  private createBackgroundTiles(): void {
    const { width, height } = this.cameras.main;

    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(50 * S, width - 50 * S);
      const startY = Phaser.Math.Between(height, height + 200 * S);
      const colorIndex = Phaser.Math.Between(0, COLORS.length - 1);
      const size = Phaser.Math.Between(30 * S, 45 * S);

      const tile = this.add.graphics();
      tile.fillStyle(COLORS[colorIndex], 0.12);
      tile.fillRoundedRect(-size / 2, -size / 2, size, size, 8 * S);
      tile.setPosition(x, startY);

      this.tweens.add({
        targets: tile,
        y: -50 * S,
        x: x + Phaser.Math.Between(-80 * S, 80 * S),
        angle: Phaser.Math.Between(-90, 90),
        duration: Phaser.Math.Between(8000, 12000),
        repeat: -1,
        delay: i * 400,
      });
    }
  }
}

import Phaser from 'phaser';
import { UI_TEXT_COLOR, COLORS, RENDER_SCALE, scaledFont } from '../config';
import { Storage, GameMode } from '../utils/storage';
import { generateShareText, shareResult } from '../utils/share';
import { checkAchievements, getAchievement, GameStats } from '../game/achievements';

const S = RENDER_SCALE;

interface SessionStats {
  totalTilesCleared: number;
  longestChain: number;
  maxMultiplier: number;
  specialTilesUsed: number;
  timePlayedMs: number;
}

interface GameOverData {
  score: number;
  mode: GameMode;
  isHighScore: boolean;
  stats?: SessionStats;
}

export class GameOverScene extends Phaser.Scene {
  private storage!: Storage;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    this.storage = new Storage();
    const { width, height } = this.cameras.main;
    const { score, mode, isHighScore, stats } = data;

    // Check for new achievements
    if (stats) {
      this.checkAndShowAchievements(score, mode, stats);
    }

    // Falling particles in background
    this.createFallingTiles();

    // Semi-transparent overlay panel (taller for stats)
    const panelHeight = stats ? 620 * S : 500 * S;
    const panel = this.add.graphics();
    panel.fillStyle(0x16213e, 0.9);
    panel.fillRoundedRect(width / 2 - 180 * S, 60 * S, 360 * S, panelHeight, 20 * S);
    panel.lineStyle(3 * S, 0x0f3460, 1);
    panel.strokeRoundedRect(width / 2 - 180 * S, 60 * S, 360 * S, panelHeight, 20 * S);

    // Game Over text with shadow
    this.add.text(width / 2 + 3 * S, 143 * S, 'GAME OVER', {
      fontSize: scaledFont(48),
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.3);

    const gameOverText = this.add.text(width / 2, 140 * S, 'GAME OVER', {
      fontSize: scaledFont(48),
      color: '#ff6b9d',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Shake animation for game over
    this.tweens.add({
      targets: gameOverText,
      x: width / 2 + 3 * S,
      yoyo: true,
      repeat: 3,
      duration: 50,
    });

    // Score panel
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0x0f3460, 1);
    scoreBg.fillRoundedRect(width / 2 - 120 * S, 200 * S, 240 * S, 80 * S, 15 * S);

    this.add.text(width / 2, 220 * S, 'SCORE', {
      fontSize: scaledFont(16),
      color: '#888888',
    }).setOrigin(0.5);

    const scoreText = this.add.text(width / 2, 255 * S, `${score}`, {
      fontSize: scaledFont(42),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Animate score counting up
    let displayScore = 0;
    this.tweens.addCounter({
      from: 0,
      to: score,
      duration: 1000,
      ease: 'Power2',
      onUpdate: (tween) => {
        displayScore = Math.floor(tween.getValue() ?? 0);
        scoreText.setText(`${displayScore}`);
      },
    });

    // High score indicator
    if (isHighScore) {
      const starBurst = this.add.graphics();
      starBurst.fillStyle(0x7fff00, 0.2);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        starBurst.fillTriangle(
          width / 2, 340 * S,
          width / 2 + Math.cos(angle) * 60 * S, 340 * S + Math.sin(angle) * 60 * S,
          width / 2 + Math.cos(angle + 0.3) * 60 * S, 340 * S + Math.sin(angle + 0.3) * 60 * S
        );
      }

      this.tweens.add({
        targets: starBurst,
        angle: 360,
        repeat: -1,
        duration: 10000,
      });

      const newBest = this.add.text(width / 2, 340 * S, '★ NEW BEST! ★', {
        fontSize: scaledFont(28),
        color: '#7fff00',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: newBest,
        scale: 1.15,
        yoyo: true,
        repeat: -1,
        duration: 400,
        ease: 'Sine.easeInOut',
      });
    }

    // Session stats panel
    if (stats) {
      this.createStatsPanel(width / 2, isHighScore ? 400 * S : 340 * S, stats);
    }

    // Share button for daily mode
    let buttonOffset = 0;
    if (mode === 'daily' && stats) {
      buttonOffset = 60 * S;
      this.createShareButton(width / 2, (stats ? 530 * S : 430 * S), score, stats);
    }

    // Buttons (positioned lower when stats are shown)
    const buttonBaseY = stats ? 530 * S + buttonOffset : 430 * S;
    this.createButton(width / 2, buttonBaseY, 'PLAY AGAIN', () => {
      this.scene.start('GameScene', { mode });
    }, true);

    this.createButton(width / 2, buttonBaseY + 80 * S, 'MENU', () => {
      this.scene.start('MenuScene');
    }, false);

    // Keyboard shortcuts
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.scene.start('GameScene', { mode });
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private createStatsPanel(x: number, y: number, stats: SessionStats): void {
    const panelWidth = 280 * S;
    const panelHeight = 120 * S;

    // Stats background
    const bg = this.add.graphics();
    bg.fillStyle(0x0f3460, 0.8);
    bg.fillRoundedRect(x - panelWidth / 2, y, panelWidth, panelHeight, 10 * S);

    // Stats title
    this.add.text(x, y + 15 * S, 'SESSION STATS', {
      fontSize: scaledFont(12),
      color: '#666666',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Format time
    const seconds = Math.floor(stats.timePlayedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const timeStr = minutes > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;

    // Stats grid (2 columns)
    const leftX = x - 65 * S;
    const rightX = x + 65 * S;
    const row1Y = y + 45 * S;
    const row2Y = y + 75 * S;
    const row3Y = y + 105 * S;

    // Row 1: Tiles cleared, Best chain
    this.createStatItem(leftX, row1Y, '🎯', `${stats.totalTilesCleared}`, 'tiles');
    this.createStatItem(rightX, row1Y, '⛓️', `${stats.longestChain}`, 'best chain');

    // Row 2: Max combo, Time
    this.createStatItem(leftX, row2Y, '🔥', `${stats.maxMultiplier}x`, 'max combo');
    this.createStatItem(rightX, row2Y, '⏱️', timeStr, 'time');

    // Row 3: Special tiles (centered if present)
    if (stats.specialTilesUsed > 0) {
      this.createStatItem(x, row3Y, '⭐', `${stats.specialTilesUsed}`, 'special tiles');
    }
  }

  private createStatItem(x: number, y: number, icon: string, value: string, label: string): void {
    // Icon
    this.add.text(x - 35 * S, y, icon, {
      fontSize: scaledFont(16),
    }).setOrigin(0.5);

    // Value
    this.add.text(x, y - 5 * S, value, {
      fontSize: scaledFont(18),
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Label
    this.add.text(x, y + 12 * S, label, {
      fontSize: scaledFont(10),
      color: '#666666',
    }).setOrigin(0.5);
  }

  private createFallingTiles(): void {
    const { width, height } = this.cameras.main;

    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, width);
      const colorIndex = Phaser.Math.Between(0, COLORS.length - 1);
      const size = Phaser.Math.Between(20 * S, 40 * S);

      const tile = this.add.graphics();
      tile.fillStyle(COLORS[colorIndex], 0.3);
      tile.fillRoundedRect(-size / 2, -size / 2, size, size, 6 * S);
      tile.setPosition(x, -50 * S);

      this.tweens.add({
        targets: tile,
        y: height + 100 * S,
        x: x + Phaser.Math.Between(-100 * S, 100 * S),
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: i * 200,
      });
    }
  }

  private createButton(x: number, y: number, label: string, onClick: () => void, primary: boolean): void {
    const btnWidth = 200 * S;
    const btnHeight = 50 * S;
    const radius = 12 * S;

    const container = this.add.container(x, y);

    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(-btnWidth / 2 + 3 * S, -btnHeight / 2 + 3 * S, btnWidth, btnHeight, radius);
    container.add(shadow);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(primary ? 0x16213e : 0x0f3460, 1);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
    bg.lineStyle(2 * S, primary ? 0xffd700 : 0x444444, primary ? 0.6 : 0.5);
    bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
    container.add(bg);

    // Highlight
    if (primary) {
      const highlight = this.add.graphics();
      highlight.fillStyle(0xffffff, 0.1);
      highlight.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight / 2, { tl: radius, tr: radius, bl: 0, br: 0 });
      container.add(highlight);
    }

    // Text
    const text = this.add.text(0, 0, label, {
      fontSize: primary ? scaledFont(24) : scaledFont(20),
      color: primary ? UI_TEXT_COLOR : '#888888',
      fontStyle: primary ? 'bold' : 'normal',
    }).setOrigin(0.5);
    container.add(text);

    // Hit area (btnWidth and btnHeight already scaled)
    const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      text.setStyle({ color: '#ffd700' });
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    hitArea.on('pointerout', () => {
      text.setStyle({ color: primary ? UI_TEXT_COLOR : '#888888' });
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: onClick,
      });
    });

    // Entrance animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      delay: primary ? 800 : 900,
      ease: 'Back.easeOut',
    });
  }

  private checkAndShowAchievements(score: number, mode: GameMode, stats: SessionStats): void {
    const gameStats: GameStats = {
      score,
      maxCombo: stats.maxMultiplier,
      tilesCleared: stats.totalTilesCleared,
      longestChain: stats.longestChain,
      specialTilesUsed: stats.specialTilesUsed,
      mode,
    };

    const streak = this.storage.getStreak();
    const challengeProgress = this.storage.getChallengeProgress();

    const newlyUnlocked = checkAchievements(
      gameStats,
      { currentStreak: streak.currentStreak },
      { completedCount: challengeProgress.completed.length, totalChallenges: 10 },
      this.storage.getUnlockedAchievements()
    );

    // Save new achievements
    if (newlyUnlocked.length > 0) {
      this.storage.unlockAchievements(newlyUnlocked);

      // Show achievement popup with delay
      this.time.delayedCall(1200, () => {
        this.showAchievementPopups(newlyUnlocked);
      });
    }
  }

  private showAchievementPopups(achievementIds: string[]): void {
    const { width, height } = this.cameras.main;

    // Show each achievement with staggered timing
    achievementIds.forEach((id, index) => {
      const achievement = getAchievement(id);
      if (!achievement) return;

      this.time.delayedCall(index * 800, () => {
        this.showSingleAchievementPopup(achievement);
      });
    });
  }

  private showSingleAchievementPopup(achievement: { id: string; name: string; icon: string; description: string }): void {
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, -100 * S);
    container.setDepth(200);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1e3a5f, 0.95);
    bg.fillRoundedRect(-160 * S, -40 * S, 320 * S, 80 * S, 15 * S);
    bg.lineStyle(3 * S, 0xffd700, 1);
    bg.strokeRoundedRect(-160 * S, -40 * S, 320 * S, 80 * S, 15 * S);
    container.add(bg);

    // Achievement unlocked label
    const label = this.add.text(0, -25 * S, '🏆 ACHIEVEMENT UNLOCKED!', {
      fontSize: scaledFont(12),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(label);

    // Icon and name
    const icon = this.add.text(-120 * S, 10 * S, achievement.icon, {
      fontSize: scaledFont(32),
    }).setOrigin(0.5);
    container.add(icon);

    const name = this.add.text(-70 * S, 5 * S, achievement.name, {
      fontSize: scaledFont(16),
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    container.add(name);

    const desc = this.add.text(-70 * S, 25 * S, achievement.description, {
      fontSize: scaledFont(11),
      color: '#aaaaaa',
    }).setOrigin(0, 0.5);
    container.add(desc);

    // Animate in
    this.tweens.add({
      targets: container,
      y: 50 * S,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold, then animate out
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: container,
            y: -100 * S,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => container.destroy(),
          });
        });
      },
    });
  }

  private createShareButton(x: number, y: number, score: number, stats: SessionStats): void {
    const btnWidth = 160 * S;
    const btnHeight = 40 * S;
    const radius = 10 * S;

    const container = this.add.container(x, y);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1da1f2, 0.9); // Twitter blue-ish
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
    bg.lineStyle(2 * S, 0xffffff, 0.3);
    bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
    container.add(bg);

    // Share icon and text
    const text = this.add.text(0, 0, '📤 SHARE', {
      fontSize: scaledFont(18),
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    // Toast message (hidden initially)
    const toast = this.add.text(x, y + 35 * S, '', {
      fontSize: scaledFont(12),
      color: '#7fff00',
    }).setOrigin(0.5).setAlpha(0);

    // Hit area
    const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    hitArea.on('pointerdown', async () => {
      const today = new Date().toISOString().split('T')[0];
      const shareText = generateShareText(score, today, {
        totalTilesCleared: stats.totalTilesCleared,
        longestChain: stats.longestChain,
        maxMultiplier: stats.maxMultiplier,
      });

      const result = await shareResult(shareText);

      if (result.success) {
        const message = result.method === 'clipboard' ? 'Copied!' : 'Shared!';
        toast.setText(message);
        toast.setAlpha(1);

        this.tweens.add({
          targets: toast,
          alpha: 0,
          y: y + 25 * S,
          delay: 1500,
          duration: 300,
        });
      }
    });

    // Entrance animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      delay: 700,
      ease: 'Back.easeOut',
    });
  }
}

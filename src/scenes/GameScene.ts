import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { Tile } from '../game/Tile';
import { TileQueue } from '../game/TileQueue';
import { TileData } from '../game/TileData';
import { ScoreManager } from '../game/ScoreManager';
import { Storage, GameMode } from '../utils/storage';
import { getDailySeed, seededRandom } from '../utils/daily';
import { getTheme } from '../utils/themes';
import { getDailyGoals, updateGoalProgress, calculateGoalBonus, DailyGoal } from '../utils/dailyGoals';
import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  GRID_PADDING,
  COLORS,
  INITIAL_COLOR_COUNT,
  MIN_MATCH_SIZE,
  UI_TEXT_COLOR,
  GRID_BACKGROUND_COLOR,
  RENDER_SCALE,
  PREVIEW_QUEUE_SIZE,
  TIMED_MODE_DURATION,
  DEFAULT_UNDO_COUNT,
  UNDO_WARNING_THRESHOLD,
  TIMER_WARNING_THRESHOLD,
  COMBO_THRESHOLD,
  MEGA_COMBO_THRESHOLD,
  SCORE_MILESTONES,
  DANGER_ZONE_ROWS,
  scaledFont,
} from '../config';

const S = RENDER_SCALE; // Shorthand

interface GameSceneData {
  mode: GameMode;
}

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private scoreManager!: ScoreManager;
  private storage!: Storage;
  private mode!: GameMode;

  private tiles: Map<string, Tile> = new Map();
  private gridX!: number;
  private gridY!: number;
  private colorCount: number = INITIAL_COLOR_COUNT;
  private rng: (() => number) | null = null;

  private tileQueue!: TileQueue;
  private previewTiles: Phaser.GameObjects.Container[] = [];
  private previewX!: number;
  private previewY!: number;

  // Hold system
  private holdContainer!: Phaser.GameObjects.Container;
  private canHoldThisTurn: boolean = true;

  // Danger zone indicators
  private dangerGraphics!: Phaser.GameObjects.Graphics;
  private dangerTween: Phaser.Tweens.Tween | null = null;

  // Milestone tracking
  private lastMilestoneReached: number = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private columnIndicator!: Phaser.GameObjects.Graphics;
  private hoveredColumn: number = -1;

  // Limited undo system
  private undosRemaining!: number;
  private undoCountText!: Phaser.GameObjects.Text;

  // Mode theming
  private modeIndicator!: Phaser.GameObjects.Container;

  // Difficulty indicator (endless mode)
  private colorCountText?: Phaser.GameObjects.Text;

  // Match preview
  private matchPreviewGraphics!: Phaser.GameObjects.Graphics;

  // Timed mode
  private timeRemaining: number = TIMED_MODE_DURATION;
  private timerText?: Phaser.GameObjects.Text;
  private timerEvent?: Phaser.Time.TimerEvent;
  private timerWarning: boolean = false;

  // Daily goals
  private dailyGoals: DailyGoal[] = [];
  private goalContainer?: Phaser.GameObjects.Container;
  private goalTexts: Phaser.GameObjects.Text[] = [];
  private comboCount: number = 0;  // Track total combos for goal

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    this.mode = data.mode || 'endless';
  }

  create(): void {
    this.grid = new Grid(GRID_COLS, GRID_ROWS);
    this.scoreManager = new ScoreManager();
    this.storage = new Storage();
    this.tiles.clear();

    // Initialize limited undo (practice mode has unlimited)
    this.undosRemaining = this.mode === 'practice' ? Infinity : DEFAULT_UNDO_COUNT;

    if (this.mode === 'daily') {
      this.rng = seededRandom(getDailySeed());
      // Record daily play for streak tracking
      this.storage.recordDailyPlay();
    }

    // Initialize tile queue with 5-tile preview
    this.tileQueue = new TileQueue(PREVIEW_QUEUE_SIZE, this.colorCount, this.rng);

    const { width, height } = this.cameras.main;

    // Calculate grid position (centered, with room for preview on right)
    const gridWidth = GRID_COLS * TILE_SIZE;
    const gridHeight = GRID_ROWS * TILE_SIZE;
    this.gridX = (width - gridWidth) / 2 - 40 * S;
    this.gridY = (height - gridHeight) / 2 + 20 * S;

    // Draw grid background
    this.add.rectangle(
      this.gridX + gridWidth / 2,
      this.gridY + gridHeight / 2,
      gridWidth + 8 * S,
      gridHeight + 8 * S,
      GRID_BACKGROUND_COLOR
    ).setStrokeStyle(2 * S, 0x0f3460);

    // Draw column indicators
    for (let col = 0; col < GRID_COLS; col++) {
      const x = this.gridX + col * TILE_SIZE + TILE_SIZE / 2;
      this.add.rectangle(x, this.gridY - 20 * S, TILE_SIZE - 8 * S, 4 * S, 0x0f3460);
    }

    // Create column hover indicator
    this.columnIndicator = this.add.graphics();
    this.columnIndicator.setDepth(10);

    // Create danger zone overlay
    this.dangerGraphics = this.add.graphics();
    this.dangerGraphics.setDepth(5);

    // UI: Title with shadow
    this.add.text(GRID_PADDING + 2 * S, GRID_PADDING + 2 * S, '★ CASCADE ★', {
      fontSize: scaledFont(22),
      color: '#000000',
    }).setAlpha(0.3);

    this.add.text(GRID_PADDING, GRID_PADDING, '★ CASCADE ★', {
      fontSize: scaledFont(22),
      color: '#ffd700',
      fontStyle: 'bold',
    });

    // UI: Mode indicator badge
    this.createModeIndicator(GRID_PADDING, GRID_PADDING + 35 * S);

    // Match preview graphics
    this.matchPreviewGraphics = this.add.graphics();
    this.matchPreviewGraphics.setDepth(8);

    // UI: Score with styled background
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0x16213e, 0.8);
    scoreBg.fillRoundedRect(width - GRID_PADDING - 130 * S, GRID_PADDING - 5 * S, 130 * S, 35 * S, 8 * S);

    this.scoreText = this.add.text(width - GRID_PADDING - 10 * S, GRID_PADDING + 12 * S, '0', {
      fontSize: scaledFont(24),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5);

    this.add.text(width - GRID_PADDING - 120 * S, GRID_PADDING + 12 * S, 'SCORE', {
      fontSize: scaledFont(12),
      color: '#888888',
    }).setOrigin(0, 0.5);

    // UI: Preview queue
    this.previewX = this.gridX + gridWidth + 60 * S;
    this.previewY = this.gridY + 40 * S;

    // Preview queue background panel (taller for 5 tiles)
    const previewBg = this.add.graphics();
    previewBg.fillStyle(0x16213e, 0.5);
    previewBg.fillRoundedRect(this.previewX - 35 * S, this.previewY - 40 * S, 70 * S, 320 * S, 12 * S);
    previewBg.lineStyle(2 * S, 0x0f3460, 1);
    previewBg.strokeRoundedRect(this.previewX - 35 * S, this.previewY - 40 * S, 70 * S, 320 * S, 12 * S);

    this.add.text(this.previewX, this.previewY - 25 * S, 'NEXT', {
      fontSize: scaledFont(14),
      color: '#666666',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.renderPreviewQueue();

    // UI: Hold slot (left of grid)
    const holdX = this.gridX - 70 * S;
    const holdY = this.gridY + 40 * S;

    // Hold background panel
    const holdBg = this.add.graphics();
    holdBg.fillStyle(0x16213e, 0.5);
    holdBg.fillRoundedRect(holdX - 35 * S, holdY - 40 * S, 70 * S, 110 * S, 12 * S);
    holdBg.lineStyle(2 * S, 0x0f3460, 1);
    holdBg.strokeRoundedRect(holdX - 35 * S, holdY - 40 * S, 70 * S, 110 * S, 12 * S);

    this.add.text(holdX, holdY - 25 * S, 'HOLD', {
      fontSize: scaledFont(14),
      color: '#666666',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.holdContainer = this.add.container(holdX, holdY);
    this.renderHoldSlot();

    // Hold button
    const holdBtnY = holdY + 50 * S;
    const holdBtnBg = this.add.graphics();
    holdBtnBg.fillStyle(0x16213e, 0.8);
    holdBtnBg.fillRoundedRect(holdX - 30 * S, holdBtnY, 60 * S, 28 * S, 6 * S);
    holdBtnBg.lineStyle(2 * S, 0x0f3460, 1);
    holdBtnBg.strokeRoundedRect(holdX - 30 * S, holdBtnY, 60 * S, 28 * S, 6 * S);

    const holdBtn = this.add.text(holdX, holdBtnY + 14 * S, '[H]', {
      fontSize: scaledFont(12),
      color: '#666666',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    holdBtn.on('pointerover', () => {
      if (this.canHoldThisTurn) holdBtn.setStyle({ color: '#ffd700' });
    });
    holdBtn.on('pointerout', () => {
      holdBtn.setStyle({ color: '#666666' });
    });
    holdBtn.on('pointerdown', () => this.holdTile());

    // UI: Styled Undo button (positioned below 5-tile preview)
    const undoBtnBg = this.add.graphics();
    undoBtnBg.fillStyle(0x16213e, 0.8);
    undoBtnBg.fillRoundedRect(this.previewX - 40 * S, this.previewY + 295 * S, 80 * S, 35 * S, 8 * S);
    undoBtnBg.lineStyle(2 * S, 0x0f3460, 1);
    undoBtnBg.strokeRoundedRect(this.previewX - 40 * S, this.previewY + 295 * S, 80 * S, 35 * S, 8 * S);

    const undoBtn = this.add.text(this.previewX, this.previewY + 312 * S, '↩ UNDO', {
      fontSize: scaledFont(14),
      color: '#666666',
      fontStyle: 'bold',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    undoBtn.on('pointerover', () => {
      undoBtn.setStyle({ color: '#ffd700' });
      undoBtnBg.clear();
      undoBtnBg.fillStyle(0x1a2744, 1);
      undoBtnBg.fillRoundedRect(this.previewX - 40 * S, this.previewY + 295 * S, 80 * S, 35 * S, 8 * S);
      undoBtnBg.lineStyle(2 * S, 0xffd700, 0.5);
      undoBtnBg.strokeRoundedRect(this.previewX - 40 * S, this.previewY + 295 * S, 80 * S, 35 * S, 8 * S);
    });
    undoBtn.on('pointerout', () => {
      undoBtn.setStyle({ color: '#666666' });
      undoBtnBg.clear();
      undoBtnBg.fillStyle(0x16213e, 0.8);
      undoBtnBg.fillRoundedRect(this.previewX - 40 * S, this.previewY + 295 * S, 80 * S, 35 * S, 8 * S);
      undoBtnBg.lineStyle(2 * S, 0x0f3460, 1);
      undoBtnBg.strokeRoundedRect(this.previewX - 40 * S, this.previewY + 295 * S, 80 * S, 35 * S, 8 * S);
    });
    undoBtn.on('pointerdown', () => this.undoLastMove());

    // Undo count display (below undo button)
    const undoCountLabel = this.mode === 'practice' ? '∞' : `${this.undosRemaining}`;
    this.undoCountText = this.add.text(this.previewX, this.previewY + 342 * S, undoCountLabel, {
      fontSize: scaledFont(12),
      color: '#888888',
    }).setOrigin(0.5);

    // Difficulty indicator for endless mode (shows current color count)
    if (this.mode === 'endless') {
      this.createDifficultyIndicator();
    }

    // Timer display and countdown for timed mode
    if (this.mode === 'timed') {
      this.createTimedModeUI();
      this.startTimedModeCountdown();
    }

    // Daily goals tracking and display
    if (this.mode === 'daily') {
      this.dailyGoals = getDailyGoals();
      this.comboCount = 0;
      this.createDailyGoalsUI();
    }

    // UI: Menu button (back to menu)
    const menuBtnY = this.previewY + 350 * S;
    const menuBtnBg = this.add.graphics();
    menuBtnBg.fillStyle(0x16213e, 0.6);
    menuBtnBg.fillRoundedRect(this.previewX - 40 * S, menuBtnY, 80 * S, 30 * S, 6 * S);

    const menuBtn = this.add.text(this.previewX, menuBtnY + 15 * S, '☰ MENU', {
      fontSize: scaledFont(12),
      color: '#555555',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => {
      menuBtn.setStyle({ color: '#ff6b9d' });
    });
    menuBtn.on('pointerout', () => {
      menuBtn.setStyle({ color: '#555555' });
    });
    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Setup input
    this.setupInput();
  }

  private renderHoldSlot(): void {
    // Clear existing hold display
    this.holdContainer.removeAll(true);

    const tileData = this.tileQueue.getHeldTile();
    if (!tileData) {
      // Show empty slot
      const emptySlot = this.add.graphics();
      emptySlot.lineStyle(2 * S, 0x333333, 0.5);
      const slotSize = TILE_SIZE * 0.75;
      emptySlot.strokeRoundedRect(-slotSize / 2, -slotSize / 2, slotSize, slotSize, 8 * S);
      this.holdContainer.add(emptySlot);
      return;
    }

    // Border dimmed if already used hold this turn
    const borderAlpha = this.canHoldThisTurn ? 0.5 : 0.2;
    this.createTilePreviewGraphics(this.holdContainer, tileData, borderAlpha);
  }

  private holdTile(): void {
    if (!this.canHoldThisTurn) return;

    this.tileQueue.hold();
    this.canHoldThisTurn = false;

    // Update both displays
    this.renderHoldSlot();
    this.renderPreviewQueue();
  }

  /**
   * Creates a tile preview graphic with shadow, fill, highlight, border, and icon.
   * Used by both renderHoldSlot() and renderPreviewQueue().
   */
  private createTilePreviewGraphics(
    container: Phaser.GameObjects.Container,
    tileData: TileData,
    borderAlpha: number = 0.5
  ): void {
    const previewSize = TILE_SIZE * 0.75;
    const radius = 8 * S;
    const color = tileData.type === 'rainbow' ? 0xffffff : COLORS[tileData.colorIndex];

    const gfx = this.add.graphics();

    // Background shadow
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillRoundedRect(-previewSize / 2 + 3 * S, -previewSize / 2 + 3 * S, previewSize, previewSize, radius);

    // Main tile
    gfx.fillStyle(color, 1);
    gfx.fillRoundedRect(-previewSize / 2, -previewSize / 2, previewSize, previewSize, radius);

    // Highlight
    gfx.fillStyle(0xffffff, 0.2);
    gfx.fillRoundedRect(-previewSize / 2, -previewSize / 2, previewSize, previewSize / 2.5, { tl: radius, tr: radius, bl: 0, br: 0 });

    // Border
    gfx.lineStyle(2 * S, 0xffffff, borderAlpha);
    gfx.strokeRoundedRect(-previewSize / 2, -previewSize / 2, previewSize, previewSize, radius);

    container.add(gfx);

    // Add icon for special tiles
    if (tileData.type === 'bomb') {
      const icon = this.add.text(0, 2 * S, '💣', { fontSize: scaledFont(20) }).setOrigin(0.5);
      container.add(icon);
    } else if (tileData.type === 'colorBomb') {
      const icon = this.add.text(0, 2 * S, '⭐', { fontSize: scaledFont(20) }).setOrigin(0.5);
      container.add(icon);
    } else if (tileData.type === 'rainbow') {
      const icon = this.add.text(0, 2 * S, '🌈', { fontSize: scaledFont(18) }).setOrigin(0.5);
      container.add(icon);
    }
  }

  private renderPreviewQueue(): void {
    // Clear existing preview tiles
    this.previewTiles.forEach(t => t.destroy());
    this.previewTiles = [];

    const previewSize = TILE_SIZE * 0.75;
    const spacing = previewSize + 12 * S;
    const radius = 8 * S;

    for (let i = 0; i < PREVIEW_QUEUE_SIZE; i++) {
      const tileData = this.tileQueue.peek(i);
      if (!tileData) continue;

      const y = this.previewY + i * spacing;
      const container = this.add.container(this.previewX, y);

      // Scale down subsequent tiles for depth effect
      const scale = i === 0 ? 1 : Math.max(0.7, 0.95 - (i * 0.05));
      container.setScale(scale);

      // First tile gets full opacity border, others get dimmed
      const borderAlpha = i === 0 ? 0.5 : 0.3;
      this.createTilePreviewGraphics(container, tileData, borderAlpha);

      // Highlight the first tile as "next" with golden glow
      if (i === 0) {
        const glow = this.add.graphics();
        glow.lineStyle(3 * S, 0xffd700, 0.5);
        glow.strokeRoundedRect(-previewSize / 2 - 2 * S, -previewSize / 2 - 2 * S, previewSize + 4 * S, previewSize + 4 * S, radius + 2 * S);
        container.addAt(glow, 0);
      }

      this.previewTiles.push(container);
    }
  }

  private setupInput(): void {
    const gridWidth = GRID_COLS * TILE_SIZE;
    const gridHeight = GRID_ROWS * TILE_SIZE;

    // Track mouse movement for column indicator
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const col = Math.floor((pointer.x - this.gridX) / TILE_SIZE);
      if (col >= 0 && col < GRID_COLS && pointer.y >= this.gridY && pointer.y <= this.gridY + gridHeight) {
        if (col !== this.hoveredColumn) {
          this.hoveredColumn = col;
          this.updateColumnIndicator(col);
        }
      } else {
        this.hoveredColumn = -1;
        this.columnIndicator.clear();
      }
    });

    // Click on grid to drop
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const col = Math.floor((pointer.x - this.gridX) / TILE_SIZE);
      if (col >= 0 && col < GRID_COLS) {
        this.dropTile(col);
      }
    });

    // Keyboard controls
    this.input.keyboard?.on('keydown-LEFT', () => this.highlightColumn(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.highlightColumn(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.dropTileAtSelection());
    this.input.keyboard?.on('keydown-DOWN', () => this.dropTileAtSelection());
    this.input.keyboard?.on('keydown-Z', () => this.undoLastMove());
    this.input.keyboard?.on('keydown-H', () => this.holdTile());
  }

  private updateColumnIndicator(col: number): void {
    const gridHeight = GRID_ROWS * TILE_SIZE;
    const x = this.gridX + col * TILE_SIZE;

    this.columnIndicator.clear();
    this.matchPreviewGraphics.clear();

    // Draw column highlight
    this.columnIndicator.fillStyle(0xffffff, 0.08);
    this.columnIndicator.fillRect(x + 2 * S, this.gridY, TILE_SIZE - 4 * S, gridHeight);

    // Draw animated drop line
    this.columnIndicator.lineStyle(2 * S, 0xffd700, 0.6);
    this.columnIndicator.beginPath();
    this.columnIndicator.moveTo(x + TILE_SIZE / 2, this.gridY - 15 * S);
    this.columnIndicator.lineTo(x + TILE_SIZE / 2, this.gridY + 5 * S);
    this.columnIndicator.strokePath();

    // Draw arrow indicator at top
    this.columnIndicator.fillStyle(0xffd700, 0.8);
    this.columnIndicator.fillTriangle(
      x + TILE_SIZE / 2, this.gridY - 8 * S,
      x + TILE_SIZE / 2 - 8 * S, this.gridY - 18 * S,
      x + TILE_SIZE / 2 + 8 * S, this.gridY - 18 * S
    );

    // Match preview - show what tiles would match
    this.drawMatchPreview(col);
  }

  private drawMatchPreview(col: number): void {
    const currentTile = this.tileQueue.peek(0);
    if (!currentTile) return;

    const result = this.grid.simulateDrop(col, currentTile);
    if (!result || result.matches.length === 0) return;

    // Draw preview circles on tiles that would match
    const radius = TILE_SIZE * 0.35;
    for (const { col: matchCol, row: matchRow } of result.matches) {
      const cx = this.gridX + matchCol * TILE_SIZE + TILE_SIZE / 2;
      const cy = this.gridY + matchRow * TILE_SIZE + TILE_SIZE / 2;

      // Glowing ring effect
      this.matchPreviewGraphics.lineStyle(4 * S, 0xffffff, 0.3);
      this.matchPreviewGraphics.strokeCircle(cx, cy, radius);

      // Inner fill
      this.matchPreviewGraphics.fillStyle(0xffffff, 0.15);
      this.matchPreviewGraphics.fillCircle(cx, cy, radius - 2 * S);
    }

    // Show landing position indicator
    const landX = this.gridX + col * TILE_SIZE + TILE_SIZE / 2;
    const landY = this.gridY + result.row * TILE_SIZE + TILE_SIZE / 2;

    // Pulsing landing indicator
    this.matchPreviewGraphics.lineStyle(2 * S, 0xffd700, 0.6);
    this.matchPreviewGraphics.strokeCircle(landX, landY, TILE_SIZE * 0.4);
  }

  private selectedColumn: number = Math.floor(GRID_COLS / 2);

  private highlightColumn(delta: number): void {
    this.selectedColumn = Phaser.Math.Clamp(
      this.selectedColumn + delta,
      0,
      GRID_COLS - 1
    );
  }

  private dropTileAtSelection(): void {
    this.dropTile(this.selectedColumn);
  }

  private dropTile(col: number): void {
    if (!this.grid.canDropInColumn(col)) return;

    // Save state for undo
    this.grid.saveState();

    // Get tile from queue
    const tileData = this.tileQueue.next();
    const landedRow = this.grid.dropTile(col, tileData);

    if (landedRow === -1) return;

    // Create visual tile with full tile data
    const tile = new Tile(this, col, 0, tileData.colorIndex, tileData.type, this.gridX, this.gridY, tileData);
    this.tiles.set(`${col},${landedRow}`, tile);

    // Animate drop
    tile.animateDrop(landedRow, this.gridY, () => {
      this.resolveCascades();
    });

    // Reset hold for next turn
    this.canHoldThisTurn = true;

    // Update preview and hold displays
    this.renderPreviewQueue();
    this.renderHoldSlot();
  }

  private resolveCascades(): void {
    const result = this.grid.resolveCascades(MIN_MATCH_SIZE);

    // Update danger zone indicators
    this.updateDangerZone();

    if (result.chains.length === 0) {
      this.scoreManager.endTurn();
      this.tickTimersAndCheck();
      return;
    }

    // Process each chain with animation delay
    this.animateChains(result.chains, 0);
  }

  private tickTimersAndCheck(): void {
    // Tick all timer tiles
    const expired = this.grid.tickTimers();

    // Update visual timers
    this.updateTimerVisuals();

    if (expired.length > 0) {
      // Timer expired - animate explosion and end game
      this.handleTimerExplosions(expired);
    } else {
      this.checkGameOver();
    }
  }

  private updateTimerVisuals(): void {
    const timers = this.grid.getTimerTiles();
    for (const { col, row, turnsRemaining } of timers) {
      const key = `${col},${row}`;
      const tile = this.tiles.get(key);
      if (tile) {
        tile.updateTimer(turnsRemaining);
      }
    }
  }

  private handleTimerExplosions(expired: Array<{ col: number; row: number }>): void {
    if (this.mode === 'practice') {
      // In practice mode, just show warning and let player undo
      this.showTimerWarningMessage();
      return;
    }

    // Screen shake
    this.cameras.main.shake(200, 0.02);

    let explosionCount = 0;
    for (const { col, row } of expired) {
      const key = `${col},${row}`;
      const tile = this.tiles.get(key);
      if (tile) {
        tile.animateTimerExplosion(() => {
          explosionCount++;
          if (explosionCount === expired.length) {
            // After all explosions, end game
            this.time.delayedCall(300, () => {
              this.storage.setHighScore(this.mode, this.scoreManager.score);
              this.scene.start('GameOverScene', {
                score: this.scoreManager.score,
                mode: this.mode,
                isHighScore: this.storage.setHighScore(this.mode, this.scoreManager.score),
                stats: this.scoreManager.getSessionStats(),
              });
            });
          }
        });
        this.tiles.delete(key);
      }
    }
  }

  private showTimerWarningMessage(): void {
    const { width, height } = this.cameras.main;
    const text = this.add.text(width / 2, height / 2, '⏰ Timer expired! Use UNDO', {
      fontSize: scaledFont(22),
      color: '#ff4444',
      backgroundColor: '#1a1a2e',
      padding: { x: 16 * S, y: 8 * S },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 2500,
      duration: 500,
      onComplete: () => text.destroy(),
    });
  }

  private animateChains(chains: Array<{ cleared: Array<{ col: number; row: number }>; fallen: Array<{ col: number; fromRow: number; toRow: number }>; damaged?: Array<{ col: number; row: number }> }>, index: number): void {
    if (index >= chains.length) {
      this.scoreManager.endTurn();
      this.tickTimersAndCheck();
      return;
    }

    const chain = chains[index];

    // Animate damaged stone tiles
    if (chain.damaged && chain.damaged.length > 0) {
      for (const { col, row } of chain.damaged) {
        const key = `${col},${row}`;
        const tile = this.tiles.get(key);
        if (tile) {
          const cellData = this.grid.getCell(col, row);
          if (cellData && cellData.health !== undefined) {
            tile.updateHealth(cellData.health);
          }
        }
      }
    }

    // Add score
    const points = this.scoreManager.addChain(chain.cleared.length);
    this.scoreText.setText(`${this.scoreManager.score}`);
    this.updateDifficulty();
    this.checkMilestones();

    // Track combos for daily goals
    if (this.scoreManager.multiplier >= 2) {
      this.comboCount++;
    }

    // Track special tiles BEFORE updating daily goals (using visual Tile objects, not grid data which is already cleared)
    for (const { col, row } of chain.cleared) {
      const key = `${col},${row}`;
      const tile = this.tiles.get(key);
      if (tile && tile.tileType !== 'normal') {
        this.scoreManager.recordSpecialTile();
      }
    }

    // Update daily goals progress
    this.updateDailyGoalsProgress();

    // Show multiplier text (starting from 1x with escalating intensity)
    this.showMultiplierText(this.scoreManager.multiplier, this.scoreManager.turnTilesCleared);

    // Apply screen shake based on clear type and size
    this.applyScreenShake(chain.cleared);

    // Animate cleared tiles
    let clearedCount = 0;
    chain.cleared.forEach(({ col, row }) => {
      const key = `${col},${row}`;
      const tile = this.tiles.get(key);
      if (tile) {
        tile.animateClear(() => {
          clearedCount++;
          if (clearedCount === chain.cleared.length) {
            // After clear animation, update fallen tiles
            this.updateFallenTiles(chain.fallen);
            // Continue to next chain
            this.time.delayedCall(200, () => {
              this.animateChains(chains, index + 1);
            });
          }
        });
        this.tiles.delete(key);
      }
    });
  }

  private applyScreenShake(cleared: Array<{ col: number; row: number }>): void {
    let duration = 0;
    let intensity = 0;

    // Check for special tiles in the clear
    let hasBomb = false;
    let hasColorBomb = false;

    for (const { col, row } of cleared) {
      const key = `${col},${row}`;
      const tile = this.tiles.get(key);
      if (tile) {
        if (tile.tileType === 'bomb') hasBomb = true;
        if (tile.tileType === 'colorBomb') hasColorBomb = true;
      }
    }

    // Calculate shake based on clear type
    if (hasColorBomb) {
      duration = 120;
      intensity = 0.008;
    } else if (hasBomb) {
      duration = 80;
      intensity = 0.005;
    } else if (cleared.length >= 5) {
      duration = 50;
      intensity = 0.003;
    }

    // Scale up for high combos
    const multiplier = this.scoreManager.multiplier;
    if (multiplier >= 4) {
      duration = Math.max(duration, 60);
      intensity = Math.max(intensity, 0.002 + (multiplier - 3) * 0.001);
    }

    if (duration > 0 && intensity > 0) {
      this.cameras.main.shake(duration, intensity);
    }
  }

  private updateFallenTiles(fallen: Array<{ col: number; fromRow: number; toRow: number }>): void {
    fallen.forEach(({ col, fromRow, toRow }) => {
      const oldKey = `${col},${fromRow}`;
      const newKey = `${col},${toRow}`;
      const tile = this.tiles.get(oldKey);
      if (tile) {
        this.tiles.delete(oldKey);
        this.tiles.set(newKey, tile);
        tile.animateDrop(toRow, this.gridY);
      }
    });
  }

  private showMultiplierText(multiplier: number, tilesCleared: number): void {
    const { width, height } = this.cameras.main;

    // Create container for multiplier display
    const container = this.add.container(width / 2, height / 2);

    // Escalating visual intensity based on multiplier
    const intensity = Math.min(multiplier, 6);
    const glowColor = multiplier >= MEGA_COMBO_THRESHOLD ? 0xff6b9d : multiplier >= COMBO_THRESHOLD ? 0xffd700 : 0xffffff;
    const textColor = multiplier >= MEGA_COMBO_THRESHOLD ? '#ff6b9d' : multiplier >= COMBO_THRESHOLD ? '#ffd700' : '#ffffff';
    const glowRadius = (40 + intensity * 10) * S;
    const glowAlpha = 0.2 + (intensity * 0.05);

    // Glow background with escalating size
    const glow = this.add.graphics();
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
        const particle = this.add.graphics();
        particle.fillStyle(glowColor, 0.8);
        particle.fillCircle(0, 0, (4 + Math.random() * 4) * S);
        container.add(particle);

        const distance = (80 + Math.random() * 40) * S;
        this.tweens.add({
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
    const shadow = this.add.text(3 * S, 3 * S, `${multiplier}x`, {
      fontSize: scaledFont(fontSize),
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.4);
    container.add(shadow);

    // Main text with escalating color
    const text = this.add.text(0, 0, `${multiplier}x`, {
      fontSize: scaledFont(fontSize),
      color: textColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    // Combo label
    const comboLabel = multiplier >= MEGA_COMBO_THRESHOLD ? 'MEGA COMBO!' : multiplier >= COMBO_THRESHOLD ? 'COMBO!' : 'CHAIN';
    const subtitle = this.add.text(0, 35 * S, comboLabel, {
      fontSize: scaledFont(16 + intensity * 2),
      color: multiplier >= COMBO_THRESHOLD ? textColor : '#888888',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(subtitle);

    // Running tiles cleared counter
    const counter = this.add.text(0, 60 * S, `${tilesCleared} tiles`, {
      fontSize: scaledFont(14),
      color: '#aaaaaa',
    }).setOrigin(0.5);
    container.add(counter);

    // Entrance animation - bigger scale for higher combos
    container.setScale(0.5);
    container.setAlpha(0);

    const peakScale = 1 + (intensity * 0.1);

    this.tweens.add({
      targets: container,
      scale: peakScale,
      alpha: 1,
      duration: 150 + intensity * 20,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
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

  private undoLastMove(): void {
    // Check if undos are available
    if (this.undosRemaining <= 0) {
      this.showNoUndosMessage();
      return;
    }

    if (this.grid.undo()) {
      // Decrement undo count (but not for practice mode)
      if (this.mode !== 'practice') {
        this.undosRemaining--;
        this.undoCountText.setText(`${this.undosRemaining}`);

        // Flash red when running low
        if (this.undosRemaining <= UNDO_WARNING_THRESHOLD) {
          this.undoCountText.setStyle({ color: '#ff4444' });
          this.tweens.add({
            targets: this.undoCountText,
            scale: 1.3,
            yoyo: true,
            duration: 100,
          });
        }
      }

      this.rebuildTilesFromGrid();
    }
  }

  private showNoUndosMessage(): void {
    const { width, height } = this.cameras.main;
    const text = this.add.text(width / 2, height / 2, 'No undos left!', {
      fontSize: scaledFont(20),
      color: '#ff6b9d',
      backgroundColor: '#1a1a2e',
      padding: { x: 16 * S, y: 8 * S },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: height / 2 - 30 * S,
      delay: 800,
      duration: 300,
      onComplete: () => text.destroy(),
    });
  }

  private createModeIndicator(x: number, y: number): void {
    const theme = getTheme(this.mode);

    this.modeIndicator = this.add.container(x, y);

    // Badge background
    const bg = this.add.graphics();
    const labelWidth = theme.labelText.length * 8 * S + 16 * S;
    bg.fillStyle(theme.accentColor, 0.2);
    bg.fillRoundedRect(0, 0, labelWidth, 22 * S, 4 * S);
    bg.lineStyle(1 * S, theme.accentColor, 0.6);
    bg.strokeRoundedRect(0, 0, labelWidth, 22 * S, 4 * S);
    this.modeIndicator.add(bg);

    // Badge text
    const text = this.add.text(labelWidth / 2, 11 * S, theme.labelText, {
      fontSize: scaledFont(10),
      color: theme.accentHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.modeIndicator.add(text);
  }

  private createDifficultyIndicator(): void {
    const { width } = this.cameras.main;

    // Container for difficulty indicator (top right, below score)
    const x = width - GRID_PADDING - 10 * S;
    const y = GRID_PADDING + 55 * S;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.6);
    bg.fillRoundedRect(x - 60 * S, y - 5 * S, 70 * S, 24 * S, 4 * S);

    // Color count text
    this.colorCountText = this.add.text(x, y + 7 * S, `${this.colorCount} colors`, {
      fontSize: scaledFont(11),
      color: '#888888',
    }).setOrigin(1, 0.5);
  }

  private createTimedModeUI(): void {
    const { width } = this.cameras.main;

    // Timer display (prominent, center top)
    const timerBg = this.add.graphics();
    timerBg.fillStyle(0xff8c00, 0.2);
    timerBg.fillRoundedRect(width / 2 - 60 * S, 5 * S, 120 * S, 45 * S, 10 * S);
    timerBg.lineStyle(2 * S, 0xff8c00, 0.5);
    timerBg.strokeRoundedRect(width / 2 - 60 * S, 5 * S, 120 * S, 45 * S, 10 * S);

    // Timer icon
    this.add.text(width / 2 - 45 * S, 27 * S, '⏱️', {
      fontSize: scaledFont(20),
    }).setOrigin(0.5);

    // Timer text
    this.timerText = this.add.text(width / 2 + 10 * S, 27 * S, this.formatTime(this.timeRemaining), {
      fontSize: scaledFont(26),
      color: '#ff8c00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private startTimedModeCountdown(): void {
    this.timeRemaining = TIMED_MODE_DURATION;

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeRemaining--;
        this.updateTimerDisplay();

        if (this.timeRemaining <= 0) {
          this.timerEvent?.destroy();
          this.handleTimedModeEnd();
        }
      },
      loop: true,
    });
  }

  private updateTimerDisplay(): void {
    if (!this.timerText) return;

    this.timerText.setText(this.formatTime(this.timeRemaining));

    // Warning state at 10 seconds
    if (this.timeRemaining <= TIMER_WARNING_THRESHOLD && !this.timerWarning) {
      this.timerWarning = true;
      this.timerText.setStyle({ color: '#ff0000' });

      // Pulse animation
      this.tweens.add({
        targets: this.timerText,
        scale: 1.2,
        yoyo: true,
        repeat: -1,
        duration: 300,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private createDailyGoalsUI(): void {
    const { height } = this.cameras.main;

    // Goals panel on left side
    const panelX = 20 * S;
    const panelY = this.gridY + 150 * S;

    // Background panel
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.8);
    bg.fillRoundedRect(panelX - 10 * S, panelY - 15 * S, 130 * S, 100 * S, 8 * S);
    bg.lineStyle(1 * S, 0xffd700, 0.3);
    bg.strokeRoundedRect(panelX - 10 * S, panelY - 15 * S, 130 * S, 100 * S, 8 * S);

    // Title
    this.add.text(panelX, panelY - 5 * S, 'GOALS', {
      fontSize: scaledFont(10),
      color: '#ffd700',
      fontStyle: 'bold',
    });

    // Goal container
    this.goalContainer = this.add.container(panelX, panelY + 15 * S);
    this.goalTexts = [];

    this.dailyGoals.forEach((goal, i) => {
      const y = i * 25 * S;
      const text = this.add.text(0, y, this.formatGoalText(goal), {
        fontSize: scaledFont(9),
        color: goal.completed ? '#7fff00' : '#888888',
      });
      this.goalTexts.push(text);
      this.goalContainer!.add(text);
    });
  }

  private formatGoalText(goal: DailyGoal): string {
    const prefix = goal.completed ? '✓' : '○';
    const progress = goal.completed ? '' : ` (${goal.progress}/${goal.target})`;
    // Truncate long descriptions
    const desc = goal.description.length > 16
      ? goal.description.slice(0, 14) + '..'
      : goal.description;
    return `${prefix} ${desc}${progress}`;
  }

  private updateDailyGoalsProgress(): void {
    if (this.mode !== 'daily' || !this.goalContainer) return;

    const stats = {
      tilesCleared: this.scoreManager.totalTilesCleared,
      comboCount: this.comboCount,
      score: this.scoreManager.score,
      longestChain: this.scoreManager.longestChain,
      specialTilesUsed: this.scoreManager.specialTilesUsed,
      maxMultiplier: this.scoreManager.maxMultiplier,
    };

    const previouslyCompleted = this.dailyGoals.filter(g => g.completed).length;
    this.dailyGoals = updateGoalProgress(this.dailyGoals, stats);
    const nowCompleted = this.dailyGoals.filter(g => g.completed).length;

    // Update display
    this.dailyGoals.forEach((goal, i) => {
      if (this.goalTexts[i]) {
        this.goalTexts[i].setText(this.formatGoalText(goal));
        this.goalTexts[i].setStyle({ color: goal.completed ? '#7fff00' : '#888888' });
      }
    });

    // Show celebration for newly completed goals
    if (nowCompleted > previouslyCompleted) {
      const newGoal = this.dailyGoals.find(g => g.completed && !this.storage.isGoalCompleted(g.id));
      if (newGoal) {
        this.showGoalCompletedMessage(newGoal);
        this.storage.completeGoal(newGoal.id);

        // Add bonus points to score
        this.scoreManager.addBonus(newGoal.reward);
        this.scoreText.setText(`${this.scoreManager.score}`);
      }
    }
  }

  private showGoalCompletedMessage(goal: DailyGoal): void {
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, height / 3);
    container.setDepth(50);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x7fff00, 0.2);
    bg.fillRoundedRect(-120 * S, -30 * S, 240 * S, 60 * S, 10 * S);
    bg.lineStyle(2 * S, 0x7fff00, 0.8);
    bg.strokeRoundedRect(-120 * S, -30 * S, 240 * S, 60 * S, 10 * S);
    container.add(bg);

    // Text
    const text = this.add.text(0, -8 * S, '🎯 GOAL COMPLETE!', {
      fontSize: scaledFont(18),
      color: '#7fff00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    const reward = this.add.text(0, 15 * S, `+${goal.reward} bonus!`, {
      fontSize: scaledFont(14),
      color: '#ffd700',
    }).setOrigin(0.5);
    container.add(reward);

    // Animation
    container.setScale(0);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: container,
          alpha: 0,
          y: height / 3 - 40 * S,
          delay: 1500,
          duration: 300,
          onComplete: () => container.destroy(),
        });
      },
    });
  }

  private handleTimedModeEnd(): void {
    // Flash the timer red
    if (this.timerText) {
      this.tweens.add({
        targets: this.timerText,
        alpha: 0,
        yoyo: true,
        repeat: 3,
        duration: 100,
        onComplete: () => {
          // Go to game over
          this.storage.setHighScore(this.mode, this.scoreManager.score);
          this.scene.start('GameOverScene', {
            score: this.scoreManager.score,
            mode: this.mode,
            isHighScore: this.storage.setHighScore(this.mode, this.scoreManager.score),
            stats: this.scoreManager.getSessionStats(),
          });
        },
      });
    }
  }

  private rebuildTilesFromGrid(): void {
    // Destroy all current tiles
    this.tiles.forEach(tile => tile.destroy());
    this.tiles.clear();

    // Recreate from grid state
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        const cellData = this.grid.getCell(col, row);
        if (cellData !== null) {
          const tile = new Tile(this, col, row, cellData.colorIndex, cellData.type, this.gridX, this.gridY, cellData);
          this.tiles.set(`${col},${row}`, tile);
        }
      }
    }
  }

  private checkGameOver(): void {
    if (this.mode === 'practice') {
      if (this.grid.isGameOver()) {
        this.showPracticeFullMessage();
      }
      return;
    }

    if (this.grid.isGameOver()) {
      this.storage.setHighScore(this.mode, this.scoreManager.score);
      this.scene.start('GameOverScene', {
        score: this.scoreManager.score,
        mode: this.mode,
        isHighScore: this.storage.setHighScore(this.mode, this.scoreManager.score),
        stats: this.scoreManager.getSessionStats(),
      });
    }
  }

  private showPracticeFullMessage(): void {
    const { width, height } = this.cameras.main;
    const text = this.add.text(width / 2, height / 2, 'Grid full! Use UNDO', {
      fontSize: scaledFont(24),
      color: '#ff6b9d',
      backgroundColor: '#1a1a2e',
      padding: { x: 16 * S, y: 8 * S },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 2000,
      duration: 500,
      onComplete: () => text.destroy(),
    });
  }

  private checkMilestones(): void {
    const score = this.scoreManager.score;

    for (const milestone of SCORE_MILESTONES) {
      if (score >= milestone && this.lastMilestoneReached < milestone) {
        this.lastMilestoneReached = milestone;
        this.showMilestoneCelebration(milestone);
        break;
      }
    }
  }

  private showMilestoneCelebration(milestone: number): void {
    const { width, height } = this.cameras.main;

    // Screen flash
    const flash = this.add.graphics();
    flash.fillStyle(0xffd700, 0.3);
    flash.fillRect(0, 0, width, height);
    flash.setDepth(100);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Confetti burst
    this.createConfetti(width / 2, height / 3, milestone);

    // Milestone banner
    const container = this.add.container(width / 2, height / 2 - 50 * S);
    container.setDepth(101);

    // Banner background
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(-150 * S, -50 * S, 300 * S, 100 * S, 15 * S);
    bg.lineStyle(4 * S, 0xffd700, 1);
    bg.strokeRoundedRect(-150 * S, -50 * S, 300 * S, 100 * S, 15 * S);
    container.add(bg);

    // Milestone value
    const milestoneText = milestone >= 1000 ? `${milestone / 1000}K` : `${milestone}`;
    const valueText = this.add.text(0, -15 * S, milestoneText, {
      fontSize: scaledFont(48),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(valueText);

    // Label
    const label = this.add.text(0, 30 * S, 'MILESTONE!', {
      fontSize: scaledFont(20),
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(label);

    // Entrance animation
    container.setScale(0);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1.1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold briefly
        this.time.delayedCall(600, () => {
          // Exit animation
          this.tweens.add({
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

  private createConfetti(x: number, y: number, milestone: number): void {
    const colors = [0xffd700, 0xff6b9d, 0x00d4ff, 0x7fff00, 0xff8c00, 0xda70d6];
    const particleCount = 30 + Math.floor(milestone / 500) * 5;

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particle = this.add.graphics();
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

      this.tweens.add({
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

  private updateDangerZone(): void {
    this.dangerGraphics.clear();

    const gridHeight = GRID_ROWS * TILE_SIZE;
    const dangerThreshold = GRID_ROWS - DANGER_ZONE_ROWS;
    let dangerColumnsCount = 0;

    for (let col = 0; col < GRID_COLS; col++) {
      const height = this.grid.getColumnHeight(col);
      if (height >= dangerThreshold) {
        dangerColumnsCount++;
        const x = this.gridX + col * TILE_SIZE;

        // Red overlay on dangerous column
        this.dangerGraphics.fillStyle(0xff0000, 0.15);
        this.dangerGraphics.fillRect(x, this.gridY, TILE_SIZE, gridHeight);

        // Pulsing warning at top of column
        this.dangerGraphics.fillStyle(0xff0000, 0.4);
        this.dangerGraphics.fillRect(x + 2 * S, this.gridY, TILE_SIZE - 4 * S, TILE_SIZE);
      }
    }

    // Screen edge glow when any columns are in danger
    if (dangerColumnsCount > 0) {
      const { width, height } = this.cameras.main;
      const intensity = Math.min(dangerColumnsCount / GRID_COLS, 1) * 0.3;

      // Left edge
      const gradient = this.dangerGraphics;
      gradient.fillStyle(0xff0000, intensity * 0.5);
      gradient.fillRect(0, 0, 20 * S, height);
      gradient.fillStyle(0xff0000, intensity * 0.25);
      gradient.fillRect(20 * S, 0, 20 * S, height);

      // Right edge
      gradient.fillStyle(0xff0000, intensity * 0.5);
      gradient.fillRect(width - 20 * S, 0, 20 * S, height);
      gradient.fillStyle(0xff0000, intensity * 0.25);
      gradient.fillRect(width - 40 * S, 0, 20 * S, height);

      // Start pulsing animation if not already running
      if (!this.dangerTween || !this.dangerTween.isPlaying()) {
        this.dangerTween = this.tweens.add({
          targets: this.dangerGraphics,
          alpha: { from: 1, to: 0.5 },
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      // Stop pulsing when no danger
      if (this.dangerTween) {
        this.dangerTween.stop();
        this.dangerTween = null;
      }
      this.dangerGraphics.setAlpha(1);
    }
  }

  private updateDifficulty(): void {
    if (this.mode !== 'endless') return;

    const score = this.scoreManager.score;
    const thresholds = [500, 1500];

    let newColorCount = INITIAL_COLOR_COUNT;
    for (const threshold of thresholds) {
      if (score >= threshold) {
        newColorCount++;
      }
    }

    if (newColorCount > this.colorCount && newColorCount <= COLORS.length) {
      this.colorCount = newColorCount;
      this.tileQueue.setColorCount(newColorCount);
      this.showNewColorMessage();

      // Update difficulty indicator
      if (this.colorCountText) {
        this.colorCountText.setText(`${this.colorCount} colors`);
        this.colorCountText.setStyle({ color: '#da70d6' });
        this.tweens.add({
          targets: this.colorCountText,
          scale: 1.2,
          yoyo: true,
          duration: 200,
          onComplete: () => {
            this.colorCountText?.setStyle({ color: '#888888' });
          },
        });
      }
    }
  }

  private showNewColorMessage(): void {
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, height / 3);

    // Background panel
    const bg = this.add.graphics();
    bg.fillStyle(0xda70d6, 0.2);
    bg.fillRoundedRect(-120 * S, -30 * S, 240 * S, 60 * S, 15 * S);
    bg.lineStyle(3 * S, 0xda70d6, 0.8);
    bg.strokeRoundedRect(-120 * S, -30 * S, 240 * S, 60 * S, 15 * S);
    container.add(bg);

    // Text
    const text = this.add.text(0, 0, '✨ NEW COLOR! ✨', {
      fontSize: scaledFont(28),
      color: '#da70d6',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    // Entrance
    container.setScale(0);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: container,
          alpha: 0,
          y: height / 3 - 30 * S,
          delay: 800,
          duration: 400,
          onComplete: () => container.destroy(),
        });
      },
    });
  }
}

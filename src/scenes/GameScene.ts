import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { Tile } from '../game/Tile';
import { TileQueue } from '../game/TileQueue';
import { TileData } from '../game/TileData';
import { ScoreManager } from '../game/ScoreManager';
import { Storage, GameMode } from '../utils/storage';
import { getDailySeed, seededRandom } from '../utils/daily';
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
} from '../config';

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

  private scoreText!: Phaser.GameObjects.Text;

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

    if (this.mode === 'daily') {
      this.rng = seededRandom(getDailySeed());
    }

    // Initialize tile queue
    this.tileQueue = new TileQueue(3, this.colorCount, this.rng);

    const { width, height } = this.cameras.main;

    // Calculate grid position (centered, with room for preview on right)
    const gridWidth = GRID_COLS * TILE_SIZE;
    const gridHeight = GRID_ROWS * TILE_SIZE;
    this.gridX = (width - gridWidth) / 2 - 40;
    this.gridY = (height - gridHeight) / 2 + 20;

    // Draw grid background
    this.add.rectangle(
      this.gridX + gridWidth / 2,
      this.gridY + gridHeight / 2,
      gridWidth + 8,
      gridHeight + 8,
      GRID_BACKGROUND_COLOR
    ).setStrokeStyle(2, 0x0f3460);

    // Draw column indicators
    for (let col = 0; col < GRID_COLS; col++) {
      const x = this.gridX + col * TILE_SIZE + TILE_SIZE / 2;
      this.add.rectangle(x, this.gridY - 20, TILE_SIZE - 8, 4, 0x0f3460);
    }

    // UI: Title
    this.add.text(GRID_PADDING, GRID_PADDING, '★ CASCADE ★', {
      fontSize: '20px',
      color: '#ffd700',
    });

    // UI: Score
    this.scoreText = this.add.text(width - GRID_PADDING, GRID_PADDING, 'Score: 0', {
      fontSize: '20px',
      color: UI_TEXT_COLOR,
    }).setOrigin(1, 0);

    // UI: Preview queue
    this.previewX = this.gridX + gridWidth + 60;
    this.previewY = this.gridY + 30;

    this.add.text(this.previewX, this.previewY - 25, 'NEXT', {
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);

    this.renderPreviewQueue();

    // UI: Undo button
    const undoBtn = this.add.text(this.previewX, this.previewY + 180, '[UNDO]', {
      fontSize: '16px',
      color: '#666666',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    undoBtn.on('pointerover', () => undoBtn.setStyle({ color: '#ffffff' }));
    undoBtn.on('pointerout', () => undoBtn.setStyle({ color: '#666666' }));
    undoBtn.on('pointerdown', () => this.undoLastMove());

    // Setup input
    this.setupInput();
  }

  private renderPreviewQueue(): void {
    // Clear existing preview tiles
    this.previewTiles.forEach(t => t.destroy());
    this.previewTiles = [];

    const previewSize = TILE_SIZE * 0.7;
    const spacing = previewSize + 10;

    for (let i = 0; i < 3; i++) {
      const tileData = this.tileQueue.peek(i);
      if (!tileData) continue;

      const y = this.previewY + i * spacing;
      const container = this.add.container(this.previewX, y);

      const color = tileData.type === 'rainbow' ? 0xffffff : COLORS[tileData.colorIndex];
      const rect = this.add.rectangle(0, 0, previewSize, previewSize, color);
      rect.setStrokeStyle(2, 0xffffff, 0.3);
      container.add(rect);

      // Add icon for special tiles
      if (tileData.type === 'bomb') {
        const icon = this.add.text(0, 0, '💣', { fontSize: '18px' }).setOrigin(0.5);
        container.add(icon);
      } else if (tileData.type === 'colorBomb') {
        const icon = this.add.text(0, 0, '⭐', { fontSize: '18px' }).setOrigin(0.5);
        container.add(icon);
      } else if (tileData.type === 'rainbow') {
        const icon = this.add.text(0, 0, '🌈', { fontSize: '16px' }).setOrigin(0.5);
        container.add(icon);
      }

      this.previewTiles.push(container);
    }
  }

  private setupInput(): void {
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

    // Create visual tile
    const tile = new Tile(this, col, 0, tileData.colorIndex, tileData.type, this.gridX, this.gridY);
    this.tiles.set(`${col},${landedRow}`, tile);

    // Animate drop
    tile.animateDrop(landedRow, this.gridY, () => {
      this.resolveCascades();
    });

    // Update preview
    this.renderPreviewQueue();
  }

  private resolveCascades(): void {
    const result = this.grid.resolveCascades(MIN_MATCH_SIZE);

    if (result.chains.length === 0) {
      this.scoreManager.endTurn();
      this.checkGameOver();
      return;
    }

    // Process each chain with animation delay
    this.animateChains(result.chains, 0);
  }

  private animateChains(chains: Array<{ cleared: Array<{ col: number; row: number }>; fallen: Array<{ col: number; fromRow: number; toRow: number }> }>, index: number): void {
    if (index >= chains.length) {
      this.scoreManager.endTurn();
      this.checkGameOver();
      return;
    }

    const chain = chains[index];

    // Add score
    const points = this.scoreManager.addChain(chain.cleared.length);
    this.scoreText.setText(`Score: ${this.scoreManager.score}`);
    this.updateDifficulty();

    // Show multiplier text if > 1x
    if (this.scoreManager.multiplier > 2) {
      this.showMultiplierText(this.scoreManager.multiplier - 1);
    }

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

  private showMultiplierText(multiplier: number): void {
    const { width, height } = this.cameras.main;
    const text = this.add.text(width / 2, height / 2, `${multiplier}x!`, {
      fontSize: '64px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      scale: 1.5,
      alpha: 0,
      duration: 500,
      onComplete: () => text.destroy(),
    });
  }

  private undoLastMove(): void {
    if (this.grid.undo()) {
      this.rebuildTilesFromGrid();
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
          const tile = new Tile(this, col, row, cellData.colorIndex, cellData.type, this.gridX, this.gridY);
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
      });
    }
  }

  private showPracticeFullMessage(): void {
    const { width, height } = this.cameras.main;
    const text = this.add.text(width / 2, height / 2, 'Grid full! Use UNDO', {
      fontSize: '24px',
      color: '#ff6b9d',
      backgroundColor: '#1a1a2e',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 2000,
      duration: 500,
      onComplete: () => text.destroy(),
    });
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
    }
  }

  private showNewColorMessage(): void {
    const { width, height } = this.cameras.main;
    const text = this.add.text(width / 2, height / 3, 'NEW COLOR!', {
      fontSize: '32px',
      color: '#da70d6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      scale: 1.3,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }
}

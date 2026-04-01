import Phaser from 'phaser';
import { Grid } from '../game/Grid';
import { Tile } from '../game/Tile';
import { TileQueue } from '../game/TileQueue';
import { TileData } from '../game/TileData';
import { ScoreManager } from '../game/ScoreManager';
import { Storage } from '../utils/storage';
import {
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  GRID_PADDING,
  COLORS,
  MIN_MATCH_SIZE,
  RENDER_SCALE,
  scaledFont,
} from '../config';

const S = RENDER_SCALE;

// Challenge objective types
type ObjectiveType = 'score' | 'tiles' | 'bombs' | 'colorBombs' | 'combos';

interface Challenge {
  id: number;
  name: string;
  description: string;
  moves: number;
  objective: {
    type: ObjectiveType;
    target: number;
  };
  colorCount: number;
  // Optional: Starting grid configuration
  startingGrid?: Array<{ col: number; row: number; colorIndex: number }>;
}

// 10 Initial Challenges
const CHALLENGES: Challenge[] = [
  {
    id: 1,
    name: 'Getting Started',
    description: 'Score 100 points',
    moves: 8,
    objective: { type: 'score', target: 100 },
    colorCount: 3,
  },
  {
    id: 2,
    name: 'Tile Collector',
    description: 'Clear 15 tiles',
    moves: 6,
    objective: { type: 'tiles', target: 15 },
    colorCount: 3,
  },
  {
    id: 3,
    name: 'Chain Reaction',
    description: 'Score 200 points',
    moves: 8,
    objective: { type: 'score', target: 200 },
    colorCount: 3,
  },
  {
    id: 4,
    name: 'Color Master',
    description: 'Clear 25 tiles',
    moves: 8,
    objective: { type: 'tiles', target: 25 },
    colorCount: 4,
  },
  {
    id: 5,
    name: 'Combo Starter',
    description: 'Get a 3x combo',
    moves: 10,
    objective: { type: 'combos', target: 3 },
    colorCount: 3,
  },
  {
    id: 6,
    name: 'Explosive Entry',
    description: 'Trigger 2 bombs',
    moves: 12,
    objective: { type: 'bombs', target: 2 },
    colorCount: 4,
  },
  {
    id: 7,
    name: 'Point Pusher',
    description: 'Score 400 points',
    moves: 10,
    objective: { type: 'score', target: 400 },
    colorCount: 4,
  },
  {
    id: 8,
    name: 'Tile Tornado',
    description: 'Clear 40 tiles',
    moves: 10,
    objective: { type: 'tiles', target: 40 },
    colorCount: 4,
  },
  {
    id: 9,
    name: 'Combo King',
    description: 'Get a 5x combo',
    moves: 12,
    objective: { type: 'combos', target: 5 },
    colorCount: 4,
  },
  {
    id: 10,
    name: 'Grand Finale',
    description: 'Score 800 points',
    moves: 12,
    objective: { type: 'score', target: 800 },
    colorCount: 5,
  },
];

interface ChallengeSceneData {
  challengeId: number;
}

export class ChallengeScene extends Phaser.Scene {
  private grid!: Grid;
  private scoreManager!: ScoreManager;
  private storage!: Storage;
  private challenge!: Challenge;

  private tiles: Map<string, Tile> = new Map();
  private gridX!: number;
  private gridY!: number;

  private tileQueue!: TileQueue;
  private previewTiles: Phaser.GameObjects.Container[] = [];
  private previewX!: number;
  private previewY!: number;

  private movesRemaining!: number;
  private movesText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;

  // Objective tracking
  private tilesCleared: number = 0;
  private bombsTriggered: number = 0;
  private maxCombo: number = 0;

  private columnIndicator!: Phaser.GameObjects.Graphics;
  private hoveredColumn: number = -1;

  constructor() {
    super({ key: 'ChallengeScene' });
  }

  init(data: ChallengeSceneData): void {
    const challenge = CHALLENGES.find(c => c.id === data.challengeId);
    if (!challenge) {
      console.error('Challenge not found:', data.challengeId);
      this.scene.start('ChallengeSelectScene');
      return;
    }
    this.challenge = challenge;
  }

  create(): void {
    this.grid = new Grid(GRID_COLS, GRID_ROWS);
    this.scoreManager = new ScoreManager();
    this.storage = new Storage();
    this.tiles.clear();

    this.movesRemaining = this.challenge.moves;
    this.tilesCleared = 0;
    this.bombsTriggered = 0;
    this.maxCombo = 0;

    this.tileQueue = new TileQueue(5, this.challenge.colorCount);

    const { width, height } = this.cameras.main;

    // Calculate grid position
    const gridWidth = GRID_COLS * TILE_SIZE;
    const gridHeight = GRID_ROWS * TILE_SIZE;
    this.gridX = (width - gridWidth) / 2;
    this.gridY = (height - gridHeight) / 2 + 40 * S;

    // Draw grid background
    this.add.rectangle(
      this.gridX + gridWidth / 2,
      this.gridY + gridHeight / 2,
      gridWidth + 8 * S,
      gridHeight + 8 * S,
      0x16213e
    ).setStrokeStyle(2 * S, 0x0f3460);

    // Column indicator
    this.columnIndicator = this.add.graphics();
    this.columnIndicator.setDepth(10);

    // Challenge header
    this.add.text(width / 2, 30 * S, this.challenge.name, {
      fontSize: scaledFont(28),
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Objective display
    const objBg = this.add.graphics();
    objBg.fillStyle(0x16213e, 0.9);
    objBg.fillRoundedRect(20 * S, 60 * S, 180 * S, 80 * S, 10 * S);

    this.add.text(30 * S, 70 * S, 'OBJECTIVE', {
      fontSize: scaledFont(10),
      color: '#666666',
    });

    this.objectiveText = this.add.text(30 * S, 90 * S, this.challenge.description, {
      fontSize: scaledFont(16),
      color: '#ffffff',
      fontStyle: 'bold',
    });

    this.progressText = this.add.text(30 * S, 115 * S, this.getProgressText(), {
      fontSize: scaledFont(14),
      color: '#ffd700',
    });

    // Moves display
    const movesBg = this.add.graphics();
    movesBg.fillStyle(0x16213e, 0.9);
    movesBg.fillRoundedRect(width - 120 * S, 60 * S, 100 * S, 80 * S, 10 * S);

    this.add.text(width - 70 * S, 70 * S, 'MOVES', {
      fontSize: scaledFont(10),
      color: '#666666',
    }).setOrigin(0.5);

    this.movesText = this.add.text(width - 70 * S, 105 * S, `${this.movesRemaining}`, {
      fontSize: scaledFont(36),
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Preview queue
    this.previewX = this.gridX + gridWidth + 50 * S;
    this.previewY = this.gridY + 40 * S;

    const previewBg = this.add.graphics();
    previewBg.fillStyle(0x16213e, 0.5);
    previewBg.fillRoundedRect(this.previewX - 30 * S, this.previewY - 35 * S, 60 * S, 200 * S, 10 * S);

    this.add.text(this.previewX, this.previewY - 20 * S, 'NEXT', {
      fontSize: scaledFont(12),
      color: '#666666',
    }).setOrigin(0.5);

    this.renderPreviewQueue();

    // Back button
    const backBtn = this.add.text(30 * S, height - 30 * S, '< BACK', {
      fontSize: scaledFont(16),
      color: '#666666',
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setStyle({ color: '#ff6b9d' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ color: '#666666' }));
    backBtn.on('pointerdown', () => this.scene.start('ChallengeSelectScene'));

    this.setupInput();
  }

  private getProgressText(): string {
    const obj = this.challenge.objective;
    switch (obj.type) {
      case 'score':
        return `${this.scoreManager.score} / ${obj.target}`;
      case 'tiles':
        return `${this.tilesCleared} / ${obj.target}`;
      case 'bombs':
        return `${this.bombsTriggered} / ${obj.target}`;
      case 'combos':
        return `Best: ${this.maxCombo}x / ${obj.target}x`;
      default:
        return '';
    }
  }

  private renderPreviewQueue(): void {
    this.previewTiles.forEach(t => t.destroy());
    this.previewTiles = [];

    const previewSize = TILE_SIZE * 0.65;
    const spacing = previewSize + 10 * S;

    for (let i = 0; i < 4; i++) {
      const tileData = this.tileQueue.peek(i);
      if (!tileData) continue;

      const y = this.previewY + i * spacing;
      const container = this.add.container(this.previewX, y);

      const scale = i === 0 ? 1 : 0.85;
      container.setScale(scale);

      const color = tileData.type === 'rainbow' ? 0xffffff : COLORS[tileData.colorIndex];
      const radius = 6 * S;

      const gfx = this.add.graphics();
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(-previewSize / 2, -previewSize / 2, previewSize, previewSize, radius);
      gfx.lineStyle(2 * S, 0xffffff, i === 0 ? 0.5 : 0.3);
      gfx.strokeRoundedRect(-previewSize / 2, -previewSize / 2, previewSize, previewSize, radius);
      container.add(gfx);

      if (tileData.type === 'bomb') {
        container.add(this.add.text(0, 0, '💣', { fontSize: scaledFont(16) }).setOrigin(0.5));
      } else if (tileData.type === 'colorBomb') {
        container.add(this.add.text(0, 0, '⭐', { fontSize: scaledFont(16) }).setOrigin(0.5));
      } else if (tileData.type === 'rainbow') {
        container.add(this.add.text(0, 0, '🌈', { fontSize: scaledFont(14) }).setOrigin(0.5));
      }

      this.previewTiles.push(container);
    }
  }

  private setupInput(): void {
    const gridHeight = GRID_ROWS * TILE_SIZE;

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

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.movesRemaining <= 0) return;

      const col = Math.floor((pointer.x - this.gridX) / TILE_SIZE);
      if (col >= 0 && col < GRID_COLS) {
        this.dropTile(col);
      }
    });
  }

  private updateColumnIndicator(col: number): void {
    const gridHeight = GRID_ROWS * TILE_SIZE;
    const x = this.gridX + col * TILE_SIZE;

    this.columnIndicator.clear();
    this.columnIndicator.fillStyle(0xffffff, 0.08);
    this.columnIndicator.fillRect(x + 2 * S, this.gridY, TILE_SIZE - 4 * S, gridHeight);

    this.columnIndicator.fillStyle(0xffd700, 0.8);
    this.columnIndicator.fillTriangle(
      x + TILE_SIZE / 2, this.gridY - 8 * S,
      x + TILE_SIZE / 2 - 8 * S, this.gridY - 18 * S,
      x + TILE_SIZE / 2 + 8 * S, this.gridY - 18 * S
    );
  }

  private dropTile(col: number): void {
    if (!this.grid.canDropInColumn(col)) return;

    const tileData = this.tileQueue.next();
    const landedRow = this.grid.dropTile(col, tileData);

    if (landedRow === -1) return;

    // Use move
    this.movesRemaining--;
    this.movesText.setText(`${this.movesRemaining}`);

    // Flash moves if low
    if (this.movesRemaining <= 2) {
      this.movesText.setStyle({ color: '#ff4444' });
      this.tweens.add({
        targets: this.movesText,
        scale: 1.2,
        yoyo: true,
        duration: 100,
      });
    }

    const tile = new Tile(this, col, 0, tileData.colorIndex, tileData.type, this.gridX, this.gridY);
    this.tiles.set(`${col},${landedRow}`, tile);

    tile.animateDrop(landedRow, this.gridY, () => {
      this.resolveCascades();
    });

    this.renderPreviewQueue();
  }

  private resolveCascades(): void {
    const result = this.grid.resolveCascades(MIN_MATCH_SIZE);

    if (result.chains.length === 0) {
      this.scoreManager.endTurn();
      this.checkChallengeStatus();
      return;
    }

    this.animateChains(result.chains, 0);
  }

  private animateChains(
    chains: Array<{ cleared: Array<{ col: number; row: number }>; fallen: Array<{ col: number; fromRow: number; toRow: number }> }>,
    index: number
  ): void {
    if (index >= chains.length) {
      this.scoreManager.endTurn();
      this.checkChallengeStatus();
      return;
    }

    const chain = chains[index];
    this.scoreManager.addChain(chain.cleared.length);
    this.tilesCleared += chain.cleared.length;

    // Track max combo
    if (this.scoreManager.multiplier > this.maxCombo) {
      this.maxCombo = this.scoreManager.multiplier;
    }

    // Track bombs
    chain.cleared.forEach(({ col, row }) => {
      const key = `${col},${row}`;
      const tile = this.tiles.get(key);
      if (tile) {
        if (tile.tileType === 'bomb') this.bombsTriggered++;
      }
    });

    // Update progress display
    this.progressText.setText(this.getProgressText());

    // Animate clears
    let clearedCount = 0;
    chain.cleared.forEach(({ col, row }) => {
      const key = `${col},${row}`;
      const tile = this.tiles.get(key);
      if (tile) {
        tile.animateClear(() => {
          clearedCount++;
          if (clearedCount === chain.cleared.length) {
            this.updateFallenTiles(chain.fallen);
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

  private checkChallengeStatus(): void {
    const obj = this.challenge.objective;
    let objectiveMet = false;

    switch (obj.type) {
      case 'score':
        objectiveMet = this.scoreManager.score >= obj.target;
        break;
      case 'tiles':
        objectiveMet = this.tilesCleared >= obj.target;
        break;
      case 'bombs':
        objectiveMet = this.bombsTriggered >= obj.target;
        break;
      case 'combos':
        objectiveMet = this.maxCombo >= obj.target;
        break;
    }

    if (objectiveMet) {
      this.showChallengeComplete();
    } else if (this.movesRemaining <= 0) {
      this.showChallengeFailed();
    }
  }

  private calculateStars(): number {
    const obj = this.challenge.objective;
    let efficiency = 0;

    switch (obj.type) {
      case 'score':
        efficiency = this.scoreManager.score / obj.target;
        break;
      case 'tiles':
        efficiency = this.tilesCleared / obj.target;
        break;
      case 'bombs':
        efficiency = this.bombsTriggered / obj.target;
        break;
      case 'combos':
        efficiency = this.maxCombo / obj.target;
        break;
    }

    // Stars based on how many moves were left
    const movesEfficiency = this.movesRemaining / this.challenge.moves;

    if (movesEfficiency >= 0.4) return 3;
    if (movesEfficiency >= 0.2) return 2;
    return 1;
  }

  private showChallengeComplete(): void {
    const { width, height } = this.cameras.main;
    const stars = this.calculateStars();

    // Save progress
    this.storage.completeChallenge(this.challenge.id, stars);

    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(-160 * S, -120 * S, 320 * S, 240 * S, 20 * S);
    bg.lineStyle(4 * S, 0x7fff00, 1);
    bg.strokeRoundedRect(-160 * S, -120 * S, 320 * S, 240 * S, 20 * S);
    container.add(bg);

    // Title
    container.add(this.add.text(0, -80 * S, 'COMPLETE!', {
      fontSize: scaledFont(36),
      color: '#7fff00',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // Stars
    const starY = -20 * S;
    for (let i = 0; i < 3; i++) {
      const starX = (i - 1) * 50 * S;
      const filled = i < stars;
      container.add(this.add.text(starX, starY, filled ? '★' : '☆', {
        fontSize: scaledFont(40),
        color: filled ? '#ffd700' : '#444444',
      }).setOrigin(0.5));
    }

    // Buttons
    this.createCompleteButton(container, 0, 50 * S, 'NEXT', () => {
      const nextChallenge = CHALLENGES.find(c => c.id === this.challenge.id + 1);
      if (nextChallenge) {
        this.scene.restart({ challengeId: nextChallenge.id });
      } else {
        this.scene.start('ChallengeSelectScene');
      }
    });

    this.createCompleteButton(container, 0, 100 * S, 'SELECT', () => {
      this.scene.start('ChallengeSelectScene');
    });

    // Entrance animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private showChallengeFailed(): void {
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, height / 2);
    container.setDepth(100);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x16213e, 0.95);
    bg.fillRoundedRect(-160 * S, -100 * S, 320 * S, 200 * S, 20 * S);
    bg.lineStyle(4 * S, 0xff6b9d, 1);
    bg.strokeRoundedRect(-160 * S, -100 * S, 320 * S, 200 * S, 20 * S);
    container.add(bg);

    // Title
    container.add(this.add.text(0, -60 * S, 'OUT OF MOVES', {
      fontSize: scaledFont(28),
      color: '#ff6b9d',
      fontStyle: 'bold',
    }).setOrigin(0.5));

    // Progress
    container.add(this.add.text(0, -10 * S, this.getProgressText(), {
      fontSize: scaledFont(18),
      color: '#ffffff',
    }).setOrigin(0.5));

    // Buttons
    this.createCompleteButton(container, 0, 40 * S, 'RETRY', () => {
      this.scene.restart({ challengeId: this.challenge.id });
    });

    this.createCompleteButton(container, 0, 90 * S, 'SELECT', () => {
      this.scene.start('ChallengeSelectScene');
    });

    // Entrance animation
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private createCompleteButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): void {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x0f3460, 1);
    btnBg.fillRoundedRect(x - 80 * S, y - 18 * S, 160 * S, 36 * S, 8 * S);
    container.add(btnBg);

    const btn = this.add.text(x, y, label, {
      fontSize: scaledFont(18),
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    container.add(btn);

    btn.on('pointerover', () => btn.setStyle({ color: '#ffd700' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', onClick);
  }
}

// Export challenges for use in select scene
export { CHALLENGES };
export type { Challenge };

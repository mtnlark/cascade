import { POINTS_PER_TILE } from '../config';

export class ScoreManager {
  private _score: number = 0;
  private _multiplier: number = 1;
  private _turnTilesCleared: number = 0;

  // Session statistics
  private _totalTilesCleared: number = 0;
  private _longestChain: number = 0;
  private _maxMultiplier: number = 1;
  private _specialTilesUsed: number = 0;
  private _startTime: number = Date.now();

  get score(): number {
    return this._score;
  }

  get multiplier(): number {
    return this._multiplier;
  }

  get turnTilesCleared(): number {
    return this._turnTilesCleared;
  }

  // Session stats getters
  get totalTilesCleared(): number {
    return this._totalTilesCleared;
  }

  get longestChain(): number {
    return this._longestChain;
  }

  get maxMultiplier(): number {
    return this._maxMultiplier;
  }

  get specialTilesUsed(): number {
    return this._specialTilesUsed;
  }

  get timePlayedMs(): number {
    return Date.now() - this._startTime;
  }

  addChain(tilesCleared: number): number {
    const points = tilesCleared * POINTS_PER_TILE * this._multiplier;
    this._score += points;
    this._turnTilesCleared += tilesCleared;
    this._totalTilesCleared += tilesCleared;

    // Track longest chain
    if (tilesCleared > this._longestChain) {
      this._longestChain = tilesCleared;
    }

    this._multiplier++;

    // Track max multiplier
    if (this._multiplier > this._maxMultiplier) {
      this._maxMultiplier = this._multiplier;
    }

    return points;
  }

  recordSpecialTile(): void {
    this._specialTilesUsed++;
  }

  /**
   * Add bonus points (e.g., from completed daily goals).
   * Does not affect multiplier or tile counts.
   */
  addBonus(points: number): void {
    this._score += points;
  }

  endTurn(): void {
    this._multiplier = 1;
    this._turnTilesCleared = 0;
  }

  reset(): void {
    this._score = 0;
    this._multiplier = 1;
    this._turnTilesCleared = 0;
    this._totalTilesCleared = 0;
    this._longestChain = 0;
    this._maxMultiplier = 1;
    this._specialTilesUsed = 0;
    this._startTime = Date.now();
  }

  getSessionStats() {
    return {
      score: this._score,
      totalTilesCleared: this._totalTilesCleared,
      longestChain: this._longestChain,
      maxMultiplier: this._maxMultiplier,
      specialTilesUsed: this._specialTilesUsed,
      timePlayedMs: this.timePlayedMs,
    };
  }
}

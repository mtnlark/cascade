import { POINTS_PER_TILE } from '../config';

export class ScoreManager {
  private _score: number = 0;
  private _multiplier: number = 1;

  get score(): number {
    return this._score;
  }

  get multiplier(): number {
    return this._multiplier;
  }

  addChain(tilesCleared: number): number {
    const points = tilesCleared * POINTS_PER_TILE * this._multiplier;
    this._score += points;
    this._multiplier++;
    return points;
  }

  endTurn(): void {
    this._multiplier = 1;
  }

  reset(): void {
    this._score = 0;
    this._multiplier = 1;
  }
}

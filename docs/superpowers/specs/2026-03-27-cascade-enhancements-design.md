# Cascade Enhancements Design

## Goal

Make the core gameplay more engaging by adding strategic depth, more frequent cascades, and special tiles.

## Changes

### 1. Lower Match Size (4 → 3)

Reduce minimum match size from 4 to 3 connected tiles. This creates more frequent matches and cascade opportunities.

**Implementation:** Change `MIN_MATCH_SIZE` in `config.ts` from 4 to 3.

### 2. Tile Preview Queue

Display the next 3 upcoming tiles on the right side of the grid.

**Layout:**
- Vertical stack to the right of the grid
- Shows 3 tiles, top-to-bottom = next, next+1, next+2
- Each preview tile is smaller than grid tiles (roughly 70% size)

**Implementation:**
- Add `TileQueue` class that manages upcoming tiles
- Generate tiles ahead of time instead of on-demand
- Render preview in `GameScene`

### 3. Special Tiles

Three special tile types appear randomly in the queue (~15% combined chance).

#### Rainbow (Wildcard)
- **Appearance:** Multi-colored gradient or rainbow pattern
- **Behavior:** During match detection, counts as matching ANY adjacent tile's color
- **Clearing:** Cleared normally as part of the match

#### Bomb
- **Appearance:** Tile with bomb icon overlay
- **Behavior:** When cleared as part of a match, also clears all tiles in a 3x3 area centered on the bomb
- **Timing:** Bomb effect triggers after match clears, before gravity
- **Scoring:** All tiles cleared by bomb count toward score with current chain multiplier

#### Color Bomb
- **Appearance:** Tile with star/sparkle icon overlay
- **Behavior:** When cleared as part of a match, also clears ALL tiles of the matched color from the entire board
- **Timing:** Effect triggers after match clears, before gravity
- **Scoring:** All tiles cleared count toward score with current chain multiplier

### Spawn Rates

- Regular tiles: 85%
- Rainbow: 5%
- Bomb: 5%
- Color Bomb: 5%

### Edge Cases

- **Rainbow in a match:** Rainbow takes the color of the group it joins. If a color bomb is in that group, the color bomb clears that color.
- **Bomb hits another bomb:** Chain reaction - second bomb also triggers its 3x3 clear.
- **Color bomb clears another color bomb:** No chain - color bombs only trigger when cleared as part of a match, not by another effect.
- **Multiple special tiles in one match:** All effects trigger. Process order: bombs first (by position), then color bombs.

## Architecture

### New Files
- `src/game/TileQueue.ts` - Manages upcoming tile generation and preview
- `src/game/SpecialTile.ts` - Types and logic for special tile effects

### Modified Files
- `src/config.ts` - Add special tile spawn rates, change MIN_MATCH_SIZE
- `src/game/Grid.ts` - Handle rainbow matching, bomb/color-bomb clearing
- `src/game/Tile.ts` - Visual rendering for special tile types
- `src/scenes/GameScene.ts` - Integrate preview queue, pull from queue instead of random generation

### Data Model

```typescript
type TileType = 'normal' | 'rainbow' | 'bomb' | 'color-bomb';

interface TileData {
  colorIndex: number | null;  // null for rainbow
  type: TileType;
}
```

## Testing

- Unit tests for rainbow matching logic
- Unit tests for bomb area clearing
- Unit tests for color bomb clearing
- Unit tests for tile queue generation and spawn rates
- Integration test for special tile cascades

## Visual Design

Special tiles use the same base shape as normal tiles but with:
- **Rainbow:** Animated gradient fill cycling through all colors
- **Bomb:** Dark tile with bomb icon (simple circle with fuse)
- **Color Bomb:** Colored tile with star icon overlay

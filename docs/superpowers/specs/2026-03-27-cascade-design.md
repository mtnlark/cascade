# Cascade — Game Design Specification

A relaxing, retro-styled falling-block puzzle game focused on chain reactions and mastery.

## Overview

**Genre:** Puzzle / Falling-block
**Platform:** Web browser (desktop + mobile)
**Session length:** 2-10 minutes
**Target experience:** Relaxing, mastery-focused, no time pressure

## Core Mechanics

### Grid
- 6 columns × 12 rows
- Tiles stack from the bottom up

### Tiles
- Simple colored squares
- Starting colors: 4 (scales up with difficulty)
- Color palette: bold, saturated retro colors (electric blue, hot pink, lime green, sunny yellow, bright orange)

### Gameplay Loop
1. Player sees the **next tile** (single colored square) waiting to drop
2. Player chooses which **column** to drop it into (click/tap or arrow keys)
3. Tile falls to the lowest available position in that column
4. **Cascade rule:** When 4+ tiles of the same color form a connected group (orthogonally adjacent, flood-fill style — not line-based), they clear and tiles above fall down
5. Falling tiles may trigger additional cascades (chain reactions)
6. Repeat until game over

### No Time Pressure
- The next tile waits indefinitely
- Player can think as long as they want between moves

### Undo
- Player can undo their last move freely
- Reduces frustration while preserving mastery incentive (planning > undoing)

### Game Over
- Occurs when any column is full and the next tile cannot be placed
- Gentle presentation, not punishing

## Scoring & Progression

### Scoring System
- **Base points:** 10 points per tile cleared
- **Cascade multiplier:** Each chain in a cascade multiplies points
  - 1st chain: 1x
  - 2nd chain: 2x
  - 3rd chain: 3x
  - And so on...
- Rewards planning multi-step chain reactions (core mastery skill)

### Game Modes

#### Endless Mode (Default)
- Play until game over
- Chase high score
- Difficulty scales: every N points, add another color (5th, then 6th)
- More colors = harder to form groups = requires more planning

#### Daily Puzzle
- Same seed for everyone each day
- Compare scores (local, or future: leaderboard)
- Wordle-style daily engagement

#### Practice Mode
- No game over condition
- Experiment and learn patterns freely
- Good for beginners

### Progression Philosophy
- **No grinding:** Progress is purely skill-based
- No unlocks, currencies, or upgrades that make the game easier
- Player improvement *is* the progression

## Visual Design

### Aesthetic
Retro-playful — chunky pixels, bold colors, 80s/90s arcade nostalgia. Fun without being childish.

### Color Palette
- **Background:** Deep blue or purple (classic arcade cabinet feel)
- **Tiles:** Bold, saturated colors with pixel-art style and slight 3D bevel
  - Electric blue
  - Hot pink
  - Lime green
  - Sunny yellow
  - Bright orange
- **UI:** Pixel/bitmap font for arcade feel

### Layout
```
┌─────────────────────────────────┐
│  ★ CASCADE ★       ▸ 1,240 pts │
├─────────────────────────────────┤
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░    ╔═══════════════╗    ░░░ │
│ ░░    ║               ║  NEXT  │
│ ░░    ║               ║  ╔═══╗ │
│ ░░    ║    6 × 12     ║  ║ ▓ ║ │
│ ░░    ║     Grid      ║  ╚═══╝ │
│ ░░    ║               ║        │
│ ░░    ║               ║  BEST  │
│ ░░    ║  ▓ ▓          ║  2,450 │
│ ░░    ║  ▓ █ █        ║        │
│ ░░    ║  █ ▓ █ ▓      ║ [UNDO] │
│ ░░    ╚═══════════════╝    ░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────┘
```

### Animations & Feedback
- **Tile drop:** Bouncy landing animation
- **Cascade clear:** Tiles flash before clearing, particle burst effect
- **Chain counter:** "2x!", "3x!", "MEGA!" appears on screen
- **Big combos:** Brief screen shake, extra particles
- **Game over:** Classic arcade "GAME OVER" style, prominent final score, cheerful "TRY AGAIN?" prompt

### Optional Polish
- CRT scanline filter toggle for extra nostalgia

## Controls

### Desktop
- **Arrow keys:** ← / → to select column
- **Down arrow or Space:** Drop tile
- **Z or Ctrl+Z:** Undo
- **Click:** Click column to drop directly

### Mobile
- **Tap:** Tap column to drop
- **Swipe left:** Undo
- **Undo button:** Always visible

## Technical Architecture

### Stack
- **Phaser 3:** 2D game framework
- **TypeScript:** Type safety and better tooling
- **Vite:** Fast dev server and bundler

### Project Structure
```
cascade/
├── src/
│   ├── main.ts              # Entry point, Phaser config
│   ├── scenes/
│   │   ├── GameScene.ts     # Main gameplay
│   │   ├── MenuScene.ts     # Title screen, mode select
│   │   └── GameOverScene.ts # Results, play again prompt
│   ├── objects/
│   │   ├── Grid.ts          # Game board state and logic
│   │   └── Tile.ts          # Individual tile object
│   └── utils/
│       └── storage.ts       # High score persistence (localStorage)
├── public/
│   └── assets/              # Pixel fonts, sprites, sounds (future)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Key Classes

#### Grid
- Manages 6×12 array of tile states
- Handles tile placement, cascade detection, clearing
- Emits events for animations to respond to

#### Tile
- Phaser GameObject representing a single tile
- Handles its own drop animation, clear animation
- Color property determines sprite/tint

#### GameScene
- Main gameplay scene
- Manages input, spawns tiles, updates score
- Coordinates between Grid (logic) and Tile objects (visuals)

### Data Persistence
- **localStorage** for:
  - High scores (per mode)
  - Settings (sound toggle, CRT filter)
  - Daily puzzle completion state

### Deployment
- Build to static files via Vite
- Host on Vercel, GitHub Pages, Netlify, or any static host

## Success Criteria

A successful implementation will:
1. Be playable in a web browser on desktop and mobile
2. Provide a relaxing experience with no time pressure
3. Reward skillful play through the cascade multiplier system
4. Have a satisfying retro-arcade aesthetic
5. Support quick 2-10 minute sessions
6. Track and display high scores locally
7. Include all three game modes (Endless, Daily, Practice)

## Out of Scope (For Now)

- Online leaderboards
- Sound effects and music (can add later)
- User accounts
- Additional game modes beyond the three specified
- Mobile app versions (web-only for now)

# AI Agent Instructions for Maze Game

## Project Overview

**Maze Game** is a browser-based 2D maze game built with Phaser + TypeScript, compiled via ESBuild. Players navigate from a start position to a goal through randomly generated mazes using keyboard (cursor keys), game controller, or on-screen buttons. After reaching the goal, the game displays congratulations and generates a new random maze.

**Target platforms:** Web browser and tablets (responsive layout, touch-friendly controls)

## Tech Stack

- **Framework:** Phaser 3 (via npm, `^3.88.2`)
- **Language:** TypeScript (`^5.4.5`), strict mode
- **Bundler:** ESBuild (`^0.21.2`) — no webpack/vite
- **Dev server:** `esbuild-serve` with live reload on port 8080
- **Rendering:** WebGL/Canvas 2D
- **Input:** Keyboard, Gamepad API, touch/pointer events
- **Deployment:** Static site (GitHub Pages compatible), output to `dist/`
- **PWA:** Service worker for offline play and installability

## Code comments
* Documentation comments should be Javadoc for Java or JSDoc for Javascript/Typescript or Documentation strings for Python.
* All classes must have class level documentation comments.
* All static methods and public methods which exceed 8 lines should have documentation comments.

## Project Structure

```
game1/
├── index.html             # NOT USED — entry is public/index.html
├── public/
│   ├── index.html         # HTML shell, PWA metadata
│   ├── style.css          # Minimal body/app styling
│   ├── favicon.ico        # Favicon
│   ├── favicon.png        # PWA icon fallback
│   ├── manifest.webmanifest # PWA manifest
│   ├── sw.js              # Service worker
│   └── assets/            # Static assets (sprites, audio, icons)
│       ├── sprites/
│       └── ui/
├── src/
│   ├── main.ts            # Phaser game config & bootstrap
│   ├── scenes/
│   │   ├── BootScene.ts   # Asset loading, scene startup
│   │   └── MazeScene.ts   # Main gameplay (maze, player, goal, UI)
│   └── game/
│       ├── Player.ts      # Player sprite, movement logic
│       ├── Maze.ts        # Maze generation and rendering
│       └── InputManager.ts # Unified input handling
├── esbuild/
│   ├── dev.server.mjs     # Dev server with live reload
│   └── build.prod.mjs     # Production build → dist/
├── package.json           # Dependencies & scripts
├── tsconfig.json          # TypeScript config (strict, ES2020, bundler)
└── log.js                 # Phaser telemetry helper
```

## Build Commands

| Command | What it does |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Start dev server on `http://localhost:8080` with live reload |
| `npm run build` | Production build → `dist/` (minified, no sourcemaps) |
| `npm run dev-nolog` | Dev server without Phaser telemetry ping |
| `npm run build-nolog` | Production build without Phaser telemetry ping |
| `npm run clean` | Remove `dist/` directory |

## Scene Architecture

### BootScene (`src/scenes/BootScene.ts`)
- Loads all game assets (sprites, audio)
- Extends `Phaser.Scene` with key `'BootScene'`
- Last action in `create()` should be `this.scene.start('MazeScene')`

### MazeScene (`src/scenes/MazeScene.ts`)
- Generates random maze layout via `Maze` class
- Spawns player at start position
- Spawns goal at end position
- Handles player movement, collision detection
- Displays on-screen control buttons (for tablet)
- Shows congratulations message and triggers next maze on goal reached

## Core Game Objects

### Player (`src/game/Player.ts`)
- Inherits from `Phaser.Physics.Arcade.Sprite`
- Handles movement via physics body velocity
- Responds to input from `InputManager`
- Collides with maze walls via `scene.physics.add.collider()`
- Overlaps goal via `scene.physics.add.overlap()`

### Maze (`src/game/Maze.ts`)
- Generates random maze (recursive backtracking recommended)
- Renders walls as static physics bodies
- Provides `startPosition` and `goalPosition` getters
- Grid-based (e.g., 15×15 cells)
- Always guarantees a solvable path

### InputManager (`src/game/InputManager.ts`)
- **Keyboard:** `scene.input.keyboard.createCursorKeys()` + WASD
- **Gamepad:** Polls `navigator.getGamepads()` each frame for D-pad/analog
- **UI Buttons:** On-screen directional buttons (shown only on touch devices)
- Exports a `direction: Phaser.Math.Vector2` property
- Priority cascade: Gamepad → Keyboard → UI Buttons

## Input Handling Strategy

1. **Priority cascade:** Gamepad → Keyboard → UI Buttons (use first active)
2. **UI Buttons:** Only show on tablet (detect via `'ontouchstart' in window` or viewport < 768px)
3. **Per-frame polling:** Poll all inputs in `update()`, not event-driven
4. **Throttle:** Prevent rapid contradictory inputs via dead zone / cooldown

## Maze Generation

- **Algorithm:** Recursive backtracking (DFS) on a 2D grid
- **Cell size:** Configurable (e.g., 32px or 48px), must fit game dimensions
- **Guarantee:** Always has a valid path from start (top-left) to goal (bottom-right)
- **Performance:** Generate once in `MazeScene.create()`, store wall data for collisions

## TypeScript Conventions

- **Strict mode:** `strict: true` in tsconfig (with `strictPropertyInitialization: false` for Phaser compatibility)
- **No unused locals/params:** `noUnusedLocals: true`, `noUnusedParameters: true`
- **Module resolution:** `bundler` mode (ESBuild-native)
- **Import style:** `import { Scene } from 'phaser'` — named imports from phaser package
- **Scene classes:** Export named classes using `export class ClassName extends Scene`
- **Typing:** Define interfaces for complex data (e.g., `MazeCell`, `InputState`)

## PWA Requirements

- `manifest.webmanifest` with name, icons, `display: standalone`, `theme_color`
- `sw.js` service worker at root of `public/`
- Register service worker in `src/main.ts`
- Cache app shell and core assets for offline play
- Icons at 192×192 and 512×512 in `public/assets/`

## Key Conventions

1. **Scene naming:** Always use `*Scene` suffix (e.g., `BootScene`, `MazeScene`)
2. **Scene keys:** Match the class name exactly as a string (e.g., `super('BootScene')`)
3. **Game objects:** PascalCase class names in `src/game/` (e.g., `Player`, `Maze`, `InputManager`)
4. **Asset naming:** kebab-case (`player-sprite.png`, `wall-tile.png`)
5. **Physics:** Moving entities need `setCollideWorldBounds(true)` if bounded by world
6. **Responsive:** Game scales via `Phaser.Scale.FIT` + `CENTER_BOTH`
7. **File size:** Keep scene/game files under 200 lines; extract utilities as needed

## Common Pitfalls to Avoid

- **Physics misconfiguration:** Arcade physics body must be enabled, gravity set, and collider added
- **Asset loading:** Never rely on assets in MazeScene; always pre-load in BootScene
- **Input conflicts:** Use `InputManager` as single source of truth, not ad-hoc listeners
- **Maze collisions:** Static physics bodies for walls need `refreshBody()` after creation
- **Touch targets:** On-screen buttons must be 48px+ (WCAG minimum)
- **Service worker:** Update cache manifest when adding new assets
- **ESBuild copy plugin:** New static assets in `public/` must be listed in `build.prod.mjs` copy config
- **Scene key typos:** Mismatched scene key strings = silent failures in Phaser

## Helpful Phaser APIs

- `Phaser.Scale.FIT` / `CENTER_BOTH` — Responsive scaling
- `Phaser.Physics.Arcade.Sprite` — Player base class
- `scene.physics.add.staticGroup()` — Wall collision bodies
- `scene.physics.add.collider()` — Wall collision
- `scene.physics.add.overlap()` — Goal detection (no physical response)
- `scene.input.keyboard.createCursorKeys()` — Arrow keys
- `navigator.getGamepads()` — Gamepad API
- `scene.add.zone()` — Invisible trigger zones for goal area

---

**Last updated:** 2026-07-20

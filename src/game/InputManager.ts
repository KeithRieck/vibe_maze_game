import { Math as PhaserMath } from 'phaser';

/** Analog stick dead‑zone threshold (0.0 – 1.0). */
const DEAD_ZONE = 0.2;

/**
 * Unified input manager.
 *
 * Polls three input sources every frame with a priority cascade:
 *
 * 1. **Gamepad** — D‑pad buttons 12‑15 and left analog stick.
 * 2. **Keyboard** — Cursor keys and WASD.
 * 3. **UI Buttons** — On‑screen directional arrows (touch / small viewport).
 *
 * Only the highest‑priority active source contributes to the returned
 * direction vector each frame.
 */
export class InputManager {

    /** Owning Phaser scene. */
    private scene: Phaser.Scene;
    /** Cached cursor‑key object. */
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    /** WASD key references. */
    private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    /** Reusable direction vector (allocated once). */
    private direction: PhaserMath.Vector2;
    /** Whether UI buttons are active (touch device or narrow viewport). */
    private uiButtons: boolean = false;
    /** Current pressed state of each on‑screen button. */
    private buttonStates: { up: boolean; down: boolean; left: boolean; right: boolean } = {
        up: false, down: false, left: false, right: false,
    };

    /**
     * Creates the input manager and wires up all input sources.
     *
     * On‑screen buttons are only created when a touch interface is
     * detected or the viewport is narrower than 768 px.
     *
     * @param scene - The owning Phaser scene.
     */
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.direction = new PhaserMath.Vector2(0, 0);

        // Keyboard: cursor keys
        this.cursors = scene.input.keyboard!.createCursorKeys();

        // Keyboard: WASD
        this.wasd = {
            W: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        };

        // UI Buttons for tablet
        this.uiButtons = 'ontouchstart' in window || window.innerWidth < 768;
        if (this.uiButtons) {
            this.createUIButtons();
        }
    }

    /**
     * Returns the current movement direction vector.
     *
     * Polls inputs in priority order (gamepad → keyboard → UI buttons)
     * and returns the first non‑zero result.  The same Vector2 instance
     * is reused each frame; callers should not cache or mutate it.
     *
     * @returns A normalised (or near‑normalised) direction vector.
     */
    getDirection(): PhaserMath.Vector2 {
        this.direction.set(0, 0);

        // Priority 1: Gamepad
        const gamepadDir = this.getGamepadDirection();
        if (gamepadDir.x !== 0 || gamepadDir.y !== 0) {
            this.direction.copy(gamepadDir);
            return this.direction;
        }

        // Priority 2: Keyboard (cursors + WASD)
        const left = this.cursors.left?.isDown || this.wasd.A.isDown;
        const right = this.cursors.right?.isDown || this.wasd.D.isDown;
        const up = this.cursors.up?.isDown || this.wasd.W.isDown;
        const down = this.cursors.down?.isDown || this.wasd.S.isDown;

        if (left || right || up || down) {
            this.direction.x = (right ? 1 : 0) - (left ? 1 : 0);
            this.direction.y = (down ? 1 : 0) - (up ? 1 : 0);
            return this.direction;
        }

        // Priority 3: UI Buttons (tablet)
        if (this.uiButtons) {
            this.direction.x = (this.buttonStates.right ? 1 : 0) - (this.buttonStates.left ? 1 : 0);
            this.direction.y = (this.buttonStates.down ? 1 : 0) - (this.buttonStates.up ? 1 : 0);
        }

        return this.direction;
    }

    /**
     * Polls all connected gamepads for direction input.
     *
     * Reads D‑pad buttons (indices 12‑15) first, then falls back to the
     * left analog stick (axes 0‑1) with a dead zone of {@link DEAD_ZONE}.
     *
     * @returns A new Vector2 with the gamepad direction, or (0, 0).
     */
    private getGamepadDirection(): PhaserMath.Vector2 {
        const tmp = new PhaserMath.Vector2(0, 0);

        try {
            const gamepads = navigator.getGamepads();
            for (const gp of gamepads) {
                if (!gp) continue;

                // D-pad
                if (gp.buttons[12]) tmp.y = -1; // up
                if (gp.buttons[13]) tmp.y = 1;  // down
                if (gp.buttons[14]) tmp.x = -1; // left
                if (gp.buttons[15]) tmp.x = 1;  // right

                // Left analog stick
                if (tmp.x === 0 && tmp.y === 0 && gp.axes.length >= 2) {
                    const ax = gp.axes[0];
                    const ay = gp.axes[1];
                    if (Math.abs(ax) > DEAD_ZONE) tmp.x = ax;
                    if (Math.abs(ay) > DEAD_ZONE) tmp.y = ay;
                }
            }
        } catch {
            // Gamepad API not available or blocked
        }

        return tmp;
    }

    /**
     * Creates on‑screen directional buttons for touch / small viewports.
     *
     * Renders four arrow characters (▲ ▼ ◀ ▶) in a diamond layout near
     * the bottom of the screen.  Each button updates
     * {@link buttonStates} on `pointerdown` / `pointerup` / `pointerout`.
     */
    private createUIButtons(): void {
        const size = 64;
        const margin = 16;
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;

        const buttonStyle = {
            fontSize: '28px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            backgroundColor: '#2d6a4f',
            padding: { x: 0, y: 0 },
        };

        // Up
        this.scene.add.text(w / 2, h - margin - size * 2.5, '▲', buttonStyle)
            .setOrigin(0.5)
            .setPadding(12, 8, 12, 8)
            .setInteractive()
            .setDepth(50)
            .on('pointerdown', () => { this.buttonStates.up = true; })
            .on('pointerup', () => { this.buttonStates.up = false; })
            .on('pointerout', () => { this.buttonStates.up = false; });

        // Down
        this.scene.add.text(w / 2, h - margin - size * 0.5, '▼', buttonStyle)
            .setOrigin(0.5)
            .setPadding(12, 8, 12, 8)
            .setInteractive()
            .setDepth(50)
            .on('pointerdown', () => { this.buttonStates.down = true; })
            .on('pointerup', () => { this.buttonStates.down = false; })
            .on('pointerout', () => { this.buttonStates.down = false; });

        // Left
        this.scene.add.text(w / 2 - size, h - margin - size * 1.5, '◀', buttonStyle)
            .setOrigin(0.5)
            .setPadding(12, 8, 12, 8)
            .setInteractive()
            .setDepth(50)
            .on('pointerdown', () => { this.buttonStates.left = true; })
            .on('pointerup', () => { this.buttonStates.left = false; })
            .on('pointerout', () => { this.buttonStates.left = false; });

        // Right
        this.scene.add.text(w / 2 + size, h - margin - size * 1.5, '▶', buttonStyle)
            .setOrigin(0.5)
            .setPadding(12, 8, 12, 8)
            .setInteractive()
            .setDepth(50)
            .on('pointerdown', () => { this.buttonStates.right = true; })
            .on('pointerup', () => { this.buttonStates.right = false; })
            .on('pointerout', () => { this.buttonStates.right = false; });
    }
}

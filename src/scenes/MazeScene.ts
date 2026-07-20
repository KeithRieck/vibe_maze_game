import { Scene } from 'phaser';
import { Maze } from '../game/Maze';
import { Player } from '../game/Player';
import { InputManager } from '../game/InputManager';

/**
 * Main gameplay scene.
 *
 * Generates a random maze, spawns the player, handles collision with walls
 * and overlap with the goal zone, and manages on-screen congratulations
 * before restarting with a new maze.
 */
export class MazeScene extends Scene {

    /** Procedurally generated maze. */
    private maze!: Maze;
    /** Player-controlled sprite. */
    private player!: Player;
    /** Unified input layer (gamepad / keyboard / touch). */
    private inputManager!: InputManager;
    /** Guards against multiple goal triggers per maze run. */
    private goalReached: boolean = false;

    constructor() {
        super('MazeScene');
    }

    /**
     * Phaser create lifecycle.
     *
     * Generates the maze, places the player at the start cell, sets up
     * physics colliders / overlap, creates the goal marker, initialises
     * the input manager, and prepares the hidden congratulations text.
     */
    create(): void {
        this.goalReached = false;

        // Generate maze
        const gridCols = 15;
        const gridRows = 11;
        const cellSize = 48;
        this.maze = new Maze(this, gridCols, gridRows, cellSize);
        this.maze.generate();

        // Place player at start
        const startPos = this.maze.getStartPosition();
        this.player = new Player(this, startPos.x, startPos.y);

        // Player collides with maze walls
        this.physics.add.collider(this.player, this.maze.getWallGroup());

        // Goal zone — invisible overlap trigger with visual marker
        const goalPos = this.maze.getGoalPosition();
        const goalZone = this.add.zone(goalPos.x, goalPos.y, cellSize, cellSize);
        this.physics.add.existing(goalZone, false);

        // Visual goal marker
        const goalMarker = this.add.rectangle(
            goalPos.x, goalPos.y, cellSize * 0.7, cellSize * 0.7, 0xffcc00, 0.6
        );
        goalMarker.setDepth(0);
        this.physics.add.overlap(this.player, goalZone, () => {
            this.onGoalReached();
        });

        // Input manager
        this.inputManager = new InputManager(this);

        // Congratulations text (hidden initially)
        const congrats = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            '🎉 Congratulations! 🎉\nNext maze loading...',
            {
                fontSize: '28px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffcc00',
                align: 'center',
                backgroundColor: '#1a1a2ecc',
                padding: { x: 24, y: 16 },
            }
        );
        congrats.setOrigin(0.5);
        congrats.setDepth(100);
        congrats.setVisible(false);

        this.data.set('congratsText', congrats);
    }

    /**
     * Phaser update loop — called every frame.
     *
     * Polls the input manager and applies the resulting direction vector
     * to the player sprite.  Early-returns when the goal has been reached
     * so the player cannot keep moving during the congratulations pause.
     */
    update(): void {
        if (this.goalReached) return;

        const direction = this.inputManager.getDirection();
        this.player.move(direction);
    }

    /**
     * Called when the player overlaps the goal zone.
     *
     * Stops movement, shows the congratulations overlay, and after a
     * 2‑second delay restarts the scene to generate a fresh maze.
     */
    private onGoalReached(): void {
        if (this.goalReached) return;
        this.goalReached = true;
        this.player.stopMoving();

        const congrats = this.data.get('congratsText') as Phaser.GameObjects.Text;
        congrats.setVisible(true);

        this.time.delayedCall(2000, () => {
            this.scene.restart();
        });
    }
}

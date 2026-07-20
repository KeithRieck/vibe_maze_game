import { Scene } from 'phaser';

/**
 * Boot / preloader scene.
 *
 * Responsible for loading all external game assets (sprites, audio, UI
 * textures) before handing control to {@link MazeScene}.  Currently assets
 * are generated procedurally; uncomment the `preload` calls when real
 * sprite files are added to `public/assets/`.
 */
export class BootScene extends Scene {

    constructor() {
        super('BootScene');
    }

    /**
     * Phaser preload lifecycle — queue assets for download.
     *
     * Uncomment individual `this.load.image(...)` lines as real asset
     * files become available.
     */
    preload(): void {
        // Load all game assets here
        // this.load.image('player', 'assets/sprites/player.png');
        // this.load.image('wall', 'assets/sprites/wall.png');
        // this.load.image('goal', 'assets/sprites/goal.png');
        // this.load.image('arrow-up', 'assets/ui/arrow-up.png');
        // this.load.image('arrow-down', 'assets/ui/arrow-down.png');
        // this.load.image('arrow-left', 'assets/ui/arrow-left.png');
        // this.load.image('arrow-right', 'assets/ui/arrow-right.png');
    }

    /**
     * Phaser create lifecycle — all assets are loaded; transition to
     * the main gameplay scene.
     */
    create(): void {
        this.scene.start('MazeScene');
    }
}

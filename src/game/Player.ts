/** Movement speed in pixels per second. */
const PLAYER_SPEED = 160;

/**
 * Player-controlled sprite.
 *
 * Represented as a green circle with arcade-physics collision.  The
 * texture is generated procedurally so no external asset is required.
 * Movement is driven by a normalised direction vector multiplied by
 * {@link PLAYER_SPEED}.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {

    /**
     * Creates the player sprite.
     *
     * Generates a circular `'player'` texture if one doesn't already
     * exist in the texture manager, then adds the sprite to the scene
     * and enables arcade physics with a circular body.
     *
     * @param scene - The owning Phaser scene.
     * @param x     - Initial world X position.
     * @param y     - Initial world Y position.
     */
    constructor(scene: Phaser.Scene, x: number, y: number) {
        // Generate a simple circle texture if it doesn't exist
        if (!scene.textures.exists('player')) {
            const gfx = scene.add.graphics();
            gfx.fillStyle(0x00ff88, 1);
            gfx.fillCircle(16, 16, 16);
            gfx.generateTexture('player', 32, 32);
            gfx.destroy();
        }

        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCircle(16, 0, 0);
    }

    /**
     * Applies velocity from a normalised direction vector.
     *
     * @param direction - A Vector2 where each axis is clamped to [-1, 1].
     */
    move(direction: Phaser.Math.Vector2): void {
        const vx = direction.x * PLAYER_SPEED;
        const vy = direction.y * PLAYER_SPEED;
        this.setVelocity(vx, vy);
    }

    /**
     * Stops the player by zeroing out velocity on both axes.
     */
    stopMoving(): void {
        this.setVelocity(0, 0);
    }
}

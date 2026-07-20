/**
 * Maze Game — application entry point.
 *
 * Bootstraps the Phaser game instance with arcade physics, responsive scaling,
 * and the BootScene/MazeScene pipeline. Registers the PWA service worker for
 * offline caching and installability.
 *
 * @module main
 */

import { BootScene } from './scenes/BootScene';
import { MazeScene } from './scenes/MazeScene';
import { Game, Types } from 'phaser';

/** Phaser game configuration. */
const config: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
        },
    },
    scene: [
        BootScene,
        MazeScene,
    ],
};

const game = new Game(config);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service Worker registration failed:', err);
    });
}

export default game;

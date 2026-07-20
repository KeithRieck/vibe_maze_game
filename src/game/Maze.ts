/** Represents a single cell in the maze grid. */
export interface MazeCell {
    /** Column index. */
    x: number;
    /** Row index. */
    y: number;
    /** Whether this cell has been visited during generation. */
    visited: boolean;
    /** Wall flags — `true` means the wall is present. */
    walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}

/**
 * Random maze generator and renderer.
 *
 * Uses recursive backtracking (DFS) to carve a perfect maze on a
 * {@link cols}×{@link rows} grid.  Walls are rendered as coloured
 * rectangles backed by arcade static physics bodies so the player
 * collides with them.
 *
 * The maze is always solvable: the start is the top‑left cell and the
 * goal is the bottom‑right cell.
 */
export class Maze {

    /** Owning Phaser scene. */
    private scene: Phaser.Scene;
    /** Number of grid columns. */
    private cols: number;
    /** Number of grid rows. */
    private rows: number;
    /** Pixel size of each grid cell (square). */
    private cellSize: number;
    /** 2‑D cell grid. */
    private grid: MazeCell[][];
    /** Static physics group containing all wall rectangles. */
    private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
    /** Horizontal pixel offset to centre the maze in the viewport. */
    private xOffset: number = 0;
    /** Vertical pixel offset to centre the maze in the viewport. */
    private yOffset: number = 0;

    /**
     * Creates a new maze generator.
     *
     * Offsets are calculated automatically to centre the maze within the
     * current scene dimensions.
     *
     * @param scene    - The owning Phaser scene.
     * @param cols     - Number of horizontal cells.
     * @param rows     - Number of vertical cells.
     * @param cellSize - Pixel size of each square cell.
     */
    constructor(scene: Phaser.Scene, cols: number, rows: number, cellSize: number) {
        this.scene = scene;
        this.cols = cols;
        this.rows = rows;
        this.cellSize = cellSize;
        this.grid = [];

        // Center the maze in the game world
        const mazeWidth = cols * cellSize;
        const mazeHeight = rows * cellSize;
        this.xOffset = (scene.scale.width - mazeWidth) / 2;
        this.yOffset = (scene.scale.height - mazeHeight) / 2;
    }

    /**
     * Generates a new random maze.
     *
     * Initialises the grid, runs the recursive-backtracking algorithm
     * starting from the top‑left cell, then draws all remaining walls
     * as static physics bodies.
     */
    generate(): void {
        this.wallGroup = this.scene.physics.add.staticGroup();

        // Initialize grid
        this.grid = [];
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = {
                    x, y,
                    visited: false,
                    walls: { top: true, right: true, bottom: true, left: true },
                };
            }
        }

        // Recursive backtracking to carve paths
        this.carve(0, 0);

        // Draw walls
        this.drawWalls();
    }

    /**
     * Recursive backtracking (DFS) maze carver.
     *
     * Visits unvisited neighbours in random order, removing the shared
     * wall between the current cell and the neighbour.
     *
     * @param x - Column of the cell to carve from.
     * @param y - Row of the cell to carve from.
     */
    private carve(x: number, y: number): void {
        const cell = this.grid[y][x];
        cell.visited = true;

        const directions = this.shuffle([
            { dx: 0, dy: -1, wall: 'top' as const, opposite: 'bottom' as const },
            { dx: 1, dy: 0, wall: 'right' as const, opposite: 'left' as const },
            { dx: 0, dy: 1, wall: 'bottom' as const, opposite: 'top' as const },
            { dx: -1, dy: 0, wall: 'left' as const, opposite: 'right' as const },
        ]);

        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;

            if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && !this.grid[ny][nx].visited) {
                // Remove walls between current cell and neighbor
                cell.walls[dir.wall] = false;
                this.grid[ny][nx].walls[dir.opposite] = false;
                this.carve(nx, ny);
            }
        }
    }

    /**
     * Renders remaining walls as static physics rectangles.
     *
     * Iterates every cell and, for each wall that still exists, creates a
     * coloured `Rectangle` game object and adds it to {@link wallGroup}.
     * After all walls are created the group is refreshed so physics bodies
     * are recalculated.
     */
    private drawWalls(): void {
        const wallThickness = 4;

        // Helper to add a wall rectangle to the static group
        const addWall = (cx: number, cy: number, cw: number, ch: number): void => {
            const wall = this.scene.add.rectangle(cx, cy, cw, ch, 0x2d6a4f);
            this.wallGroup.add(wall);
        };

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                const px = this.xOffset + x * this.cellSize;
                const py = this.yOffset + y * this.cellSize;

                if (cell.walls.top) {
                    addWall(px + this.cellSize / 2, py + wallThickness / 2, this.cellSize, wallThickness);
                }
                if (cell.walls.right) {
                    addWall(px + this.cellSize - wallThickness / 2, py + this.cellSize / 2, wallThickness, this.cellSize);
                }
                if (cell.walls.bottom) {
                    addWall(px + this.cellSize / 2, py + this.cellSize - wallThickness / 2, this.cellSize, wallThickness);
                }
                if (cell.walls.left) {
                    addWall(px + wallThickness / 2, py + this.cellSize / 2, wallThickness, this.cellSize);
                }
            }
        }

        // Refresh static group physics bodies after adding all walls
        this.wallGroup.refresh();

        // Set world bounds to maze boundaries
        this.scene.physics.world.setBounds(
            this.xOffset,
            this.yOffset,
            this.cols * this.cellSize,
            this.rows * this.cellSize
        );
    }

    getStartPosition(): { x: number; y: number } {
        return {
            x: this.xOffset + this.cellSize / 2,
            y: this.yOffset + this.cellSize / 2,
        };
    }

    getGoalPosition(): { x: number; y: number } {
        return {
            x: this.xOffset + (this.cols - 1) * this.cellSize + this.cellSize / 2,
            y: this.yOffset + (this.rows - 1) * this.cellSize + this.cellSize / 2,
        };
    }

    getWallGroup(): Phaser.Physics.Arcade.StaticGroup {
        return this.wallGroup;
    }

    private shuffle<T>(array: T[]): T[] {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
        return arr;
    }
}

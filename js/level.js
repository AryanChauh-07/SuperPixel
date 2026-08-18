/**
 * Pixel Mirio - Level Engine & Progressive Difficulty
 */

class Level {
    constructor(levelNum = 1) {
        this.levelNum = Math.max(1, Math.min(25, levelNum));
        this.tileSize = 30;
        this.height = 12; // 12 * 30 = 360px

        this.worldIndex = Math.floor((this.levelNum - 1) / 5) + 1;
        this.subLevel   = ((this.levelNum - 1) % 5) + 1;
        this.worldName  = `${this.worldIndex}-${this.subLevel}`;

        const themeMap = { 1: 'grassland', 2: 'cavern', 3: 'sky', 4: 'desert', 5: 'lava' };
        this.theme = themeMap[this.worldIndex] || 'grassland';
        this.isBossLevel = this.subLevel === 5;

        this.timeLimit      = Math.max(250, 420 - (this.levelNum * 6));
        this.enemySpeedMult = 1.0 + (this.levelNum - 1) * 0.05;

        // Increased base width and per-level scaling to make levels feel larger and more expansive.
        // The original was 180 + (levelNum * 6).
        this.width = 240 + (this.levelNum * 8);
        this.tiles = Array(this.height).fill(null).map(() => Array(this.width).fill(0));

        this.enemies             = [];
        this.items               = [];
        this.coins               = [];
        this.movingObstacles     = [];
        this.pipeDestinations    = {};
        this.decorativeBackgrounds = [];

        this.flagpoleX = (this.width - 24) * this.tileSize;
        this.castleX   = (this.width - 17) * this.tileSize;

        this.generateLevelData();
    }

    generateLevelData() {
        if (this.isBossLevel) {
            if (this.levelNum === 25) {
                this.generateFinalBossArena();
            } else {
                this.generateBossArena();
            }
            // Prevent normal level generation for all boss levels
            return;
        }

        const H = this.height;

        /* ── Ground with pit gaps ── */
        const pitCount = Math.min(9, 2 + Math.floor(this.levelNum / 2.5));
        const pitPositions = [];
        for (let i = 0; i < pitCount; i++) {
            const pitX = 45 + i * Math.floor((this.width - 80) / pitCount) + (this.levelNum % 3);
            pitPositions.push(pitX);
        }
        for (let x = 0; x < this.width; x++) {
            const isPit = pitPositions.some(px => x >= px && x <= px + 2);
            if (isPit && x > 10 && x < this.width - 30) continue;
            this.tiles[H - 1][x] = 1;
            this.tiles[H - 2][x] = 1;
        }

        /* ── Platforms, Bricks & ? Blocks ── */
        for (let x = 16; x < this.width - 35; x += 12) {
            const pattern = (x + this.levelNum) % 4;
            if (pattern === 0) {
                this.tiles[H - 5][x]     = 3;
                this.tiles[H - 5][x + 1] = 2;
                this.tiles[H - 5][x + 2] = 4;
                this.tiles[H - 5][x + 3] = 2;
                this.tiles[H - 5][x + 4] = 3;
            } else if (pattern === 1) {
                // Make one specific pipe enterable as a demonstration (on levels > 1)
                if (x === 28 && this.levelNum > 1) {
                    this.addPipe(x + 2, H - 4, 2, true, { tx: this.width - 50, ty: H - 8 });
                } else {
                    this.addPipe(x + 2, H - 4, 2);
                }
                this.addPipe(x + 8, H - 5, 3); // A taller, non-enterable pipe
            } else if (pattern === 2) {
                for (let bx = x; bx < x + 5; bx++) {
                    this.tiles[H - 5][bx] = 2;
                    if (bx === x + 2) this.tiles[H - 9][bx] = 4;
                }
            } else {
                this.addStaircase(x + 1, 4, true);
                this.addStaircase(x + 6, 4, false);
            }
        }

        /* ── Final staircase before flagpole ── */
        const stairHeight = Math.min(8, 4 + Math.floor(this.subLevel));
        this.addStaircase(this.width - 32, stairHeight, true);

        /* ── Enemies (scale aggressively with level) ── */
        const enemyCount = Math.min(36, 6 + this.levelNum * 3);
        for (let i = 0; i < enemyCount; i++) {
            const ex = 25 + Math.floor((i * (this.width - 55)) / enemyCount);
            if (i % 4 === 0 && this.levelNum >= 2) { // Introduce flying enemies from level 2 onwards
                const flyingEnemy = new FlyingEnemy(ex * this.tileSize, (H - 8) * this.tileSize); // Spawn higher up
                flyingEnemy.vx = (i % 2 === 0 ? 1 : -1) * (1.0 + this.levelNum * 0.05); // Vary speed and direction
                this.enemies.push(flyingEnemy);
            } else if (i % 3 === 0) {
                const koopa = new Koopa(ex * this.tileSize, (H - 4) * this.tileSize);
                koopa.vx = -0.9 * this.enemySpeedMult;
                this.enemies.push(koopa);
            } else {
                const goomba = new Goomba(ex * this.tileSize, (H - 3) * this.tileSize);
                goomba.vx = -1.1 * this.enemySpeedMult;
                this.enemies.push(goomba);
            }
        }

        /* ── Moving Obstacles (start at level 3, max 12) ── */
        const movingObstacleCount = Math.min(12, Math.floor(this.levelNum / 2));
        for (let i = 0; i < movingObstacleCount; i++) {
            const ox = 40 + Math.floor((i * (this.width - 80)) / Math.max(1, movingObstacleCount));
            const speed = (0.6 + this.levelNum * 0.07) * (i % 2 === 0 ? 1 : -1);
            this.movingObstacles.push(new MovingObstacle(ox * this.tileSize, (H - 6) * this.tileSize, speed));
        }

        /* ── Collectible Coins (avoid solid tile positions) ── */
        const coinCount = Math.min(40, 10 + this.levelNum * 2);
        for (let i = 0; i < coinCount; i++) {
            const cx = 15 + Math.floor((i * (this.width - 30)) / coinCount);
            const cyOptions = [H - 5, H - 7, H - 4];
            const cy = cyOptions[i % 3];
            // Only place coin if the tile position is empty
            if (this.tiles[cy] && this.tiles[cy][cx] === 0) {
                this.coins.push(new CollectibleCoin(cx * this.tileSize + 5, cy * this.tileSize + 5));
            }
        }

        /* ── Background Scenery ── */
        if (this.theme === 'lava') {
            // For the fiery fifth world, add volcanoes and chains.
            for (let x = 10; x < this.width - 40; x += 70) {
                this.decorativeBackgrounds.push({ type: 'volcano', x: x * this.tileSize, y: (H - 2) * this.tileSize });
                this.decorativeBackgrounds.push({ type: 'chain', x: (x + 35) * this.tileSize, y: 0 });
            }
        } else if (this.theme === 'cavern') {
            // For the cavern world, add stalactites, stalagmites, and crystals.
            for (let x = 15; x < this.width - 30; x += 35) {
                // Add a stalactite hanging from the ceiling
                this.decorativeBackgrounds.push({ type: 'stalactite', x: (x + 5) * this.tileSize, y: 0 });
                // Add a stalagmite rising from the floor
                this.decorativeBackgrounds.push({ type: 'stalagmite', x: (x + 18) * this.tileSize, y: (H - 2) * this.tileSize });
                // Add a glowing crystal formation
                this.decorativeBackgrounds.push({ type: 'crystal', x: (x + 28) * this.tileSize, y: (H - 3) * this.tileSize });
            }
        } else {
            // Default scenery for other worlds (grassland, cavern, etc.)
            for (let x = 6; x < this.width - 20; x += 24) {
                this.decorativeBackgrounds.push({ type: 'cloud', x: x * this.tileSize, y: 40 });
                this.decorativeBackgrounds.push({ type: 'hill',  x: (x + 8)  * this.tileSize, y: (H - 4) * this.tileSize });
                this.decorativeBackgrounds.push({ type: 'bush',  x: (x + 16) * this.tileSize, y: (H - 3) * this.tileSize });
            }
        }
    }

    addPipe(x, y, heightTiles, isEnterable = false, destination = null) {
        if (x + 1 >= this.width || y >= this.height) return;
        
        // The top of the pipe
        this.tiles[y][x]     = isEnterable ? 6 : 5;
        this.tiles[y][x + 1] = isEnterable ? 6 : 5;
        if (isEnterable && destination) {
            this.pipeDestinations[`${x},${y}`] = destination;
        }

        for (let i = 1; i < heightTiles; i++) {
            if (y + i < this.height) { // The body
                this.tiles[y + i][x]     = 5;
                this.tiles[y + i][x + 1] = 5;
            }
        }
    }

    generateFinalBossArena() {
        this.width = 180;
        this.flagpoleX = -1;
        this.castleX = -1;
        this.theme = 'lava';
        const H = this.height;

        // --- Background: A truly hellish and epic backdrop ---
        this.decorativeBackgrounds = [];
        this.decorativeBackgrounds.push({ type: 'volcano', x: 30 * this.tileSize, y: (H - 2) * this.tileSize });
        this.decorativeBackgrounds.push({ type: 'volcano', x: 90 * this.tileSize, y: (H - 2) * this.tileSize });
        this.decorativeBackgrounds.push({ type: 'volcano', x: 150 * this.tileSize, y: (H - 2) * this.tileSize });
        for (let i = 0; i < 12; i++) {
            this.decorativeBackgrounds.push({ type: 'chain', x: (10 + i * 14) * this.tileSize, y: 0 });
        }

        // === PHASE 1: The Approach (x: 0-50) ===
        // A classic platforming section to warm up the player.
        for (let x = 0; x < 10; x++) { this.tiles[H - 2][x] = 1; } // Start platform
        this.tiles[H - 6][8] = 4; // Starting power-up

        this.tiles[H - 3][15] = 2; this.tiles[H - 3][16] = 2; this.tiles[H - 3][17] = 2;
        this.tiles[H - 4][25] = 2;
        for (let x = 32; x < 36; x++) { this.tiles[H - 2][x] = 1; }
        this.enemies.push(new Goomba(33 * this.tileSize, (H - 4) * this.tileSize));
        for (let x = 40; x < 45; x++) { this.tiles[H - 3][x] = 2; }

        // === PHASE 2: The Spire Climb (x: 50-90) ===
        // A vertical challenge testing precise jumping.
        for (let x = 50; x < 60; x++) { this.tiles[H - 2][x] = 1; } // Checkpoint platform
        for (let x = 65; x < 69; x++) { this.tiles[H - 4][x] = 2; } // Step 1
        for (let x = 58; x < 62; x++) { this.tiles[H - 7][x] = 2; } // Step 2
        this.movingObstacles.push(new MovingObstacle(58 * this.tileSize, (H - 8) * this.tileSize, 0.6)); // Patrolling hazard
        for (let x = 65; x < 69; x++) { this.tiles[H - 10][x] = 2; } // Step 3
        for (let x = 75; x < 85; x++) { this.tiles[H - 10][x] = 1; } // High platform after climb

        // === PHASE 3: The Descent (x: 90-120) ===
        // A clear, safe path connecting the high point to the low point. THIS FIXES THE BUG.
        for (let x = 90; x < 93; x++) { this.tiles[H - 8][x] = 2; } // Step down 1
        for (let x = 97; x < 100; x++) { this.tiles[H - 6][x] = 2; } // Step down 2
        for (let x = 104; x < 107; x++) { this.tiles[H - 4][x] = 2; } // Step down 3
        for (let x = 110; x < 120; x++) { this.tiles[H - 2][x] = 1; } // Solid ground leading into the arena
        this.tiles[H - 5][115] = 4; // Final power-up before the boss

        // === PHASE 4: Bowser's Throne Room (x: 120-180) ===
        // The final confrontation in a dedicated, multi-tiered arena.
        for (let y = 0; y < H; y++) { // Enclosing walls
            this.tiles[y][120] = 2;
            this.tiles[y][this.width - 1] = 2;
        }
        for (let x = 121; x < this.width - 1; x++) { // Arena floor with central pit
            if (x >= 145 && x <= 155) continue; // Central lava pit
            this.tiles[H - 2][x] = 1;
        }

        // Platforms inside the arena for verticality.
        for (let x = 125; x < 135; x++) { this.tiles[H - 5][x] = 2; } // Lower left platform
        for (let x = 160; x < 170; x++) { this.tiles[H - 5][x] = 2; } // Lower right platform
        for (let x = 138; x < 148; x++) { this.tiles[H - 8][x] = 2; } // Upper central platform

        // The Axe, placed on a high pedestal on the far right.
        for (let x = this.width - 8; x < this.width - 1; x++) { this.tiles[H - 8][x] = 1; }
        const axe = new Axe((this.width - 5) * this.tileSize, (H - 10) * this.tileSize);
        this.items.push(axe);

        // --- The Final Boss ---
        const boss = new Browser(130 * this.tileSize, (H - 6) * this.tileSize, this.levelNum);
        boss.hp = 25; // Make the final boss truly challenging
        this.enemies.push(boss);

        // Add minions for extra chaos.
        this.enemies.push(new Koopa(150 * this.tileSize, (H - 4) * this.tileSize));
        this.enemies.push(new Goomba(165 * this.tileSize, (H - 4) * this.tileSize));
    }

    generateBossArena() {
        this.width = 60; // A more contained arena
        this.flagpoleX = -1; // No flagpole in boss arenas
        this.castleX = -1; // No castle
        const H = this.height;

        // Solid floor with a central lava pit
        const pitStart = Math.floor(this.width / 2) - 4;
        const pitEnd = pitStart + 8;
        for (let x = 0; x < this.width; x++) {
            // Create a pit in the middle by NOT adding floor tiles
            if (x >= pitStart && x < pitEnd) continue;
            this.tiles[H - 1][x] = 1;
            this.tiles[H - 2][x] = 1;
        }

        // Add a helpful power-up block over the pit, making it easier to reach.
        // This gives the player a chance to recover or power-up during the fight.
        const platformCenter = pitStart + 3; // Move platform left to significantly reduce the jump gap.
        this.tiles[H - 5][platformCenter - 2] = 2; // Lower the platform to make it easily reachable.
        this.tiles[H - 5][platformCenter - 1] = 2; // Brick
        this.tiles[H - 5][platformCenter]     = 4; // Question block with mushroom/flower
        this.tiles[H - 5][platformCenter + 1] = 2; // Brick
        this.tiles[H - 5][platformCenter + 2] = 2; // Brick

        // Create thicker, more visually appealing walls using brick tiles.
        const wallWidth = 4; // How many tiles thick the walls are.
        for (let y = 0; y < H; y++) {
            for (let i = 0; i < wallWidth; i++) {
                this.tiles[y][i] = 2; // Left wall (brick tile)
                this.tiles[y][this.width - 1 - i] = 2; // Right wall (brick tile)
            }
        }

        // Add the boss
        const boss = new Browser((this.width - 10) * this.tileSize, (H - 6) * this.tileSize, this.levelNum);
        this.enemies.push(boss);

        // Add the axe to defeat the boss
        const axe = new Axe((this.width - 5) * this.tileSize, (H - 3) * this.tileSize); // Place on ground near right wall
        this.items.push(axe);

        // Add some lava theme elements for the boss fight
        this.theme = 'lava';
    }

    addStaircase(startX, height, ascending) {
        const H = this.height;
        for (let col = 0; col < height; col++) {
            const currentX = startX + col;
            if (currentX >= this.width - 1) break;
            const currentH = ascending ? col + 1 : height - col;
            for (let h = 0; h < currentH; h++) {
                if (H - 3 - h >= 0) this.tiles[H - 3 - h][currentX] = 1;
            }
        }
    }

    getTile(tx, ty) {
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return null;
        const type = this.tiles[ty][tx];
        if (type === 0) return null;
        return {
            type,
            solid:       true,
            isBrick:     type === 2,
            isQuestion:  type === 3 || type === 4,
            hasMushroom: type === 4,
            isPipe:      type === 5 || type === 6,
            isEnterable: type === 6
        };
    }

    getPipeDestination(tx, ty) {
        // The key is the top-left tile of the pipe
        if (this.pipeDestinations[`${tx},${ty}`]) {
            return this.pipeDestinations[`${tx},${ty}`];
        }
        if (this.pipeDestinations[`${tx - 1},${ty}`]) {
            return this.pipeDestinations[`${tx - 1},${ty}`];
        }
        return null;
    }

    setTile(tx, ty, type) {
        if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
            this.tiles[ty][tx] = type;
        }
    }

    /* ── Update moving obstacles (called from game loop, NOT draw) ── */
    updateMovingObstacles() {
        this.movingObstacles.forEach(obs => obs.update());
    }

    draw(ctx, cameraX, viewportWidth, viewportHeight) {
        const startTx = Math.max(0, Math.floor(cameraX / this.tileSize));
        const endTx   = Math.min(this.width - 1, Math.ceil((cameraX + viewportWidth) / this.tileSize));

        /* Background Scenery with Parallax Scrolling for depth */
        const now = Date.now(); // Add a time source for animations
        this.decorativeBackgrounds.forEach(bg => {
            let parallaxFactor = 1.0;
            let bgWidth = 120; // A generous width for culling

            // Assign different scroll speeds based on the background element type
            if (bg.type === 'cloud') {
                parallaxFactor = 0.3; // Clouds are far away, move slowly
                bgWidth = 60;
            } else if (bg.type === 'hill') {
                parallaxFactor = 0.6; // Hills are in the mid-ground
                bgWidth = 72;
            } else if (bg.type === 'bush') {
                parallaxFactor = 0.8; // Bushes are closer, move faster
                bgWidth = 45;
            } else if (bg.type === 'lava_mountain') {
                parallaxFactor = 0.4; // Distant mountains
                bgWidth = 100;
            } else if (bg.type === 'volcano') {
                parallaxFactor = 0.35; // Volcano is furthest away
                bgWidth = 150;
            } else if (bg.type === 'chain') {
                parallaxFactor = 0.7; // Chains are in the mid-ground
                bgWidth = 20;
            } else if (bg.type === 'stalactite') {
                parallaxFactor = 0.5; // Mid-background
                bgWidth = 20;
            } else if (bg.type === 'stalagmite') {
                parallaxFactor = 0.7; // Closer background
                bgWidth = 20;
            } else if (bg.type === 'crystal') {
                parallaxFactor = 0.85; // Foreground, moves fast
                bgWidth = 30;
            }

            const drawX = bg.x - (cameraX * parallaxFactor);

            // Cull elements that are off-screen
            if (drawX + bgWidth < 0 || drawX > viewportWidth) return;

            if (bg.type === 'cloud') {
                const bobOffset = Math.sin(now / 1200 + bg.x / 100) * 4; // Gentle vertical bob
                ctx.fillStyle = SpriteRenderer.themes[this.theme].cloud;
                ctx.globalAlpha = 0.85;
                ctx.fillRect(drawX,      bg.y + bobOffset,      60, 20);
                ctx.fillRect(drawX + 15, bg.y - 10 + bobOffset, 30, 10);
                ctx.globalAlpha = 1;
            } else if (bg.type === 'hill') {
                ctx.fillStyle = SpriteRenderer.themes[this.theme].hill;
                ctx.beginPath();
                ctx.moveTo(drawX,      bg.y + 60);
                ctx.lineTo(drawX + 36, bg.y);
                ctx.lineTo(drawX + 72, bg.y + 60);
                ctx.fill();
            } else if (bg.type === 'bush') {
                const rustle = Math.sin(now / 300 + bg.x / 50) * 2; // Gentle horizontal rustle
                ctx.fillStyle = SpriteRenderer.themes[this.theme].bush;
                ctx.fillRect(drawX + rustle,      bg.y + 15, 45 - rustle * 2, 15);
                ctx.fillRect(drawX + 10, bg.y + 5,  25, 10);
            } else if (bg.type === 'lava_mountain') {
                ctx.fillStyle = '#2a0505'; // Very dark, almost black red
                ctx.beginPath();
                ctx.moveTo(drawX,       bg.y + 60);
                ctx.lineTo(drawX + 50,  bg.y - 80); // Taller and more jagged than a hill
                ctx.lineTo(drawX + 100, bg.y + 60);
                ctx.fill();
            } else if (bg.type === 'volcano') {
                // Main volcano body
                ctx.fillStyle = '#1a0303'; // Even darker red/black
                ctx.beginPath();
                ctx.moveTo(drawX,       bg.y + 60);
                ctx.lineTo(drawX + 75,  bg.y - 120); // Very tall
                ctx.lineTo(drawX + 150, bg.y + 60);
                ctx.fill();
                // Glowing lava top with a pulse effect
                const pulse = Math.sin(now / 400) * 5;
                ctx.fillStyle = '#ff4500'; // OrangeRed
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 15 + pulse;
                ctx.beginPath();
                ctx.moveTo(drawX + 60, bg.y - 110);
                ctx.lineTo(drawX + 75, bg.y - 120);
                ctx.lineTo(drawX + 90, bg.y - 110);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0; // Reset shadow for other elements
            } else if (bg.type === 'chain') {
                ctx.fillStyle = '#333333'; // Dark gray for chains
                // Draw 15 links to form a chain hanging from the top
                for (let i = 0; i < 15; i++) {
                    ctx.fillRect(drawX, bg.y + i * 12, 10, 8);
                }
            } else if (bg.type === 'stalactite') {
                ctx.fillStyle = '#4a3a4a'; // Dark, desaturated purple-brown
                ctx.beginPath();
                ctx.moveTo(drawX, bg.y);
                ctx.lineTo(drawX + 10, bg.y + 70); // Long and pointy
                ctx.lineTo(drawX + 20, bg.y);
                ctx.fill();
            } else if (bg.type === 'stalagmite') {
                ctx.fillStyle = '#5a4a5a'; // Slightly lighter purple-brown
                ctx.beginPath();
                ctx.moveTo(drawX, bg.y + 60);
                ctx.lineTo(drawX + 8, bg.y + 10); // Shorter and wider
                ctx.lineTo(drawX + 16, bg.y + 60);
                ctx.fill();
            } else if (bg.type === 'crystal') {
                const pulse = Math.sin(now / 500 + bg.x / 80) * 6;
                ctx.fillStyle = '#c084fc'; // A light purple for the crystal body
                ctx.shadowColor = '#a855f7'; // The main theme purple for the glow
                ctx.shadowBlur = 10 + pulse;
                // Main crystal point
                ctx.beginPath();
                ctx.moveTo(drawX + 15, bg.y - 5);
                ctx.lineTo(drawX + 25, bg.y + 20);
                ctx.lineTo(drawX + 5,  bg.y + 20);
                ctx.closePath();
                ctx.fill();
                // Smaller side crystal
                ctx.fillRect(drawX, bg.y + 10, 10, 10);
                
                ctx.shadowBlur = 0; // Reset shadow for other elements
            }
        });

        /* Draw Tiles with Optimization */
        // This new logic groups adjacent tiles of the same type (like ground or bricks)
        // and draws them in a single operation using a repeating pattern. This significantly
        // reduces the number of draw calls, improving rendering performance.
        for (let ty = 0; ty < this.height; ty++) {
            for (let tx = startTx; tx <= endTx; /* tx is incremented inside the loop */) {
                const type = this.tiles[ty][tx];
                if (type === 0) {
                    tx++;
                    continue;
                }

                // Find how many tiles of the same type are in a row (a "run")
                let runWidth = 1;
                while (tx + runWidth <= endTx && this.tiles[ty][tx + runWidth] === type) {
                    runWidth++;
                }

                const drawX = tx * this.tileSize - cameraX;
                const drawY = ty * this.tileSize;

                // Use optimized pattern rendering for common, static tiles (ground and brick).
                if (type === 1 || type === 2) {
                    const pattern = SpriteRenderer.getTilePattern(ctx, type, this.theme, this.tileSize);
                    if (pattern) {
                        ctx.fillStyle = pattern;
                        // We must translate to align the pattern with the tile grid, as patterns are drawn
                        // relative to the canvas origin, not the fillRect position.
                        ctx.save();
                        ctx.translate(drawX, drawY);
                        ctx.fillRect(0, 0, runWidth * this.tileSize, this.tileSize);
                        ctx.restore();
                    }
                } else {
                    // For other, more complex, or non-repeating tiles, draw them individually.
                    for (let i = 0; i < runWidth; i++) {
                        const currentDrawX = (tx + i) * this.tileSize - cameraX;
                        const currentType = this.tiles[ty][tx + i];

                        if (currentType === 3 || currentType === 4) {
                            SpriteRenderer.drawQuestionBlock(ctx, currentDrawX, drawY, false, this.theme);
                        } else if (currentType === 9) {
                            SpriteRenderer.drawQuestionBlock(ctx, currentDrawX, drawY, true, this.theme);
                        } else if (currentType === 5 || currentType === 6) {
                            const tileAbove = this.getTile(tx + i, ty - 1);
                            if (!tileAbove || !tileAbove.isPipe) {
                                let pipeHeight = 1;
                                while (this.getTile(tx + i, ty + pipeHeight)?.isPipe) { pipeHeight++; }
                                SpriteRenderer.drawPipe(ctx, currentDrawX, drawY, this.tileSize, pipeHeight * this.tileSize);
                            }
                        }
                    }
                }
                // Move to the next tile after the run we just processed.
                tx += runWidth;
            }
        }

        /* Draw Moving Obstacles */
        this.movingObstacles.forEach(obs => {
            if (obs.x - cameraX > -60 && obs.x - cameraX < viewportWidth + 60) {
                obs.draw(ctx, cameraX);
            }
        });

        /* Flagpole & Castle */
        if (!this.isBossLevel) {
            if (this.flagpoleX + 60 > cameraX && this.flagpoleX < cameraX + viewportWidth) {
                SpriteRenderer.drawFlagpole(ctx, this.flagpoleX - cameraX, (this.height - 9) * this.tileSize);
            }
            if (this.castleX + 150 > cameraX && this.castleX < cameraX + viewportWidth) {
                SpriteRenderer.drawCastle(ctx, this.castleX - cameraX, (this.height - 5) * this.tileSize);
            }
        }
    }
}

/* ═══════════════════════════════════════════════════
   MovingObstacle — Patrolling spike block
   Speed & count scale with level number
═══════════════════════════════════════════════════ */
class MovingObstacle {
    constructor(x, y, speed) {
        this.x      = x;
        this.y      = y;
        this.w      = 28;
        this.h      = 22;
        this.speed  = speed;
        this.startX = x;
        this.range  = 80 + Math.abs(speed) * 18;
        this.animTimer = 0;
    }

    getBounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    update() {
        this.x += this.speed;
        this.animTimer += 0.12;
        if (Math.abs(this.x - this.startX) >= this.range) {
            this.speed = -this.speed;
        }
    }

    draw(ctx, cameraX) {
        const dx = this.x - cameraX;
        const dy = this.y;
        const pulse = Math.floor(this.animTimer) % 2;

        ctx.save();

        // Body gradient
        const grd = ctx.createLinearGradient(dx, dy, dx + this.w, dy + this.h);
        grd.addColorStop(0, pulse === 0 ? '#ff3300' : '#ff5500');
        grd.addColorStop(1, pulse === 0 ? '#880000' : '#aa2200');
        ctx.fillStyle = grd;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur  = 10;
        ctx.fillRect(dx, dy, this.w, this.h);

        // Spike tops
        ctx.shadowBlur = 0;
        ctx.fillStyle = pulse === 0 ? '#ff8800' : '#ffaa00';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(dx + i * 7,       dy);
            ctx.lineTo(dx + i * 7 + 3.5, dy - 9);
            ctx.lineTo(dx + i * 7 + 7,   dy);
            ctx.closePath();
            ctx.fill();
        }

        // Border
        ctx.strokeStyle = '#440000';
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(dx, dy, this.w, this.h);

        // Skull icon
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '10px sans-serif';
        ctx.fillText('☠', dx + 8, dy + 15);

        ctx.restore();
    }
}

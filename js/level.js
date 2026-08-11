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

        this.timeLimit      = Math.max(250, 420 - (this.levelNum * 6));
        this.enemySpeedMult = 1.0 + (this.levelNum - 1) * 0.05;

        this.width = 180 + (this.levelNum * 6);
        this.tiles = Array(this.height).fill(null).map(() => Array(this.width).fill(0));

        this.enemies             = [];
        this.items               = [];
        this.coins               = [];
        this.movingObstacles     = [];
        this.decorativeBackgrounds = [];

        this.flagpoleX = (this.width - 24) * this.tileSize;
        this.castleX   = (this.width - 17) * this.tileSize;

        this.generateLevelData();
    }

    generateLevelData() {
        const H = this.height;

        /* ── Ground with pit gaps ── */
        const pitCount = Math.min(9, 2 + Math.floor(this.levelNum / 2.5));
        const pitPositions = [];
        for (let i = 0; i < pitCount; i++) {
            const pitX = 35 + i * Math.floor((this.width - 70) / pitCount) + (this.levelNum % 3);
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
                this.addPipe(x + 2, H - 4, 2);
                this.addPipe(x + 8, H - 5, 3);
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
        for (let x = 6; x < this.width - 20; x += 24) {
            this.decorativeBackgrounds.push({ type: 'cloud', x: x * this.tileSize, y: 40 });
            this.decorativeBackgrounds.push({ type: 'hill',  x: (x + 8)  * this.tileSize, y: (H - 4) * this.tileSize });
            this.decorativeBackgrounds.push({ type: 'bush',  x: (x + 16) * this.tileSize, y: (H - 3) * this.tileSize });
        }
    }

    addPipe(x, y, heightTiles) {
        if (x + 1 >= this.width || y >= this.height) return;
        this.tiles[y][x]     = 5;
        this.tiles[y][x + 1] = 5; // both solid
        for (let i = 1; i < heightTiles; i++) {
            if (y + i < this.height) {
                this.tiles[y + i][x]     = 5;
                this.tiles[y + i][x + 1] = 5;
            }
        }
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
            isPipe:      type === 5
        };
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
            }

            const drawX = bg.x - (cameraX * parallaxFactor);

            // Cull elements that are off-screen
            if (drawX + bgWidth < 0 || drawX > viewportWidth) return;

            if (bg.type === 'cloud') {
                ctx.fillStyle = SpriteRenderer.themes[this.theme].cloud;
                ctx.globalAlpha = 0.85;
                ctx.fillRect(drawX,      bg.y,      60, 20);
                ctx.fillRect(drawX + 15, bg.y - 10, 30, 10);
                ctx.globalAlpha = 1;
            } else if (bg.type === 'hill') {
                ctx.fillStyle = SpriteRenderer.themes[this.theme].hill;
                ctx.beginPath();
                ctx.moveTo(drawX,      bg.y + 60);
                ctx.lineTo(drawX + 36, bg.y);
                ctx.lineTo(drawX + 72, bg.y + 60);
                ctx.fill();
            } else if (bg.type === 'bush') {
                ctx.fillStyle = SpriteRenderer.themes[this.theme].bush;
                ctx.fillRect(drawX,      bg.y + 15, 45, 15);
                ctx.fillRect(drawX + 10, bg.y + 5,  25, 10);
            }
        });

        /* Draw Tiles */
        for (let ty = 0; ty < this.height; ty++) {
            for (let tx = startTx; tx <= endTx; tx++) {
                const type = this.tiles[ty][tx];
                if (type === 0) continue;
                const drawX = tx * this.tileSize - cameraX;
                const drawY = ty * this.tileSize;
                if (type === 1) {
                    SpriteRenderer.drawGroundTile(ctx, drawX, drawY, this.theme);
                } else if (type === 2) {
                    SpriteRenderer.drawBrickBlock(ctx, drawX, drawY, this.theme);
                } else if (type === 3 || type === 4) {
                    SpriteRenderer.drawQuestionBlock(ctx, drawX, drawY, false, this.theme);
                } else if (type === 9) {
                    SpriteRenderer.drawQuestionBlock(ctx, drawX, drawY, true, this.theme);
                } else if (type === 5) {
                    SpriteRenderer.drawPipe(ctx, drawX, drawY, 30, 60);
                }
            }
        }

        /* Draw Moving Obstacles */
        this.movingObstacles.forEach(obs => {
            if (obs.x - cameraX > -60 && obs.x - cameraX < viewportWidth + 60) {
                obs.draw(ctx, cameraX);
            }
        });

        /* Flagpole & Castle */
        if (this.flagpoleX + 60 > cameraX && this.flagpoleX < cameraX + viewportWidth) {
            SpriteRenderer.drawFlagpole(ctx, this.flagpoleX - cameraX, (this.height - 9) * this.tileSize);
        }
        if (this.castleX + 150 > cameraX && this.castleX < cameraX + viewportWidth) {
            SpriteRenderer.drawCastle(ctx, this.castleX - cameraX, (this.height - 5) * this.tileSize);
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

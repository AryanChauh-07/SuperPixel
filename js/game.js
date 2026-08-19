/**
 * Pixel Mirio - Main Game Engine & Controller
 * 25 Levels | Progressive Difficulty | Full Campaign
 */

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx    = this.canvas.getContext('2d');

        // 640x360 Resolution
        this.virtualWidth  = 640;
        this.virtualHeight = 360;
        this.canvas.width  = this.virtualWidth;
        this.canvas.height = this.virtualHeight;

        // Pixel-art rendering (no blur)
        this.ctx.imageSmoothingEnabled = false;

        // Campaign State
        this.currentLevelNum = 1;
        this.unlockedLevels  = 25;

        // Game State
        this.state         = 'START';
        this.previousState = 'START';
        this.transitionData = null;
        this.score  = 0;
        this.coins  = 0;
        this.lives  = 3;
        this.time   = 400;
        this.timeTimer = 0;

        // Camera
        this.cameraX = 0;

        // Entities
        this.level     = null;
        this.player    = null;
        this.particles = [];
        this.fireballs = [];

        // Input
        this.keys = { left: false, right: false, up: false, down: false, jump: false, run: false };

        this.initDOM();
        this.buildLevelSelectGrid();
        this.bindEvents();
    }

    /* ─── DOM References ─── */
    initDOM() {
        this.hudScore = document.getElementById('hud-score');
        this.hudCoins = document.getElementById('hud-coins');
        this.hudWorld = document.getElementById('hud-world');
        this.hudTime  = document.getElementById('hud-time');
        this.hudLives = document.getElementById('hud-lives');

        this.startScreen   = document.getElementById('start-screen');
        this.pauseScreen   = document.getElementById('pause-screen');
        this.shopScreen    = document.getElementById('shop-screen');
        this.levelScreen   = document.getElementById('level-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.victoryScreen  = document.getElementById('victory-screen');
        this.endingScreen   = document.getElementById('ending-screen');

        this.soundBtn      = document.getElementById('sound-btn');
        this.soundIcon     = document.getElementById('sound-icon');
        this.pauseBtn      = document.getElementById('pause-btn');
        this.shopBtn       = document.getElementById('shop-btn');
        this.levelSelectBtn = document.getElementById('level-select-btn');
        this.homeBtn       = document.getElementById('home-btn');
        this.restartBtn    = document.getElementById('restart-btn');
    }

    /* ─── Level Select Grid ─── */
    buildLevelSelectGrid() {
        const grid = document.getElementById('level-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const worldNames = ['Grassland', 'Cavern', 'Sky Islands', 'Desert Dunes', 'Lava Fortress'];

        for (let i = 1; i <= 25; i++) {
            const wIdx   = Math.floor((i - 1) / 5) + 1;
            const subIdx = ((i - 1) % 5) + 1;
            const card   = document.createElement('div');
            card.className = `level-card w${wIdx}`;
            card.innerHTML = `
                <div class="level-number">${wIdx}-${subIdx}</div>
                <div class="world-name">${worldNames[wIdx - 1]}</div>
            `;
            card.addEventListener('click', () => { this.currentLevelNum = i; this.startGame(); });
            grid.appendChild(card);
        }
    }

    /* ─── Event Bindings ─── */
    bindEvents() {
        window.addEventListener('keydown', e => this.handleKeyDown(e));
        window.addEventListener('keyup',   e => this.handleKeyUp(e));

        this.homeBtn.addEventListener('click',    () => this.goHome());
        this.restartBtn.addEventListener('click', () => this.startGame());

        document.getElementById('start-btn').addEventListener('click',       () => this.startGame());
        document.getElementById('retry-btn').addEventListener('click',        () => this.startGame());
        document.getElementById('home-gameover-btn').addEventListener('click',() => this.goHome());
        document.getElementById('home-pause-btn').addEventListener('click',   () => this.goHome());
        document.getElementById('ending-home-btn').addEventListener('click',  () => this.goHome());

        document.getElementById('next-btn').addEventListener('click', () => {
            if (this.currentLevelNum >= 25) this.handleGrandEnding();
            else { this.currentLevelNum++; this.startGame(); }
        });

        document.getElementById('resume-btn').addEventListener('click',       () => this.togglePause());
        document.getElementById('restart-pause-btn').addEventListener('click',() => this.startGame());

        this.levelSelectBtn.addEventListener('click',                             () => this.openLevelSelect());
        document.getElementById('title-levels-btn').addEventListener('click',    () => this.openLevelSelect());
        document.getElementById('open-levels-pause-btn').addEventListener('click',() => this.openLevelSelect());
        document.getElementById('close-level-btn').addEventListener('click',     () => this.closeLevelSelect());

        this.soundBtn.addEventListener('click', () => {
            const m = AudioSystem.toggleMute();
            this.soundIcon.textContent = m ? '🔇' : '🔊';
        });
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        this.shopBtn.addEventListener('click',                                  () => this.openShop());
        document.getElementById('close-shop-btn').addEventListener('click',     () => this.closeShop());
        document.getElementById('open-shop-pause-btn').addEventListener('click',() => this.openShop());

        document.getElementById('buy-shroom-btn').addEventListener('click', () => this.buyItem('shroom'));
        document.getElementById('buy-life-btn').addEventListener('click',   () => this.buyItem('life'));
        document.getElementById('buy-speed-btn').addEventListener('click',  () => this.buyItem('speed'));
        document.getElementById('buy-star-btn').addEventListener('click',   () => this.buyItem('star'));
        document.getElementById('buy-hammer-btn').addEventListener('click', () => this.buyItem('hammer'));
    }

    /* ─── Input ─── */
    handleKeyDown(e) {
        try { AudioSystem.init(); } catch(err) {}
        switch (e.code) {
            case 'ArrowLeft':  case 'KeyA':  this.keys.left  = true; break;
            case 'ArrowRight': case 'KeyD':  this.keys.right = true; break;
            case 'ArrowUp':    case 'KeyW':  case 'Space':  this.keys.jump = true; e.preventDefault(); break;
            case 'ArrowDown':  case 'KeyS':  this.keys.down  = true; break;
            case 'ShiftLeft':  case 'ShiftRight': case 'KeyX':
                if (this.state === 'PLAYING') {
                    // Prioritize shooting fireballs if Fiery, otherwise use hammer if available.
                    // Both actions use the same cooldown mechanism.
                    if (this.player.isFiery) {
                        this.shootFireball();
                    } else if (this.player.hasHammerPower) {
                        this.useHammer();
                    }
                }
                this.keys.run = true;
                break;
            case 'KeyP': this.togglePause(); break;
            case 'KeyM': {
                const m = AudioSystem.toggleMute();
                this.soundIcon.textContent = m ? '🔇' : '🔊';
                break;
            }
            case 'Enter':
                if (this.state === 'START' || this.state === 'GAMEOVER') this.startGame();
                break;
        }
    }

    handleKeyUp(e) {
        switch (e.code) {
            case 'ArrowLeft':  case 'KeyA':  this.keys.left  = false; break;
            case 'ArrowRight': case 'KeyD':  this.keys.right = false; break;
            case 'ArrowUp':    case 'KeyW':  case 'Space':  this.keys.jump = false; break;
            case 'ArrowDown':  case 'KeyS':  this.keys.down  = false; break; // Keep S here for consistency
            case 'ShiftLeft':  case 'ShiftRight': case 'KeyX': this.keys.run = false; break;
        }
    }

    /* ─── Navigation ─── */
    goHome() {
        this.hideOverlays();
        try { AudioSystem.stopMusic(); } catch(e) {}
        this.state = 'START';
        this.startScreen.classList.remove('hidden');
        this.startScreen.classList.add('active');
    }

    startGame() {
        try {
            this.level  = new Level(this.currentLevelNum);
            this.player = new Player(60, 272);
            this.particles = [];
            this.fireballs = [];

            this.time      = this.level.timeLimit;
            this.timeTimer = 0;
            this.cameraX   = 0;

            this.player.onHeadBump = (tx, ty, tile) => this.handleHeadBump(tx, ty, tile);

            this.updateHUD();
            this.hideOverlays();
            this.state = 'PLAYING';
            try { AudioSystem.startMusic(); } catch(e) {}
        } catch(err) {
            console.error('startGame error:', err);
        }
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            this.hideOverlays();
            this.pauseScreen.classList.remove('hidden');
            this.pauseScreen.classList.add('active');
            try { AudioSystem.stopMusic(); } catch(e) {}
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.hideOverlays();
            try { AudioSystem.startMusic(); } catch(e) {}
        }
    }

    openLevelSelect() {
        this.previousState = this.state;
        this.state = 'LEVELS';
        this.hideOverlays();
        this.levelScreen.classList.remove('hidden');
        this.levelScreen.classList.add('active');
    }

    closeLevelSelect() {
        this.levelScreen.classList.add('hidden');
        this.levelScreen.classList.remove('active');
        if (this.previousState === 'PAUSED') {
            this.pauseScreen.classList.remove('hidden');
            this.pauseScreen.classList.add('active');
            this.state = 'PAUSED';
        } else {
            this.startScreen.classList.remove('hidden');
            this.startScreen.classList.add('active');
            this.state = 'START';
        }
    }

    openShop() {
        if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'START') {
            this.previousState = this.state;
            this.state = 'SHOP';
            this.updateShopUI();
            this.hideOverlays();
            this.shopScreen.classList.remove('hidden');
            this.shopScreen.classList.add('active');
            if (this.previousState === 'PLAYING') {
                try { AudioSystem.stopMusic(); } catch(e) {}
            }
        }
    }

    closeShop() {
        this.shopScreen.classList.add('hidden');
        this.shopScreen.classList.remove('active');
        if (this.previousState === 'PAUSED') {
            this.pauseScreen.classList.remove('hidden');
            this.pauseScreen.classList.add('active');
            this.state = 'PAUSED';
        } else if (this.previousState === 'START') {
            this.startScreen.classList.remove('hidden');
            this.startScreen.classList.add('active');
            this.state = 'START';
        } else {
            this.state = 'PLAYING';
            try { AudioSystem.startMusic(); } catch(e) {}
        }
    }

    buyItem(itemType) {
        let purchased = false;
        // When buying from the shop, show floating text in the center of the screen.
        const particleX = this.virtualWidth / 2;
        const particleY = this.virtualHeight / 2;

        // Player-specific items can only be bought when a player entity exists (during gameplay).
        const canBuyPlayerItems = this.player && (this.previousState === 'PLAYING' || this.previousState === 'PAUSED');

        if (itemType === 'shroom' && this.coins >= 5 && canBuyPlayerItems) {
            this.coins -= 5;
            this.player.grow(AudioSystem);
            this.particles.push(new FloatingText(particleX, particleY, 'GROW!', '#00e676'));
            purchased = true;
        } else if (itemType === 'life' && this.coins >= 10) {
            // Lives are a global stat, can be bought anytime.
            this.coins -= 10;
            this.lives++;
            this.particles.push(new FloatingText(particleX, particleY, '1-UP!', '#00e676'));
            purchased = true;
        } else if (itemType === 'speed' && this.coins >= 8 && canBuyPlayerItems) {
            this.coins -= 8;
            this.player.speedBoost = 1.35;
            this.particles.push(new FloatingText(particleX, particleY, 'SPEED UP!', '#29b6f6'));
            purchased = true;
        } else if (itemType === 'star' && this.coins >= 15 && canBuyPlayerItems) {
            this.coins -= 15;
            this.player.isStarInvincible = true;
            this.player.starTimer = 900;
            this.particles.push(new FloatingText(particleX, particleY, 'STAR POWER!', '#fcd000'));
            purchased = true;
        } else if (itemType === 'hammer' && this.coins >= 12 && canBuyPlayerItems && !this.player.hasHammerPower) {
            this.coins -= 12;
            this.player.hasHammerPower = true;
            this.particles.push(new FloatingText(particleX, particleY, 'HAMMER TIME!', '#a0522d'));
            purchased = true;
        }
        if (purchased) {
            try { AudioSystem.playBuySound(); } catch(e) { try { AudioSystem.playCoin(); } catch(e2) {} }
            this.updateHUD();
            this.updateShopUI();
        }
    }

    hideOverlays() {
        [this.startScreen, this.pauseScreen, this.shopScreen, this.levelScreen, this.gameoverScreen, this.victoryScreen, this.endingScreen]
            .forEach(s => { if (s) { s.classList.add('hidden'); s.classList.remove('active'); } });
    }

    updateShopUI() {
        // Player-specific items can only be bought when a player entity exists.
        const canBuyPlayerItems = this.player && (this.previousState === 'PLAYING' || this.previousState === 'PAUSED');

        document.getElementById('shop-coin-count').textContent = this.coins;
        document.getElementById('buy-shroom-btn').disabled = this.coins < 5 || !canBuyPlayerItems;
        document.getElementById('buy-life-btn').disabled   = this.coins < 10;
        document.getElementById('buy-speed-btn').disabled  = this.coins < 8 || !canBuyPlayerItems;
        document.getElementById('buy-star-btn').disabled   = this.coins < 15 || !canBuyPlayerItems;
        document.getElementById('buy-hammer-btn').disabled = this.coins < 12 || !canBuyPlayerItems || this.player.hasHammerPower;
    }

    /* ─── Block Bump Handler ─── */
    handleHeadBump(tx, ty, tile) {
        if (!tile) return;
        if (tile.isQuestion) {
            this.level.setTile(tx, ty, 9); // Set to empty block
            if (tile.hasMushroom) {
                // If player is big, spawn a Fire Flower. Otherwise, a Mushroom.
                const item = this.player.isBig
                    ? new FireFlower(tx * 30, (ty - 1) * 30)
                    : new Mushroom(tx * 30, (ty - 1) * 30);
                this.level.items.push(item);
                try { AudioSystem.playBump(); } catch(e) {}
            } else {
                // It's a coin
                this.coins++;
                this.score += 200;
                this.particles.push(new FloatingText(tx * 30 - this.cameraX, ty * 30 - 12, '+200', '#fcd000'));
                try { AudioSystem.playCoin(); } catch(e) {}
            }
        } else if (tile.isBrick) {
            if (this.player.isBig || this.player.hasHammerPower) { // Player can break brick if big OR has hammer power
                this.level.setTile(tx, ty, 0);
                this.score += 50;
                try { AudioSystem.playBreak(); } catch(e) {}
                const bx = tx * 30, by = ty * 30;
                this.particles.push(new BrickParticle(bx - this.cameraX,      by,      -3, -5));
                this.particles.push(new BrickParticle(bx + 15 - this.cameraX, by,       3, -5));
                this.particles.push(new BrickParticle(bx - this.cameraX,      by + 15, -2, -2.5));
                this.particles.push(new BrickParticle(bx + 15 - this.cameraX, by + 15,  2, -2.5));
            } else {
                try { AudioSystem.playBump(); } catch(e) {}
            }
        }
    }

    /* ─── Player Actions ─── */
    shootFireball() {
        if (!this.player || !this.player.isFiery || !this.player.canShoot) return;

        const fireball = new Fireball(
            this.player.x + (this.player.facing === 1 ? 20 : -12),
            this.player.y + 20,
            this.player.facing
        );
        this.fireballs.push(fireball);
        this.player.canShoot = false;
        this.player.shootCooldown = 20; // Cooldown managed on player
        try { AudioSystem.playFireballSound(); } catch(e) {}
    }

    useHammer() {
        if (!this.player || !this.player.canShoot) return; // Reuse canShoot/shootCooldown

        const player = this.player;
        const level = this.level;
        const tileSize = level.tileSize;

        // Determine target tile in front of the player based on their facing direction.
        const checkX = player.facing === 1
            ? Math.floor((player.x + player.w + 1) / tileSize)
            : Math.floor((player.x - 1) / tileSize);

        // Check the column of tiles at the player's height.
        const startTileY = Math.floor(player.y / tileSize);
        const endTileY = Math.floor((player.y + player.h - 1) / tileSize);

        for (let ty = startTileY; ty <= endTileY; ty++) {
            const tile = level.getTile(checkX, ty);
            if (tile && tile.isBrick) {
                // Found a brick to break.
                level.setTile(checkX, ty, 0);
                this.score += 50;
                try { AudioSystem.playBreak(); } catch(e) {}

                // Create brick break particles for visual feedback.
                const bx = checkX * tileSize, by = ty * tileSize;
                this.particles.push(new BrickParticle(bx - this.cameraX, by, player.facing * 2, -5));
                this.particles.push(new BrickParticle(bx + 15 - this.cameraX, by, player.facing * 4, -5));

                // Set a cooldown to prevent rapid-fire breaking.
                player.canShoot = false;
                player.shootCooldown = 20; // Same cooldown as fireball.

                return; // Only break one block per key press.
            }
        }
    }

    tryEnterPipe() {
        if (this.state !== 'PLAYING' || !this.player.isCrouching) return;

        const player = this.player;
        const level = this.level;
        const tileSize = level.tileSize;

        // Check tile directly under the player's center. Player's y is top, h is height.
        const checkX = Math.floor((player.x + player.w / 2) / tileSize);
        const checkY = Math.floor((player.y + player.h) / tileSize);

        const tile = level.getTile(checkX, checkY);

        if (tile && tile.isEnterable) {
            const dest = level.getPipeDestination(checkX, checkY);
            if (dest) {
                this.startPipeTransition(dest);
            }
        }
    }

    startPipeTransition(destination) {
        this.state = 'PIPE_TRANSITION';
        this.player.isEnteringPipe = true;
        this.transitionData = {
            timer: 0,
            duration: 90, // 1.5 seconds
            destination: destination
        };
        try { AudioSystem.playPipeSound(); } catch(e) {}
    }

    handlePipeTransition() {
        const data = this.transitionData;
        data.timer++;

        this.player.y += 1; // Animate player moving down into pipe
        this.player.vx = 0; // Stop any horizontal movement

        if (data.timer >= data.duration) {
            // Teleport player to destination
            this.player.x = data.destination.tx * this.level.tileSize;
            this.player.y = data.destination.ty * this.level.tileSize;
            this.player.vy = 0;

            // Snap camera to new position
            const targetCameraX = this.player.x - this.virtualWidth * 0.4;
            this.cameraX = Math.max(0, Math.min(targetCameraX, (this.level.width * 30) - this.virtualWidth));

            // End transition
            this.state = 'PLAYING';
            this.player.isEnteringPipe = false;
            this.transitionData = null;
        }
    }

    /* ─── Main Update ─── */
    update() {
        // Update particles regardless of game state for effects like shop purchase text.
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => !p.remove);

        if (this.state === 'PIPE_TRANSITION') {
            this.handlePipeTransition();
            return;
        }

        if (this.state !== 'PLAYING') return;

        try {
            /* Timer */
            this.timeTimer++;
            if (this.timeTimer >= 60) {
                this.timeTimer = 0;
                this.time--;
                if (this.time <= 0) { this.handlePlayerDeath(); return; }
            }

            /* Player */
            this.player.update(this.level, this.keys, AudioSystem);

            // Check for pipe entry after player update
            if (this.player.isCrouching && this.keys.down) {
                this.tryEnterPipe();
            }

            // In regular levels, prevent player from moving left of the camera.
            if (!this.level.isBossLevel && this.player.x < this.cameraX) {
                this.player.x  = this.cameraX;
                this.player.vx = 0;
            }

            /* Pit death */
            if (this.player.y > this.virtualHeight + 50) {
                this.handlePlayerDeath(); return;
            }

            /* Camera */
            // The target x-position for the camera is ahead of the player in normal levels,
            // and centered on the player in boss levels for better arena visibility.
            const targetOffsetX = this.level.isBossLevel ? this.virtualWidth / 2 : this.virtualWidth * 0.4;
            const targetCameraX = this.player.x - targetOffsetX;
            
            // In a boss level, the camera should be able to move left and right.
            // In a regular level, it should only move forward.
            if (this.level.isBossLevel || targetCameraX > this.cameraX) {
                // Use linear interpolation (lerp) for a smooth "catch-up" effect.
                // A smaller smoothing factor (e.g., 0.05) results in a smoother, more delayed camera.
                const smoothing = 0.08;
                const newCameraX = this.cameraX + (targetCameraX - this.cameraX) * smoothing;

                // Clamp the camera to the level's boundaries.
                const maxCameraX = (this.level.width * 30) - this.virtualWidth;
                this.cameraX = Math.max(0, Math.min(newCameraX, maxCameraX));
            }

            /* Items (mushrooms) */
            this.level.items.forEach(item => {
                item.update(this.level);
                if (PhysicsEngine.checkOverlap(this.player.getBounds(), item.getBounds())) {
                    item.remove = true;
                    if (item instanceof Mushroom) {
                        this.player.grow(AudioSystem);
                        this.score += 1000;
                        this.particles.push(new FloatingText(this.player.x - this.cameraX, this.player.y - 12, '+1000', '#00e676'));
                    } else if (item instanceof FireFlower) {
                        this.player.promoteToFiery(AudioSystem);
                        this.score += 1000;
                        this.particles.push(new FloatingText(this.player.x - this.cameraX, this.player.y - 12, 'FIERY!', '#ff8c00'));
                    } else if (item instanceof Axe) { // New axe logic
                        item.remove = true;
                        this.score += 1000; // Score for collecting axe
                        this.particles.push(new FloatingText(this.player.x - this.cameraX, this.player.y - 12, 'AXE!', '#fcd000'));
                        try { AudioSystem.playPowerUp(); } catch(e) {} // Use power-up sound for now

                        // Defeat the boss instantly
                        const boss = this.level.enemies.find(e => e instanceof Browser);
                        if (boss && !boss.isDead) {
                            boss.isDead = true;
                            boss.vy = -8; // Make it bounce up as if defeated
                            boss.vx = 0;
                            // The score for defeating the boss is already added in Browser.takeDamage,
                            // but since we're setting isDead directly, we need to add it here.
                            this.score += 5000;
                            this.particles.push(new FloatingText(boss.x - this.cameraX, boss.y - 32, '+5000', '#fcd000'));
                        }
                    }
                }
            });
            this.level.items = this.level.items.filter(i => !i.remove);

            /* Fireballs */
            this.fireballs.forEach(fb => {
                fb.update(this.level);
                // Check collision with enemies
                if (fb instanceof Fireball && !(fb instanceof BrowserFire)) {
                    this.level.enemies.forEach(enemy => {
                        if (!enemy.isDead && !enemy.remove && PhysicsEngine.checkOverlap(fb.getBounds(), enemy.getBounds())) {
                            fb.remove = true;
                            if (enemy instanceof Browser) {
                                enemy.takeDamage(this);
                            } else if (typeof enemy.squish === 'function') {
                                enemy.squish(); // Use squish for visual effect, but it's a hit
                            } else {
                                enemy.remove = true;
                            }
                            this.score += 200;
                            try { AudioSystem.playStomp(); } catch(e) {} // Or a fireball hit sound
                            this.particles.push(new FloatingText(enemy.x - this.cameraX, enemy.y - 12, '+200', '#ff8c00'));
                        }
                    });
                } else if (fb instanceof BrowserFire) { // Boss fireballs hit player
                    if (PhysicsEngine.checkOverlap(fb.getBounds(), this.player.getBounds())) {
                        fb.remove = true;
                        const died = this.player.takeDamage(AudioSystem);
                        if (died) this.handlePlayerDeath();
                    }
                }
            });
            this.fireballs = this.fireballs.filter(fb => !fb.remove);

            /* Collectible Coins */
            this.level.coins.forEach(coin => {
                coin.update();
                if (!coin.collected && PhysicsEngine.checkOverlap(this.player.getBounds(), coin.getBounds())) {
                    coin.collected = true;
                    coin.remove    = true;
                    this.coins++;
                    this.score += 200;
                    try { AudioSystem.playCoin(); } catch(e) {}
                    this.particles.push(new FloatingText(
                        this.player.x - this.cameraX, this.player.y - 18, '+200', '#fcd000'
                    ));
                }
            });
            this.level.coins = this.level.coins.filter(c => !c.remove);

            /* Moving Obstacles update (physics side) */
            if (this.level.movingObstacles) {
                this.level.updateMovingObstacles();
                this.level.movingObstacles.forEach(obs => {
                    if (!this.player.isStarInvincible &&
                        !this.player.isInvincible &&
                        PhysicsEngine.checkOverlap(this.player.getBounds(), obs.getBounds())) {
                        const died = this.player.takeDamage(AudioSystem);
                        if (died) this.handlePlayerDeath();
                    }
                });
            }

            /* Enemies */
            const playerBounds = this.player.getBounds();
            this.level.enemies.forEach(enemy => {
                if (enemy.isDead || enemy.remove) return;
                enemy.update(this.level, this);

                const eb = enemy.getBounds();
                if (!PhysicsEngine.checkOverlap(playerBounds, eb)) return;

                /* Star power — squish everything */
                if (this.player.isStarInvincible) {
                    if (typeof enemy.squish === 'function') enemy.squish();
                    else enemy.remove = true;
                    this.score += 200;
                    try { AudioSystem.playStomp(); } catch(e) {}
                    this.particles.push(new FloatingText(enemy.x - this.cameraX, enemy.y - 12, '+200', '#fcd000'));
                    return;
                }

                const isStomp = (this.player.vy > 0 && playerBounds.y + playerBounds.h <= eb.y + 12);

                if (enemy instanceof Goomba) {
                    if (isStomp) {
                        enemy.squish();
                        this.player.vy = -6.5;
                        this.score += 100;
                        try { AudioSystem.playStomp(); } catch(e) {}
                        this.particles.push(new FloatingText(enemy.x - this.cameraX, enemy.y - 12, '+100', '#ffffff'));
                    } else if (!enemy.isSquished) {
                        const died = this.player.takeDamage(AudioSystem);
                        if (died) this.handlePlayerDeath();
                    }
                } else if (enemy instanceof Koopa) {
                    if (isStomp) {
                        enemy.stomp();
                        this.player.vy = -6.5;
                        this.score += 100;
                        try { AudioSystem.playStomp(); } catch(e) {}
                    } else if (enemy.isShell && !enemy.shellMoving) {
                        enemy.stomp();
                        try { AudioSystem.playBump(); } catch(e) {}
                    } else if (!enemy.isShell) {
                        const died = this.player.takeDamage(AudioSystem);
                        if (died) this.handlePlayerDeath();
                    }
                } else if (enemy instanceof Browser) {
                    if (isStomp) {
                        enemy.takeDamage(this);
                        this.player.vy = -8; // Higher bounce off boss
                        try { AudioSystem.playStomp(); } catch(e) {}
                    } else if (!enemy.isDead) { // Don't take damage from a dead boss
                        const died = this.player.takeDamage(AudioSystem);
                        if (died) this.handlePlayerDeath();
                    }
                } else if (enemy instanceof FlyingEnemy) { // New Flying Enemy collision logic
                    if (isStomp) {
                        enemy.squish();
                        this.player.vy = -6.5; // Bounce player up
                        this.score += 100;
                        try { AudioSystem.playStomp(); } catch(e) {}
                        this.particles.push(new FloatingText(enemy.x - this.cameraX, enemy.y - 12, '+100', '#ffffff'));
                    } else if (!enemy.isShell) {
                        const died = this.player.takeDamage(AudioSystem);
                        if (died) this.handlePlayerDeath();
                    }
                }
            });

            /* Shell chain kills */
            this.level.enemies.forEach(enemy => {
                if (enemy instanceof Koopa && enemy.isShell && enemy.shellMoving) {
                    this.level.enemies.forEach(other => {
                        if (other !== enemy && !other.isSquished && !other.remove &&
                            PhysicsEngine.checkOverlap(enemy.getBounds(), other.getBounds())) {
                            if (typeof other.squish === 'function') other.squish();
                            else other.remove = true;
                            this.score += 200;
                            try { AudioSystem.playStomp(); } catch(e) {}
                        }
                    });
                }
            });

            this.level.enemies = this.level.enemies.filter(e => !e.remove);

            /* Flagpole */
            let victory = false;
            if (this.level.isBossLevel) {
                const boss = this.level.enemies.find(e => e instanceof Browser);
                if (boss && boss.isDead && this.state === 'PLAYING') {
                    victory = true;
                }
            } else if (this.level.flagpoleX > 0 && this.player.x >= this.level.flagpoleX - 15) {
                victory = true;
            }

            if (victory) {
                if (this.currentLevelNum === 25) this.handleGrandEnding();
                else this.handleVictory();
            }

            this.updateHUD();
        } catch(err) {
            console.error('Update error:', err);
        }
    }

    /* ─── Death / Victory ─── */
    handlePlayerDeath() {
        this.lives--;
        try { AudioSystem.playDeath(); } catch(e) {}

        if (this.lives <= 0) {
            this.state = 'GAMEOVER';
            document.getElementById('final-score').textContent = String(this.score).padStart(6, '0');
            this.hideOverlays();
            this.gameoverScreen.classList.remove('hidden');
            this.gameoverScreen.classList.add('active');
        } else {
            this.player = new Player(60, 272);
            this.player.onHeadBump = (tx, ty, tile) => this.handleHeadBump(tx, ty, tile);
            this.cameraX = 0;
            this.time    = this.level ? this.level.timeLimit : 400;
        }
    }

    handleVictory() {
        this.state = 'VICTORY';
        try { AudioSystem.playVictory(); } catch(e) {}
        const timeBonus = this.time * 50;
        this.score += timeBonus;

        document.getElementById('victory-stage-text').textContent = `World ${this.level.worldName} Cleared!`;
        document.getElementById('victory-score').textContent = String(this.score).padStart(6, '0');
        document.getElementById('victory-time').textContent  = this.time;

        this.hideOverlays();
        this.victoryScreen.classList.remove('hidden');
        this.victoryScreen.classList.add('active');
    }

    handleGrandEnding() {
        this.state = 'ENDING';
        try { AudioSystem.playVictory(); } catch(e) {}
        this.score += this.time * 100;

        document.getElementById('ending-score').textContent = String(this.score).padStart(6, '0');
        this.hideOverlays();
        this.endingScreen.classList.remove('hidden');
        this.endingScreen.classList.add('active');
    }

    /* ─── HUD ─── */
    updateHUD() {
        this.hudScore.textContent = String(this.score).padStart(6, '0');
        this.hudCoins.textContent = String(this.coins).padStart(2, '0');
        this.hudWorld.textContent = this.level ? this.level.worldName : '1-1';
        this.hudTime.textContent  = String(this.time).padStart(3, '0');
        this.hudLives.textContent = `❤️ x${this.lives}`;
    }

    /* ─── Render ─── */
    render() {
        try {
            // Sky
            const skyColor = this.level ? SpriteRenderer.themes[this.level.theme].sky : '#5c94fc';
            this.ctx.fillStyle = skyColor;
            this.ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

            if (!this.level) return;

            // Level tiles, scenery, moving obstacles
            this.level.draw(this.ctx, this.cameraX, this.virtualWidth, this.virtualHeight);

            // Items (mushrooms, flowers)
            this.level.items.forEach(item => {
                this.ctx.save();
                this.ctx.translate(-this.cameraX, 0);
                item.draw(this.ctx);
                this.ctx.restore();
            });

            // Collectible coins
            this.level.coins.forEach(coin => {
                const screenX = coin.x - this.cameraX;
                if (screenX > -30 && screenX < this.virtualWidth + 30) {
                    this.ctx.save();
                    this.ctx.translate(-this.cameraX, 0);
                    coin.draw(this.ctx);
                    this.ctx.restore();
                }
            });

            // Enemies
            this.level.enemies.forEach(enemy => {
                if (enemy.remove) return;
                const screenX = enemy.x - this.cameraX;
                if (screenX > -60 && screenX < this.virtualWidth + 60) {
                    this.ctx.save();
                    this.ctx.translate(-this.cameraX, 0);
                    enemy.draw(this.ctx);
                    this.ctx.restore();
                }
            });

            // Player
            if (this.player && !this.player.isDead) {
                this.ctx.save();
                this.ctx.translate(-this.cameraX, 0);
                this.player.draw(this.ctx);
                this.ctx.restore();
            }

            // Fireballs
            this.fireballs.forEach(fb => {
                const screenX = fb.x - this.cameraX;
                if (screenX > -30 && screenX < this.virtualWidth + 30) {
                    this.ctx.save();
                    this.ctx.translate(-this.cameraX, 0);
                    fb.draw(this.ctx);
                    this.ctx.restore();
                }
            });

            // Particles / floating text
            this.particles.forEach(p => p.draw(this.ctx));
        } catch(err) {
            console.error('Render error:', err);
        }
    }

    /* ─── Game Loop ─── */
    loop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine();
    game.loop();
});

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
    }

    /* ─── Input ─── */
    handleKeyDown(e) {
        try { AudioSystem.init(); } catch(err) {}
        switch (e.code) {
            case 'ArrowLeft':  case 'KeyA':  this.keys.left  = true; break;
            case 'ArrowRight': case 'KeyD':  this.keys.right = true; break;
            case 'ArrowUp':    case 'KeyW':  case 'Space': this.keys.jump = true; e.preventDefault(); break;
            case 'ArrowDown':                this.keys.down  = true; break;
            case 'ShiftLeft':  case 'ShiftRight': case 'KeyX': this.keys.run = true; break;
            case 'KeyS':
                if      (this.state === 'PLAYING' || this.state === 'PAUSED') this.openShop();
                else if (this.state === 'SHOP')  this.closeShop();
                else     this.keys.down = true;
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
            case 'ArrowDown':  case 'KeyS':  this.keys.down = false; break;
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
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
            this.previousState = this.state;
            this.state = 'SHOP';
            this.updateShopUI();
            this.hideOverlays();
            this.shopScreen.classList.remove('hidden');
            this.shopScreen.classList.add('active');
        }
    }

    closeShop() {
        this.shopScreen.classList.add('hidden');
        this.shopScreen.classList.remove('active');
        if (this.previousState === 'PAUSED') {
            this.pauseScreen.classList.remove('hidden');
            this.pauseScreen.classList.add('active');
            this.state = 'PAUSED';
        } else {
            this.state = 'PLAYING';
            try { AudioSystem.startMusic(); } catch(e) {}
        }
    }

    updateShopUI() {
        document.getElementById('shop-coin-count').textContent = this.coins;
        document.getElementById('buy-shroom-btn').disabled = this.coins < 5;
        document.getElementById('buy-life-btn').disabled   = this.coins < 10;
        document.getElementById('buy-speed-btn').disabled  = this.coins < 8;
        document.getElementById('buy-star-btn').disabled   = this.coins < 15;
    }

    buyItem(itemType) {
        if (!this.player) return;
        if (itemType === 'shroom' && this.coins >= 5) {
            this.coins -= 5;
            this.player.grow(AudioSystem);
            this.particles.push(new FloatingText(this.player.x - this.cameraX, this.player.y - 12, 'GROW!', '#00e676'));
        } else if (itemType === 'life' && this.coins >= 10) {
            this.coins -= 10;
            this.lives++;
            try { AudioSystem.playBuySound(); } catch(e) { try { AudioSystem.playCoin(); } catch(e2) {} }
            this.particles.push(new FloatingText(this.player.x - this.cameraX, this.player.y - 12, '+1 LIFE!', '#ff3855'));
        } else if (itemType === 'speed' && this.coins >= 8) {
            this.coins -= 8;
            this.player.speedBoost = 1.35;
            try { AudioSystem.playBuySound(); } catch(e) { try { AudioSystem.playCoin(); } catch(e2) {} }
            this.particles.push(new FloatingText(this.player.x - this.cameraX, this.player.y - 12, 'SPEED UP!', '#29b6f6'));
        } else if (itemType === 'star' && this.coins >= 15) {
            this.coins -= 15;
            this.player.isStarInvincible = true;
            this.player.starTimer = 900;
            try { AudioSystem.playBuySound(); } catch(e) { try { AudioSystem.playCoin(); } catch(e2) {} }
            this.particles.push(new FloatingText(this.player.x - this.cameraX, this.player.y - 12, 'STAR POWER!', '#fcd000'));
        }
        this.updateHUD();
        this.updateShopUI();
    }

    hideOverlays() {
        [this.startScreen, this.pauseScreen, this.shopScreen,
         this.levelScreen, this.gameoverScreen, this.victoryScreen, this.endingScreen]
            .forEach(s => { if (s) { s.classList.add('hidden'); s.classList.remove('active'); } });
    }

    /* ─── Block Bump Handler ─── */
    handleHeadBump(tx, ty, tile) {
        if (!tile) return;
        if (tile.isQuestion) {
            this.level.setTile(tx, ty, 9);
            if (tile.hasMushroom) {
                const shroom = new Mushroom(tx * 30, (ty - 1) * 30);
                this.level.items.push(shroom);
                try { AudioSystem.playBump(); } catch(e) {}
            } else {
                this.coins++;
                this.score += 200;
                this.particles.push(new FloatingText(tx * 30 - this.cameraX, ty * 30 - 12, '+200', '#fcd000'));
                try { AudioSystem.playCoin(); } catch(e) {}
            }
        } else if (tile.isBrick) {
            if (this.player.isBig) {
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

    /* ─── Main Update ─── */
    update() {
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

            if (this.player.x < this.cameraX) {
                this.player.x  = this.cameraX;
                this.player.vx = 0;
            }

            /* Pit death */
            if (this.player.y > this.virtualHeight + 50) {
                this.handlePlayerDeath(); return;
            }

            /* Camera */
            const targetCameraX = this.player.x - this.virtualWidth * 0.4;
            if (targetCameraX > this.cameraX) {
                this.cameraX = Math.min(targetCameraX, (this.level.width * 30) - this.virtualWidth);
            }

            /* Items (mushrooms) */
            this.level.items.forEach(item => {
                item.update(this.level);
                if (PhysicsEngine.checkOverlap(this.player.getBounds(), item.getBounds())) {
                    item.remove = true;
                    this.player.grow(AudioSystem);
                    this.score += 1000;
                    this.particles.push(new FloatingText(this.player.x - this.cameraX, this.player.y - 12, '+1000', '#00e676'));
                }
            });
            this.level.items = this.level.items.filter(i => !i.remove);

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
                enemy.update(this.level);

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

            /* Particles */
            this.particles.forEach(p => p.update());
            this.particles = this.particles.filter(p => !p.remove);

            /* Flagpole */
            if (this.player.x >= this.level.flagpoleX - 15) {
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

            // Mushroom items
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

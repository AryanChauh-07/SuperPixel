/**
 * Pixel Mirio - Game Entities
 */

class Entity {
    constructor(x, y, w, h) {
        this.x = x;  this.y = y;
        this.w = w;  this.h = h;
        this.vx = 0; this.vy = 0;
        this.isGrounded = false;
        this.isDead  = false;
        this.remove  = false;
    }
    getBounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    update(level) { PhysicsEngine.updateEntity(this, level); }
}

/* ═══════════════════════════════════════════════════
   Player (Pixel Mirio)
═══════════════════════════════════════════════════ */
class Player extends Entity {
    constructor(x, y) {
        super(x, y, 26, 28);
        this.isBig            = false;
        this.isCrouching      = false;
        this.isFiery          = false;
        this.facing           = 1;
        this.animFrame        = 'idle';
        this.walkCounter      = 0;
        this.isInvincible     = false;
        this.invincibleTimer  = 0;
        this.isStarInvincible = false;
        this.starTimer        = 0;
        this.speedBoost       = 1.0;
        this.isGrowing        = false;
        this.growTimer        = 0;
        this.isEnteringPipe   = false;
        this.canShoot         = true;
        this.shootCooldown    = 0;

        this.walkSpeed  = 3.5;
        this.runSpeed   = 5.6;
        this.accel      = 0.32;
        this.friction   = 0.85;
        this.jumpForce  = -10.2;
        this.bigJumpForce = -11.4;
    }

    update(level, keys, sound) {
        if (this.isEnteringPipe) {
            this.animFrame = 'idle'; // Keep a neutral frame during pipe travel
            return;
        }

        if (this.isGrowing) {
            this.growTimer++;
            if (this.growTimer > 30) {
                this.isGrowing = false;
                this.isBig = true;
                this.h = 56;
                this.y -= 28;
            }
            return;
        }

        if (this.isStarInvincible) {
            this.starTimer--;
            if (this.starTimer <= 0) this.isStarInvincible = false;
        }
        if (this.isInvincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) this.isInvincible = false;
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown--;
            if (this.shootCooldown <= 0) this.canShoot = true;
        }

        const isRunning = keys.run;
        const maxSpeed  = (isRunning ? this.runSpeed : this.walkSpeed) * this.speedBoost;
        
        // Crouching logic
        this.isCrouching = this.isBig && keys.down && this.isGrounded;

        if (this.isCrouching) {
            this.animFrame = 'crouch';
            this.h = 30; // Physics height for crouch
            this.vx *= this.friction; // Stop moving
        } else {
            if (this.isBig) this.h = 56; // Restore physics height

            // Horizontal movement
            if (keys.right) {
                this.vx += this.accel;
                if (this.vx > maxSpeed) this.vx = maxSpeed;
                this.facing = 1;
            } else if (keys.left) {
                this.vx -= this.accel;
                if (this.vx < -maxSpeed) this.vx = -maxSpeed;
                this.facing = -1;
            } else {
                this.vx *= this.friction;
                if (Math.abs(this.vx) < 0.08) this.vx = 0;
            }
        }

        if (keys.jump && this.isGrounded && !this.isCrouching) {
            this.vy = this.isBig ? this.bigJumpForce : this.jumpForce;
            this.isGrounded = false;
            if (sound) sound.playJump();
        }
        if (!keys.jump && this.vy < -3.5) this.vy *= 0.6;

        if (this.isCrouching) {
            this.animFrame = 'crouch';
        } else if (!this.isGrounded) {
            this.animFrame = 'jump';
        } else if (Math.abs(this.vx) > 0.2) {
            this.walkCounter += Math.abs(this.vx) * 0.15;
            this.animFrame = Math.floor(this.walkCounter) % 2 === 0 ? 'walk1' : 'walk2';
        } else {
            this.animFrame = 'idle';
        }

        super.update(level);
    }

    takeDamage(sound) {
        if (this.isStarInvincible || this.isInvincible || this.isGrowing) return false;
        if (this.isFiery) {
            this.isCrouching = false;
            this.isFiery = false;
            this.isInvincible = true;
            this.invincibleTimer = 90;
            if (sound) sound.playBump(); // Power-down sound
            return false;
        }
        if (this.isBig) {
            this.isCrouching = false;
            this.isBig = false;
            this.h = 28;
            this.isInvincible = true;
            this.invincibleTimer = 90;
            if (sound) sound.playBump();
            return false;
        }
        this.isDead = true;
        if (sound) sound.playDeath();
        return true;
    }

    grow(sound) {
        if (!this.isBig && !this.isGrowing) {
            this.isGrowing = true;
            this.growTimer = 0;
            if (sound) sound.playPowerUp();
        }
    }

    promoteToFiery(sound) {
        if (!this.isBig) {
            this.grow(sound); // If small, just grow into Big Mario
        } else {
            this.isFiery = true;
            if (sound) sound.playPowerUp();
        }
    }

    draw(ctx) {
        if (this.isGrowing && Math.floor(this.growTimer / 4) % 2 === 0) {
            SpriteRenderer.drawSmallHero(ctx, this.x, this.y, 'idle', this.facing, false, false);
        } else if (this.isBig) {
            SpriteRenderer.drawBigHero(ctx, this.x, this.y, this.animFrame, this.facing, this.isInvincible, this.isStarInvincible, this.isFiery);
        } else {
            SpriteRenderer.drawSmallHero(ctx, this.x, this.y, this.animFrame, this.facing, this.isInvincible, this.isStarInvincible);
        }
    }
}

/* ═══════════════════════════════════════════════════
   Goomba
═══════════════════════════════════════════════════ */
class Goomba extends Entity {
    constructor(x, y) {
        super(x, y, 22, 22);
        this.vx = -1.0;
        this.animTimer  = 0;
        this.isSquished = false;
        this.squishTimer = 0;
    }

    onWallHit() { this.vx = -this.vx; }

    squish() {
        if (!this.isSquished) {
            this.isSquished = true;
            this.vx = 0;
            this.vy = 0;
        }
    }

    update(level) {
        if (this.isSquished) {
            this.squishTimer++;
            if (this.squishTimer > 25) this.remove = true;
            return;
        }
        this.animTimer += 0.08;
        super.update(level);
    }

    draw(ctx) {
        SpriteRenderer.drawGoomba(ctx, this.x, this.y, Math.floor(this.animTimer) % 2, this.isSquished);
    }
}

/* ═══════════════════════════════════════════════════
   Koopa Troopa
═══════════════════════════════════════════════════ */
class Koopa extends Entity {
    constructor(x, y) {
        super(x, y, 22, 34);
        this.vx = -0.8;
        this.facing = -1;
        this.animTimer   = 0;
        this.isShell     = false;
        this.shellMoving = false;
        this.isSquished  = false; // needed for star invincible code
    }

    onWallHit() {
        this.vx    = -this.vx;
        this.facing = this.vx > 0 ? 1 : -1;
    }

    /* squish() used by star-invincible code — turns Koopa into shell */
    squish() {
        if (!this.isSquished && !this.isShell) {
            this.stomp();
        } else if (this.isShell) {
            this.isSquished = true;
            this.remove     = true;
        } else {
            this.isSquished = true;
            this.remove     = true;
        }
    }

    stomp() {
        if (!this.isShell) {
            this.isShell     = true;
            this.h           = 20;
            this.y          += 14;
            this.vx          = 0;
            this.shellMoving = false;
        } else if (!this.shellMoving) {
            this.shellMoving = true;
            this.vx = 5.5;
        } else {
            this.shellMoving = false;
            this.vx = 0;
        }
    }

    update(level) {
        if (!this.isShell) this.animTimer += 0.08;
        super.update(level);
    }

    draw(ctx) {
        SpriteRenderer.drawKoopa(ctx, this.x, this.y, Math.floor(this.animTimer) % 2, this.isShell, this.facing);
    }
}

/* ═══════════════════════════════════════════════════
   Super Mushroom
═══════════════════════════════════════════════════ */
class Mushroom extends Entity {
    constructor(x, y) {
        super(x, y, 24, 24);
        this.vx = 1.2;
        this.emerging = true;
        this.emergeY  = y - 24;
    }

    onWallHit() { this.vx = -this.vx; }

    update(level) {
        if (this.emerging) {
            this.y -= 1.0;
            if (this.y <= this.emergeY) { this.y = this.emergeY; this.emerging = false; }
            return;
        }
        super.update(level);
    }

    draw(ctx) { SpriteRenderer.drawMushroom(ctx, this.x, this.y); }
}

/* ═══════════════════════════════════════════════════
   Fire Flower
═══════════════════════════════════════════════════ */
class FireFlower extends Entity {
    constructor(x, y) {
        super(x, y, 24, 24);
        this.emerging = true;
        this.emergeY  = y - 24;
        this.animTimer = 0;
    }

    update(level) {
        this.animTimer++;
        if (this.emerging) {
            this.y -= 1.0;
            if (this.y <= this.emergeY) { this.y = this.emergeY; this.emerging = false; }
            return;
        }
        // Fire flower doesn't move after emerging
    }

    draw(ctx) {
        SpriteRenderer.drawFireFlower(ctx, this.x, this.y, Math.floor(this.animTimer / 8));
    }
}

/* ═══════════════════════════════════════════════════
   Fireball
═══════════════════════════════════════════════════ */
class Fireball extends Entity {
    constructor(x, y, facing) {
        super(x, y, 12, 12);
        this.vx = 6 * facing;
        this.vy = 2; // Start with a slight downward velocity to initiate bounce
        this.animTimer = 0;
        this.bounces = 0;
        this.maxBounces = 4;
    }

    onWallHit() {
        // Fireballs are destroyed on wall hit
        this.remove = true;
    }

    onLand() {
        this.vy = -6; // Bounce up
        this.bounces++;
        if (this.bounces > this.maxBounces) {
            this.remove = true;
        }
    }

    update(level) {
        this.animTimer++;
        super.update(level);
        // Also remove if it falls in a pit
        if (this.y > level.height * level.tileSize) {
            this.remove = true;
        }
    }

    draw(ctx) {
        SpriteRenderer.drawFireball(ctx, this.x, this.y, Math.floor(this.animTimer / 4));
    }
}

/* ═══════════════════════════════════════════════════
   Axe (Boss Defeat Item)
═══════════════════════════════════════════════════ */
class Axe extends Entity {
    constructor(x, y) {
        super(x, y, 24, 24); // Adjust width/height as needed for sprite
        this.remove = false; // To be removed when collected
    }

    update(level) {
        // Axe doesn't move or have complex physics, just sits there
    }

    draw(ctx) {
        SpriteRenderer.drawAxe(ctx, this.x, this.y);
    }
}


/* ═══════════════════════════════════════════════════
   Browser (The Boss)
═══════════════════════════════════════════════════ */
class Browser extends Entity {
    constructor(x, y, levelNum) {
        super(x, y, 60, 70);
        this.hp = 5 + Math.floor(levelNum / 5); // HP scales with world
        this.vx = -1.0;
        this.facing = -1;
        this.state = 'walking'; // walking, jumping, firing
        this.stateTimer = 120; // Time until next action
        this.invincibleTimer = 0; // After taking damage
        this.animTimer = 0;
    }

    onWallHit() {
        this.vx = -this.vx;
        this.facing = this.vx > 0 ? 1 : -1;
    }

    takeDamage(game) {
        if (this.invincibleTimer > 0 || this.isDead) return;

        this.hp--;
        this.invincibleTimer = 45; // Brief invincibility
        game.particles.push(new FloatingText(this.x - game.cameraX, this.y - 12, '-1 HP', '#ff3855'));

        if (this.hp <= 0) {
            this.isDead = true;
            this.state = 'dead';
            this.vy = -8; // Death bounce
            this.vx = 0;
            game.score += 5000;
            game.particles.push(new FloatingText(this.x - game.cameraX, this.y - 32, '+5000', '#fcd000'));
        }
    }

    update(level, game) {
        this.animTimer++;
        if (this.invincibleTimer > 0) this.invincibleTimer--;

        if (this.isDead) {
            // Fall off screen when dead
            this.vy += PhysicsEngine.gravity;
            this.y += this.vy;
            if (this.y > level.height * level.tileSize + 100) this.remove = true;
            return;
        }

        this.stateTimer--;
        if (this.stateTimer <= 0) {
            const rand = Math.random();
            if (rand < 0.4 && this.isGrounded) {
                this.state = 'jumping';
                this.vy = -12;
                this.isGrounded = false;
                this.stateTimer = 150;
            } else if (rand < 0.8) {
                this.state = 'firing';
                this.stateTimer = 90; // Duration of firing state
            } else {
                this.state = 'walking';
                this.stateTimer = 180;
            }
        }

        if (this.state === 'firing' && this.animTimer % 30 === 0) {
            const fire = new BrowserFire(this.x + (this.facing > 0 ? 60 : -20), this.y + 40, this.facing);
            game.fireballs.push(fire); // Use the fireballs array for convenience
        }

        // Use standard physics update
        super.update(level);
    }

    draw(ctx) {
        const isInvincible = this.invincibleTimer > 0;
        SpriteRenderer.drawBrowser(ctx, this.x, this.y, this.facing, this.state, isInvincible);
    }
}

class BrowserFire extends Entity {
    constructor(x, y, facing) {
        super(x, y, 16, 16);
        this.vx = 4.5 * facing; // Slightly faster
        this.vy = 1; // Give it some initial vertical velocity to start bouncing
        this.animTimer = 0;
    }

    onWallHit() {
        // Boss fireballs bounce off walls instead of being destroyed, making them a persistent threat.
        this.vx = -this.vx;
    }

    onLand() {
        // Bounce up when it hits the ground.
        this.vy = -7;
    }

    update(level) {
        this.animTimer++;
        // Use the full physics engine update for bouncing behavior.
        super.update(level);
        // Also remove if it falls in a pit.
        if (this.y > level.height * level.tileSize) {
            this.remove = true;
        }
    }

    draw(ctx) {
        // We can reuse the player's fireball sprite for the boss's fire
        SpriteRenderer.drawFireball(ctx, this.x, this.y, Math.floor(this.animTimer / 4));
    }
}

/* ═══════════════════════════════════════════════════
   FlyingEnemy - A simple enemy that flies horizontally
   and bobs up and down.
═══════════════════════════════════════════════════ */
class FlyingEnemy extends Entity {
    constructor(x, y) {
        super(x, y, 28, 20); // Width and height for a flying enemy
        this.vx = -1.5; // Initial horizontal speed
        this.baseY = y; // Base Y position for bobbing
        this.amplitude = 15; // How much it bobs up and down
        this.frequency = 0.05; // How fast it bobs
        this.animTimer = 0; // For animation and bobbing
        this.isDead = false; // For consistency with other enemies
        this.remove = false; // For removal from game
    }

    // Flying enemies do not use PhysicsEngine.updateEntity directly
    // as they are not affected by gravity or grounding.

    squish() {
        // When stomped or hit by star, it just gets removed
        this.isDead = true;
        this.remove = true;
    }

    update(level) {
        // Horizontal movement
        this.x += this.vx;

        // Vertical bobbing movement
        this.animTimer++; // Increment timer for sine wave
        this.y = this.baseY + Math.sin(this.animTimer * this.frequency) * this.amplitude;

        // Manual horizontal collision detection against solid tiles
        const bounds = this.getBounds();
        const tileSize = PhysicsEngine.tileSize;

        // Check for collision with tiles on its path
        const startTileX = Math.floor(bounds.x / tileSize);
        const endTileX = Math.floor((bounds.x + bounds.w) / tileSize);
        const startTileY = Math.floor(bounds.y / tileSize);
        const endTileY = Math.floor((bounds.y + bounds.h) / tileSize);

        for (let ty = startTileY; ty <= endTileY; ty++) {
            for (let tx = startTileX; tx <= endTileX; tx++) {
                const tile = level.getTile(tx, ty);
                if (tile && tile.solid && PhysicsEngine.checkOverlap(bounds, { x: tx * tileSize, y: ty * tileSize, w: tileSize, h: tileSize })) {
                    this.vx = -this.vx; // Reverse direction
                    this.x += this.vx; // Adjust position immediately to prevent sticking
                    return; // Resolve only one collision per frame
                }
            }
        }
    }

    draw(ctx) {
        SpriteRenderer.drawFlyingEnemy(ctx, this.x, this.y, Math.floor(this.animTimer / 5) % 2);
    }
}

/* ═══════════════════════════════════════════════════
   Collectible Coin (animated)
═══════════════════════════════════════════════════ */
class CollectibleCoin {
    constructor(x, y) {
        this.x = x;  this.y = y;
        this.w = 18; this.h = 18;
        this.animFrame = 0;
        this.bobTimer  = 0;
        this.baseY     = y;
        this.collected = false;
        this.remove    = false;
    }

    getBounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

    update() {
        this.animFrame += 0.1;
        this.bobTimer  += 0.07;
        this.y = this.baseY + Math.sin(this.bobTimer) * 3; // gentle bob
    }

    draw(ctx) {
        SpriteRenderer.drawCoin(ctx, this.x, this.y, Math.floor(this.animFrame) % 4);
    }
}

/* ═══════════════════════════════════════════════════
   Floating Score Text
═══════════════════════════════════════════════════ */
class FloatingText {
    constructor(x, y, text, color = '#ffffff') {
        this.x = x; this.y = y;
        this.text  = text;
        this.color = color;
        this.life  = 50;
        this.remove = false;
    }

    update() {
        this.y -= 0.8;
        this.life--;
        if (this.life <= 0) this.remove = true;
    }

    draw(ctx) {
        const alpha = Math.min(1, this.life / 20);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = this.color;
        ctx.font        = '8px "Press Start 2P", sans-serif';
        ctx.shadowColor = '#000';
        ctx.shadowBlur  = 4;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

/* ═══════════════════════════════════════════════════
   Brick Debris Particle
═══════════════════════════════════════════════════ */
class BrickParticle {
    constructor(x, y, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life   = 35;
        this.remove = false;
    }

    update() {
        this.x  += this.vx;
        this.y  += this.vy;
        this.vy += 0.4;
        this.life--;
        if (this.life <= 0) this.remove = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#b84400';
        ctx.fillRect(this.x, this.y, 6, 6);
        ctx.restore();
    }
}

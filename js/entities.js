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

        this.walkSpeed  = 3.5;
        this.runSpeed   = 5.6;
        this.accel      = 0.32;
        this.friction   = 0.85;
        this.jumpForce  = -10.2;
        this.bigJumpForce = -11.4;
    }

    update(level, keys, sound) {
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

        const isRunning = keys.run;
        const maxSpeed  = (isRunning ? this.runSpeed : this.walkSpeed) * this.speedBoost;

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

        if (keys.jump && this.isGrounded) {
            this.vy = this.isBig ? this.bigJumpForce : this.jumpForce;
            this.isGrounded = false;
            if (sound) sound.playJump();
        }
        if (!keys.jump && this.vy < -3.5) this.vy *= 0.6;

        if (!this.isGrounded) {
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
        if (this.isBig) {
            this.isBig = false;
            this.h = 28;
            this.isInvincible    = true;
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

    draw(ctx) {
        if (this.isGrowing && Math.floor(this.growTimer / 4) % 2 === 0) {
            SpriteRenderer.drawSmallHero(ctx, this.x, this.y, 'idle', this.facing, false, false);
        } else if (this.isBig) {
            SpriteRenderer.drawBigHero(ctx, this.x, this.y, this.animFrame, this.facing, this.isInvincible, this.isStarInvincible);
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

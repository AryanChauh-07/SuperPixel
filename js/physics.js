/**
 * Super Pixel Mario - Physics Engine & Collision Detection
 */

const PhysicsEngine = {
    gravity: 0.48,
    maxFallSpeed: 9.5,
    tileSize: 30,

    /**
     * Check AABB Overlap between two rectangles
     */
    checkOverlap(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.w &&
            rect1.x + rect1.w > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + rect1.h > rect2.y
        );
    },

    /**
     * Move Entity & Resolve Collisions against Tile Map
     */
    updateEntity(entity, level) {
        // Apply Gravity
        if (!entity.isGrounded) {
            entity.vy += this.gravity;
            if (entity.vy > this.maxFallSpeed) entity.vy = this.maxFallSpeed;
        }

        // Horizontal Movement & Collision Resolution
        entity.x += entity.vx;
        this.resolveHorizontalCollisions(entity, level);

        // Vertical Movement & Collision Resolution
        entity.y += entity.vy;
        entity.isGrounded = false;
        this.resolveVerticalCollisions(entity, level);
    },

    resolveHorizontalCollisions(entity, level) {
        const bounds = entity.getBounds();
        const startTileX = Math.floor(bounds.x / this.tileSize);
        const endTileX = Math.floor((bounds.x + bounds.w) / this.tileSize);
        const startTileY = Math.floor(bounds.y / this.tileSize);
        const endTileY = Math.floor((bounds.y + bounds.h - 0.1) / this.tileSize);

        for (let tx = startTileX; tx <= endTileX; tx++) {
            for (let ty = startTileY; ty <= endTileY; ty++) {
                const tile = level.getTile(tx, ty);
                if (tile && tile.solid) {
                    const tileRect = { x: tx * this.tileSize, y: ty * this.tileSize, w: this.tileSize, h: this.tileSize };

                    if (this.checkOverlap(bounds, tileRect)) {
                        if (entity.vx > 0) { // Moving Right
                            entity.x = tileRect.x - bounds.w;
                            if (entity.onWallHit) entity.onWallHit('right');
                        } else if (entity.vx < 0) { // Moving Left
                            entity.x = tileRect.x + tileRect.w;
                            if (entity.onWallHit) entity.onWallHit('left');
                        }
                        entity.vx = 0;
                        return;
                    }
                }
            }
        }
    },

    resolveVerticalCollisions(entity, level) {
        const bounds = entity.getBounds();
        const startTileX = Math.floor(bounds.x / this.tileSize);
        const endTileX = Math.floor((bounds.x + bounds.w - 0.1) / this.tileSize);
        const startTileY = Math.floor(bounds.y / this.tileSize);
        const endTileY = Math.floor((bounds.y + bounds.h) / this.tileSize);

        for (let tx = startTileX; tx <= endTileX; tx++) {
            for (let ty = startTileY; ty <= endTileY; ty++) {
                const tile = level.getTile(tx, ty);
                if (tile && tile.solid) {
                    const tileRect = { x: tx * this.tileSize, y: ty * this.tileSize, w: this.tileSize, h: this.tileSize };

                    if (this.checkOverlap(bounds, tileRect)) {
                        if (entity.vy > 0) { // Landing on Ground
                            entity.y = tileRect.y - bounds.h;
                            entity.vy = 0;
                            entity.isGrounded = true;
                            if (entity.onLand) entity.onLand();
                        } else if (entity.vy < 0) { // Head-bumping Block from underneath
                            entity.y = tileRect.y + tileRect.h;
                            entity.vy = 0;
                            if (entity.onHeadBump) entity.onHeadBump(tx, ty, tile);
                        }
                        return;
                    }
                }
            }
        }
    }
};

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

        // Horizontal Movement & Sub-stepping for Collision Resolution
        const maxSubStep = this.tileSize / 2; // Limit step size to prevent tunneling
        let remainingVx = entity.vx;
        while (Math.abs(remainingVx) > 0.001) { // Use a small epsilon for float comparison
            const step = Math.sign(remainingVx) * Math.min(Math.abs(remainingVx), maxSubStep);
            entity.x += step;
            this.resolveHorizontalCollisions(entity, level);
            // If collision resolution set entity.vx to 0, stop further horizontal movement for this frame
            if (entity.vx === 0) {
                remainingVx = 0;
            } else {
                remainingVx -= step;
            }
        }

        // Vertical Movement & Sub-stepping for Collision Resolution
        // Reset isGrounded before vertical movement to correctly detect landing in resolveVerticalCollisions
        entity.isGrounded = false;
        let remainingVy = entity.vy;
        while (Math.abs(remainingVy) > 0.001) {
            const step = Math.sign(remainingVy) * Math.min(Math.abs(remainingVy), maxSubStep);
            entity.y += step;
            this.resolveVerticalCollisions(entity, level);
            // If collision resolution set entity.vy to 0, stop further vertical movement for this frame
            if (entity.vy === 0) {
                remainingVy = 0;
            } else {
                remainingVy -= step;
            }
        }
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

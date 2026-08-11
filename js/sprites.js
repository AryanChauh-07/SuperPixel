/**
 * Super Mario Pixel Classic - Authentic 16-Bit Pixel Art Renderer
 */

const SpriteRenderer = {
    // 5 World Theme Color Palettes
    themes: {
        grassland: {
            sky: '#5c94fc',
            groundTop: '#00a800',
            groundBody: '#d86800',
            brick: '#b84400',
            question: '#fcd000',
            cloud: '#ffffff',
            hill: '#008800',
            bush: '#00a800'
        },
        cavern: {
            sky: '#0f0c29',
            groundTop: '#8b5cf6',
            groundBody: '#4c1d95',
            brick: '#581c87',
            question: '#a855f7',
            cloud: '#312e81',
            hill: '#4c1d95',
            bush: '#6d28d9'
        },
        sky: {
            sky: '#38bdf8',
            groundTop: '#ffffff',
            groundBody: '#94a3b8',
            brick: '#0284c7',
            question: '#fcd000',
            cloud: '#ffffff',
            hill: '#0ea5e9',
            bush: '#38bdf8'
        },
        desert: {
            sky: '#fef08a',
            groundTop: '#f59e0b',
            groundBody: '#b45309',
            brick: '#92400e',
            question: '#f59e0b',
            cloud: '#fef9c3',
            hill: '#d97706',
            bush: '#b45309'
        },
        lava: {
            sky: '#450a0a',
            groundTop: '#ef4444',
            groundBody: '#7f1d1d',
            brick: '#991b1b',
            question: '#f59e0b',
            cloud: '#7f1d1d',
            hill: '#991b1b',
            bush: '#ef4444'
        }
    },

    /**
     * Draw Classic Small Mario (24x24)
     */
    drawSmallHero(ctx, x, y, frame = 'idle', facing = 1, isInvincible = false, isStar = false) {
        ctx.save();
        ctx.translate(x, y);
        if (facing === -1) {
            ctx.scale(-1, 1);
            ctx.translate(-24, 0);
        }

        if (isInvincible && Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        let capRed = '#e52521';
        let overallsBlue = '#0026e6';
        if (isStar) {
            const hue = (Date.now() / 4) % 360;
            capRed = `hsl(${hue}, 100%, 50%)`;
            overallsBlue = `hsl(${(hue + 180) % 360}, 100%, 50%)`;
        }

        const skin = '#fcc082';
        const brown = '#6b3c00';
        const yellow = '#fcd000';

        // Cap & Brim
        ctx.fillStyle = capRed;
        ctx.fillRect(4, 1, 14, 4);
        ctx.fillRect(3, 3, 18, 3);

        // Cap 'M' Badge
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, 2, 4, 3);
        ctx.fillStyle = capRed;
        ctx.font = 'bold 5px sans-serif';
        ctx.fillText('M', 8.5, 4.5);

        // Face & Hair
        ctx.fillStyle = skin;
        ctx.fillRect(4, 6, 14, 6);
        ctx.fillStyle = brown;
        ctx.fillRect(3, 6, 5, 3); // Hair
        ctx.fillRect(12, 7, 2, 3); // Eye
        ctx.fillRect(9, 9, 8, 3); // Mustache

        // Torso / Shirt & Overalls
        ctx.fillStyle = capRed;
        ctx.fillRect(3, 12, 14, 5); // Red Shirt
        ctx.fillStyle = overallsBlue;
        ctx.fillRect(5, 14, 10, 6); // Overalls
        ctx.fillStyle = yellow;
        ctx.fillRect(6, 16, 2, 2); ctx.fillRect(12, 16, 2, 2); // Yellow Buttons

        // Boots & Legs
        ctx.fillStyle = brown;
        if (frame === 'jump') {
            ctx.fillRect(1, 18, 6, 5);
            ctx.fillRect(14, 18, 6, 5);
        } else if (frame === 'walk1' || frame === 'walk2') {
            const step = frame === 'walk1' ? 2 : -2;
            ctx.fillRect(3 + step, 19, 7, 5);
            ctx.fillRect(12 - step, 19, 7, 5);
        } else {
            ctx.fillRect(3, 19, 7, 5);
            ctx.fillRect(12, 19, 7, 5);
        }

        ctx.restore();
    },

    /**
     * Draw Classic Big Mario (24x48)
     */
    drawBigHero(ctx, x, y, frame = 'idle', facing = 1, isInvincible = false, isStar = false) {
        ctx.save();
        ctx.translate(x, y);
        if (facing === -1) {
            ctx.scale(-1, 1);
            ctx.translate(-24, 0);
        }

        if (isInvincible && Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        let capRed = '#e52521';
        let overallsBlue = '#0026e6';
        if (isStar) {
            const hue = (Date.now() / 4) % 360;
            capRed = `hsl(${hue}, 100%, 50%)`;
            overallsBlue = `hsl(${(hue + 180) % 360}, 100%, 50%)`;
        }

        const skin = '#fcc082';
        const brown = '#6b3c00';
        const yellow = '#fcd000';

        if (frame === 'crouch') {
            ctx.translate(0, 18);
            // Crouching Big Mario (30px tall)
            ctx.fillStyle = capRed;
            ctx.fillRect(4, 1, 15, 5);
            ctx.fillStyle = skin;
            ctx.fillRect(4, 6, 14, 7);
            ctx.fillStyle = brown;
            ctx.fillRect(8, 9, 9, 4); // Mustache
            ctx.fillStyle = overallsBlue;
            ctx.fillRect(3, 13, 16, 11);
            ctx.fillStyle = brown;
            ctx.fillRect(2, 24, 8, 6); ctx.fillRect(12, 24, 8, 6);
        } else {
            // Full Standing Big Mario (48px tall)
            // Cap
            ctx.fillStyle = capRed;
            ctx.fillRect(4, 1, 15, 6);
            ctx.fillRect(3, 4, 18, 4);

            // Cap 'M' Badge
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(9, 2, 5, 4);
            ctx.fillStyle = capRed;
            ctx.font = 'bold 5px sans-serif';
            ctx.fillText('M', 9.5, 5);

            // Head / Face
            ctx.fillStyle = skin;
            ctx.fillRect(4, 8, 14, 10);
            ctx.fillStyle = brown;
            ctx.fillRect(3, 8, 5, 5); // Hair
            ctx.fillRect(13, 11, 3, 4); // Eye
            ctx.fillRect(9, 14, 9, 4); // Mustache

            // Body / Shirt & Overalls
            ctx.fillStyle = capRed; // Red for shirt and arms
            if (frame === 'walk1' || frame === 'walk2') {
                // Dynamic running/walking animation with arm swing
                ctx.fillRect(4, 18, 14, 10); // Torso
                if (frame === 'walk2') { // Open stride pose: left leg back -> left arm forward
                    ctx.fillRect(16, 19, 6, 5); // Front (left) arm
                    ctx.fillRect(0, 19, 4, 5);  // Back (right) arm
                } else { // 'walk1', passing pose: left leg fwd -> left arm back
                    ctx.fillRect(2, 19, 6, 5);  // Back (left) arm
                    ctx.fillRect(13, 19, 6, 5); // Front (right) arm
                }
            } else {
                // Default idle/jump shirt
                ctx.fillRect(2, 18, 18, 10);
            }

            ctx.fillStyle = overallsBlue;
            ctx.fillRect(5, 24, 12, 16); // Blue Overalls
            ctx.fillStyle = yellow;
            ctx.fillRect(6, 28, 3, 3); ctx.fillRect(13, 28, 3, 3);

            // Legs & Boots
            ctx.fillStyle = brown;
            if (frame === 'jump') {
                ctx.fillRect(1, 38, 8, 9);
                ctx.fillRect(13, 36, 8, 9);
            } else if (frame === 'walk1' || frame === 'walk2') {
                // More dynamic running animation for legs
                if (frame === 'walk2') { // Open stride pose
                    ctx.fillRect(0, 37, 8, 9);    // Left leg back and up
                    ctx.fillRect(15, 39, 8, 9);   // Right leg forward and planted
                } else { // 'walk1', passing pose
                    ctx.fillRect(8, 39, 8, 9);    // Right leg planted
                    ctx.fillRect(5, 38, 8, 10);   // Left leg lifted and passing
                }
            } else {
                ctx.fillRect(3, 39, 8, 9);
                ctx.fillRect(12, 39, 8, 9);
            }
        }

        ctx.restore();
    },

    /**
     * Draw Classic Goomba (24x24)
     */
    drawGoomba(ctx, x, y, frame = 0, isSquished = false) {
        ctx.save();
        ctx.translate(x, y);

        const brown = '#9c4a00';
        const skin = '#fcc082';

        if (isSquished) {
            // Squished Goomba (12px high)
            ctx.fillStyle = brown;
            ctx.fillRect(2, 12, 20, 12);
            ctx.fillStyle = skin;
            ctx.fillRect(5, 15, 14, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(6, 16, 3, 3); ctx.fillRect(15, 16, 3, 3);
        } else {
            // Normal Goomba (24x24)
            ctx.fillStyle = brown;
            ctx.fillRect(6, 1, 12, 3);
            ctx.fillRect(3, 4, 18, 6);
            ctx.fillRect(1, 10, 22, 6);

            // Face
            ctx.fillStyle = skin;
            ctx.fillRect(6, 13, 12, 6);

            // Angry Eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(4, 9, 5, 5); ctx.fillRect(15, 9, 5, 5);
            ctx.fillStyle = '#fff';
            ctx.fillRect(6, 10, 2, 3); ctx.fillRect(17, 10, 2, 3);

            // Feet
            ctx.fillStyle = '#000';
            if (frame === 0) {
                ctx.fillRect(1, 19, 8, 5);
                ctx.fillRect(13, 19, 8, 5);
            } else {
                ctx.fillRect(4, 19, 8, 5);
                ctx.fillRect(16, 19, 8, 5);
            }
        }

        ctx.restore();
    },

    /**
     * Draw Classic Koopa Troopa (24x36)
     */
    drawKoopa(ctx, x, y, frame = 0, isShell = false, facing = 1) {
        ctx.save();
        ctx.translate(x, y);
        if (facing === -1) {
            ctx.scale(-1, 1);
            ctx.translate(-24, 0);
        }

        const green = '#00b800';
        const yellow = '#fcd000';

        if (isShell) {
            ctx.translate(0, 12);
            ctx.fillStyle = green;
            ctx.fillRect(3, 3, 18, 15);
            ctx.fillStyle = yellow;
            ctx.fillRect(6, 15, 12, 6);
            ctx.fillStyle = '#fff';
            ctx.fillRect(7, 7, 4, 4); ctx.fillRect(13, 7, 4, 4);
        } else {
            // Head
            ctx.fillStyle = green;
            ctx.fillRect(11, 0, 10, 8);
            ctx.fillStyle = yellow;
            ctx.fillRect(14, 6, 9, 6);
            ctx.fillStyle = '#fff';
            ctx.fillRect(15, 3, 3, 4);

            // Shell Body
            ctx.fillStyle = green;
            ctx.fillRect(3, 12, 15, 15);
            ctx.fillStyle = yellow;
            ctx.fillRect(6, 21, 12, 6);

            // Feet
            ctx.fillStyle = yellow;
            if (frame === 0) {
                ctx.fillRect(2, 30, 8, 6);
                ctx.fillRect(11, 30, 8, 6);
            } else {
                ctx.fillRect(6, 30, 8, 6);
                ctx.fillRect(15, 30, 8, 6);
            }
        }

        ctx.restore();
    },

    /**
     * Draw Question Block (`?`) (24x24)
     */
    drawQuestionBlock(ctx, x, y, isEmpty = false, theme = 'grassland') {
        ctx.save();
        ctx.translate(x, y);
        const pal = this.themes[theme] || this.themes.grassland;

        if (isEmpty) {
            // Used (empty) block - using brick colors for consistency
            ctx.fillStyle = pal.brick;
            ctx.fillRect(0, 0, 24, 24);
            ctx.fillStyle = '#000'; // Black outline/inset
            ctx.fillRect(2, 2, 20, 20);
            ctx.fillStyle = pal.brick;
            ctx.fillRect(3, 3, 18, 18);
            ctx.fillStyle = '#000';
            ctx.fillRect(3, 3, 2, 2); ctx.fillRect(19, 3, 2, 2);
            ctx.fillRect(3, 19, 2, 2); ctx.fillRect(19, 19, 2, 2);
        } else {
            // Active question block
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 24, 24);
            ctx.fillStyle = pal.question;
            ctx.fillRect(1, 1, 22, 22);

            // Highlight border
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(1, 1, 22, 2); ctx.fillRect(1, 1, 2, 22);

            // `?` Symbol
            ctx.fillStyle = '#000'; // Black for better contrast on all themes
            ctx.fillRect(8, 4, 8, 3);
            ctx.fillRect(13, 7, 3, 5);
            ctx.fillRect(10, 10, 5, 3);
            ctx.fillRect(10, 16, 3, 3);
        }

        ctx.restore();
    },

    /**
     * Draw Brick Block (24x24)
     */
    drawBrickBlock(ctx, x, y, theme = 'grassland') {
        ctx.save();
        ctx.translate(x, y);

        const pal = this.themes[theme] || this.themes.grassland;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 24, 24);
        ctx.fillStyle = pal.brick;
        ctx.fillRect(1, 1, 22, 22);

        // Mortar Lines
        ctx.fillStyle = '#fcd000';
        ctx.fillRect(1, 8, 22, 2);
        ctx.fillRect(1, 16, 22, 2);
        ctx.fillRect(11, 1, 2, 7);
        ctx.fillRect(5, 9, 2, 7); ctx.fillRect(17, 9, 2, 7);
        ctx.fillRect(12, 17, 2, 7);

        ctx.restore();
    },

    /**
     * Draw Ground Tile (24x24)
     */
    drawGroundTile(ctx, x, y, theme = 'grassland') {
        ctx.save();
        ctx.translate(x, y);

        const pal = this.themes[theme] || this.themes.grassland;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 24, 24);
        ctx.fillStyle = pal.groundBody;
        ctx.fillRect(1, 1, 22, 22);

        // Grass / Top Texture
        ctx.fillStyle = pal.groundTop;
        ctx.fillRect(1, 1, 22, 5);

        ctx.restore();
    },

    /**
     * Draw Pipe (48x72)
     */
    drawPipe(ctx, x, y, width = 48, height = 72) {
        ctx.save();
        ctx.translate(x, y);

        const green = '#00a800';
        const dark = '#006000';
        const highlight = '#5cf05c';

        // Pipe Lip Top
        ctx.fillStyle = '#000';
        ctx.fillRect(-3, 0, width + 6, 24);
        ctx.fillStyle = green;
        ctx.fillRect(-2, 1, width + 4, 22);
        ctx.fillStyle = highlight;
        ctx.fillRect(1, 1, 6, 22);
        ctx.fillStyle = dark;
        ctx.fillRect(width - 6, 1, 4, 22);

        // Pipe Stem
        if (height > 24) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 24, width, height - 24);
            ctx.fillStyle = green;
            ctx.fillRect(1, 24, width - 2, height - 24);
            ctx.fillStyle = highlight;
            ctx.fillRect(4, 24, 6, height - 24);
            ctx.fillStyle = dark;
            ctx.fillRect(width - 7, 24, 4, height - 24);
        }

        ctx.restore();
    },

    /**
     * Draw Super Mushroom (24x24)
     */
    drawMushroom(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        // Cap
        ctx.fillStyle = '#e52521';
        ctx.fillRect(3, 1, 18, 12);
        ctx.fillRect(1, 4, 22, 8);

        // White Spots
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(9, 3, 6, 6);
        ctx.fillRect(3, 6, 3, 4); ctx.fillRect(18, 6, 3, 4);

        // Stem & Face
        ctx.fillStyle = '#fcc082';
        ctx.fillRect(4, 12, 16, 11);
        ctx.fillStyle = '#000';
        ctx.fillRect(7, 15, 2, 4); ctx.fillRect(15, 15, 2, 4);

        ctx.restore();
    },

    /**
     * Draw Castle
     */
    drawCastle(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = '#b84400';
        ctx.fillRect(0, 48, 120, 72);
        ctx.fillRect(36, 0, 48, 48);

        ctx.fillStyle = '#000';
        ctx.fillRect(45, 75, 30, 45);

        ctx.fillStyle = '#e52521';
        ctx.beginPath(); ctx.moveTo(60, -30); ctx.lineTo(30, -20); ctx.lineTo(60, -10); ctx.fill();

        ctx.restore();
    },

    /**
     * Draw Collectible Coin (animated, 4 frames)
     */
    drawCoin(ctx, x, y, frame = 0) {
        ctx.save();
        ctx.translate(x, y);

        // Coin squish animation: frame 0=full, 1=wide, 2=thin, 3=wide
        const widths  = [14, 10, 4, 10];
        const offsets = [ 3,  5, 8,  5]; // x offset to center the coin
        const w = widths[frame % 4];
        const ox = offsets[frame % 4];

        // Outer gold ring
        ctx.fillStyle = '#f5c000';
        ctx.fillRect(ox, 1, w, 16);

        // Inner highlight
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(ox + 2, 2, Math.max(1, w - 6), 6);

        // Bottom shadow
        ctx.fillStyle = '#c8960c';
        ctx.fillRect(ox, 11, w, 5);

        // Shine dot
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox + 2, 3, 2, 2);

        ctx.restore();
    },

    /**
     * Draw Flagpole
     */
    drawFlagpole(ctx, x, y, flagHeight = 0) {
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = '#00e676';
        ctx.beginPath(); ctx.arc(6, 6, 8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#a8a8a8';
        ctx.fillRect(3, 14, 6, 200);

        ctx.fillStyle = '#00e676';
        ctx.fillRect(-36, 14 + flagHeight, 39, 24);

        ctx.restore();
    },

    /**
     * Draw a simple Flying Enemy (28x20)
     */
    drawFlyingEnemy(ctx, x, y, frame = 0) {
        ctx.save();
        ctx.translate(x, y);

        const bodyColor = '#4a0e2a'; // Dark purple/brown
        const wingColor = '#6a1e4a'; // Lighter purple/brown
        const eyeColor = '#fff';

        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(8, 5, 12, 10); // Main body

        // Head
        ctx.fillRect(10, 0, 8, 6); // Head
        ctx.fillStyle = eyeColor; // Eyes
        ctx.fillRect(12, 2, 2, 2);
        ctx.fillRect(15, 2, 2, 2);

        // Wings (animated)
        if (frame === 0) { // Wings up
            ctx.fillStyle = wingColor;
            ctx.beginPath();
            ctx.moveTo(8, 5);
            ctx.lineTo(0, 0);
            ctx.lineTo(4, 10);
            ctx.lineTo(8, 10);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(20, 5);
            ctx.lineTo(28, 0);
            ctx.lineTo(24, 10);
            ctx.lineTo(20, 10);
            ctx.closePath();
            ctx.fill();
        } else { // Wings down
            ctx.fillStyle = wingColor;
            ctx.beginPath();
            ctx.moveTo(8, 10);
            ctx.lineTo(0, 15);
            ctx.lineTo(4, 5);
            ctx.lineTo(8, 5);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(20, 10);
            ctx.lineTo(28, 15);
            ctx.lineTo(24, 5);
            ctx.lineTo(20, 5);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }
};

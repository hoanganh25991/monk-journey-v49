import { UIComponent } from '../UIComponent.js';

/**
 * Shows a flag emoji at the edge of the screen pointing toward the yellow quest marker,
 * so the player can follow that direction when the marker is off the minimap.
 * Direction is map-based: top = N, right = E, bottom = S, left = W.
 */
export class QuestDirectionIndicator extends UIComponent {
    static FLAG_EMOJI = '🚩';
    /** Don't show flag when marker is closer than this (avoid clutter when nearly there). */
    static MIN_DISTANCE = 8;

    constructor(game) {
        super('quest-direction-indicator', game);
        /** @type {'top'|'right'|'bottom'|'left'|null} */
        this.currentEdge = null;
    }

    init() {
        if (!this.container) return false;
        this.container.textContent = QuestDirectionIndicator.FLAG_EMOJI;
        this.container.setAttribute('aria-label', 'Quest marker direction');
        this.hideIndicator();
        return true;
    }

    /**
     * Get world angle from player to target (radians). 0 = +Z (south), π/2 = +X (east), π = -Z (north), -π/2 = -X (west).
     * @param {number} dx - target.x - player.x
     * @param {number} dz - target.z - player.z
     * @returns {number} angle in [-Math.PI, Math.PI]
     */
    static angleToTarget(dx, dz) {
        return Math.atan2(dx, dz);
    }

    /**
     * Map world angle to screen edge (same as map directions: N=top, E=right, S=bottom, W=left).
     * @param {number} angleRad - angle from player to marker
     * @returns {'top'|'right'|'bottom'|'left'}
     */
    static angleToEdge(angleRad) {
        const deg = (angleRad * 180 / Math.PI + 360) % 360;
        if (deg >= 45 && deg < 135) return 'right';   // E
        if (deg >= 135 && deg < 225) return 'top';    // N
        if (deg >= 225 && deg < 315) return 'left';    // W
        return 'bottom'; // S (0–45 and 315–360)
    }

    hideIndicator() {
        if (!this.container) return;
        this.container.style.display = 'none';
        this.container.removeAttribute('data-edge');
        this.currentEdge = null;
    }

    showAtEdge(edge) {
        if (!this.container) return;
        if (this.currentEdge === edge) return;
        this.currentEdge = edge;
        this.container.style.display = 'flex';
        this.container.setAttribute('data-edge', edge);
        this.container.textContent = QuestDirectionIndicator.FLAG_EMOJI;
    }

    update(delta) {
        const player = this.game?.player;
        const positions = this.game?.world?.interactiveManager?.getChapterQuestMarkerPositions?.() || [];
        if (!player || positions.length === 0) {
            this.hideIndicator();
            return;
        }

        const pos = player.getPosition();
        if (!pos) {
            this.hideIndicator();
            return;
        }

        // Use nearest quest marker
        let best = null;
        let bestDistSq = Infinity;
        for (const m of positions) {
            const dx = m.x - pos.x;
            const dz = m.z - pos.z;
            const d2 = dx * dx + dz * dz;
            if (d2 < bestDistSq) {
                bestDistSq = d2;
                best = { dx, dz };
            }
        }

        if (!best) {
            this.hideIndicator();
            return;
        }

        const minD2 = QuestDirectionIndicator.MIN_DISTANCE * QuestDirectionIndicator.MIN_DISTANCE;
        if (bestDistSq < minD2) {
            this.hideIndicator();
            return;
        }

        const angle = QuestDirectionIndicator.angleToTarget(best.dx, best.dz);
        const edge = QuestDirectionIndicator.angleToEdge(angle);
        this.showAtEdge(edge);
    }
}

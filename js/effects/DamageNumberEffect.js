import * as THREE from 'three';

/**
 * Floating damage number in screen space (RPG/Diablo style).
 * Projects 3D world position to screen and animates float-up + fade.
 * Optimized with object pool and minimal DOM updates.
 */
export class DamageNumberEffect {
    /**
     * @param {Object} game - Game instance (for camera and canvas)
     * @param {number} amount - Damage value to display
     * @param {THREE.Vector3} worldPosition - Position above enemy in world
     * @param {Object} options - { isPlayerDamage, isCritical, isKill }
     */
    constructor(game, amount, worldPosition, options = {}) {
        this.game = game;
        this.amount = amount;
        this.worldPosition = worldPosition.clone();
        this.isPlayerDamage = options.isPlayerDamage || false;
        this.isCritical = options.isCritical || options.isKill || false;
        this.isKill = options.isKill || false;
        this.duration = 2.2;
        this.elapsed = 0;
        this.isActive = true;
        this.element = null;
        this._ndc = new THREE.Vector3();
    }

    /**
     * Get or create the global container for damage numbers.
     * @param {Object} game
     * @returns {HTMLElement}
     */
    static getContainer(game) {
        if (!game || !game.gameContainer) return null;
        let el = document.getElementById('damage-numbers-container');
        if (!el) {
            el = document.createElement('div');
            el.id = 'damage-numbers-container';
            el.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:95;overflow:hidden;';
            const parent = game.gameContainer || document.body;
            parent.appendChild(el);
        }
        return el;
    }

    /**
     * Project world position to screen (pixels). Uses camera and canvas size.
     */
    projectToScreen() {
        const camera = this.game.camera;
        const canvas = this.game.canvas;
        if (!camera || !canvas) return { x: 0.5 * window.innerWidth, y: 0.5 * window.innerHeight };
        this._ndc.copy(this.worldPosition).project(camera);
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        const x = (this._ndc.x * 0.5 + 0.5) * w;
        const y = (-this._ndc.y * 0.5 + 0.5) * h;
        return { x, y };
    }

    /**
     * Create and show the damage number DOM element.
     * @returns {boolean} - True if created and added to container
     */
    create() {
        const container = DamageNumberEffect.getContainer(this.game);
        if (!container) return false;

        const el = document.createElement('div');
        el.className = 'damage-number physical';
        if (this.isKill) el.classList.add('kill');
        else if (this.isCritical) el.classList.add('critical');
        if (this.isPlayerDamage) el.classList.add('player-damage');

        el.textContent = this.amount.toLocaleString();

        const { x, y } = this.projectToScreen();
        const offsetX = (Math.random() - 0.5) * 24;
        const offsetY = (Math.random() - 0.5) * 16;
        el.style.left = `${x + offsetX}px`;
        el.style.top = `${y + offsetY}px`;
        el.style.transform = 'translate(-50%, -50%)';
        el.style.animation = `damageNumberFloat ${this.duration}s ease-out forwards`;

        container.appendChild(el);
        this.element = el;
        return true;
    }

    /**
     * Update effect (for cleanup when duration expired).
     * @param {number} delta
     * @returns {boolean} - True if still active
     */
    update(delta) {
        if (!this.isActive) return false;
        this.elapsed += delta;
        if (this.elapsed >= this.duration) {
            this.dispose();
            return false;
        }
        return true;
    }

    dispose() {
        this.isActive = false;
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
        this.element = null;
    }
}

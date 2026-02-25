import { EnemyProjectile } from './EnemyProjectile.js';

/**
 * Manages projectiles fired by ranged enemies. Spawns, updates, and removes them.
 */
export class EnemyProjectileManager {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
        this.maxProjectiles = 80;
    }

    /**
     * Spawn a projectile from a ranged enemy toward its target.
     * @param {import("./Enemy.js").Enemy} enemy - The ranged enemy firing the projectile
     * @param {Object} [overrides] - Override projectileType, flightStyle, speed
     */
    spawn(enemy, overrides = {}) {
        if (!enemy || !enemy.targetPlayer) return;
        if (this.projectiles.length >= this.maxProjectiles) return;

        const sourcePosition = enemy.position.clone();
        sourcePosition.y += (enemy.heightOffset ?? 0.4) + 0.3;

        const projectileType = overrides.projectileType ?? enemy.projectileType ?? 'arrow';
        const flightStyle = overrides.flightStyle ?? enemy.projectileFlightStyle ?? 'direct';
        const speed = overrides.speed ?? (flightStyle === 'curve' ? 12 : 14);

        const projectile = new EnemyProjectile(this.scene, {
            sourcePosition,
            target: enemy.targetPlayer,
            damage: enemy.damage,
            projectileType,
            flightStyle,
            speed,
            color: enemy.color ?? 0xddccbb
        });

        this.projectiles.push(projectile);
    }

    /**
     * @param {number} delta - Time in seconds
     */
    update(delta) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const stillActive = p.update(delta);
            if (!stillActive) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    /** Remove all projectiles (e.g. when changing level or resetting). */
    clear() {
        for (const p of this.projectiles) {
            p.dispose();
        }
        this.projectiles.length = 0;
    }
}

import * as THREE from '../../libs/three/three.module.js';
import { distanceSq3D, distanceApprox3D } from '../utils/FastMath.js';

/**
 * A single projectile fired by a ranged enemy (e.g. arrow, orb).
 * Flies toward the target (direct or curved), applies damage on hit, then is removed.
 */
export class EnemyProjectile {
    /**
     * @param {THREE.Scene} scene
     * @param {Object} options
     * @param {THREE.Vector3} options.sourcePosition - Where the projectile spawns (enemy position + height)
     * @param {Object} options.target - Target with getPosition() (e.g. player)
     * @param {number} options.damage - Damage to apply on hit
     * @param {string} [options.projectileType='arrow'] - 'arrow' | 'orb' | 'bolt'
     * @param {string} [options.flightStyle='direct'] - 'direct' | 'curve'
     * @param {number} [options.speed=14] - Units per second
     * @param {number} [options.hitRadius=0.8] - Distance to target to count as hit
     * @param {number} [options.maxLifetime=3] - Seconds before projectile is removed if no hit
     * @param {number} [options.color=0xddccbb] - Tint for projectile mesh
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.sourcePosition = options.sourcePosition.clone();
        this.target = options.target;
        this.damage = options.damage ?? 10;
        this.projectileType = options.projectileType ?? 'arrow';
        this.flightStyle = options.flightStyle ?? 'direct';
        this.speed = options.speed ?? 14;
        this.hitRadius = options.hitRadius ?? 0.8;
        this.maxLifetime = options.maxLifetime ?? 3;
        this.color = options.color ?? 0xddccbb;

        this.mesh = null;
        this.isActive = true;
        this.lifetime = 0;

        // Direct flight: constant direction from source to target at launch
        this.direction = new THREE.Vector3();
        // Curve: parabolic arc - we store start, end, and progress 0..1
        this.curveStart = this.sourcePosition.clone();
        this.curveEnd = new THREE.Vector3();
        this.curveProgress = 0;
        this.curveArcHeight = 2; // Extra height at apex of arc
        this.curveTotalDistance = 0; // Set on first _updateTargetPosition

        this._updateTargetPosition();
        if (this.flightStyle === 'direct') {
            this.direction.subVectors(this.curveEnd, this.curveStart).normalize();
        } else {
            this.curveTotalDistance = distanceApprox3D(
                this.curveStart.x, this.curveStart.y, this.curveStart.z,
                this.curveEnd.x, this.curveEnd.y, this.curveEnd.z
            );
        }

        this._createMesh();
        this.mesh.position.copy(this.sourcePosition);
        this.scene.add(this.mesh);
    }

    _updateTargetPosition() {
        if (this.target && typeof this.target.getPosition === 'function') {
            this.curveEnd.copy(this.target.getPosition());
            // Aim slightly above feet so projectile hits center mass
            this.curveEnd.y += 0.5;
        }
    }

    _createMesh() {
        const group = new THREE.Group();

        if (this.projectileType === 'arrow') {
            const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6);
            const shaftMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.rotation.z = Math.PI / 2;
            shaft.position.x = 0.2;
            group.add(shaft);

            const headGeometry = new THREE.ConeGeometry(0.04, 0.12, 6);
            const headMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.rotation.z = Math.PI / 2;
            head.position.x = 0.38;
            group.add(head);
        } else if (this.projectileType === 'orb') {
            const geometry = new THREE.SphereGeometry(0.12, 10, 10);
            const material = new THREE.MeshStandardMaterial({
                color: this.color,
                emissive: this.color,
                emissiveIntensity: 0.4
            });
            const orb = new THREE.Mesh(geometry, material);
            group.add(orb);
        } else {
            // bolt / generic
            const geometry = new THREE.CylinderGeometry(0.04, 0.06, 0.35, 8);
            const material = new THREE.MeshStandardMaterial({
                color: this.color,
                emissive: this.color,
                emissiveIntensity: 0.3
            });
            const bolt = new THREE.Mesh(geometry, material);
            bolt.rotation.z = Math.PI / 2;
            group.add(bolt);
        }

        this.mesh = group;
        this.mesh.userData.enemyProjectile = true;
    }

    /**
     * Update projectile position. Call every frame.
     * @param {number} delta - Time in seconds
     * @returns {boolean} - false if projectile should be removed
     */
    update(delta) {
        if (!this.isActive || !this.target) return false;

        this.lifetime += delta;
        if (this.lifetime >= this.maxLifetime) {
            this.dispose();
            return false;
        }

        // For direct flight, update target position and direction each frame (homing, so arrow aims at player in sky too)
        if (this.flightStyle === 'direct') {
            this._updateTargetPosition();
            this.direction.subVectors(this.curveEnd, this.mesh.position).normalize();
        }

        if (this.flightStyle === 'curve') {
            this._updateCurve(delta);
        } else {
            this._updateDirect(delta);
        }

        // Orient projectile so it points in the flight direction (arrow tip = forward toward player).
        // Arrow/bolt mesh local +X is "forward"; align it with this.direction (works for player on ground or in sky).
        if (this.direction.lengthSq() > 0.0001) {
            const forward = new THREE.Vector3(1, 0, 0);
            this.mesh.quaternion.setFromUnitVectors(forward, this.direction.clone().normalize());
        }

        // Hit check (squared distance to avoid sqrt)
        const px = this.mesh.position.x, py = this.mesh.position.y, pz = this.mesh.position.z;
        const ex = this.curveEnd.x, ey = this.curveEnd.y, ez = this.curveEnd.z;
        const hitRadiusSq = this.hitRadius * this.hitRadius;
        if (distanceSq3D(px, py, pz, ex, ey, ez) <= hitRadiusSq) {
            this._onHit();
            return false;
        }

        return true;
    }

    _updateDirect(delta) {
        const move = this.speed * delta;
        this.mesh.position.x += this.direction.x * move;
        this.mesh.position.y += this.direction.y * move;
        this.mesh.position.z += this.direction.z * move;
    }

    _updateCurve(delta) {
        const move = this.speed * delta;
        const totalDist = Math.max(0.1, this.curveTotalDistance);
        this.curveProgress = Math.min(1, this.curveProgress + move / totalDist);

        const t = this.curveProgress;
        const arc = Math.sin(t * Math.PI) * this.curveArcHeight;
        this.mesh.position.x = this.curveStart.x + (this.curveEnd.x - this.curveStart.x) * t;
        this.mesh.position.z = this.curveStart.z + (this.curveEnd.z - this.curveStart.z) * t;
        this.mesh.position.y = this.curveStart.y + (this.curveEnd.y - this.curveStart.y) * t + arc;

        this.direction.set(
            this.curveEnd.x - this.mesh.position.x,
            this.curveEnd.y - this.mesh.position.y,
            this.curveEnd.z - this.mesh.position.z
        ).normalize();
    }

    _onHit() {
        if (this.target && typeof this.target.takeDamage === 'function') {
            this.target.takeDamage(this.damage);
        }
        this.dispose();
    }

    dispose() {
        this.isActive = false;
        if (this.mesh && this.scene) {
            this.scene.remove(this.mesh);
            this.mesh.traverse((o) => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) {
                    if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
                    else o.material.dispose();
                }
            });
        }
        this.mesh = null;
        this.target = null;
    }
}

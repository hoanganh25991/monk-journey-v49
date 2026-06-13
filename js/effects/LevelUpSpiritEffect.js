import * as THREE from '../../libs/three/three.module.js';

const PARTICLE_COUNT = 48;
const DURATION = 1.4;

/**
 * Brief golden spirit particle burst on the monk when leveling up.
 */
export class LevelUpSpiritEffect {
    constructor(game) {
        this.game = game;
        this.group = null;
        this.points = null;
        this.velocities = [];
        this.elapsed = 0;
        this.isActive = true;
    }

    create() {
        const player = this.game?.player;
        if (!player || !this.game.scene) return null;

        const pos = player.getPosition?.() || player.position;
        if (!pos) return null;

        this.group = new THREE.Group();
        this.group.name = 'level-up-spirit';
        this.group.position.set(pos.x, pos.y + 0.5, pos.z);

        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);
        const sizes = new Float32Array(PARTICLE_COUNT);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
            const radius = 0.15 + Math.random() * 0.35;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = Math.random() * 0.4;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            const gold = 0.85 + Math.random() * 0.15;
            colors[i * 3] = gold;
            colors[i * 3 + 1] = 0.72 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.2 + Math.random() * 0.25;

            sizes[i] = 0.08 + Math.random() * 0.12;

            this.velocities.push({
                x: (Math.random() - 0.5) * 0.6,
                y: 1.2 + Math.random() * 1.8,
                z: (Math.random() - 0.5) * 0.6
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.points = new THREE.Points(geometry, material);
        this.group.add(this.points);

        const worldGroup = this.game.getWorldGroup?.() || this.game.scene;
        worldGroup.add(this.group);
        return this;
    }

    update(delta) {
        if (!this.isActive || !this.points) return;

        this.elapsed += delta;
        const t = this.elapsed / DURATION;
        const fade = Math.max(0, 1 - t);

        const posAttr = this.points.geometry.attributes.position;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const v = this.velocities[i];
            posAttr.array[i * 3] += v.x * delta;
            posAttr.array[i * 3 + 1] += v.y * delta;
            posAttr.array[i * 3 + 2] += v.z * delta;
            v.y *= 0.98;
        }
        posAttr.needsUpdate = true;

        this.points.material.opacity = fade * 0.95;
        this.group.rotation.y += delta * 1.5;

        if (this.elapsed >= DURATION) {
            this.isActive = false;
        }
    }

    dispose() {
        if (this.group?.parent) {
            this.group.parent.remove(this.group);
        }
        this.points?.geometry?.dispose();
        this.points?.material?.dispose();
        this.group = null;
        this.points = null;
    }
}

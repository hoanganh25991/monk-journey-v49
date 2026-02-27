import * as THREE from '../../../libs/three/three.module.js';

/**
 * Circular grassland patch - used to cover square terrain with grass color (e.g. at village center).
 */
export class GrassCircle {
    constructor(scene, worldManager) {
        this.scene = scene;
        this.worldManager = worldManager;
    }

    /**
     * Create the circular grass mesh (lies flat on ground, hides underlying square/terrain color).
     * @param {Object} data - { position: {x,y,z}, radius (or size) }
     * @returns {THREE.Mesh}
     */
    createMesh(data) {
        const radius = data.radius != null ? data.radius : (data.size != null ? data.size : 20);
        const segments = 64;

        const geometry = new THREE.CircleGeometry(radius, segments);
        const grassColor = 0x4a7c23; // Grass green
        const material = new THREE.MeshStandardMaterial({
            color: grassColor,
            roughness: 0.85,
            metalness: 0.05
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        const baseY = (data.position && data.position.y != null && isFinite(data.position.y)) ? data.position.y : 0;
        mesh.position.set(
            data.position ? data.position.x : 0,
            baseY + 0.06,
            data.position ? data.position.z : 0
        );
        mesh.userData = { type: 'grass_circle' };

        return mesh;
    }
}

import * as THREE from '../../../../libs/three/three.module.js';
import { ItemModel } from '../ItemModel.js';

/**
 * Model for crystal consumable type (skill crystals - freeze, stun, etc.)
 * Creates a glowing crystal with different colors per effect type
 */
export class CrystalModel extends ItemModel {
    constructor(item, modelGroup) {
        super(item, modelGroup);
        this.glow = null;
        this.createModel();
    }

    createModel() {
        const crystalGroup = new THREE.Group();

        // Crystal color based on skill effect
        const skillEffect = this.item.baseStats?.skillEffect || 'freeze';
        const colorMap = {
            freeze: 0x87CEEB,
            stun: 0xFFD700,
            slow: 0xADD8E6,
            burn: 0xFF4500,
            shock: 0x00BFFF
        };
        const crystalColor = colorMap[skillEffect] || 0x9370DB;

        // Main crystal (octahedron - diamond shape)
        const crystalGeometry = new THREE.OctahedronGeometry(0.2, 0);
        const crystalMaterial = new THREE.MeshStandardMaterial({
            color: crystalColor,
            roughness: 0.2,
            metalness: 0.6,
            transparent: true,
            opacity: 0.9,
            emissive: crystalColor,
            emissiveIntensity: 0.3
        });
        const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        crystal.castShadow = true;
        crystalGroup.add(crystal);

        // Inner glow sphere
        const glowGeometry = new THREE.SphereGeometry(0.12, 12, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: crystalColor,
            transparent: true,
            opacity: 0.4
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        crystalGroup.add(this.glow);

        this.modelGroup.add(crystalGroup);
        this.modelGroup.scale.set(0.8, 0.8, 0.8);
    }

    updateAnimations(delta) {
        if (!this.modelGroup) return;
        const time = Date.now() * 0.001;
        this.modelGroup.rotation.y += delta * 0.8;
        if (this.glow?.material?.opacity !== undefined) {
            this.glow.material.opacity = 0.3 + Math.sin(time * 2) * 0.15;
        }
    }
}

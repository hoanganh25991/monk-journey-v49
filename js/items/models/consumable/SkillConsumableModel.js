import * as THREE from '../../../../libs/three/three.module.js';
import { ItemModel } from '../ItemModel.js';
import { SKILL_ICONS } from '../../../config/skill-icons.js';

/**
 * Model for skill consumables (pickup that casts a skill at that point when used).
 * Small skill-colored orb on the ground - same size as other pickups.
 */
export class SkillConsumableModel extends ItemModel {
    constructor(item, modelGroup) {
        super(item, modelGroup);
        this.glow = null;
        this.createModel();
    }

    createModel() {
        const skillName = this.item.baseStats?.skillName || 'Wave of Light';
        const iconConfig = SKILL_ICONS[skillName];
        const hexColor = (iconConfig && iconConfig.color) ? iconConfig.color : '#ffdd22';
        const crystalColor = typeof hexColor === 'string' && hexColor.startsWith('#')
            ? parseInt(hexColor.slice(1), 16)
            : 0xffdd22;

        const skillGroup = new THREE.Group();

        // Main orb (sphere - skill essence)
        const orbGeometry = new THREE.SphereGeometry(0.2, 12, 12);
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: crystalColor,
            roughness: 0.2,
            metalness: 0.5,
            transparent: true,
            opacity: 0.95,
            emissive: crystalColor,
            emissiveIntensity: 0.35
        });
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        orb.castShadow = true;
        skillGroup.add(orb);

        // Inner glow
        const glowGeometry = new THREE.SphereGeometry(0.12, 10, 10);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: crystalColor,
            transparent: true,
            opacity: 0.45
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        skillGroup.add(this.glow);

        this.modelGroup.add(skillGroup);
        this.modelGroup.scale.set(0.8, 0.8, 0.8);
    }

    updateAnimations(delta) {
        if (!this.modelGroup) return;
        const time = Date.now() * 0.001;
        this.modelGroup.rotation.y += delta * 0.8;
        if (this.glow?.material?.opacity !== undefined) {
            this.glow.material.opacity = 0.35 + Math.sin(time * 2) * 0.15;
        }
    }
}

import * as THREE from '../../../../libs/three/three.module.js';
import { ItemModel } from '../ItemModel.js';
import { ItemModelFactory } from '../ItemModelFactory.js';

/**
 * Model for shoulder armor type (pauldrons/spaulders)
 * Creates left and right shoulder pads
 */
export class ShoulderModel extends ItemModel {
    constructor(item, modelGroup) {
        super(item, modelGroup);
        this.createModel();
    }

    createModel() {
        const material = this.getShoulderMaterial();

        // Left shoulder pauldron
        this.createPauldron(material, -1);
        // Right shoulder pauldron
        this.createPauldron(material, 1);

        this.modelGroup.scale.set(0.5, 0.5, 0.5);
    }

    /**
     * Create a single shoulder pauldron (sized to match character model)
     * @param {THREE.Material} material - Base material
     * @param {number} side - -1 for left, 1 for right
     */
    createPauldron(material, side) {
        const group = new THREE.Group();
        const x = side * 0.26;

        // Main pauldron (curved cap) – smaller to match 3D model
        const capGeometry = new THREE.SphereGeometry(0.14, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const cap = new THREE.Mesh(capGeometry, material);
        cap.position.set(x, 0.06, 0.06);
        cap.rotation.z = side * Math.PI / 6;
        cap.castShadow = true;
        group.add(cap);

        // Shoulder strap (connects to chest)
        const strapGeometry = new THREE.BoxGeometry(0.05, 0.16, 0.04);
        const strap = new THREE.Mesh(strapGeometry, material);
        strap.position.set(x * 0.7, -0.1, 0.1);
        strap.rotation.x = Math.PI / 6;
        strap.castShadow = true;
        group.add(strap);

        // Edge reinforcement
        const edgeGeometry = new THREE.TorusGeometry(0.12, 0.02, 8, 16, Math.PI / 2);
        const edge = new THREE.Mesh(edgeGeometry, material);
        edge.position.set(x, 0.08, 0.1);
        edge.rotation.x = Math.PI / 2;
        edge.rotation.z = -side * Math.PI / 4;
        edge.castShadow = true;
        group.add(edge);

        this.modelGroup.add(group);
    }

    /** Reuse ItemModelFactory rarity+level colors so shoulders match other items (vivid at high level). */
    getShoulderMaterial() {
        const rarity = this.item.rarity || 'common';
        const level = this.item.level != null ? this.item.level : 1;
        const { color, glow } = ItemModelFactory.getRarityLevelColor(rarity, level);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.5
        });
        if (glow > 0) {
            mat.emissive = new THREE.Color(color);
            mat.emissiveIntensity = glow;
        }
        return mat;
    }

    /**
     * No rotation – pauldrons stay static and only follow player direction (model group is under player).
     */
    updateAnimations(delta) {
        // Intentionally no-op: do not rotate; direction comes from player model
    }
}

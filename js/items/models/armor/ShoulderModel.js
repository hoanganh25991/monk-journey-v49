import * as THREE from '../../../../libs/three/three.module.js';
import { ItemModel } from '../ItemModel.js';

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

        this.modelGroup.scale.set(0.7 / 3, 0.7 / 3, 0.7 / 3);
    }

    /**
     * Create a single shoulder pauldron
     * @param {THREE.Material} material - Base material
     * @param {number} side - -1 for left, 1 for right
     */
    createPauldron(material, side) {
        const group = new THREE.Group();
        const x = side * 0.35;

        // Main pauldron (curved cap)
        const capGeometry = new THREE.SphereGeometry(0.2, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const cap = new THREE.Mesh(capGeometry, material);
        cap.position.set(x, 0.1, 0.1);
        cap.rotation.z = side * Math.PI / 6;
        cap.castShadow = true;
        group.add(cap);

        // Shoulder strap (connects to chest)
        const strapGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.06);
        const strap = new THREE.Mesh(strapGeometry, material);
        strap.position.set(x * 0.7, -0.15, 0.15);
        strap.rotation.x = Math.PI / 6;
        strap.castShadow = true;
        group.add(strap);

        // Edge reinforcement
        const edgeGeometry = new THREE.TorusGeometry(0.18, 0.03, 8, 16, Math.PI / 2);
        const edge = new THREE.Mesh(edgeGeometry, material);
        edge.position.set(x, 0.12, 0.15);
        edge.rotation.x = Math.PI / 2;
        edge.rotation.z = -side * Math.PI / 4;
        edge.castShadow = true;
        group.add(edge);

        this.modelGroup.add(group);
    }

    getShoulderMaterial() {
        const colors = {
            common: 0x8B4513,
            uncommon: 0x654321,
            rare: 0x2F4F4F,
            epic: 0x4B0082,
            legendary: 0x8B0000,
            mythic: 0x191970
        };
        const color = colors[this.item.rarity] || colors.common;
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.6,
            metalness: 0.4
        });
    }
}

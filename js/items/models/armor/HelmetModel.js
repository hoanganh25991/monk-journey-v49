import * as THREE from '../../../../libs/three/three.module.js';
import { ItemModel } from '../ItemModel.js';

/**
 * Model for helmet armor type
 * Creates a monk-style helmet with face protection
 */
export class HelmetModel extends ItemModel {
    constructor(item, modelGroup) {
        super(item, modelGroup);
        this.createModel();
    }
    
    createModel() {
        // Use neutral dark metal so helmet matches armor; applyColor() will set rarity color
        const baseColor = 0x404050;
        const matOpts = { color: baseColor, roughness: 0.6, metalness: 0.7 };

        // Create base helmet (half sphere)
        const baseGeometry = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const baseMaterial = new THREE.MeshStandardMaterial(matOpts);
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0;
        base.castShadow = true;
        
        this.modelGroup.add(base);
        
        // Create face protection (partial cylinder)
        const faceGeometry = new THREE.CylinderGeometry(0.3, 0.25, 0.3, 16, 1, true, Math.PI / 4, Math.PI * 1.5);
        const faceMaterial = new THREE.MeshStandardMaterial({ ...matOpts, side: THREE.DoubleSide });
        const face = new THREE.Mesh(faceGeometry, faceMaterial);
        face.position.y = -0.15;
        face.castShadow = true;
        
        this.modelGroup.add(face);
        
        // Add decorative elements
        this.addDecorativeElements();
        
        // Position the helmet correctly
        this.modelGroup.rotation.x = Math.PI / 6; // Tilt slightly
        this.modelGroup.scale.set(0.7 / 3, 0.7 / 3, 0.7 / 3); // Scale down a bit (1/3 scale applied)
    }
    
    /**
     * Add decorative elements to the helmet
     */
    addDecorativeElements() {
        const baseColor = 0x404050;
        const accentColor = 0x505060;

        // Add crest on top (same base color; applyColor will tint whole helmet)
        const crestGeometry = new THREE.BoxGeometry(0.05, 0.15, 0.4);
        const crestMaterial = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.7, metalness: 0.3 });
        const crest = new THREE.Mesh(crestGeometry, crestMaterial);
        crest.position.y = 0.3;
        crest.castShadow = true;
        this.modelGroup.add(crest);

        // Add eye protection (horizontal bars)
        const barCount = 3;
        const barMaterial = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.6, metalness: 0.7 });
        for (let i = 0; i < barCount; i++) {
            const barGeometry = new THREE.BoxGeometry(0.6, 0.02, 0.02);
            const bar = new THREE.Mesh(barGeometry, barMaterial);
            bar.position.set(0, -0.1 - (i * 0.07), 0.2);
            bar.castShadow = true;
            this.modelGroup.add(bar);
        }

        // Add decorative side plates
        const sidePlateGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.02);
        const sidePlateMaterial = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.3, metalness: 0.9 });
        const leftPlate = new THREE.Mesh(sidePlateGeometry, sidePlateMaterial);
        leftPlate.position.set(-0.25, -0.1, 0.15);
        leftPlate.rotation.y = Math.PI / 4;
        leftPlate.castShadow = true;
        this.modelGroup.add(leftPlate);
        const rightPlate = new THREE.Mesh(sidePlateGeometry, sidePlateMaterial.clone());
        rightPlate.position.set(0.25, -0.1, 0.15);
        rightPlate.rotation.y = -Math.PI / 4;
        rightPlate.castShadow = true;
        this.modelGroup.add(rightPlate);

        // Forehead gem (accent; applyColor will still tint it; keep subtle emissive)
        const gemGeometry = new THREE.OctahedronGeometry(0.03, 0);
        const gemMaterial = new THREE.MeshStandardMaterial({
            color: accentColor,
            roughness: 0.2,
            metalness: 0.9,
            emissive: accentColor,
            emissiveIntensity: 0.15
        });
        const foreheadGem = new THREE.Mesh(gemGeometry, gemMaterial);
        foreheadGem.position.set(0, 0.05, 0.28);
        foreheadGem.castShadow = true;
        foreheadGem.userData.isHelmetGem = true;
        this.modelGroup.add(foreheadGem);
    }
    
    updateAnimations(delta) {
        const time = Date.now() * 0.001;
        if (!this.modelGroup) return;
        this.modelGroup.traverse(child => {
            if (child.userData && child.userData.isHelmetGem && child.material) {
                child.material.emissiveIntensity = 0.15 + Math.sin(time * 2) * 0.1;
            }
        });
        this.modelGroup.rotation.y = Math.sin(time * 0.5) * 0.1;
    }
}
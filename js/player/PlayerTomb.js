/**
 * PlayerTomb.js
 * Creates a 3D tomb (bia mộ) mesh shown when a player dies, instead of the character model.
 */

import * as THREE from '../../libs/three/three.module.js';

const TOMB_LABEL = 'bia mộ';

/**
 * Creates a tomb group: vertical slab + text label "bia mộ".
 * @returns {THREE.Group} Group containing slab mesh and text sprite, centered at base.
 */
export function createPlayerTomb() {
    const group = new THREE.Group();

    // Tomb slab (vertical gravestone)
    const slabWidth = 0.5;
    const slabHeight = 0.65;
    const slabDepth = 0.12;
    const slabGeometry = new THREE.BoxGeometry(slabWidth, slabHeight, slabDepth);
    const slabMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d3630,
        roughness: 0.9,
        metalness: 0.05
    });
    const slab = new THREE.Mesh(slabGeometry, slabMaterial);
    slab.castShadow = true;
    slab.receiveShadow = true;
    slab.position.y = slabHeight / 2;
    group.add(slab);

    // Label "bia mộ" on a canvas texture, shown on a plane in front of the slab
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    ctx.fillStyle = '#2a2520';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e8e0d5';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TOMB_LABEL, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: true
    });
    const labelWidth = slabWidth * 0.85;
    const labelHeight = slabHeight * 0.4;
    const labelGeometry = new THREE.PlaneGeometry(labelWidth, labelHeight);
    const labelPlane = new THREE.Mesh(labelGeometry, labelMaterial);
    labelPlane.position.set(0, slabHeight / 2, slabDepth / 2 + 0.01);
    group.add(labelPlane);

    return group;
}

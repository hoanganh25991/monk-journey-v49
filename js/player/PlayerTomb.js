/**
 * PlayerTomb.js
 * Chinese-style tomb (墓) for Monk Journey: horizontal base (body) + vertical stele (碑).
 * Shown when a player dies; static, no animation.
 */

import * as THREE from '../../libs/three/three.module.js';

const TOMB_LABEL = '圓寂'; // "Yuán jì" – passing of a monk (Chinese Buddhist term)

const stoneDark = 0x2a2520;
const stoneMid = 0x3d3630;
const stoneLight = 0x4a443e;
const inkColor = '#e8e0d5';

/**
 * Creates a Chinese-style tomb: large horizontal body (base) + vertical stele with label.
 * @returns {THREE.Group} Group centered at base; origin at ground under center of body.
 */
export function createPlayerTomb() {
    const group = new THREE.Group();

    // —— Horizontal body (base) – long, low platform like a sarcophagus base ——
    const bodyWidth = 2.2;
    const bodyHeight = 0.45;
    const bodyDepth = 1.1;
    const bodyGeometry = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: stoneMid,
        roughness: 0.92,
        metalness: 0.03
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = bodyHeight / 2;
    group.add(body);

    // Optional: slight cap/ledge on top for a more traditional look (wider than body)
    const capWidth = bodyWidth * 1.08;
    const capHeight = 0.08;
    const capDepth = bodyDepth * 1.06;
    const capGeometry = new THREE.BoxGeometry(capWidth, capHeight, capDepth);
    const capMaterial = new THREE.MeshStandardMaterial({
        color: stoneLight,
        roughness: 0.9,
        metalness: 0.04
    });
    const cap = new THREE.Mesh(capGeometry, capMaterial);
    cap.castShadow = true;
    cap.receiveShadow = true;
    cap.position.y = bodyHeight + capHeight / 2;
    group.add(cap);

    // —— Vertical stele (碑) – stands on top of body, centered ——
    const steleWidth = 0.95;
    const steleHeight = 1.05;
    const steleDepth = 0.18;
    const steleGeometry = new THREE.BoxGeometry(steleWidth, steleHeight, steleDepth);
    const steleMaterial = new THREE.MeshStandardMaterial({
        color: stoneDark,
        roughness: 0.9,
        metalness: 0.05
    });
    const stele = new THREE.Mesh(steleGeometry, steleMaterial);
    stele.castShadow = true;
    stele.receiveShadow = true;
    stele.position.y = bodyHeight + capHeight + steleHeight / 2;
    group.add(stele);

    // Label "圓寂" on a canvas texture, on a plane in front of the stele
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 256;
    ctx.fillStyle = '#1e1a17';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = inkColor;
    ctx.font = 'bold 120px serif';
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
    const labelWidth = steleWidth * 0.82;
    const labelHeight = steleHeight * 0.5;
    const labelGeometry = new THREE.PlaneGeometry(labelWidth, labelHeight);
    const labelPlane = new THREE.Mesh(labelGeometry, labelMaterial);
    labelPlane.position.set(0, bodyHeight + capHeight + steleHeight / 2, steleDepth / 2 + 0.01);
    group.add(labelPlane);

    return group;
}

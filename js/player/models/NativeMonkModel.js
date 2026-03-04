/**
 * NativeMonkModel.js
 * Procedural Three.js monk character: young monk, shaolin-style yellow cloth,
 * parts: head, hands, body, legs. Built to match PlayerEquipmentVisuals
 * attachment layout (origin at feet, ~1.8 units tall) so equipment slots work.
 *
 * Design: young monk, shaolin-style yellow cloth. Attachment positions/slots
 * are defined in PlayerEquipmentVisuals.initAttachmentPoints() (rightHand,
 * leftHand, head, chest, back, etc.); this model uses the same proportions.
 */

import * as THREE from '../../../libs/three/three.module.js';

// Colors: GDD / shaolin-style
const ROBE_COLOR = 0xe8b923;      // Amber / yellow cloth
const ROBE_DARK = 0xc4951a;       // Sleeve/trim darker
const PANTS_COLOR = 0x2a2520;     // Dark brown pants
const SKIN_COLOR = 0xe8c4a0;      // Skin tone
const STAFF_WOOD = 0x5c4033;      // Wood staff (optional placeholder)
const HAIR_COLOR = 0x2a2520;      // Dark hair

/** Scale of the whole model to match game world (same as GLTF monk ~1.8m) */
const MODEL_SCALE = 1.0;

/**
 * Create the native monk mesh group (no attachment groups; PlayerEquipmentVisuals adds those).
 *
 * @param {Object} [opts] - Options
 * @param {boolean} [opts.includeDefaultStaff=false] - If true, add a simple staff in right hand (equipment system normally provides weapon)
 * @returns {THREE.Group} Root group containing monk meshes only
 */
export function createNativeMonkGroup(opts = {}) {
    const includeDefaultStaff = opts.includeDefaultStaff === true;

    const root = new THREE.Group();
    root.name = 'NativeMonk';
    root.scale.setScalar(MODEL_SCALE);

    // ---- Body (robe torso) ----
    const bodyGeom = new THREE.CylinderGeometry(0.35, 0.4, 0.6, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: ROBE_COLOR,
        roughness: 0.85,
        metalness: 0.05
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.set(0, 1.2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    body.name = 'body';
    root.add(body);

    // ---- Legs (pants) ----
    const legGeom = new THREE.BoxGeometry(0.22, 0.5, 0.2);
    const legMat = new THREE.MeshStandardMaterial({
        color: PANTS_COLOR,
        roughness: 0.9,
        metalness: 0
    });
    const leftLeg = new THREE.Mesh(legGeom, legMat);
    leftLeg.position.set(-0.2, 0.25, 0.02);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    leftLeg.name = 'leftLeg';
    root.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeom, legMat);
    rightLeg.position.set(0.2, 0.25, 0.02);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    rightLeg.name = 'rightLeg';
    root.add(rightLeg);

    // ---- Upper arms (sleeves) ----
    const armGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.45, 6);
    const armMat = new THREE.MeshStandardMaterial({
        color: ROBE_DARK,
        roughness: 0.85,
        metalness: 0.05
    });
    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.position.set(-0.42, 1.05, 0.15);
    leftArm.rotation.z = Math.PI / 12;
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    leftArm.name = 'leftArm';
    root.add(leftArm);
    const rightArm = new THREE.Mesh(armGeom, armMat);
    rightArm.position.set(0.42, 1.05, 0.15);
    rightArm.rotation.z = -Math.PI / 12;
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    rightArm.name = 'rightArm';
    root.add(rightArm);

    // ---- Head (skin) ----
    const headGeom = new THREE.SphereGeometry(0.22, 16, 12);
    const headMat = new THREE.MeshStandardMaterial({
        color: SKIN_COLOR,
        roughness: 0.9,
        metalness: 0
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.set(0, 1.7, 0);
    head.castShadow = true;
    head.receiveShadow = true;
    head.name = 'head';
    root.add(head);

    // Simple hair/cap (flat top)
    const capGeom = new THREE.CylinderGeometry(0.2, 0.22, 0.12, 12, 1, true);
    const capMat = new THREE.MeshStandardMaterial({
        color: HAIR_COLOR,
        roughness: 0.9,
        metalness: 0
    });
    const cap = new THREE.Mesh(capGeom, capMat);
    cap.position.set(0, 1.82, 0);
    cap.castShadow = true;
    cap.receiveShadow = true;
    cap.name = 'cap';
    root.add(cap);

    // ---- Optional default staff (placeholder when no weapon equipped) ----
    let defaultStaffMesh = null;
    if (includeDefaultStaff) {
        const staffGeom = new THREE.CylinderGeometry(0.03, 0.035, 1.1, 8);
        const staffMat = new THREE.MeshStandardMaterial({
            color: STAFF_WOOD,
            roughness: 0.9,
            metalness: 0
        });
        defaultStaffMesh = new THREE.Mesh(staffGeom, staffMat);
        defaultStaffMesh.rotation.z = -Math.PI / 2;
        defaultStaffMesh.position.set(0.5, 1.2, 0.3 + 0.2);
        defaultStaffMesh.name = 'defaultStaff';
        root.add(defaultStaffMesh);
    }

    // Store refs for animation (idle/walk)
    root.userData.nativeMonk = {
        body,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        head,
        defaultStaffMesh
    };

    return root;
}

/**
 * Update simple procedural animations for the native monk (idle breath, walk cycle).
 * Call each frame with delta and state { isMoving, isAttacking }.
 *
 * @param {THREE.Group} root - Root returned by createNativeMonkGroup
 * @param {number} delta - Time since last frame (seconds)
 * @param {{ isMoving?: boolean, isAttacking?: boolean }} state - Player state
 */
export function updateNativeMonkAnimations(root, delta, state = {}) {
    const data = root.userData.nativeMonk;
    if (!data) return;

    const time = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
    const { body, leftLeg, rightLeg, leftArm, rightArm, head } = data;

    if (!body || !leftLeg || !rightLeg) return;

    // Store original positions/rotations once
    if (body.userData.origY === undefined) {
        body.userData.origY = body.position.y;
        head.userData.origY = head.position.y;
        leftLeg.userData.origZ = leftLeg.position.z;
        rightLeg.userData.origZ = rightLeg.position.z;
        leftArm.userData.origRot = leftArm.rotation.clone();
        rightArm.userData.origRot = rightArm.rotation.clone();
    }

    const isMoving = state.isMoving === true;
    const isAttacking = state.isAttacking === true;

    if (isAttacking) {
        const attackCycle = (time * 8) % (Math.PI * 2);
        const progress = attackCycle < Math.PI ? attackCycle / Math.PI : (attackCycle - Math.PI) / Math.PI;
        rightArm.rotation.x = rightArm.userData.origRot.x - progress * Math.PI * 0.6;
        leftArm.rotation.x = leftArm.userData.origRot.x + Math.sin(time * 6) * 0.15;
        body.position.y = body.userData.origY;
        head.position.y = head.userData.origY;
        leftLeg.position.z = leftLeg.userData.origZ;
        rightLeg.position.z = rightLeg.userData.origZ;
    } else if (isMoving) {
        const walkSpeed = 6;
        const walkAmp = 0.08;
        const armSwing = 0.35;
        leftLeg.position.z = leftLeg.userData.origZ + Math.sin(time * walkSpeed) * walkAmp;
        rightLeg.position.z = rightLeg.userData.origZ - Math.sin(time * walkSpeed) * walkAmp;
        leftArm.rotation.x = leftArm.userData.origRot.x + Math.sin(time * walkSpeed) * armSwing;
        rightArm.rotation.x = rightArm.userData.origRot.x - Math.sin(time * walkSpeed) * armSwing;
        const bob = Math.abs(Math.sin(time * walkSpeed)) * 0.05;
        body.position.y = body.userData.origY + bob;
        head.position.y = head.userData.origY + bob;
    } else {
        const idleSpeed = 1.5;
        const breathe = Math.sin(time * idleSpeed) * 0.02;
        body.position.y = body.userData.origY + breathe;
        head.position.y = head.userData.origY + breathe;
        head.rotation.x = Math.sin(time * 0.8) * 0.04;
        head.rotation.y = Math.sin(time * 0.6) * 0.06;
        leftArm.rotation.x = leftArm.userData.origRot.x + Math.sin(time * idleSpeed * 0.5) * 0.04;
        rightArm.rotation.x = rightArm.userData.origRot.x + Math.cos(time * idleSpeed * 0.5) * 0.04;
        leftLeg.position.z = leftLeg.userData.origZ;
        rightLeg.position.z = rightLeg.userData.origZ;
    }
}

import * as THREE from '../../libs/three/three.module.js';

/**
 * Applies an elemental visual overlay to a skill/attack effect group.
 * Adds glow, ring, and particle burst so skills look more vivid and elemental (fire, water, thunder, etc.).
 *
 * @param {THREE.Group} effectGroup - The skill effect group to augment (children added at local origin)
 * @param {import('../config/elemental-effects.js').ElementalEffectConfig} config - Elemental config (color, emissive, particleStyle, intensity)
 * @param {number} [scale=1] - Scale of overlay (e.g. match skill radius)
 */
export function applyElementalOverlay(effectGroup, config, scale = 1) {
    if (!effectGroup || !config) return;
    const color = config.color ?? 0xffffff;
    const emissive = config.emissiveColor ?? color;
    const particleColor = config.particleColor ?? color;
    const intensity = Math.min(1, (config.intensity ?? 0.8) * 1.2);
    const s = scale;

    const overlayRoot = new THREE.Group();
    overlayRoot.name = 'ElementalOverlay';

    // Emissive core glow
    const coreGeom = new THREE.SphereGeometry(0.35 * s, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({
        color: emissive,
        transparent: true,
        opacity: 0.5 * intensity,
        depthWrite: false
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    overlayRoot.add(core);

    // Outer glow (larger, more transparent)
    const glowGeom = new THREE.SphereGeometry(0.8 * s, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.25 * intensity,
        depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    overlayRoot.add(glow);

    // Ring around the effect
    const ringGeom = new THREE.TorusGeometry(0.6 * s, 0.08 * s, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
        color: emissive,
        transparent: true,
        opacity: 0.7 * intensity,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    overlayRoot.add(ring);

    // Particle burst: small spheres in a radial pattern
    const particleCount = config.particleStyle === 'mist' || config.particleStyle === 'bubbles' ? 12 : 16;
    const positions = [];
    for (let i = 0; i < particleCount; i++) {
        const phi = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
        const theta = Math.random() * Math.PI * 0.4;
        const r = (0.4 + Math.random() * 0.5) * s;
        positions.push(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta) - 0.2 * s,
            r * Math.sin(theta) * Math.sin(phi)
        );
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    particleGeom.computeBoundingSphere();
    const particleMat = new THREE.PointsMaterial({
        color: particleColor,
        size: 0.15 * s,
        transparent: true,
        opacity: 0.8 * intensity,
        depthWrite: false,
        sizeAttenuation: true
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    overlayRoot.add(particles);

    // Store on overlay for optional animation in effect handler update
    overlayRoot.userData.elementalOverlay = {
        ring,
        particles,
        core,
        glow,
        elapsed: 0,
        config
    };

    effectGroup.add(overlayRoot);
}

/**
 * Update elemental overlay animation (pulse, rotate ring, particle motion).
 * Call from SkillEffect.update() if the effect has an elemental overlay.
 * @param {THREE.Group} effectGroup - Effect group that may contain ElementalOverlay
 * @param {number} delta - Time since last frame
 */
export function updateElementalOverlay(effectGroup, delta) {
    if (!effectGroup) return;
    const overlay = effectGroup.getObjectByName('ElementalOverlay');
    if (!overlay?.userData?.elementalOverlay) return;
    const data = overlay.userData.elementalOverlay;
    data.elapsed += delta;
    const t = data.elapsed;
    if (data.ring) {
        data.ring.rotation.z = t * 1.5;
        const s = 1 + Math.sin(t * 3) * 0.05;
        data.ring.scale.setScalar(s);
    }
    if (data.particles?.material?.opacity !== undefined) {
        data.particles.material.opacity = (0.5 + 0.3 * Math.sin(t * 4)) * (data.config?.intensity ?? 0.8);
    }
}

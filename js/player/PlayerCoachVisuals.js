/**
 * PlayerCoachVisuals.js
 * Renders the "coach" (player aura/coat) on top of the player model.
 * Beautiful aura with different colors per type; elemental types (fire, water, etc.)
 * have particles that become more complex over time to show off strength.
 */

import * as THREE from '../../libs/three/three.module.js';
import { fastSin, fastCos } from 'utils/FastMath.js';
import { getCoachType, getCoachElementFromWeapon, COACH_AURA_ROTATION_SPEED, COACH_SCALE } from '../config/coach.js';

export class PlayerCoachVisuals {
    /**
     * @param {THREE.Scene} scene
     * @param {import('./PlayerModel.js').PlayerModel} playerModel
     * @param {import('../game/Game.js').Game} [game=null]
     */
    constructor(scene, playerModel, game = null) {
        this.scene = scene;
        this.playerModel = playerModel;
        this.game = game;
        this.coachGroup = null;
        this.auraMesh = null;
        this.particles = [];
        this.currentTypeId = 'none';
        this.strength = 0;
        this.timeAccum = 0; // Grows over time for "stronger over time" complexity
    }

    /**
     * Build coach from current type and strength. Call when type or strength changes.
     */
    build() {
        this.clear();
        if (!this.playerModel || !this.playerModel.modelGroup) return;

        const config = getCoachType(this.currentTypeId);
        if (config.element === 'none') return;

        this.coachGroup = new THREE.Group();
        this.coachGroup.name = 'player-coach';
        this.coachGroup.position.set(0, 0.85, 0);
        this.coachGroup.scale.setScalar(COACH_SCALE);
        this.playerModel.modelGroup.add(this.coachGroup);

        const strength = Math.max(0, Math.min(1, this.strength));
        const intensity = 0.4 + strength * 0.55;

        this.createAuraMantle(config, intensity, strength);
        this.createParticles(config, strength);
    }

    /**
     * Create a visible "mantle" aura: layered rings (cowl shape) + back glow.
     * Vividness scales with strength (stronger level = more vivid).
     */
    createAuraMantle(config, intensity, strength = this.strength) {
        const primary = config.primaryColor;
        const secondary = config.secondaryColor;
        const vivid = 0.4 + strength * 0.6;
        const opacityBase = 0.18 + intensity * 0.32 * vivid;
        const opacityAccent = 0.1 + this.strength * 0.25 * vivid;

        // Layered horizontal rings at different heights – form a soft cone/cowl behind the character
        const layers = [
            { y: 0.05, inner: 0.45, outer: 0.72 },
            { y: 0.35, inner: 0.5, outer: 0.78 },
            { y: 0.65, inner: 0.52, outer: 0.82 },
            { y: 0.95, inner: 0.48, outer: 0.78 }
        ];
        layers.forEach((layer, i) => {
            const baseOp = (i < 2 ? opacityBase : opacityAccent) * (0.85 + i * 0.05);
            const geo = new THREE.RingGeometry(layer.inner, layer.outer, 40);
            const mat = new THREE.MeshBasicMaterial({
                color: i < 2 ? primary : secondary,
                transparent: true,
                opacity: baseOp,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = layer.y;
            ring.userData.isCoachAura = true;
            ring.userData.baseOpacity = baseOp;
            this.coachGroup.add(ring);
            if (i === 0) this.auraMesh = ring;
        });

        // Back glow: curved panel behind the character so the aura reads from the side/back
        const backZ = -0.5;
        const coneGeo = new THREE.CylinderGeometry(0.35, 0.7, 1.1, 24, 1, true, 0, Math.PI * 0.85);
        const coneMat = new THREE.MeshBasicMaterial({
            color: primary,
            transparent: true,
            opacity: 0.15 + intensity * 0.15,
            side: THREE.BackSide,
            depthWrite: false
        });
        const backGlowOpacity = 0.12 + intensity * 0.22 * vivid;
        const backGlow = new THREE.Mesh(coneGeo, coneMat);
        backGlow.rotation.x = Math.PI / 2;
        backGlow.rotation.z = Math.PI / 2;
        backGlow.position.set(0, 0.5, backZ);
        backGlow.userData.isCoachAura = true;
        backGlow.userData.isBackGlow = true;
        backGlow.userData.baseOpacity = backGlowOpacity;
        coneMat.opacity = backGlowOpacity;
        this.coachGroup.add(backGlow);

        if (this.strength > 0.2) {
            const inner2 = 0.78;
            const outer2 = 0.92;
            const geo2 = new THREE.RingGeometry(inner2, outer2, 32);
            const mat2 = new THREE.MeshBasicMaterial({
                color: secondary,
                transparent: true,
                opacity: opacityAccent,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const outerRing = new THREE.Mesh(geo2, mat2);
            outerRing.rotation.x = -Math.PI / 2;
            outerRing.position.y = 0.5;
            outerRing.userData.isCoachAura = true;
            outerRing.userData.baseOpacity = opacityAccent;
            this.coachGroup.add(outerRing);
        }
    }

    /**
     * Create particles: more visible and vivid as strength/level increases.
     */
    createParticles(config, strength) {
        const baseCount = (config.particles?.baseCount ?? 10) || 8;
        const speed = config.particles?.speed ?? 1;
        const style = config.particles?.style || 'orbit';
        const complexity = Math.min(1, strength * 0.8 + this.timeAccum * 0.02);
        const count = Math.max(8, Math.floor(baseCount * (0.8 + strength * 0.7 + complexity * 0.4)));
        const colors = [config.primaryColor, config.secondaryColor];
        if (config.tertiaryColor) colors.push(config.tertiaryColor);

        const particleSize = 0.05 + strength * 0.045;
        const particleGeometry = new THREE.SphereGeometry(particleSize, 8, 8);
        const particleOpacity = 0.38 + strength * 0.35;
        for (let i = 0; i < count; i++) {
            const color = colors[i % colors.length];
            const material = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: particleOpacity
            });
            const particle = new THREE.Mesh(particleGeometry.clone(), material);
            const angle = (i / count) * Math.PI * 2;
            const radius = 0.5 + (i % 3) * 0.18;
            particle.position.set(
                fastCos(angle) * radius,
                0.15 + (i / count) * 0.9,
                fastSin(angle) * radius
            );
            particle.userData = {
                style,
                angle,
                radius,
                speed: speed * (0.9 + Math.random() * 0.4),
                phase: Math.random() * Math.PI * 2,
                riseSpeed: 0.25 + Math.random() * 0.35,
                orbitRadius: radius
            };
            this.coachGroup.add(particle);
            this.particles.push(particle);
        }
    }

    /**
     * Set coach type by element or id and optional strength. Rebuilds coach.
     * @param {string} typeId - e.g. 'fire', 'water', 'none'
     * @param {number} [strength=0.5] - 0–1
     */
    setCoach(typeId, strength = 0.5) {
        this.currentTypeId = typeId || 'none';
        this.strength = typeof strength === 'number' ? Math.max(0, Math.min(1, strength)) : 0.5;
        this.build();
    }

    /**
     * Update coach from equipped weapon (element) and game-derived strength.
     * @param {Object} [weapon] - Equipped weapon
     * @param {number} [strength] - 0–1 from player/weapon level
     */
    updateFromWeapon(weapon, strength) {
        const element = getCoachElementFromWeapon(weapon);
        const typeId = element === 'none' ? 'none' : element;
        const str = typeof strength === 'number' ? strength : this.computeStrength(weapon);
        if (typeId !== this.currentTypeId || Math.abs(str - this.strength) > 0.05) {
            this.setCoach(typeId, str);
        }
    }

    /**
     * Compute strength 0–1 from player level and weapon.
     * @param {Object} [weapon]
     * @returns {number}
     */
    computeStrength(weapon) {
        let s = 0.2;
        if (this.game && this.game.player && this.game.player.stats) {
            const level = this.game.player.stats.level || 1;
            s = Math.min(1, 0.2 + (level / 50) * 0.5);
        }
        if (weapon) {
            const level = weapon.level || 1;
            const rarityBoost = { common: 0, uncommon: 0.1, rare: 0.2, epic: 0.3, legendary: 0.5, mythic: 0.7 }[weapon.rarity] || 0;
            s = Math.min(1, s + (level / 30) * 0.3 + rarityBoost);
        }
        return Math.max(0, Math.min(1, s));
    }

    /**
     * Update animation. Call every frame. Increases time accumulator for complexity.
     * @param {number} delta
     */
    update(delta) {
        if (this.currentTypeId === 'none' || !this.coachGroup) return;

        this.timeAccum += delta;
        const time = this.timeAccum;

        const pulse = 1.0 + fastSin(time * 2) * 0.06;
        const rotSpeed = COACH_AURA_ROTATION_SPEED;
        this.coachGroup.traverse(child => {
            if (child.userData?.isCoachAura && child.material && child.userData.baseOpacity != null) {
                const base = child.userData.baseOpacity;
                if (child.userData.isBackGlow) {
                    child.material.opacity = base + fastSin(time * 1.2) * 0.05;
                    // Do not rotate back glow (cloth-like panel) – only outer rings/particles rotate
                } else if (child.geometry && child.geometry.type === 'RingGeometry') {
                    child.material.opacity = Math.max(0.08, base + fastSin(time * 1.5) * 0.06);
                    child.scale.set(pulse, pulse, 1);
                    child.rotation.z = time * 0.25 * rotSpeed;
                }
            }
        });

        this.coachGroup.traverse(child => {
            if (!child.userData || child.userData.isCoachAura) return;
            const ud = child.userData;
            const motion = rotSpeed; // same as aura rotation: 0 = static, 1 = full motion
            if (ud.style === 'orbit') {
                ud.angle += delta * ud.speed * motion;
                child.position.x = fastCos(ud.angle) * ud.orbitRadius;
                child.position.z = fastSin(ud.angle) * ud.orbitRadius;
                child.position.y = 0.2 + (child.position.y - 0.2) * 0.99 + fastSin(time + ud.phase) * 0.05;
            } else if (ud.style === 'rise') {
                ud.angle += delta * ud.speed * motion;
                child.position.y += delta * ud.riseSpeed * motion;
                if (child.position.y > 1.2) child.position.y = 0.1;
                child.position.x = fastCos(ud.angle + time * 0.5) * ud.orbitRadius;
                child.position.z = fastSin(ud.angle + time * 0.5) * ud.orbitRadius;
            } else if (ud.style === 'drip') {
                child.position.y -= delta * ud.riseSpeed * 0.8 * motion;
                if (child.position.y < -0.2) {
                    child.position.y = 0.9;
                    child.position.x = fastCos(time + ud.phase) * ud.orbitRadius;
                    child.position.z = fastSin(time + ud.phase) * ud.orbitRadius;
                }
            } else if (ud.style === 'spiral') {
                ud.angle += delta * ud.speed * motion;
                child.position.x = fastCos(ud.angle) * (ud.orbitRadius + fastSin(time * 2) * 0.1);
                child.position.z = fastSin(ud.angle) * (ud.orbitRadius + fastSin(time * 2) * 0.1);
                child.position.y = 0.3 + (ud.angle % (Math.PI * 2)) / (Math.PI * 2) * 0.7;
            } else if (ud.style === 'burst') {
                ud.angle += delta * ud.speed * motion;
                const r = ud.orbitRadius + fastSin(time * 3 + ud.phase) * 0.2;
                child.position.x = fastCos(ud.angle) * r;
                child.position.z = fastSin(ud.angle) * r;
                child.position.y = 0.4 + fastSin(time * 2 + ud.phase) * 0.2;
            }
        });
    }

    clear() {
        if (this.coachGroup) {
            this.coachGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            if (this.playerModel && this.playerModel.modelGroup) {
                this.playerModel.modelGroup.remove(this.coachGroup);
            }
        }
        this.coachGroup = null;
        this.auraMesh = null;
        this.particles = [];
    }

    dispose() {
        this.clear();
    }
}

import * as THREE from '../../libs/three/three.module.js';
import { RENDER_CONFIG } from '../config/render.js';

/**
 * Base class for all skill effects
 * Provides common functionality for creating and updating skill effects
 */
export class SkillEffect {
    
    /**
     * @param {import("../skills/Skill.js").Skill} skill 
     */
    constructor(skill) {
        this.skill = skill;
        this.effect = null;
        this.isActive = false;
        this.elapsedTime = 0;
    }

    /**
     * Utility method to validate vector values
     * @param {THREE.Vector3} vector - The vector to validate
     * @returns {boolean} - Whether the vector is valid
     */
    validateVector(vector) {
        if (!vector) return false;
        
        // Check if any component is NaN or infinite
        if (isNaN(vector.x) || isNaN(vector.y) || isNaN(vector.z) ||
            !isFinite(vector.x) || !isFinite(vector.y) || !isFinite(vector.z)) {
            console.warn("Invalid vector detected:", vector);
            return false;
        }
        
        return true;
    }

    /**
     * Update effect's Y position to follow terrain height at current X,Z.
     * Call this after moving projectiles (e.g. Deadly Reach, Wave Strike) so they stay on terrain.
     * @param {number} offset - Height above terrain (default 1.0)
     */
    updateEffectHeightForTerrain(offset = 1.0) {
        if (!this.effect || !this.skill?.game?.world) return;
        try {
            const h = this.skill.game.world.getTerrainHeight(this.effect.position.x, this.effect.position.z);
            if (h != null && h !== undefined && isFinite(h)) {
                this.effect.position.y = h + offset;
            }
        } catch (_) { /* terrain may not be ready */ }
    }

    /**
     * Adjust position to respect terrain height
     * @param {THREE.Vector3} position - The original position
     * @returns {THREE.Vector3} - The adjusted position
     */
    adjustPositionForTerrain(position) {
        if (!position) return new THREE.Vector3(0, 0, 0);
        
        // Create a copy of the position to avoid modifying the original
        const adjustedPosition = position.clone();
        
        // Try to get terrain height from the game world
        if (this.skill && this.skill.game && this.skill.game.world) {
            try {
                const terrainHeight = this.skill.game.world.getTerrainHeight(position.x, position.z);
                if (terrainHeight !== null && terrainHeight !== undefined && isFinite(terrainHeight)) {
                    // ALWAYS place effects well above the terrain to ensure visibility
                    // Use a generous offset to make sure effects are never underground
                    adjustedPosition.y = terrainHeight + 1.0; // 1 unit above terrain
                    console.debug(`Effect positioned at terrain height ${terrainHeight} + 1.0 = ${adjustedPosition.y}`);
                } else {
                    console.debug(`Failed to get valid terrain height for position (${position.x}, ${position.z}), using default height`);
                    // Use a reasonable default height when terrain height is not available
                    adjustedPosition.y = Math.max(adjustedPosition.y, 1.0);
                }
            } catch (error) {
                console.debug(`Error getting terrain height: ${error.message}, using default height`);
                // Use a reasonable default height when terrain height calculation fails
                adjustedPosition.y = Math.max(adjustedPosition.y, 1.0);
            }
        } else {
            // This can happen during initialization, in preview modes, or before world is ready
            // Instead of showing warnings, silently use a default height
            // Use a reasonable default height
            adjustedPosition.y = Math.max(adjustedPosition.y, 1.0);
        }
        
        return adjustedPosition;
    }

    /**
     * Create the effect mesh/group
     * @param {THREE.Vector3} position - Position to create the effect at
     * @param {THREE.Vector3} direction - Direction the effect should face
     * @returns {THREE.Group} - The created effect
     */
    create(position, direction) {
        // Base implementation creates a simple effect
        const effectGroup = new THREE.Group();
        
        // Create a simple mesh
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: this.skill.color,
            transparent: true,
            opacity: 0.8,
            depthWrite: false // Prevent hiding models behind the effect
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        effectGroup.add(mesh);
        
        // Position effect - adjust for terrain height if possible
        const adjustedPosition = this.adjustPositionForTerrain(position);
        effectGroup.position.copy(adjustedPosition);

        // AoE ground ring: show target area for skills with meaningful radius
        this._aoeRing = null;
        if (this.skill.radius > 1) {
            const outerR = this.skill.radius;
            const innerR = Math.max(0, outerR - 0.18);
            const ringGeo = new THREE.RingGeometry(innerR, outerR, 40);
            const ringMat = new THREE.MeshBasicMaterial({
                color: this.skill.color || 0xffffff,
                transparent: true,
                opacity: 0.40,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2; // lay flat on ground
            ring.position.y = -0.98; // just below effect center (at terrain level)
            this._aoeRing = ring;
            effectGroup.add(ring);
        }

        // Store effect
        this.effect = effectGroup;
        this.isActive = true;

        // Trail system for projectile-style skills (low radius = moving projectile)
        this._trailPoints = [];       // { mesh, opacity } ring buffer
        this._trailPrevPos = null;    // last sampled position
        this._trailFrameSkip = 0;    // sample every 2 frames

        this.applyShadowsToEffect(effectGroup);
        return effectGroup;
    }

    /**
     * Apply shadow casting to skill effect meshes only when the current quality profile has shadows enabled
     * (RENDER_CONFIG: high and medium have shadowMapEnabled: true; low and minimal have false).
     * Semi-transparent meshes (opacity >= 0.4) still cast shadows when the profile allows it.
     * @param {THREE.Object3D} effectGroup - Effect group or any Object3D (traversed)
     */
    applyShadowsToEffect(effectGroup) {
        if (!effectGroup || !this.skill?.game) return;
        const game = this.skill.game;
        const qualityLevel = game.materialQuality || game.performanceManager?.getCurrentQualityLevel?.() || 'medium';
        const profile = RENDER_CONFIG[qualityLevel] || RENDER_CONFIG.medium;
        const shadowsEnabled = profile.settings?.shadowMapEnabled === true;
        if (!shadowsEnabled) return;
        effectGroup.traverse(object => {
            if (!object.isMesh) return;
            const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
            let shouldCast = true;
            for (const mat of materials) {
                if (!mat) continue;
                const opacity = mat.opacity !== undefined ? mat.opacity : 1;
                if (mat.transparent === true && opacity < 0.4) {
                    shouldCast = false;
                    break;
                }
            }
            object.castShadow = shouldCast;
            object.receiveShadow = false;
        });
    }

    /** Temp vector for LOD distance check (reused to avoid allocation) */
    static _lodCheckPos = new THREE.Vector3();

    /**
     * Update the effect
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        if (!this.isActive || !this.effect) return;

        // LOD: hide effect when far from camera (saves GPU, particles still tick for collisions)
        const lodConfig = this.skill?.game?.world?.performanceProfile?.skillEffectLod;
        if (lodConfig && this.skill?.game?.camera) {
            this.effect.getWorldPosition(SkillEffect._lodCheckPos);
            const cp = this.skill.game.camera.position;
            const dx = SkillEffect._lodCheckPos.x - cp.x;
            const dy = SkillEffect._lodCheckPos.y - cp.y;
            const dz = SkillEffect._lodCheckPos.z - cp.z;
            const hideDist = lodConfig.hide ?? 120;
            this.effect.visible = (dx * dx + dy * dy + dz * dz) <= (hideDist * hideDist);
        }

        this.elapsedTime += delta;
        
        // Check if effect has expired
        if (this.elapsedTime >= this.skill.duration) {
            this.isActive = false;
            return;
        }
        
        // ALWAYS adjust effect position for terrain height on first few frames to ensure visibility
        // Then do it periodically for performance
        const shouldAdjustTerrain = this.elapsedTime < 0.1 || Math.random() < 0.05; // First 100ms or 5% chance
        
        if (shouldAdjustTerrain) {
            const adjustedPosition = this.adjustPositionForTerrain(this.effect.position);
            
            // Always update if it's the first few frames, otherwise check for significant difference
            if (this.elapsedTime < 0.1 || Math.abs(this.effect.position.y - adjustedPosition.y) > 0.2) {
                this.effect.position.copy(adjustedPosition);
                console.debug(`Effect position updated to: ${this.effect.position.y}`);
            }
        }
        
        // Animate AoE ring (pulse + fade towards end)
        if (this._aoeRing) {
            const progress = this.elapsedTime / this.skill.duration;
            const pulse = 1 + Math.sin(this.elapsedTime * 6) * 0.04;
            this._aoeRing.scale.set(pulse, 1, pulse);
            this._aoeRing.material.opacity = 0.40 * (1 - progress * 0.6);
        }

        // Trail: only for projectile-style skills (radius ≤ 2, actually moving)
        if (this._trailPoints !== undefined && this.skill.radius <= 2) {
            this._trailFrameSkip = (this._trailFrameSkip + 1) % 2;
            if (this._trailFrameSkip === 0) {
                const cur = this.effect.position;
                const moved = !this._trailPrevPos ||
                    Math.abs(cur.x - this._trailPrevPos.x) > 0.15 ||
                    Math.abs(cur.z - this._trailPrevPos.z) > 0.15;

                if (moved) {
                    // Spawn a new ghost dot at current position
                    const scene = this.skill.game?.getWorldGroup?.() || this.skill.game?.scene;
                    if (scene) {
                        const geo = new THREE.SphereGeometry(0.18, 5, 5);
                        const mat = new THREE.MeshBasicMaterial({
                            color: this.skill.color || 0xffffff,
                            transparent: true, opacity: 0.55, depthWrite: false
                        });
                        const dot = new THREE.Mesh(geo, mat);
                        dot.position.copy(cur);
                        dot.renderOrder = 997;
                        scene.add(dot);
                        this._trailPoints.push({ mesh: dot, opacity: 0.55 });
                        // Cap trail length
                        if (this._trailPoints.length > 7) {
                            const old = this._trailPoints.shift();
                            scene.remove(old.mesh);
                            old.mesh.geometry.dispose();
                            old.mesh.material.dispose();
                        }
                    }
                    this._trailPrevPos = cur.clone();
                }
            }

            // Fade all existing trail dots
            const scene = this.skill.game?.getWorldGroup?.() || this.skill.game?.scene;
            for (let _t = this._trailPoints.length - 1; _t >= 0; _t--) {
                const tp = this._trailPoints[_t];
                tp.opacity -= delta * 1.8;
                tp.mesh.material.opacity = Math.max(0, tp.opacity);
                if (tp.opacity <= 0) {
                    if (scene) scene.remove(tp.mesh);
                    tp.mesh.geometry.dispose();
                    tp.mesh.material.dispose();
                    this._trailPoints.splice(_t, 1);
                }
            }
        }

        // IMPORTANT: Update the skill's position property to match the effect's position
        // This is crucial for collision detection in CollisionManager
        this.skill.position.copy(this.effect.position);
    }

    /**
     * Dispose of the effect and clean up resources
     */
    dispose() {
        if (!this.effect) return;

        // Clean up trail dots
        if (this._trailPoints?.length) {
            const scene = this.skill?.game?.getWorldGroup?.() || this.skill?.game?.scene;
            for (const tp of this._trailPoints) {
                if (scene) scene.remove(tp.mesh);
                tp.mesh.geometry.dispose();
                tp.mesh.material.dispose();
            }
            this._trailPoints = [];
        }

        // Recursively dispose of geometries and materials
        this.effect.traverse(child => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        // Remove from parent
        if (this.effect.parent) {
            this.effect.parent.remove(this.effect);
        }
        
        this.effect = null;
        this.isActive = false;
    }
    
    /**
     * Reset the effect to its initial state
     * This allows the effect to be reused without creating a new instance
     */
    reset() {
        // Dispose of any existing effect
        this.dispose();
        
        // Reset state variables
        this.isActive = false;
        this.elapsedTime = 0;
        
        // Additional reset logic can be added in derived classes
    }
    
    /**
     * Create a hit effect when the skill hits an enemy
     * This is a generic implementation that can be overridden by derived classes
     * @param {THREE.Vector3} position - Position to create the hit effect at
     */
    createHitEffect(position) {
        if (!position || !this.skill || !this.skill.game || !this.skill.game.scene) {
            console.warn('Cannot create hit effect: missing required references');
            return;
        }
        
        // Create a group for the hit effect
        const hitEffectGroup = new THREE.Group();
        
        // Create a flash of light
        const flashGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: this.skill.color || 0xffffff,
            transparent: true,
            opacity: 0.7,
            depthWrite: false
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        hitEffectGroup.add(flash);
        
        // Position the hit effect - adjust for terrain height
        const adjustedHitPosition = this.adjustPositionForTerrain(position);
        hitEffectGroup.position.copy(adjustedHitPosition);
        
        // Add to scene
        (this.skill.game.getWorldGroup?.() || this.skill.game.scene).add(hitEffectGroup);
        
        // Animate the hit effect
        let elapsedTime = 0;
        const duration = 0.3; // seconds
        
        const animate = (delta) => {
            elapsedTime += delta;
            
            // Scale flash
            const flashScale = 1.0 + (elapsedTime / duration);
            flash.scale.set(flashScale, flashScale, flashScale);
            flash.material.opacity = (1.0 - (elapsedTime / duration)) * 0.7;
            
            // Remove when animation is complete
            if (elapsedTime >= duration) {
                // Clean up
                if (flash.geometry) flash.geometry.dispose();
                if (flash.material) flash.material.dispose();
                
                this.skill.game.scene.remove(hitEffectGroup);
                return;
            }
            
            // Continue animation
            requestAnimationFrame(() => {
                animate(1/60); // Approximate delta if not provided by game loop
            });
        };
        
        // Start animation
        animate(1/60);
    }
}
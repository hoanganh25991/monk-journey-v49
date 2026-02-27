import * as THREE from '../../libs/three/three.module.js';
import { fastAtan2 } from '../utils/FastMath.js';
import { TextGeometry } from '../../libs/three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from '../../libs/three/examples/jsm/loaders/FontLoader.js';

/**
 * Configuration for 3D damage number appearance
 */
const DAMAGE_NUMBER_CONFIG = {
    // Text geometry parameters
    TEXT_SIZE: 1,
    TEXT_HEIGHT: 0.2, // Reduced depth for better performance
    CURVE_SEGMENTS: 6, // Reduced for better performance (was 10)
    BEVEL_ENABLED: true,
    BEVEL_THICKNESS: 0.03,
    BEVEL_SIZE: 0.02,
    BEVEL_SEGMENTS: 2, // Reduced for better performance (was 4)
    
    // Material parameters
    EMISSIVE_INTENSITY: 0.8,
    METALNESS: 0.1,
    ROUGHNESS: 0.3,
    
    // Outline parameters
    OUTLINE_SCALE: 1.04, // Reduced for subtler outline
    OUTLINE_OPACITY: 0.7, // Slightly more transparent
    OUTLINE_ENABLED: true, // Can be disabled for better performance
    
    // Animation parameters — fast up and disappear for strong-attack feel
    DURATION: 0.45,
    FLOAT_SPEED: 6.0,
    SCALE_NORMAL: 0.5, // 10x bigger - was 0.05
    SCALE_CRITICAL: 0.6, // 10x bigger - was 0.06
    SCALE_KILL: 0.8, // 10x bigger - was 0.08
    
    // Performance parameters
    BILLBOARD_UPDATE_INTERVAL: 0.1, // Update billboard rotation every 0.1s instead of every frame
    GEOMETRY_CACHE_SIZE: 20 // Cache up to 20 most common damage values
};

/**
 * Floating damage number in Three.js world space (RPG/Diablo style).
 * Renders as 3D extruded text geometry at a fixed world position, floats upward and fades out.
 * Does not follow the player or any entity — stays where the hit occurred.
 */
export class DamageNumberSpriteEffect {
    static font = null;
    static fontLoading = false;
    static fontLoadPromise = null;
    
    // Geometry cache for reusing common damage values
    static geometryCache = new Map();
    static materialCache = new Map();
    static cacheHits = 0;
    static cacheMisses = 0;
    
    /**
     * @param {Object} game - Game instance (for scene)
     * @param {number} amount - Damage value to display
     * @param {THREE.Vector3} worldPosition - Position in world (cloned; effect stays here)
     * @param {Object} options - { isPlayerDamage, isCritical, isKill, isExperience, isBonus }
     */
    constructor(game, amount, worldPosition, options = {}) {
        this.game = game;
        this.amount = amount;
        this.worldPosition = worldPosition.clone();
        this.isPlayerDamage = options.isPlayerDamage || false;
        this.isCritical = options.isCritical || options.isKill || false;
        this.isKill = options.isKill || false;
        this.isExperience = options.isExperience || false;
        this.isBonus = options.isBonus || false;
        this.duration = DAMAGE_NUMBER_CONFIG.DURATION;
        this.floatSpeed = DAMAGE_NUMBER_CONFIG.FLOAT_SPEED;
        this.elapsed = 0;
        this.isActive = true;
        this.group = null;
        this.mesh = null;
        this.initialScale = this.isBonus
            ? DAMAGE_NUMBER_CONFIG.SCALE_KILL
            : this.isExperience
                ? DAMAGE_NUMBER_CONFIG.SCALE_CRITICAL
                : this.isKill
                    ? DAMAGE_NUMBER_CONFIG.SCALE_KILL
                    : this.isCritical
                        ? DAMAGE_NUMBER_CONFIG.SCALE_CRITICAL
                        : DAMAGE_NUMBER_CONFIG.SCALE_NORMAL;
        
        // Billboard optimization - don't update every frame
        this.billboardTimer = 0;
        this.lastCameraAngle = 0;
        
        // Track if we're using cached geometry
        this.usingCachedGeometry = false;
    }

    /**
     * Load font for 3D text (called once, shared across all instances)
     * @returns {Promise<Font>}
     */
    static loadFont() {
        if (DamageNumberSpriteEffect.font) {
            return Promise.resolve(DamageNumberSpriteEffect.font);
        }
        if (DamageNumberSpriteEffect.fontLoadPromise) {
            return DamageNumberSpriteEffect.fontLoadPromise;
        }
        
        DamageNumberSpriteEffect.fontLoadPromise = new Promise((resolve, reject) => {
            const loader = new FontLoader();
            // Use Helvetiker Bold font (included with Three.js)
            loader.load(
                './fonts/helvetiker_bold.typeface.json',
                (font) => {
                    DamageNumberSpriteEffect.font = font;
                    resolve(font);
                },
                undefined,
                (error) => {
                    console.warn('Failed to load 3D font, will use fallback:', error);
                    reject(error);
                }
            );
        });
        
        return DamageNumberSpriteEffect.fontLoadPromise;
    }

    /**
     * Get or create cached geometry for a text string
     * @param {string} text - The text to create geometry for
     * @param {Font} font - The loaded font
     * @returns {THREE.BufferGeometry}
     */
    static getCachedGeometry(text, font) {
        // Check cache first
        if (this.geometryCache.has(text)) {
            this.cacheHits++;
            return this.geometryCache.get(text);
        }
        
        this.cacheMisses++;
        
        // Create new geometry
        const geometry = new TextGeometry(text, {
            font: font,
            size: DAMAGE_NUMBER_CONFIG.TEXT_SIZE,
            height: DAMAGE_NUMBER_CONFIG.TEXT_HEIGHT,
            curveSegments: DAMAGE_NUMBER_CONFIG.CURVE_SEGMENTS,
            bevelEnabled: DAMAGE_NUMBER_CONFIG.BEVEL_ENABLED,
            bevelThickness: DAMAGE_NUMBER_CONFIG.BEVEL_THICKNESS,
            bevelSize: DAMAGE_NUMBER_CONFIG.BEVEL_SIZE,
            bevelSegments: DAMAGE_NUMBER_CONFIG.BEVEL_SEGMENTS
        });
        
        // Center the geometry
        geometry.computeBoundingBox();
        const centerOffset = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        geometry.translate(centerOffset, 0, 0);
        
        // Cache management - keep only most recent entries
        if (this.geometryCache.size >= DAMAGE_NUMBER_CONFIG.GEOMETRY_CACHE_SIZE) {
            // Remove oldest entry (first in Map)
            const firstKey = this.geometryCache.keys().next().value;
            const oldGeometry = this.geometryCache.get(firstKey);
            oldGeometry.dispose();
            this.geometryCache.delete(firstKey);
        }
        
        this.geometryCache.set(text, geometry);
        return geometry;
    }
    
    /**
     * Get or create cached material for a color type
     * @param {string} type - 'normal', 'critical', 'kill', or 'playerDamage'
     * @returns {THREE.Material}
     */
    static getCachedMaterial(type) {
        const cacheKey = `${type}_main`;
        
        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(cacheKey);
        }
        
        // Choose color based on damage type
        let color, emissiveColor;
        if (type === 'playerDamage') {
            color = 0xff2222;
            emissiveColor = 0xff0000;
        } else if (type === 'exp') {
            color = 0xffcc00;
            emissiveColor = 0xffaa00;
        } else if (type === 'bonus') {
            color = 0x44ff88;
            emissiveColor = 0x22cc66;
        } else if (type === 'kill') {
            color = 0xff5500;
            emissiveColor = 0xff3300;
        } else if (type === 'critical') {
            color = 0xff9900;
            emissiveColor = 0xff6600;
        } else {
            color = 0xffdd00;
            emissiveColor = 0xffaa00;
        }
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissiveColor,
            emissiveIntensity: DAMAGE_NUMBER_CONFIG.EMISSIVE_INTENSITY,
            metalness: DAMAGE_NUMBER_CONFIG.METALNESS,
            roughness: DAMAGE_NUMBER_CONFIG.ROUGHNESS,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        
        this.materialCache.set(cacheKey, material);
        return material;
    }
    
    /**
     * Get or create cached outline material
     * @returns {THREE.Material}
     */
    static getCachedOutlineMaterial() {
        const cacheKey = 'outline';
        
        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(cacheKey);
        }
        
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: DAMAGE_NUMBER_CONFIG.OUTLINE_OPACITY,
            side: THREE.BackSide
        });
        
        this.materialCache.set(cacheKey, material);
        return material;
    }

    /**
     * Create 3D text geometry with materials (optimized with caching)
     * @returns {THREE.Mesh|null}
     */
    async create3DText() {
        try {
            const font = await DamageNumberSpriteEffect.loadFont();
            if (!font) return null;

            let text;
            if (this.isExperience) text = `+${this.amount} EXP`;
            else if (this.isBonus) text = `+${this.amount} BONUS!`;
            else text = this.isPlayerDamage ? `-${this.amount.toLocaleString()}` : this.amount.toLocaleString();
            
            // Get cached geometry (or create new one)
            const geometry = DamageNumberSpriteEffect.getCachedGeometry(text, font);
            this.usingCachedGeometry = true;
            
            // Get material type
            const materialType = this.isBonus ? 'bonus'
                : this.isExperience ? 'exp'
                : this.isPlayerDamage ? 'playerDamage'
                : this.isKill ? 'kill'
                : this.isCritical ? 'critical'
                : 'normal';
            
            // Get cached materials
            const material = DamageNumberSpriteEffect.getCachedMaterial(materialType);
            const outlineMaterial = DamageNumberSpriteEffect.getCachedOutlineMaterial();

            // Create main mesh (reuse geometry and material)
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = false; // Disable shadows for performance
            mesh.receiveShadow = false;
            
            // Group mesh and outline together
            const group = new THREE.Group();
            
            // Only add outline if enabled (can disable for better performance)
            if (DAMAGE_NUMBER_CONFIG.OUTLINE_ENABLED) {
                // Create outline mesh (reuse geometry and material, just scale differently)
                const outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
                outlineMesh.castShadow = false; // Disable shadows for performance
                outlineMesh.receiveShadow = false;
                const outlineScale = DAMAGE_NUMBER_CONFIG.OUTLINE_SCALE;
                outlineMesh.scale.set(outlineScale, outlineScale, outlineScale);
                group.add(outlineMesh);
                group.userData.outlineMesh = outlineMesh;
            }
            
            group.add(mesh);
            
            // Store reference to main mesh for animations
            group.userData.mainMesh = mesh;
            
            return group;
        } catch (error) {
            console.warn('Failed to create 3D text, using fallback:', error);
            return null;
        }
    }

    /**
     * Create the 3D text mesh and add to scene at world position.
     * @returns {Promise<boolean>} - True if created and added
     */
    async create() {
        if (!this.game?.scene) return false;

        this.mesh = await this.create3DText();
        if (!this.mesh) return false;

        // Scale the 3D text
        const baseScale = this.initialScale;
        this.mesh.scale.set(baseScale, baseScale, baseScale);

        this.group = new THREE.Group();
        this.group.position.copy(this.worldPosition);
        this.group.add(this.mesh);

        (this.game.getWorldGroup?.() || this.game.scene).add(this.group);
        return true;
    }

    /**
     * Update: float up, face camera, and fade out. Called every frame by EffectsManager.
     * @param {number} delta - Time in seconds
     * @returns {boolean} - True if still active
     */
    update(delta) {
        if (!this.isActive || !this.group) return false;
        this.elapsed += delta;
        if (this.elapsed >= this.duration) {
            this.dispose();
            return false;
        }
        
        // Frustum culling - hide if too far from camera
        if (this.game?.camera) {
            const dx = this.group.position.x - this.game.camera.position.x;
            const dy = this.group.position.y - this.game.camera.position.y;
            const dz = this.group.position.z - this.game.camera.position.z;
            const distSqToCamera = dx * dx + dy * dy + dz * dz;
            if (distSqToCamera > 6400) { // 80^2 // Hide damage numbers beyond 80 units
                this.group.visible = false;
                return true; // Keep alive but hidden
            } else {
                this.group.visible = true;
            }
        }
        
        // Float up fast (no deceleration — snappy)
        this.group.position.y += this.floatSpeed * delta;
        
        // Billboard optimization - only update rotation periodically
        this.billboardTimer += delta;
        if (this.billboardTimer >= DAMAGE_NUMBER_CONFIG.BILLBOARD_UPDATE_INTERVAL) {
            this.billboardTimer = 0;
            
            // Make the 3D text face the camera (billboard on Y-axis only)
            if (this.game?.camera && this.mesh) {
                const cameraPos = this.game.camera.position;
                const meshPos = this.group.position;
                
                // Calculate angle to camera on horizontal plane (XZ)
                const dx = cameraPos.x - meshPos.x;
                const dz = cameraPos.z - meshPos.z;
                const angleY = fastAtan2(dx, dz);
                
                // Only update if angle changed significantly (> 0.1 radians)
                if (Math.abs(angleY - this.lastCameraAngle) > 0.1) {
                    this.mesh.rotation.y = angleY;
                    this.lastCameraAngle = angleY;
                }
            }
        }
        
        // Scale: quick pop then hold (no slow shrink — snappy)
        const t = this.elapsed / this.duration;
        const scale = t < 0.12
            ? this.initialScale * (1 + 0.25 * (t / 0.12))
            : this.initialScale * 1.25;
        
        // Fade out early and fast — no long blur
        const fadeStart = 0.2;
        let opacity = 1;
        if (t > fadeStart) {
            const f = (t - fadeStart) / (1 - fadeStart);
            opacity = Math.max(0, 1 - f * f);
        }
        
        // Update opacity and scale for both main mesh and outline
        if (this.mesh) {
            const mainMesh = this.mesh.userData?.mainMesh;
            const outlineMesh = this.mesh.userData?.outlineMesh;
            
            if (mainMesh?.material) {
                mainMesh.material.opacity = opacity;
            }
            if (outlineMesh?.material) {
                outlineMesh.material.opacity = opacity * 0.8; // Slightly more transparent outline
            }
            
            this.mesh.scale.set(scale, scale, scale);
        }
        return true;
    }

    dispose() {
        this.isActive = false;
        if (this.mesh) {
            const mainMesh = this.mesh.userData?.mainMesh;
            const outlineMesh = this.mesh.userData?.outlineMesh;
            if (!this.usingCachedGeometry) {
                if (mainMesh?.geometry) mainMesh.geometry.dispose();
                if (outlineMesh?.geometry) outlineMesh.geometry.dispose();
                if (mainMesh?.material) mainMesh.material.dispose();
                if (outlineMesh?.material) outlineMesh.material.dispose();
            }
        }
        if (this.group?.parent) {
            this.group.parent.remove(this.group);
        }
        this.mesh = null;
        this.group = null;
    }
    
    /**
     * Clear all cached geometries and materials (call on scene cleanup)
     */
    static clearCache() {
        // Dispose all cached geometries
        for (const geometry of this.geometryCache.values()) {
            geometry.dispose();
        }
        this.geometryCache.clear();
        
        // Dispose all cached materials
        for (const material of this.materialCache.values()) {
            material.dispose();
        }
        this.materialCache.clear();
        
        console.debug(`DamageNumberSpriteEffect cache cleared. Cache stats - Hits: ${this.cacheHits}, Misses: ${this.cacheMisses}`);
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }
}

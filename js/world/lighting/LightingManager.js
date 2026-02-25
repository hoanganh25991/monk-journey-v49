import * as THREE from '../../../libs/three/three.module.js';
import { RENDER_CONFIG } from '../../config/render.js';
import deviceCapabilities from '../../utils/DeviceCapabilities.js';

/**
 * Manages world lighting
 */
export class LightingManager {
    constructor(scene) {
        this.scene = scene;
        
        // Lighting collections
        this.lights = [];
        
        // Time of day
        this.timeOfDay = 0.5; // 0 = midnight, 0.5 = noon, 1 = midnight
        this.dayNightCycle = true;
        this.dayNightCycleSpeed = 0.0001; // Speed of day/night cycle
    }
    
    /**
     * Initialize the lighting system
     */
    init() {
        this.createLights();
    }
    
    /**
     * Create lights for the world
     */
    createLights() {
        // Ambient light - darker for atmospheric mood
        const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Directional light (sun)
        // Positioned for longer shadows (like 15:00/3 PM sun angle)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(120, 40, 50);
        directionalLight.castShadow = true;
        
        // IMPROVED: Shadow camera must cover full visible terrain (chunked terrain with height)
        const shadowCameraRadius = 320;
        const defaultShadow = RENDER_CONFIG.high?.settings || {};
        directionalLight.shadow.mapSize.width = defaultShadow.shadowMapSize || 4096;
        directionalLight.shadow.mapSize.height = defaultShadow.shadowMapSize || 4096;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -shadowCameraRadius;
        directionalLight.shadow.camera.right = shadowCameraRadius;
        directionalLight.shadow.camera.top = shadowCameraRadius;
        directionalLight.shadow.camera.bottom = -shadowCameraRadius;
        directionalLight.shadow.bias = -0.0001;
        directionalLight.shadow.normalBias = defaultShadow.shadowNormalBias ?? 0.006;
        directionalLight.shadow.radius = defaultShadow.shadowRadius ?? 0.5;
        
        // Create a target for the directional light
        directionalLight.target.position.set(0, 0, 0);
        this.scene.add(directionalLight.target);
        
        // Add the light to the scene
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
        this.sunLight = directionalLight;
        
        // Add a hemisphere light - darker for atmospheric mood
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3a7e4f, 0.25);
        this.scene.add(hemisphereLight);
        this.lights.push(hemisphereLight);
        this.skyLight = hemisphereLight;
    }
    
    /**
     * Update lighting based on time of day and player position
     * @param {number} deltaTime - Time since last update
     * @param {THREE.Vector3} [playerPosition] - Optional player position to update light position
     */
    update(deltaTime, playerPosition) {
        if (this.dayNightCycle) {
            // Update time of day
            this.timeOfDay += this.dayNightCycleSpeed * deltaTime;
            if (this.timeOfDay > 1) {
                this.timeOfDay = 0;
            }
            
            // Update lighting based on time of day
            this.updateLightingForTimeOfDay();
        }
        
        // If player position is provided, update the shadow camera position
        if (playerPosition) {
            this.updateLightPositionForPlayer(playerPosition);
        }
    }
    
    /**
     * Update directional light position to follow the player
     * @param {THREE.Vector3} playerPosition - The player's current position
     */
    updateLightPositionForPlayer(playerPosition) {
        if (!this.sunLight) return;
        
        // Get the current sun angle and height from time of day
        // Adjusted for lower sun angle (like 15:00/3 PM) to create longer shadows
        const sunAngle = Math.PI * 2 * this.timeOfDay - Math.PI / 2;
        const sunHeight = Math.sin(sunAngle) * 0.4; // Much lower sun for 15:00 angle
        const sunDistance = 200; // Increased distance for longer shadows
        
        // Calculate sun position relative to player
        // For 15:00 angle, we want low Y relative to horizontal distance
        const relativeX = Math.cos(sunAngle) * sunDistance;
        const relativeY = Math.max(20, sunHeight * 50 + 30); // Fixed low height for afternoon sun
        const relativeZ = 0;
        
        // Update sun position to be relative to player
        this.sunLight.position.set(
            playerPosition.x + relativeX,
            playerPosition.y + relativeY,
            playerPosition.z + relativeZ
        );
        
        // Update the target of the directional light to look at the player
        this.sunLight.target.position.copy(playerPosition);
        
        // Make sure the target is added to the scene
        if (!this.sunLight.target.parent) {
            this.scene.add(this.sunLight.target);
        }
    }
    
    /**
     * Update lighting based on current time of day
     */
    updateLightingForTimeOfDay() {
        // Calculate sun angle and height (but don't update position here)
        const sunAngle = Math.PI * 2 * this.timeOfDay - Math.PI / 2;
        const sunHeight = Math.sin(sunAngle);
        
        // Update sun intensity based on height - reduced for darker atmosphere
        const sunIntensity = Math.max(0, sunHeight) * 0.5; // Reduced to 50% for darker mood
        this.sunLight.intensity = sunIntensity;
        
        // Update ambient light based on time of day - darker
        const ambientIntensity = 0.15 + sunIntensity * 0.2; // Reduced base and multiplier
        this.lights[0].intensity = ambientIntensity;
        
        // Update sky light based on time of day
        const skyColor = new THREE.Color();
        const groundColor = new THREE.Color();
        
        if (sunHeight > 0) {
            // Day - darker colors for atmospheric mood
            skyColor.setHSL(0.6, 0.7, 0.35 + sunHeight * 0.3); // Reduced saturation and lightness
            groundColor.setHSL(0.095, 0.4, 0.25 + sunHeight * 0.08); // Darker ground
        } else {
            // Night - darker
            skyColor.setHSL(0.7, 0.6, Math.max(0.08, 0.25 + sunHeight * 0.15));
            groundColor.setHSL(0.095, 0.4, Math.max(0.08, 0.25 + sunHeight * 0.08));
        }
        
        this.skyLight.color.copy(skyColor);
        this.skyLight.groundColor.copy(groundColor);
        this.skyLight.intensity = 0.2 + sunIntensity * 0.2; // Reduced from 0.3 + 0.3
    }
    
    /**
     * Set the time of day
     * @param {number} time - Time of day (0-1)
     */
    setTimeOfDay(time) {
        this.timeOfDay = Math.max(0, Math.min(1, time));
        this.updateLightingForTimeOfDay();
    }
    
    /**
     * Toggle day/night cycle
     * @param {boolean} enabled - Whether the day/night cycle is enabled
     */
    setDayNightCycle(enabled) {
        this.dayNightCycle = enabled;
    }
    
    /**
     * Set day/night cycle speed
     * @param {number} speed - Speed of day/night cycle
     */
    setDayNightCycleSpeed(speed) {
        this.dayNightCycleSpeed = speed;
    }
    
    /**
     * Clear all lights
     */
    clear() {
        this.lights.forEach(light => {
            if (light.parent) {
                this.scene.remove(light);
            }
        });
        this.lights = [];
    }

    /**
     * Apply shadow settings with device capability detection.
     * Desktop: Uses full quality settings (e.g., 4096 for high)
     * Mobile: Automatically scales down to device-safe limits
     * @param {string} qualityLevel - 'high' | 'medium' | 'low' | 'minimal'
     */
    applyQuality(qualityLevel) {
        if (!this.sunLight) return;
        
        const level = ['high', 'medium', 'low', 'minimal'].includes(qualityLevel) ? qualityLevel : 'high';
        const settings = RENDER_CONFIG[level]?.settings || RENDER_CONFIG.high.settings;
        
        // Check device capabilities for shadow support
        const capabilities = deviceCapabilities.getCapabilities();
        const shadowsEnabled = capabilities 
            ? deviceCapabilities.shouldEnableShadows(qualityLevel)
            : !!settings.shadowMapEnabled;
        
        this.sunLight.castShadow = shadowsEnabled;
        
        if (shadowsEnabled && settings.shadowMapSize > 0) {
            // Get optimal shadow map size for this device
            let shadowMapSize = settings.shadowMapSize;
            
            if (capabilities && capabilities.optimalShadowMapSize) {
                const optimalSize = capabilities.optimalShadowMapSize[qualityLevel];
                shadowMapSize = Math.min(settings.shadowMapSize, optimalSize);
                
                console.debug(`Light shadow map size adjusted from ${settings.shadowMapSize} to ${shadowMapSize} based on device capabilities`);
            }
            
            this.sunLight.shadow.mapSize.width = shadowMapSize;
            this.sunLight.shadow.mapSize.height = shadowMapSize;
            this.sunLight.shadow.radius = typeof settings.shadowRadius === 'number' ? settings.shadowRadius : 0.5;
            this.sunLight.shadow.normalBias = typeof settings.shadowNormalBias === 'number' ? settings.shadowNormalBias : 0.006;
            
            console.debug(`Light shadows enabled with ${shadowMapSize}x${shadowMapSize} map`);
        } else {
            console.debug(`Light shadows disabled for ${qualityLevel} quality on this device`);
        }
    }
}
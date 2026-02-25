import * as THREE from '../../../libs/three/three.module.js';

/**
 * Represents a plaza environment object for circular villages
 */
export class Plaza {
    /**
     * Create a new plaza
     * @param {THREE.Scene} scene - The scene to add the plaza to
     * @param {Object} worldManager - The world manager
     */
    constructor(scene, worldManager) {
        this.scene = scene;
        this.worldManager = worldManager;
    }

    /**
     * Create the plaza mesh
     * @param {Object} data - Plaza data including position and radius
     * @returns {THREE.Mesh} - The plaza mesh
     */
    createMesh(data) {
        const radius = data.radius || 8;
        
        // Create plaza ground
        const plazaGeometry = new THREE.CircleGeometry(radius, 32);
        
        // Get theme colors
        let plazaColor = 0xCCCCCC; // Default plaza color
        
        if (this.worldManager.mapLoader && 
            this.worldManager.mapLoader.currentMap && 
            this.worldManager.mapLoader.currentMap.theme) {
            const themeColors = this.worldManager.mapLoader.currentMap.theme.colors;
            
            // Use theme-specific path color if available
            if (themeColors && themeColors.path) {
                // Convert hex string to number
                plazaColor = parseInt(themeColors.path.replace('#', '0x'), 16);
            }
        }
        
        const plazaMaterial = new THREE.MeshStandardMaterial({ 
            color: plazaColor,
            roughness: 0.7
        });
        
        const plaza = new THREE.Mesh(plazaGeometry, plazaMaterial);
        plaza.rotation.x = -Math.PI / 2; // Rotate to be horizontal
        const baseY = (data.position.y != null && isFinite(data.position.y)) ? data.position.y : 0;
        plaza.position.set(data.position.x, baseY + 0.05, data.position.z); // Terrain height + slight offset
        
        plaza.userData = { type: 'plaza' };
        
        return plaza;
    }
}
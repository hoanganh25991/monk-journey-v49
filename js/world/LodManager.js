/**
 * LodManager - Level of Detail manager for structures and environment
 *
 * When enabled (high/medium/low), can apply LOD to reduce detail at distance.
 * Disabled for minimal profile to reduce overhead on low-end tablets.
 *
 * IMPORTANT: The player (monk) 3D model must never use LOD based on world position
 * or distance from origin (0,0,0). Only camera distance (zoom) and quality level
 * may change the monk's model detail. See performance-profile PLAYER_LOD_POLICY.
 */

export class LodManager {
    constructor(worldManager, qualityLevel = 'high') {
        this.worldManager = worldManager;
        this.qualityLevel = qualityLevel;
    }

    /**
     * Apply LOD to an object. For now returns object as-is.
     * Full LOD (THREE.LOD with multiple levels) can be added later.
     * Player (monk) model is never given position-based LOD—only zoom and quality may affect it.
     * @param {THREE.Object3D} object - The object to potentially wrap in LOD
     * @param {string} type - Type of object (tree, rock, etc.)
     * @param {THREE.Vector3} position - World position
     * @returns {THREE.Object3D} The object (possibly wrapped in LOD)
     */
    applyLOD(object, type, position) {
        // Never apply position-based LOD to the player (monk) model. LOD for the monk
        // must only depend on camera distance (zoom) and quality level, not distance from origin.
        if (object && object.traverse) {
            let isPlayerModel = false;
            object.traverse((node) => {
                if (node.userData && node.userData.isPlayerModel) {
                    isPlayerModel = true;
                }
            });
            if (isPlayerModel) return object;
        }
        // Placeholder: return object as-is. Full LOD would wrap in THREE.LOD with
        // near/mid/far levels. Disabled for minimal; for low we keep simple.
        return object;
    }
    
    /**
     * Update quality settings (called when user changes profile)
     * @param {string} quality - New quality level
     */
    updateQualitySettings(quality) {
        this.qualityLevel = quality;
    }
}

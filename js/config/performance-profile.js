/**
 * Performance Profile Configuration
 * 
 * Quality-level-specific settings for terrain, LOD, structures, and environment.
 * Used when user selects a lower profile in Settings for low-end tablets.
 * 
 * Profiles: high | medium | low | minimal
 */

/**
 * Terrain LOD - resolution by distance (chunks from player)
 * Lower resolution = fewer vertices = better performance on low-end devices
 */
export const TERRAIN_LOD = {
    high: {
        nearResolution: 32,   // 0–1 chunk from player
        midResolution: 24,   // 1–2 chunks
        farResolution: 16,   // 2+ chunks
        bufferResolution: 12 // buffered chunks
    },
    medium: {
        nearResolution: 24,
        midResolution: 16,
        farResolution: 12,
        bufferResolution: 8
    },
    low: {
        nearResolution: 16,
        midResolution: 12,
        farResolution: 8,
        bufferResolution: 6
    },
    minimal: {
        nearResolution: 12,
        midResolution: 8,
        farResolution: 6,
        bufferResolution: 4
    }
};

/**
 * View distance in chunks - fewer chunks = less geometry to render
 */
export const VIEW_DISTANCE = {
    high: 3,
    medium: 3,
    low: 2,
    minimal: 2
};

/**
 * Buffer distance (chunks pre-generated ahead of player)
 */
export const BUFFER_DISTANCE = {
    high: 6,
    medium: 5,
    low: 4,
    minimal: 3
};

/**
 * Max chunks to process per frame - lower = smoother on weak devices
 */
export const CHUNKS_PER_FRAME = {
    high: 2,
    medium: 2,
    low: 1,
    minimal: 1
};

/**
 * Environment object count multiplier per chunk (0–1)
 */
export const ENVIRONMENT_DENSITY_MULTIPLIER = {
    high: 1.0,
    medium: 0.8,
    low: 0.5,
    minimal: 0.25
};

/**
 * Structure probability multiplier (0–1)
 */
export const STRUCTURE_DENSITY_MULTIPLIER = {
    high: 1.0,
    medium: 0.8,
    low: 0.5,
    minimal: 0.2
};

/**
 * Max structure chunks generated per frame
 */
export const STRUCTURE_CHUNKS_PER_FRAME = {
    high: 2,
    medium: 2,
    low: 1,
    minimal: 1
};

/**
 * Max environment chunks generated per frame
 */
export const ENV_CHUNKS_PER_FRAME = {
    high: 2,
    medium: 2,
    low: 1,
    minimal: 1
};

/**
 * Whether to enable LOD for structures/environment (LOD adds overhead on minimal)
 */
export const LOD_ENABLED = {
    high: true,
    medium: true,
    low: true,
    minimal: false
};

/**
 * LOD distances for enemies (meters from camera)
 * When beyond highDetailDistance, use low-poly proxy; beyond hideDistance, hide entirely
 * Multiplied 3x from original for better visibility of enemies at distance
 */
export const ENEMY_LOD_DISTANCES = {
    high: { highDetail: 150, hide: 600 },
    medium: { highDetail: 120, hide: 450 },
    low: { highDetail: 90, hide: 300 },
    minimal: { highDetail: 60, hide: 240 }
};

/**
 * LOD distances for skill effects (meters from camera)
 * When beyond highDetailDistance, hide effect (saves particles/geometry updates)
 */
export const SKILL_EFFECT_LOD_DISTANCES = {
    high: { highDetail: 80, hide: 150 },
    medium: { highDetail: 60, hide: 120 },
    low: { highDetail: 40, hide: 80 },
    minimal: { highDetail: 25, hide: 50 }
};

/**
 * Shadow casting - disable for distant objects on low/minimal
 */
export const SHADOW_CASTER_DISTANCE = {
    high: Infinity,
    medium: 150,
    low: 80,
    minimal: 0  // No shadows
};

/**
 * Get profile config for a quality level
 * @param {string} qualityLevel - 'high' | 'medium' | 'low' | 'minimal'
 * @returns {Object} Merged profile config
 */
export function getPerformanceProfile(qualityLevel) {
    const level = ['high', 'medium', 'low', 'minimal'].includes(qualityLevel) ? qualityLevel : 'medium';
    return {
        terrainLod: TERRAIN_LOD[level],
        viewDistance: VIEW_DISTANCE[level],
        bufferDistance: BUFFER_DISTANCE[level],
        chunksPerFrame: CHUNKS_PER_FRAME[level],
        environmentDensity: ENVIRONMENT_DENSITY_MULTIPLIER[level],
        structureDensity: STRUCTURE_DENSITY_MULTIPLIER[level],
        structureChunksPerFrame: STRUCTURE_CHUNKS_PER_FRAME[level],
        envChunksPerFrame: ENV_CHUNKS_PER_FRAME[level],
        lodEnabled: LOD_ENABLED[level],
        shadowCasterDistance: SHADOW_CASTER_DISTANCE[level],
        enemyLod: ENEMY_LOD_DISTANCES[level],
        skillEffectLod: SKILL_EFFECT_LOD_DISTANCES[level]
    };
}

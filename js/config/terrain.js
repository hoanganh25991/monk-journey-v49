/**
 * Player "virtual space" radius in chunks. Only chunks within this distance are kept.
 * Zone-agnostic: the bubble can span 2 zones; no need to buffer whole zones.
 */
export const PLAYER_SPACE_CHUNKS = 5;

/**
 * Terrain height profiles - used when map has terrain.profile
 * Must match scripts/generate-maps.js TERRAIN_PROFILES
 */
export const TERRAIN_PROFILES = {
  flat:      { amplitude: 4,  frequency: 0.003 },
  gentle:    { amplitude: 8,  frequency: 0.005 },
  hills:     { amplitude: 16, frequency: 0.006 },
  mountains: { amplitude: 24, frequency: 0.004 },
};

/**
 * Configuration settings for terrain generation and rendering
 */
export const TERRAIN_CONFIG = {
    // Base terrain properties
    size: 0,
    resolution: 32,
    height: 16,

    // Terrain chunk properties - tied to player space
    chunkSize: 64,
    chunkViewDistance: 3,
    bufferDistance: 6,
    
    // Terrain caching - in-memory only. NEVER save terrain to localStorage (huge CPU lock from JSON.stringify)
    cache: {
        maxCachedChunks: 100,
        saveToLocalStorage: false, // MUST stay false - terrain serialization causes game freeze
        localStorageKey: 'monk_journey_terrain_cache' // Unused when saveToLocalStorage is false
    }
};
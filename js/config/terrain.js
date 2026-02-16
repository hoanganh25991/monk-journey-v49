/**
 * Player "virtual space" radius in chunks. Only chunks within this distance are kept.
 * Zone-agnostic: the bubble can span 2 zones; no need to buffer whole zones.
 */
export const PLAYER_SPACE_CHUNKS = 5;

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
/**
 * Configuration settings for terrain generation and rendering
 */
export const TERRAIN_CONFIG = {
    // Base terrain properties
    size: 0, // Base terrain size (fixed from 0)
    resolution: 32, // Base terrain resolution (fixed from 1)
    height: 16, // Maximum terrain height (increased from 4)

    // Terrain chunk properties
    chunkSize: 64, // Size of each terrain chunk
    chunkViewDistance: 2, // Reduced from 3 for performance - visible chunks around player
    
    // Terrain buffering properties
    bufferDistance: 3, // Reduced from 5 for performance - fewer pre-generated chunks
    
    // Terrain caching - in-memory only. NEVER save terrain to localStorage (huge CPU lock from JSON.stringify)
    cache: {
        maxCachedChunks: 100,
        saveToLocalStorage: false, // MUST stay false - terrain serialization causes game freeze
        localStorageKey: 'monk_journey_terrain_cache' // Unused when saveToLocalStorage is false
    }
};
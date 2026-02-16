/**
 * Renderer configuration for different quality levels
 * 
 * Device targeting:
 * - high: Good desktop computers
 * - medium: Slower desktops and good tablets
 * - low: Tablets and mid-range mobile devices
 * - minimal: Any low-end device to achieve playable FPS
 * 
 * The quality level is stored in localStorage using the key 'monk_journey_quality_level'.
 */



export const FOG_CONFIG = {
    // Base fog settings
    enabled: true,
    type: 'exp2', // 'exp2' for exponential squared fog (more realistic), 'exp' for exponential, 'linear' for linear
    color: 0x87CEEB, // Lighter blue-gray color for a brighter atmosphere 0x87CEEB 0xFFD39B 0xE8C49A 0xF8D98D 0xF6C75B #FFCC00B3 #FFCC00 #FFDD00
    density: 0.0075, // Reduced base fog density for lighter atmosphere
    near: 10, // For linear fog only - increased distance where fog begins
    far: 50, // For linear fog only - increased distance where fog is fully opaque
    
    // Fog transition settings
    transitionSpeed: 0.05, // How quickly fog color transitions between zones
    
    // Distance-based fog settings
    distanceFalloff: 1.5, // Controls how quickly visibility drops with distance
    maxVisibleDistance: 16 * 2, // Maximum distance at which objects are still visible
    darkeningFactor: 0.7, // How much darker distant objects become (0-1)
    
    // PERFORMANCE FIX: Add frustum culling distance
    frustumCullingDistance: 16 * 4, // Objects beyond this distance are not rendered at all
    
    // Quality level adjustments - PERFORMANCE FIX: More aggressive fog for performance
    qualityMultipliers: {
        high: 0.9, // Slightly reduced fog density for high quality (better visibility)
        medium: 1.4, // Increased from 1.2 to help cull distant objects and improve performance
        low: 1.5, // Reduced from 2.2 to prevent darkening
        minimal: 2.0 // Reduced from 6.0 to prevent excessive darkening while still improving performance
    }
};

export const RENDER_CONFIG = {
    // High quality - for good desktop computers
    high: {
        init: {
            antialias: true,
            powerPreference: 'high-performance',
            precision: 'highp',
            stencil: false,
            logarithmicDepthBuffer: false,
            depth: true,
            alpha: false
        },
        settings: {
            pixelRatio: Math.min(window.devicePixelRatio, 1.5),
            shadowMapEnabled: true,
            shadowMapSize: 1024,
            shadowMapType: 'PCFSoftShadowMap',
            outputColorSpace: 'SRGBColorSpace'
        },
        materials: {
            particleCount: 0.8,
            drawDistance: 0.8,
            textureQuality: 0.8,
            objectDetail: 0.9,
            maxVisibleObjects: 500
        }
    },
    
    // Medium quality - for slower desktops and good tablets
    medium: {
        init: {
            antialias: false,
            powerPreference: 'high-performance',
            precision: 'lowp',
            stencil: false,
            logarithmicDepthBuffer: false,
            depth: true,
            alpha: false
        },
        settings: {
            pixelRatio: Math.min(window.devicePixelRatio, 0.6), // Reduced from 0.7 for better performance
            shadowMapEnabled: false, // Disabled shadows to reduce GPU load
            shadowMapSize: 0, // Reduced from 256 to match disabled shadows
            shadowMapType: 'BasicShadowMap', // Lighter shadow type if shadows are re-enabled
            outputColorSpace: 'SRGBColorSpace' // Changed to linear for better performance
        },
        materials: {
            particleCount: 0.3, // Reduced from 0.5 to prevent particle buildup
            drawDistance: 0.5, // Reduced from 0.6 to cull distant objects sooner
            textureQuality: 0.4, // Reduced from 0.5 for memory efficiency
            objectDetail: 0.5, // Reduced from 0.6 for simpler geometry
            maxVisibleObjects: 200, // Reduced from 250 to prevent object accumulation
            memoryOptimized: true // Flag for additional memory management
        }
    },
    
    // Low quality - for tablets and mid-range mobile (low-end tablet friendly)
    low: {
        init: {
            antialias: false,
            powerPreference: 'high-performance',
            precision: 'lowp',
            stencil: false,
            logarithmicDepthBuffer: false,
            depth: true,
            alpha: false
        },
        settings: {
            pixelRatio: Math.min(window.devicePixelRatio, 0.4), // Aggressive for tablets
            shadowMapEnabled: false,
            shadowMapSize: 0,
            shadowMapType: 'BasicShadowMap',
            outputColorSpace: 'LinearSRGBColorSpace',
        },
        materials: {
            particleCount: 0.05,
            drawDistance: 0.15,
            textureQuality: 0.15,
            objectDetail: 0.2,
            maxVisibleObjects: 60,
            optimizedForLowEnd: true
        }
    },
    
    // Minimal quality - for low-end tablets (freezing fix)
    minimal: {
        init: {
            antialias: false,
            powerPreference: 'high-performance',
            precision: 'lowp',
            stencil: false,
            logarithmicDepthBuffer: false,
            depth: true,
            alpha: false
        },
        settings: {
            pixelRatio: 0.25, // Very low for smooth FPS on weak tablets
            shadowMapEnabled: false,
            shadowMapSize: 0,
            shadowMapType: 'BasicShadowMap',
            outputColorSpace: 'LinearSRGBColorSpace',
            pixelatedMode: true,
            colorPalette: 'limited',
            dithering: true
        },
        materials: {
            particleCount: 0.01,
            drawDistance: 0.08,
            textureQuality: 0.05,
            objectDetail: 0.05,
            maxVisibleObjects: 25,
            is8BitMode: true
        }
    }
};

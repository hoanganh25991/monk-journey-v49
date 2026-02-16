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
    density: 0.003, // Reduced fog density for clearer visibility (was 0.0075)
    near: 10, // For linear fog only - increased distance where fog begins
    far: 80, // For linear fog only - increased distance where fog is fully opaque (was 50)
    
    // Fog transition settings
    transitionSpeed: 0.05, // How quickly fog color transitions between zones
    
    // Distance-based fog settings
    distanceFalloff: 0.7, // Controls how quickly visibility drops with distance (lower = clearer view, was 1.5)
    maxVisibleDistance: 16 * 6, // Maximum distance at which objects are still visible (was 16*2)
    darkeningFactor: 0.85, // How much darker distant objects become (0-1, higher = brighter)
    
    // PERFORMANCE FIX: Add frustum culling distance
    frustumCullingDistance: 16 * 4, // Objects beyond this distance are not rendered at all
    
    // Quality level adjustments - reduced for better visibility
    qualityMultipliers: {
        high: 0.5, // Reduced fog for high quality (was 0.9)
        medium: 0.7, // Reduced fog for medium (was 1.4)
        low: 0.85, // Reduced fog for low (was 1.5)
        minimal: 1.0 // Reduced fog for minimal (was 2.0)
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
            pixelRatio: Math.min(window.devicePixelRatio, 2),
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
            pixelRatio: Math.min(window.devicePixelRatio, 0.85), // Improved from 0.6 for smoother model on mobile
            shadowMapEnabled: false, // Disabled shadows to reduce GPU load
            shadowMapSize: 0, // Reduced from 256 to match disabled shadows
            shadowMapType: 'BasicShadowMap', // Lighter shadow type if shadows are re-enabled
            outputColorSpace: 'SRGBColorSpace' // Changed to linear for better performance
        },
        materials: {
            particleCount: 0.3, // Reduced from 0.5 to prevent particle buildup
            drawDistance: 0.5, // Reduced from 0.6 to cull distant objects sooner
            textureQuality: 0.55, // Improved from 0.4 for smoother model on mobile
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
            pixelRatio: Math.min(window.devicePixelRatio, 0.55), // Improved from 0.4 for less blur on low
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

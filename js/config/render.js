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
    density: 0.00525, // Midpoint between original (0.0075) and reduced (0.003)
    near: 10, // For linear fog only - distance where fog begins
    far: 65, // For linear fog only - midpoint between original (50) and increased (80)
    
    // Fog transition settings
    transitionSpeed: 0.05, // How quickly fog color transitions between zones
    
    // Distance-based fog settings
    distanceFalloff: 1.1, // Midpoint between original (1.5) and reduced (0.7)
    maxVisibleDistance: 16 * 4, // Midpoint between original (16*2) and increased (16*6)
    darkeningFactor: 0.78, // Midpoint between original (0.7) and brighter (0.85)
    
    // PERFORMANCE FIX: Add frustum culling distance
    frustumCullingDistance: 16 * 4, // Objects beyond this distance are not rendered at all
    
    // Quality level adjustments - midpoint between original and reduced
    qualityMultipliers: {
        high: 0.7, // Midpoint (original 0.9, reduced 0.5)
        medium: 1.05, // Midpoint (original 1.4, reduced 0.7)
        low: 1.2, // Midpoint (original 1.5, reduced 0.85)
        minimal: 1.5 // Midpoint (original 2.0, reduced 1.0)
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
            shadowMapSize: 4096,
            shadowMapType: 'PCFSoftShadowMap',
            shadowRadius: 0.5,      // Soft edge, no blocky "squares"
            shadowNormalBias: 0.006,
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
            shadowMapEnabled: true,
            shadowMapSize: 2048,
            shadowMapType: 'PCFSoftShadowMap', // Smooth edges, lighter than high
            shadowRadius: 0.35,
            shadowNormalBias: 0.01,
            outputColorSpace: 'SRGBColorSpace'
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
            shadowRadius: 0,
            shadowNormalBias: 0.02,
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
            shadowRadius: 0,
            shadowNormalBias: 0.02,
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

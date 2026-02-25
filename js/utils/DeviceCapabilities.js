import * as THREE from '../../libs/three/three.module.js';

/**
 * DeviceCapabilities - Detects device capabilities for optimal rendering settings
 * 
 * This utility detects:
 * - Maximum texture size supported by the GPU
 * - WebGL capabilities and extensions
 * - Device type (mobile vs desktop)
 * - GPU tier estimation
 * 
 * Used to automatically adjust shadow map sizes and other settings for mobile devices
 */
export class DeviceCapabilities {
    constructor() {
        this.capabilities = null;
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
    }
    
    /**
     * Detect if the device is mobile
     * @returns {boolean}
     */
    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Check for mobile user agents
        const mobileRegex = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i;
        if (mobileRegex.test(userAgent.toLowerCase())) {
            return true;
        }
        
        // Check for touch support and small screen
        const hasTouchScreen = (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
        
        const hasSmallScreen = window.innerWidth <= 768;
        
        return hasTouchScreen && hasSmallScreen;
    }
    
    /**
     * Detect if the device is a tablet
     * @returns {boolean}
     */
    detectTablet() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Check for tablet user agents
        const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;
        if (tabletRegex.test(userAgent.toLowerCase())) {
            return true;
        }
        
        // Check for touch support and medium screen
        const hasTouchScreen = (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
        
        const hasMediumScreen = window.innerWidth > 768 && window.innerWidth <= 1024;
        
        return hasTouchScreen && hasMediumScreen;
    }
    
    /**
     * Initialize and detect device capabilities
     * Must be called with a WebGL context (after renderer creation)
     * @param {THREE.WebGLRenderer} renderer - The Three.js renderer
     * @returns {Object} Device capabilities
     */
    detect(renderer) {
        if (this.capabilities) {
            return this.capabilities;
        }
        
        const gl = renderer.getContext();
        
        if (!gl) {
            console.error('WebGL context not available for capability detection');
            return this.getFallbackCapabilities();
        }
        
        // Detect maximum texture size
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        // Detect maximum renderbuffer size (often used for shadow maps)
        const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
        
        // Detect maximum viewport dimensions
        const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
        
        // Detect WebGL version
        const isWebGL2 = gl instanceof WebGL2RenderingContext;
        
        // Detect available extensions
        const extensions = {
            depthTexture: gl.getExtension('WEBGL_depth_texture') || gl.getExtension('WEBKIT_WEBGL_depth_texture'),
            textureFloat: gl.getExtension('OES_texture_float'),
            textureHalfFloat: gl.getExtension('OES_texture_half_float'),
            anisotropic: gl.getExtension('EXT_texture_filter_anisotropic') || 
                        gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'),
            standardDerivatives: gl.getExtension('OES_standard_derivatives'),
            shaderTextureLod: gl.getExtension('EXT_shader_texture_lod')
        };
        
        // Get max anisotropy if available
        const maxAnisotropy = extensions.anisotropic 
            ? gl.getParameter(extensions.anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
            : 1;
        
        // Estimate GPU tier based on capabilities
        const gpuTier = this.estimateGPUTier(maxTextureSize, isWebGL2, extensions);
        
        // Determine optimal shadow map size based on device capabilities
        const optimalShadowMapSize = this.getOptimalShadowMapSize(
            maxTextureSize,
            maxRenderbufferSize,
            gpuTier
        );
        
        this.capabilities = {
            maxTextureSize,
            maxRenderbufferSize,
            maxViewportDims,
            isWebGL2,
            extensions,
            maxAnisotropy,
            gpuTier,
            optimalShadowMapSize,
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isDesktop: !this.isMobile && !this.isTablet,
            // Memory estimation (rough)
            estimatedGPUMemoryMB: this.estimateGPUMemory(gpuTier)
        };
        
        console.debug('Device capabilities detected:', this.capabilities);
        
        return this.capabilities;
    }
    
    /**
     * Estimate GPU tier based on capabilities
     * Better detection for high-end mobile devices
     * @param {number} maxTextureSize
     * @param {boolean} isWebGL2
     * @param {Object} extensions
     * @returns {string} 'high' | 'medium' | 'low'
     */
    estimateGPUTier(maxTextureSize, isWebGL2, extensions) {
        // High-end: Large texture support, WebGL2, all extensions
        // Many high-end mobile devices support 8192 or 4096 textures
        if (maxTextureSize >= 8192 && isWebGL2 && 
            extensions.depthTexture && extensions.textureFloat) {
            return 'high';
        }
        
        // High-end mobile: 4096 support with WebGL2 or good extensions
        if (maxTextureSize >= 4096 && 
            (isWebGL2 || (extensions.depthTexture && extensions.textureFloat))) {
            return 'high';
        }
        
        // Medium: Good texture support, some extensions
        if (maxTextureSize >= 2048 && 
            (isWebGL2 || extensions.depthTexture)) {
            return 'medium';
        }
        
        // Low-end: Basic capabilities
        return 'low';
    }
    
    /**
     * Get optimal shadow map size based on device capabilities
     * Improved to better support high-end mobile devices
     * @param {number} maxTextureSize
     * @param {number} maxRenderbufferSize
     * @param {string} gpuTier
     * @returns {Object} Shadow map size recommendations per quality level
     */
    getOptimalShadowMapSize(maxTextureSize, maxRenderbufferSize, gpuTier) {
        // Use the smaller of the two limits as the absolute maximum
        const absoluteMax = Math.min(maxTextureSize, maxRenderbufferSize);
        
        // Define safe shadow map sizes (with safety margin)
        // Use 50% of max for shadow maps (more conservative for stability)
        const safeMax = Math.floor(absoluteMax * 0.5);
        
        console.debug(`Shadow map limits - Max: ${absoluteMax}, Safe: ${safeMax}, GPU Tier: ${gpuTier}`);
        
        // Start with ideal sizes
        let recommendations = {
            high: 4096,
            medium: 2048,
            low: 1024,
            minimal: 512
        };
        
        // Adjust based on GPU tier first (most important factor)
        if (gpuTier === 'high') {
            // High-end GPU: Try to use larger shadow maps
            // For high-end mobile with 4096+ texture support, use 4096 on high profile
            if (absoluteMax >= 4096) {
                recommendations = {
                    high: Math.min(4096, safeMax),    // High-end mobile can handle 4096 on high profile
                    medium: Math.min(1024, safeMax),  // Still conservative on medium
                    low: Math.min(512, safeMax),
                    minimal: Math.min(512, safeMax)
                };
            } else if (absoluteMax >= 2048) {
                recommendations = {
                    high: Math.min(2048, safeMax),    // Use 2048 if device maxes out there
                    medium: Math.min(1024, safeMax),
                    low: Math.min(512, safeMax),
                    minimal: Math.min(256, safeMax)
                };
            }
        } else if (gpuTier === 'medium') {
            // Medium GPU: Conservative but usable
            recommendations = {
                high: Math.min(1024, safeMax),
                medium: Math.min(512, safeMax),
                low: Math.min(512, safeMax),
                minimal: Math.min(256, safeMax)
            };
        } else {
            // Low GPU: Very conservative
            recommendations = {
                high: Math.min(512, safeMax),
                medium: Math.min(512, safeMax),
                low: Math.min(256, safeMax),
                minimal: Math.min(256, safeMax)
            };
        }
        
        // Override for desktop: always use full capabilities
        if (!this.isMobile && !this.isTablet) {
            recommendations = {
                high: Math.min(4096, safeMax),
                medium: Math.min(2048, safeMax),
                low: Math.min(1024, safeMax),
                minimal: Math.min(512, safeMax)
            };
        }
        
        // Ensure all values are power of 2 and within limits
        Object.keys(recommendations).forEach(key => {
            let size = recommendations[key];
            // Clamp to safe maximum
            size = Math.min(size, safeMax);
            // Ensure power of 2
            size = Math.pow(2, Math.floor(Math.log2(size)));
            // Minimum 256
            size = Math.max(256, size);
            recommendations[key] = size;
        });
        
        console.debug('Optimal shadow map sizes:', recommendations);
        
        return recommendations;
    }
    
    /**
     * Estimate GPU memory in MB
     * @param {string} gpuTier
     * @returns {number}
     */
    estimateGPUMemory(gpuTier) {
        if (this.isMobile) {
            return gpuTier === 'high' ? 512 : gpuTier === 'medium' ? 256 : 128;
        } else if (this.isTablet) {
            return gpuTier === 'high' ? 1024 : gpuTier === 'medium' ? 512 : 256;
        } else {
            return gpuTier === 'high' ? 4096 : gpuTier === 'medium' ? 2048 : 1024;
        }
    }
    
    /**
     * Get fallback capabilities when WebGL is not available
     * @returns {Object}
     */
    getFallbackCapabilities() {
        return {
            maxTextureSize: 2048,
            maxRenderbufferSize: 2048,
            maxViewportDims: [2048, 2048],
            isWebGL2: false,
            extensions: {},
            maxAnisotropy: 1,
            gpuTier: 'low',
            optimalShadowMapSize: {
                high: 1024,
                medium: 512,
                low: 256,
                minimal: 256
            },
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isDesktop: !this.isMobile && !this.isTablet,
            estimatedGPUMemoryMB: 256
        };
    }
    
    /**
     * Get capabilities (must call detect() first)
     * @returns {Object|null}
     */
    getCapabilities() {
        return this.capabilities;
    }
    
    /**
     * Check if shadows should be enabled for a given quality level
     * More aggressive - enable shadows if device supports it at any size
     * @param {string} qualityLevel - 'high' | 'medium' | 'low' | 'minimal'
     * @returns {boolean}
     */
    shouldEnableShadows(qualityLevel) {
        if (!this.capabilities) {
            console.warn('Capabilities not detected yet, assuming shadows disabled');
            return false;
        }
        
        // Always disable shadows for minimal quality
        if (qualityLevel === 'minimal') {
            return false;
        }
        
        // Check if device supports depth textures (required for shadows)
        const hasDepthSupport = this.capabilities.extensions.depthTexture || this.capabilities.isWebGL2;
        
        if (!hasDepthSupport) {
            console.warn('Device does not support depth textures, shadows disabled');
            return false;
        }
        
        // Check if device has enough texture size for shadows (at least 512)
        const minShadowSize = this.capabilities.optimalShadowMapSize[qualityLevel];
        if (minShadowSize < 256) {
            console.warn('Device texture size too small for shadows');
            return false;
        }
        
        // Enable shadows for high and medium quality if device supports it
        // Even on mobile - we'll just use smaller shadow maps
        if (qualityLevel === 'high' || qualityLevel === 'medium') {
            console.debug(`Shadows enabled for ${qualityLevel} quality (size: ${minShadowSize})`);
            return true;
        }
        
        // Low quality: enable on desktop and high-end mobile
        if (qualityLevel === 'low') {
            const enableOnLow = !this.isMobile || this.capabilities.gpuTier === 'high';
            if (enableOnLow) {
                console.debug(`Shadows enabled for low quality on high-end device (size: ${minShadowSize})`);
            }
            return enableOnLow;
        }
        
        return false;
    }
    
    /**
     * Get recommended shadow map type based on device capabilities
     * Better support for high-end mobile devices
     * @param {string} qualityLevel - 'high' | 'medium' | 'low' | 'minimal'
     * @returns {string} 'PCFSoftShadowMap' | 'PCFShadowMap' | 'BasicShadowMap'
     */
    getRecommendedShadowMapType(qualityLevel) {
        if (!this.capabilities) {
            return 'BasicShadowMap';
        }
        
        // Desktop: use highest quality
        if (!this.isMobile && !this.isTablet) {
            if (qualityLevel === 'high' && this.capabilities.gpuTier === 'high') {
                return 'PCFSoftShadowMap';
            } else if (qualityLevel === 'high' || qualityLevel === 'medium') {
                return 'PCFShadowMap';
            }
            return 'BasicShadowMap';
        }
        
        // High-end mobile: can handle PCFSoftShadowMap on high quality for smooth shadows
        if (this.capabilities.gpuTier === 'high') {
            if (qualityLevel === 'high') {
                // High-end mobile with high quality: use PCFSoftShadowMap for smoothest shadows
                console.debug('High-end mobile detected: using PCFSoftShadowMap for smooth shadows');
                return 'PCFSoftShadowMap';
            } else if (qualityLevel === 'medium') {
                return 'PCFShadowMap';
            }
        }
        
        // Mid-range mobile: use PCFShadowMap for better quality on high, BasicShadowMap otherwise
        if (this.capabilities.gpuTier === 'medium') {
            if (qualityLevel === 'high') {
                return 'PCFShadowMap';
            }
            return 'BasicShadowMap';
        }
        
        // Low-end mobile: BasicShadowMap only
        return 'BasicShadowMap';
    }
    
    /**
     * Log device capabilities to console
     */
    logCapabilities() {
        if (!this.capabilities) {
            console.warn('Capabilities not detected yet');
            return;
        }
        
        console.group('Device Capabilities');
        console.log('Device Type:', this.isMobile ? 'Mobile' : this.isTablet ? 'Tablet' : 'Desktop');
        console.log('GPU Tier:', this.capabilities.gpuTier);
        console.log('Max Texture Size:', this.capabilities.maxTextureSize);
        console.log('Max Renderbuffer Size:', this.capabilities.maxRenderbufferSize);
        console.log('WebGL 2:', this.capabilities.isWebGL2);
        console.log('Optimal Shadow Map Sizes:', this.capabilities.optimalShadowMapSize);
        console.log('Estimated GPU Memory:', this.capabilities.estimatedGPUMemoryMB, 'MB');
        console.groupEnd();
    }
}

// Create singleton instance
const deviceCapabilities = new DeviceCapabilities();

export default deviceCapabilities;

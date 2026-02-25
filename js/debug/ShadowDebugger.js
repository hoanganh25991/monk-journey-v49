import deviceCapabilities from '../utils/DeviceCapabilities.js';

/**
 * ShadowDebugger - Visual debugging tool for shadow settings
 * 
 * Shows current shadow configuration and device capabilities
 * Useful for testing shadow support across different devices
 */
export class ShadowDebugger {
    constructor() {
        this.debugPanel = null;
        this.isVisible = false;
    }
    
    /**
     * Create and show the debug panel
     * @param {THREE.WebGLRenderer} renderer
     * @param {string} qualityLevel
     */
    show(renderer, qualityLevel) {
        if (this.debugPanel) {
            this.debugPanel.style.display = 'block';
            this.update(renderer, qualityLevel);
            return;
        }
        
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'shadow-debug-panel';
        this.debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(this.debugPanel);
        this.update(renderer, qualityLevel);
        this.isVisible = true;
    }
    
    /**
     * Hide the debug panel
     */
    hide() {
        if (this.debugPanel) {
            this.debugPanel.style.display = 'none';
            this.isVisible = false;
        }
    }
    
    /**
     * Toggle visibility
     * @param {THREE.WebGLRenderer} renderer
     * @param {string} qualityLevel
     */
    toggle(renderer, qualityLevel) {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show(renderer, qualityLevel);
        }
    }
    
    /**
     * Update the debug panel with current information
     * @param {THREE.WebGLRenderer} renderer
     * @param {string} qualityLevel
     */
    update(renderer, qualityLevel) {
        if (!this.debugPanel) return;
        
        const capabilities = deviceCapabilities.getCapabilities();
        const shadowsEnabled = renderer.shadowMap.enabled;
        const shadowMapSize = renderer.shadowMap.mapSize;
        const shadowMapType = this.getShadowMapTypeName(renderer.shadowMap.type);
        
        let html = '<div style="margin-bottom: 10px; font-weight: bold; color: #00ffff;">🔍 Shadow Debug Info</div>';
        
        // Device Info
        html += '<div style="margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 5px;">';
        html += '<div style="color: #ffff00;">Device:</div>';
        if (capabilities) {
            const deviceType = capabilities.isMobile ? 'Mobile' : capabilities.isTablet ? 'Tablet' : 'Desktop';
            const tierColor = capabilities.gpuTier === 'high' ? '#00ff00' : capabilities.gpuTier === 'medium' ? '#ffff00' : '#ff6600';
            html += `<div>Type: <strong>${deviceType}</strong></div>`;
            html += `<div>GPU Tier: <strong style="color: ${tierColor};">${capabilities.gpuTier.toUpperCase()}</strong></div>`;
            html += `<div>Max Texture: <strong>${capabilities.maxTextureSize}px</strong></div>`;
            html += `<div>Max Renderbuffer: <strong>${capabilities.maxRenderbufferSize}px</strong></div>`;
            html += `<div>WebGL 2: ${capabilities.isWebGL2 ? '<span style="color: #00ff00;">✓ YES</span>' : '<span style="color: #ff6600;">✗ NO</span>'}</div>`;
            html += `<div>Est. GPU Memory: ${capabilities.estimatedGPUMemoryMB}MB</div>`;
        } else {
            html += '<div style="color: #ff0000;">Not detected</div>';
        }
        html += '</div>';
        
        // Shadow Settings
        html += '<div style="margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 5px;">';
        html += '<div style="color: #ffff00;">Shadow Settings:</div>';
        html += `<div>Quality: <strong>${qualityLevel.toUpperCase()}</strong></div>`;
        html += `<div>Enabled: ${shadowsEnabled ? '<span style="color: #00ff00;">✓ YES</span>' : '<span style="color: #ff0000;">✗ NO</span>'}</div>`;
        if (shadowsEnabled) {
            const sizeColor = shadowMapSize.x >= 2048 ? '#00ff00' : shadowMapSize.x >= 1024 ? '#ffff00' : '#ff6600';
            html += `<div>Map Size: <strong style="color: ${sizeColor};">${shadowMapSize.x}x${shadowMapSize.y}</strong></div>`;
            html += `<div>Type: <strong>${shadowMapType}</strong></div>`;
        } else if (capabilities) {
            // Show why shadows are disabled
            const hasDepth = capabilities.extensions.depthTexture || capabilities.isWebGL2;
            html += `<div style="color: #ff6600; font-size: 11px; margin-top: 5px;">`;
            if (!hasDepth) {
                html += `Reason: No depth texture support`;
            } else if (qualityLevel === 'minimal') {
                html += `Reason: Minimal quality`;
            } else {
                html += `Reason: Quality level too low`;
            }
            html += `</div>`;
        }
        html += '</div>';
        
        // Optimal Settings
        if (capabilities && capabilities.optimalShadowMapSize) {
            html += '<div style="margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 5px;">';
            html += '<div style="color: #ffff00;">Optimal Shadow Sizes:</div>';
            const currentSize = shadowsEnabled ? shadowMapSize.x : 0;
            Object.keys(capabilities.optimalShadowMapSize).forEach(level => {
                const size = capabilities.optimalShadowMapSize[level];
                const isCurrent = level === qualityLevel;
                const color = isCurrent ? '#00ffff' : '#ffffff';
                const arrow = isCurrent ? ' ← Current' : '';
                html += `<div style="color: ${color};">${level.charAt(0).toUpperCase() + level.slice(1)}: <strong>${size}px</strong>${arrow}</div>`;
            });
            html += '</div>';
        }
        
        // Extensions
        if (capabilities && capabilities.extensions) {
            html += '<div>';
            html += '<div style="color: #ffff00;">Extensions:</div>';
            html += `<div>Depth Texture: ${capabilities.extensions.depthTexture ? '✓' : '✗'}</div>`;
            html += `<div>Float Texture: ${capabilities.extensions.textureFloat ? '✓' : '✗'}</div>`;
            html += '</div>';
        }
        
        this.debugPanel.innerHTML = html;
    }
    
    /**
     * Get shadow map type name
     * @param {number} type
     * @returns {string}
     */
    getShadowMapTypeName(type) {
        const THREE = window.THREE;
        if (!THREE) return 'Unknown';
        
        switch (type) {
            case THREE.BasicShadowMap:
                return 'BasicShadowMap';
            case THREE.PCFShadowMap:
                return 'PCFShadowMap';
            case THREE.PCFSoftShadowMap:
                return 'PCFSoftShadowMap';
            case THREE.VSMShadowMap:
                return 'VSMShadowMap';
            default:
                return 'Unknown';
        }
    }
    
    /**
     * Remove the debug panel
     */
    destroy() {
        if (this.debugPanel && this.debugPanel.parentNode) {
            this.debugPanel.parentNode.removeChild(this.debugPanel);
            this.debugPanel = null;
        }
        this.isVisible = false;
    }
}

// Create singleton instance
const shadowDebugger = new ShadowDebugger();

export default shadowDebugger;

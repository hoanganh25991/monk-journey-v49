import Stats from 'three/addons/libs/stats.module.js';
import { STORAGE_KEYS } from './config/storage-keys.js';

export class PerformanceManager {
    constructor(game) {
        this.game = game;
        this.stats = null;
        this.statsEnabled = false;
        this.currentQualityLevel = 'high';
        this.performanceSettings = {};
        this.expandedStatsView = true; // Default to expanded view
    }
    
    async init() {
        this.updateStatsVisibility();
        return this;
    }

    updateStatsVisibility() {
        const shouldShowStats = localStorage.getItem(STORAGE_KEYS.SHOW_PERFORMANCE_INFO) === 'true';
        
        if (shouldShowStats && !this.stats) {
            // Create and show stats
            this.stats = new Stats();
            document.body.appendChild(this.stats.dom);
            this.stats.dom.style.zIndex = 50;
            this.stats.dom.style.position = "fixed";
            this.stats.dom.style.top = "0px";
            this.stats.dom.style.left = "0px";
            
            // Apply expanded view if enabled
            if (this.expandedStatsView) {
                this.applyExpandedStatsView();
            }
            
            this.statsEnabled = true;
        } else if (!shouldShowStats && this.stats) {
            // Hide and remove stats
            if (this.stats.dom && this.stats.dom.parentNode) {
                this.stats.dom.parentNode.removeChild(this.stats.dom);
            }
            this.stats = null;
            this.statsEnabled = false;
        } else if (shouldShowStats && this.stats && this.statsEnabled) {
            // Update the view mode if stats are already visible
            if (this.expandedStatsView) {
                this.applyExpandedStatsView();
            } else {
                this.applyDefaultStatsView();
            }
        }
    }
    
    applyExpandedStatsView() {
        if (!this.stats || !this.stats.dom) return;
        
        // Find all canvas elements inside stats.dom
        const panels = this.stats.dom.children;
        for (let i = 0; i < panels.length; i++) {
            const panel = panels[i];
            // Make all panels visible
            panel.style.display = 'block';
            // Add some margin between panels
            panel.style.marginBottom = '5px';
        }
        
        // Adjust the container to accommodate all panels
        this.stats.dom.style.width = 'auto';
        this.stats.dom.style.height = 'auto';
        this.stats.dom.style.display = 'flex';
        this.stats.dom.style.flexDirection = 'column';
    }
    
    applyDefaultStatsView() {
        if (!this.stats || !this.stats.dom) return;
        
        // Reset to default Three.js Stats styling
        const panels = this.stats.dom.children;
        for (let i = 0; i < panels.length; i++) {
            const panel = panels[i];
            // Only the first panel is visible by default in Three.js Stats
            panel.style.display = i === 0 ? 'block' : 'none';
            panel.style.marginBottom = '0';
        }
        
        // Reset container to default Three.js Stats styling
        this.stats.dom.style.width = '80px';
        this.stats.dom.style.height = '48px';
        this.stats.dom.style.display = 'block';
    }
    
    toggleStatsViewMode() {
        this.expandedStatsView = !this.expandedStatsView;
        this.updateStatsVisibility();
        return this.expandedStatsView;
    }
    
    setExpandedStatsView(enabled) {
        this.expandedStatsView = enabled;
        this.updateStatsVisibility();
        return this.expandedStatsView;
    }

    getDrawDistanceMultiplier() {
        return 1.0;
    }

    /**
     * Get particle multiplier based on quality level
     * Used to scale particle counts for effects like bleeding
     * @returns {number} - Multiplier between 0.3 and 1.0
     */
    getParticleMultiplier() {
        const qualityLevel = this.getCurrentQualityLevel();
        
        // Return multiplier based on quality level
        switch (qualityLevel) {
            case 'minimal':
                return 0.3; // Minimal particles for lowest quality
            case 'low':
                return 0.5; // Reduced particles for low quality
            case 'medium':
                return 0.8; // Slightly reduced for medium
            case 'high':
            default:
                return 1.0; // Full particles for high quality
        }
    }

    getCurrentQualityLevel() {
        // Prefer game's materialQuality (from Settings) over cached value
        if (this.game && this.game.materialQuality) {
            return this.game.materialQuality;
        }
        const stored = localStorage.getItem(STORAGE_KEYS.QUALITY_LEVEL);
        return ['high', 'medium', 'low', 'minimal'].includes(stored) ? stored : 'high';
    }

    getCurrentPerformanceLevel() {
        return this.currentQualityLevel;
    }

    togglePerformanceStats(enabled) {
        localStorage.setItem(STORAGE_KEYS.SHOW_PERFORMANCE_INFO, enabled.toString());
        this.updateStatsVisibility();
    }

    isPerformanceStatsEnabled() {
        return localStorage.getItem(STORAGE_KEYS.SHOW_PERFORMANCE_INFO) === 'true';
    }
    
    isExpandedStatsViewEnabled() {
        return this.expandedStatsView;
    }
    
    update() {
        // Check if settings changed and update visibility accordingly
        this.updateStatsVisibility();
        
        if (this.stats && this.statsEnabled) {
            this.stats.update();
        }
    }
}
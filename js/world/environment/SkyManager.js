import * as THREE from '../../../libs/three/three.module.js';

/**
 * Manages the sky in the game world
 * Provides a simple sky implementation that doesn't impact performance
 */
export class SkyManager {
    constructor(scene) {
        this.scene = scene;
        this.sky = null;
        this.sun = null;
        this.timeOfDay = 'day'; // 'day', 'dawn', 'dusk', 'night'
        this.weather = 'clear'; // 'clear', 'rain', 'fog', 'storm'
        
        // Sky colors for different times of day - darker for atmospheric mood
        this.skyColors = {
            day: 0x6B7B8C,    // Darker blue-gray (was 0x87ceeb)
            dawn: 0xB8866B,   // Darker salmon (was 0xffa07a)
            dusk: 0xCC6644,   // Darker coral (was 0xff7f50)
            night: 0x0F0F28   // Darker midnight blue (was 0x191970)
        };
        
        // Weather modifiers - darker for more atmospheric effect
        this.weatherModifiers = {
            clear: new THREE.Color(0.85, 0.85, 0.85),
            rain: new THREE.Color(0.6, 0.6, 0.7),
            fog: new THREE.Color(0.7, 0.7, 0.7),
            storm: new THREE.Color(0.4, 0.4, 0.5)
        };
        
        this.initSky();
    }
    
    /**
     * Initialize the sky
     */
    initSky() {
        // Simple implementation - just use scene background color
        // This is the most performance-friendly approach
        this.updateSkyColor();
    }
    
    /**
     * Update the sky color based on time of day and weather
     */
    updateSkyColor() {
        // Get base color for time of day
        const baseColor = new THREE.Color(this.skyColors[this.timeOfDay] || this.skyColors.day);
        
        // Apply weather modifier
        const weatherModifier = this.weatherModifiers[this.weather] || this.weatherModifiers.clear;
        baseColor.multiply(weatherModifier);
        
        // Set scene background color
        if (this.scene) {
            this.scene.background = baseColor;
        }
    }
    
    /**
     * Set the time of day
     * @param {string} timeOfDay - 'day', 'dawn', 'dusk', or 'night'
     */
    setTimeOfDay(timeOfDay) {
        if (this.timeOfDay !== timeOfDay) {
            this.timeOfDay = timeOfDay;
            this.updateSkyColor();
        }
    }
    
    /**
     * Set the weather condition
     * @param {string} weather - 'clear', 'rain', 'fog', or 'storm'
     */
    setWeather(weather) {
        if (this.weather !== weather) {
            this.weather = weather;
            this.updateSkyColor();
        }
    }
    
    /**
     * Update the sky (called each frame)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Nothing to update in the simple implementation
        // This method is here for future enhancements
    }
}
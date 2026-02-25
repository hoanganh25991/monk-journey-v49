/**
 * CameraTab.js
 * Manages the camera settings tab UI component (zoom, etc.)
 */

import { SettingsTab } from './SettingsTab.js';
import { STORAGE_KEYS } from '../../config/storage-keys.js';

export class CameraTab extends SettingsTab {
    /**
     * Create a camera settings tab
     * @param {import('../../game/Game.js').Game} game - The game instance
     * @param {SettingsMenu} settingsMenu - The parent settings menu
     */
    constructor(game, settingsMenu) {
        super('camera', game, settingsMenu);

        this.cameraZoomSlider = document.getElementById('camera-zoom-slider');
        this.cameraZoomValue = document.getElementById('camera-zoom-value');

        this.initializeCameraSettings();
    }

    /**
     * Initialize camera settings (zoom slider)
     * @private
     */
    initializeCameraSettings() {
        if (!this.cameraZoomSlider) return;

        this.cameraZoomSlider.min = 0.1;
        this.cameraZoomSlider.max = 100;
        this.cameraZoomSlider.step = 0.1;

        const defaultZoom = 15;
        const storedZoom = this.loadSettingSync(STORAGE_KEYS.CAMERA_ZOOM, defaultZoom);
        const currentZoom = parseFloat(storedZoom) || defaultZoom;

        this.cameraZoomSlider.value = currentZoom;
        if (this.cameraZoomValue) {
            this.cameraZoomValue.textContent = this.formatZoomDisplay(currentZoom);
        }

        let zoomDebounceTimeout = null;
        this.cameraZoomSlider.addEventListener('input', () => {
            const zoomValue = parseFloat(this.cameraZoomSlider.value);

            if (this.cameraZoomValue) {
                this.cameraZoomValue.textContent = this.formatZoomDisplay(zoomValue);
            }

            if (this.game?.hudManager?.components?.cameraControlUI) {
                this.game.hudManager.components.cameraControlUI.setCameraDistance(zoomValue);
            }

            if (zoomDebounceTimeout) clearTimeout(zoomDebounceTimeout);
            zoomDebounceTimeout = setTimeout(() => {
                this.saveSetting(STORAGE_KEYS.CAMERA_ZOOM, zoomValue.toString());
            }, 300);
        });
    }

    /**
     * Format zoom value for display (compact for small decimals)
     * @param {number} value - Zoom value
     * @returns {string}
     */
    formatZoomDisplay(value) {
        const n = Number(value);
        if (Number.isInteger(n)) return String(n);
        return parseFloat(n.toFixed(1)).toString();
    }

    /**
     * Handle storage updates from Google Drive sync
     * @param {CustomEvent} event - Storage update event
     */
    handleStorageUpdate(event) {
        const { key, newValue } = event.detail;
        if (key === STORAGE_KEYS.CAMERA_ZOOM && this.cameraZoomSlider) {
            const zoomValue = parseFloat(newValue) || 15;
            this.cameraZoomSlider.value = zoomValue;
            if (this.cameraZoomValue) {
                this.cameraZoomValue.textContent = this.formatZoomDisplay(zoomValue);
            }
        }
    }

    /**
     * Save camera settings
     * @returns {Promise<boolean>}
     */
    async saveSettings() {
        if (this.cameraZoomSlider) {
            await this.saveSetting(STORAGE_KEYS.CAMERA_ZOOM, parseFloat(this.cameraZoomSlider.value).toString());
        }
        return true;
    }

    /**
     * Reset camera settings to defaults
     * @returns {Promise<boolean>}
     */
    async resetToDefaults() {
        if (this.cameraZoomSlider) {
            this.cameraZoomSlider.value = 15;
            if (this.cameraZoomValue) {
                this.cameraZoomValue.textContent = 15;
            }
        }
        return this.saveSettings();
    }
}

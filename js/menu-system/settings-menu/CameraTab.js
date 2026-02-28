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
        this.showMinimapCheckbox = document.getElementById('show-minimap-checkbox');
        this.fpsSlider = document.getElementById('fps-slider');
        this.fpsValue = document.getElementById('fps-value');

        this.initializeCameraSettings();
        this.initializeRenderSettings();
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

        const defaultZoom = 10;
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
     * Initialize render-related settings (UI / minimap, target FPS)
     * @private
     */
    initializeRenderSettings() {
        // Target FPS
        if (this.fpsSlider && this.fpsValue) {
            const targetFPS = this.loadSettingSync(STORAGE_KEYS.TARGET_FPS, 120);
            const parsedFPS = parseInt(targetFPS) || 120;
            this.fpsSlider.value = parsedFPS;
            this.fpsValue.textContent = parsedFPS;

            let fpsDebounceTimeout = null;
            this.fpsSlider.addEventListener('input', () => {
                const value = parseInt(this.fpsSlider.value);
                this.fpsValue.textContent = value;
                if (fpsDebounceTimeout) clearTimeout(fpsDebounceTimeout);
                fpsDebounceTimeout = setTimeout(() => {
                    this.saveSetting(STORAGE_KEYS.TARGET_FPS, value.toString());
                    if (this.game?.setTargetFPS) {
                        this.game.setTargetFPS(value);
                    }
                }, 300);
            });
        }

        // Show Mini Map
        if (this.showMinimapCheckbox) {
            const showMinimap = this.loadSettingSync(STORAGE_KEYS.SHOW_MINIMAP, true);
            this.showMinimapCheckbox.checked = showMinimap === true || showMinimap === 'true';
            this.showMinimapCheckbox.addEventListener('change', () => {
                const isVisible = this.showMinimapCheckbox.checked;
                this.saveSetting(STORAGE_KEYS.SHOW_MINIMAP, isVisible.toString());
                if (this.game?.hudManager?.components?.miniMapUI) {
                    if (isVisible) {
                        this.game.hudManager.components.miniMapUI.show();
                    } else {
                        this.game.hudManager.components.miniMapUI.hide();
                    }
                    if (this.game.hudManager) {
                        this.game.hudManager.showNotification(`Mini map ${isVisible ? 'enabled' : 'disabled'}`);
                    }
                }
            });
        }
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
            const zoomValue = parseFloat(newValue) || 10;
            this.cameraZoomSlider.value = zoomValue;
            if (this.cameraZoomValue) {
                this.cameraZoomValue.textContent = this.formatZoomDisplay(zoomValue);
            }
        } else if (key === STORAGE_KEYS.TARGET_FPS && this.fpsSlider && this.fpsValue) {
            const parsedFPS = parseInt(newValue) || 120;
            this.fpsSlider.value = parsedFPS;
            this.fpsValue.textContent = parsedFPS;
        } else if (key === STORAGE_KEYS.SHOW_MINIMAP && this.showMinimapCheckbox) {
            this.showMinimapCheckbox.checked = newValue === true || newValue === 'true';
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
        if (this.fpsSlider) {
            await this.saveSetting(STORAGE_KEYS.TARGET_FPS, parseInt(this.fpsSlider.value).toString());
        }
        return true;
    }

    /**
     * Reset camera settings to defaults
     * @returns {Promise<boolean>}
     */
    async resetToDefaults() {
        if (this.cameraZoomSlider) {
            this.cameraZoomSlider.value = 10;
            if (this.cameraZoomValue) {
                this.cameraZoomValue.textContent = 10;
            }
        }
        if (this.fpsSlider && this.fpsValue) {
            this.fpsSlider.value = 120;
            this.fpsValue.textContent = 120;
        }
        if (this.showMinimapCheckbox) {
            this.showMinimapCheckbox.checked = true;
            await this.saveSetting(STORAGE_KEYS.SHOW_MINIMAP, 'true');
        }
        return this.saveSettings();
    }
}

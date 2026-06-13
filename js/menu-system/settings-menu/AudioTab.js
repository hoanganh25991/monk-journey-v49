/**
 * AudioTab.js
 * Manages the audio settings tab UI component
 */

import { SettingsTab } from './SettingsTab.js';
import { STORAGE_KEYS } from '../../config/storage-keys.js';

export class AudioTab extends SettingsTab {
    /**
     * Create an audio settings tab
     * @param {import('../../game/Game.js').Game} game - The game instance
     * @param {SettingsMenu} settingsMenu - The parent settings menu
     */
    constructor(game, settingsMenu) {
        super('audio', game, settingsMenu);
        
        this.muteCheckbox = document.getElementById('mute-checkbox');
        this.musicVolumeSlider = document.getElementById('music-volume-slider');
        this.musicVolumeValue = document.getElementById('music-volume-value');
        this.sfxVolumeSlider = document.getElementById('sfx-volume-slider');
        this.sfxVolumeValue = document.getElementById('sfx-volume-value');
        this.testSoundButton = document.getElementById('test-sound-button');
        this.audioDisabledMessage = document.getElementById('audio-disabled-message');
        this.simulatedAudioNote = document.getElementById('simulated-audio-note');
        
        this.init();
    }

    _audio() {
        return this.game?.audioManager;
    }
    
    init() {
        const audio = this._audio();
        const audioAvailable = audio?.isAvailable ?? false;
        
        if (this.audioDisabledMessage) {
            this.audioDisabledMessage.style.display = audioAvailable ? 'none' : 'block';
        }
        
        if (this.simulatedAudioNote) {
            this.simulatedAudioNote.style.display = audio?.isSimulated ? 'block' : 'none';
        }
        
        if (this.muteCheckbox) {
            const muted = localStorage.getItem(STORAGE_KEYS.MUTED) === 'true';
            this.muteCheckbox.checked = muted;
            
            this.muteCheckbox.addEventListener('change', () => {
                localStorage.setItem(STORAGE_KEYS.MUTED, this.muteCheckbox.checked);
                if (this._audio()) {
                    this._audio().setMuted(this.muteCheckbox.checked);
                }
            });
        }
        
        if (this.musicVolumeSlider && this.musicVolumeValue) {
            const musicVolume = parseFloat(localStorage.getItem(STORAGE_KEYS.MUSIC_VOLUME)) || 0.5;
            this.musicVolumeSlider.value = musicVolume;
            this.musicVolumeValue.textContent = Math.round(musicVolume * 100);
            
            this.musicVolumeSlider.addEventListener('input', () => {
                const value = parseFloat(this.musicVolumeSlider.value);
                this.musicVolumeValue.textContent = Math.round(value * 100);
                localStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, value);
                if (this._audio()) {
                    this._audio().setMusicVolume(value);
                }
            });
        }
        
        if (this.sfxVolumeSlider && this.sfxVolumeValue) {
            const sfxVolume = parseFloat(localStorage.getItem(STORAGE_KEYS.SFX_VOLUME)) || 0.5;
            this.sfxVolumeSlider.value = sfxVolume;
            this.sfxVolumeValue.textContent = Math.round(sfxVolume * 100);
            
            this.sfxVolumeSlider.addEventListener('input', () => {
                const value = parseFloat(this.sfxVolumeSlider.value);
                this.sfxVolumeValue.textContent = Math.round(value * 100);
                localStorage.setItem(STORAGE_KEYS.SFX_VOLUME, value);
                if (this._audio()) {
                    this._audio().setSFXVolume(value);
                }
            });
        }
        
        if (this.testSoundButton) {
            this.testSoundButton.addEventListener('click', () => {
                if (this._audio()) {
                    this._audio().playSfx('test');
                }
            });
        }
        
        return true;
    }
    
    saveSettings() {
        if (this.muteCheckbox) {
            localStorage.setItem(STORAGE_KEYS.MUTED, this.muteCheckbox.checked);
        }
        if (this.musicVolumeSlider) {
            localStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, this.musicVolumeSlider.value);
        }
        if (this.sfxVolumeSlider) {
            localStorage.setItem(STORAGE_KEYS.SFX_VOLUME, this.sfxVolumeSlider.value);
        }
    }
    
    resetToDefaults() {
        if (this.muteCheckbox) {
            this.muteCheckbox.checked = false;
        }
        if (this.musicVolumeSlider && this.musicVolumeValue) {
            this.musicVolumeSlider.value = 0.5;
            this.musicVolumeValue.textContent = '50';
        }
        if (this.sfxVolumeSlider && this.sfxVolumeValue) {
            this.sfxVolumeSlider.value = 0.5;
            this.sfxVolumeValue.textContent = '50';
        }
        this.saveSettings();
    }
}

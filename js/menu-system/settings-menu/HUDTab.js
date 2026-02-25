/**
 * HUDTab.js
 * Manages the HUD preview tab UI component
 */

import { SettingsTab } from './SettingsTab.js';

export class HUDTab extends SettingsTab {
    /**
     * Create a HUD preview tab
     * @param {import('../../game/Game.js').Game} game - The game instance
     * @param {SettingsMenu} settingsMenu - The parent settings menu
     */
    constructor(game, settingsMenu) {
        super('hud', game, settingsMenu);
        
        // Get button references
        this.testEquipButton = document.getElementById('test-notification-equip');
        this.testSkipButton = document.getElementById('test-notification-skip');
        this.testPickButton = document.getElementById('test-notification-pick');
        this.testConsumeHealthButton = document.getElementById('test-notification-consume-health');
        this.testConsumeManaButton = document.getElementById('test-notification-consume-mana');
        
        // Initialize the tab
        this.initializeTab();
    }
    
    /**
     * Initialize the tab
     */
    initializeTab() {
        this.setupTestButtons();
    }
    
    /**
     * Setup test notification buttons
     */
    setupTestButtons() {
        console.log('HUDTab: Setting up test buttons');
        
        // Test Pick notification
        if (this.testPickButton) {
            console.log('HUDTab: Pick button found');
            this.testPickButton.addEventListener('click', (e) => {
                console.log('HUDTab: Pick button clicked');
                e.preventDefault();
                this.showTestNotification('pick');
            });
        } else {
            console.warn('HUDTab: Pick button not found');
        }
        
        // Test Equip notification
        if (this.testEquipButton) {
            console.log('HUDTab: Equip button found');
            this.testEquipButton.addEventListener('click', (e) => {
                console.log('HUDTab: Equip button clicked');
                e.preventDefault();
                this.showTestNotification('equip');
            });
        } else {
            console.warn('HUDTab: Equip button not found');
        }
        
        // Test Skip notification
        if (this.testSkipButton) {
            console.log('HUDTab: Skip button found');
            this.testSkipButton.addEventListener('click', (e) => {
                console.log('HUDTab: Skip button clicked');
                e.preventDefault();
                this.showTestNotification('skip');
            });
        } else {
            console.warn('HUDTab: Skip button not found');
        }
        
        // Test Consume Health notification
        if (this.testConsumeHealthButton) {
            console.log('HUDTab: Health button found');
            this.testConsumeHealthButton.addEventListener('click', (e) => {
                console.log('HUDTab: Health button clicked');
                e.preventDefault();
                this.showTestNotification('consume-health');
            });
        } else {
            console.warn('HUDTab: Health button not found');
        }
        
        // Test Consume Mana notification
        if (this.testConsumeManaButton) {
            console.log('HUDTab: Mana button found');
            this.testConsumeManaButton.addEventListener('click', (e) => {
                console.log('HUDTab: Mana button clicked');
                e.preventDefault();
                this.showTestNotification('consume-mana');
            });
        } else {
            console.warn('HUDTab: Mana button not found');
        }
    }
    
    /**
     * Show a test notification (standalone preview, doesn't require game to be running)
     * @param {string} type - The notification type
     */
    showTestNotification(type) {
        console.log('HUDTab: showTestNotification called with type:', type);
        
        // Pick notifications go in center, others float on left
        if (type === 'pick') {
            this.showCenterNotification('Pick Legendary Sword');
        } else {
            this.showFloatNotification(type);
        }
    }
    
    /**
     * Show a center notification (for pick items)
     * @param {string} message - Message to display
     */
    showCenterNotification(message) {
        // Create or get the center notification container
        let centerContainer = document.getElementById('hud-preview-center-notifications');
        if (!centerContainer) {
            centerContainer = document.createElement('div');
            centerContainer.id = 'hud-preview-center-notifications';
            centerContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
            `;
            document.body.appendChild(centerContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification-item';
        notification.style.cssText = `
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
        `;
        notification.textContent = message;
        
        centerContainer.appendChild(notification);
        
        // Fade out and remove after 3 seconds
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s';
            notification.style.opacity = '0';
            
            setTimeout(() => {
                notification.remove();
                
                // Clean up container if empty
                if (centerContainer.children.length === 0) {
                    centerContainer.remove();
                }
            }, 500);
        }, 2500);
        
        console.log('HUDTab: Center notification shown');
    }
    
    /**
     * Show a float notification (for equip, skip, consume)
     * @param {string} type - The notification type
     */
    showFloatNotification(type) {
        // Create or get the preview notification container
        let previewContainer = document.getElementById('hud-preview-notifications');
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.id = 'hud-preview-notifications';
            previewContainer.style.cssText = `
                position: fixed;
                left: 10px;
                bottom: 80px;
                width: min(260px, 70vw);
                pointer-events: none;
                z-index: 9999;
            `;
            document.body.appendChild(previewContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification-float notification-float--${type}`;
        
        // Add icon for item types
        if (type === 'equip' || type === 'skip') {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'notification-float-icon';
            iconSpan.textContent = '⚔️';
            notification.appendChild(iconSpan);
        }
        
        // Add text
        const textSpan = document.createElement('span');
        textSpan.className = 'notification-float-text';
        
        switch (type) {
            case 'equip':
                textSpan.textContent = 'Equipped Legendary Sword';
                break;
            case 'skip':
                textSpan.textContent = 'Skip Legendary Sword (weaker)';
                break;
            case 'consume-health':
                textSpan.textContent = 'Consume +200 Health';
                break;
            case 'consume-mana':
                textSpan.textContent = 'Consume +200 Mana';
                break;
        }
        
        notification.appendChild(textSpan);
        previewContainer.appendChild(notification);
        
        // Animate and remove after duration
        const duration = type === 'equip' ? 5000 : (type === 'skip' ? 3000 : 2200);
        
        // Float up animation
        let offset = 0;
        const floatInterval = setInterval(() => {
            offset += 2;
            notification.style.transform = `translateY(-${offset}px)`;
        }, 16);
        
        // Fade out and remove
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s';
            notification.style.opacity = '0';
            
            setTimeout(() => {
                clearInterval(floatInterval);
                notification.remove();
                
                // Clean up container if empty
                if (previewContainer.children.length === 0) {
                    previewContainer.remove();
                }
            }, 500);
        }, duration - 500);
        
        console.log('HUDTab: Float notification shown');
    }
    
    /**
     * Called when the tab is activated
     */
    onActivate() {
        console.log('HUDTab: Tab activated');
        
        // Re-get button references in case they weren't available during construction
        if (!this.testEquipButton) {
            this.testEquipButton = document.getElementById('test-notification-equip');
        }
        if (!this.testSkipButton) {
            this.testSkipButton = document.getElementById('test-notification-skip');
        }
        if (!this.testPickButton) {
            this.testPickButton = document.getElementById('test-notification-pick');
        }
        if (!this.testConsumeHealthButton) {
            this.testConsumeHealthButton = document.getElementById('test-notification-consume-health');
        }
        if (!this.testConsumeManaButton) {
            this.testConsumeManaButton = document.getElementById('test-notification-consume-mana');
        }
        
        // Re-setup buttons if needed
        const allButtonsFound = this.testEquipButton && this.testSkipButton && 
                                this.testPickButton && this.testConsumeHealthButton && 
                                this.testConsumeManaButton;
        
        if (allButtonsFound) {
            console.log('HUDTab: All buttons found on activate');
        } else {
            console.warn('HUDTab: Some buttons still missing on activate');
        }
    }
    
    /**
     * Save the notifications settings
     * @returns {Promise<boolean>}
     */
    async saveSettings() {
        // No settings to save for this tab (it's just for testing)
        return true;
    }
}

import { UIComponent } from '../UIComponent.js';
/**
 * Notifications UI component
 * Displays game notifications and messages
 */
export class NotificationsUI extends UIComponent {
    /**
     * Create a new NotificationsUI component
     * @param {Object} game - Reference to the game instance
     */
    constructor(game) {
        super('notifications-container', game);
        this.notifications = [];
        this.damageNumbers = [];
        /** @type {Array<{element: HTMLElement, lifetime: number, message: string, timestamp: number, floatOffset: number}>} */
        this.floatNotifications = [];
        
        // Message queue for asynchronous processing
        this.messageQueue = [];
        this.isProcessingQueue = false;
        
        // Configuration
        this.maxQueueSize = 20; // Maximum number of messages in queue
        this.processingInterval = 50; // Milliseconds between processing messages
        this.maxVisibleNotifications = 5; // Default max visible notifications
        /** Types that show on left side and float up (above joystick) */
        this.floatTypes = ['equip', 'consume-health', 'consume-mana', 'consume-effect', 'skip'];
    }
    
    /**
     * Initialize the component
     * @returns {boolean} - True if initialization was successful
     */
    init() {
        // No initial HTML needed, notifications are added dynamically
        
        // Float container: left side, above joystick, notifications float up
        this.floatContainer = document.createElement('div');
        this.floatContainer.id = 'notifications-float-container';
        this.container.appendChild(this.floatContainer);
        
        console.log('NotificationsUI: Float container created and appended', this.floatContainer);
        
        // Calculate max visible notifications based on screen height
        this.updateMaxVisibleNotifications();
        
        // Start the message queue processor
        this.startQueueProcessor();
        
        return true;
    }
    
    /**
     * Update max visible notifications based on screen height
     */
    updateMaxVisibleNotifications() {
        const screenHeight = window.innerHeight;
        const maxNotificationAreaHeight = screenHeight / 5;
        const estimatedNotificationHeight = 40;
        this.maxVisibleNotifications = Math.floor(maxNotificationAreaHeight / estimatedNotificationHeight);
    }
    
    /**
     * Start the message queue processor
     */
    startQueueProcessor() {
        // Process messages from queue at regular intervals
        setInterval(() => {
            this.processNextMessage();
        }, this.processingInterval);
    }
    
    /**
     * Process the next message in the queue
     */
    processNextMessage() {
        // If already processing or queue is empty, do nothing
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        try {
            const entry = this.messageQueue.shift();
            const message = typeof entry === 'string' ? entry : (entry && entry.message);
            const type = typeof entry === 'object' && entry && typeof entry.type === 'string' ? entry.type : undefined;
            const item = typeof entry === 'object' && entry && entry.item;
            if (message != null) {
                this.displayNotification(message, type, item);
            }
        } catch (error) {
            console.error('Error processing notification message:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }
    
    /**
     * Update notifications and damage numbers
     * @param {number} delta - Time since last update in seconds
     */
    update(delta) {
        // Update notifications
        this.updateNotifications(delta);
    }
    
    /**
     * Add a notification message to the queue
     * @param {string} message - Message to display
     * @param {string|number} [typeOrDuration] - Optional: type ('equip', 'consume-health', 'consume-mana', 'warning', 'error', ...) or duration in ms
     * @param {{ item?: { name: string, icon?: string } }} [extra] - Optional: for type 'equip', pass { item } to show item icon
     */
    showNotification(message, typeOrDuration, extra) {
        const isType = typeof typeOrDuration === 'string';
        const entry = {
            message: typeof message === 'string' ? message : (message && message.message) || String(message),
            type: isType ? typeOrDuration : undefined,
            duration: !isType && typeof typeOrDuration === 'number' ? typeOrDuration : undefined,
            item: extra && extra.item ? extra.item : undefined
        };
        this.messageQueue.push(entry);
        
        // If queue gets too large, remove oldest messages
        if (this.messageQueue.length > this.maxQueueSize) {
            const messagesToKeep = Math.max(5, Math.floor(this.maxQueueSize * 0.5));
            this.messageQueue = this.messageQueue.slice(-messagesToKeep);
        }
    }
    
    /**
     * Display a notification message (called from queue processor)
     * @param {string} message - Message to display
     * @param {string} [type] - Optional type for styling: 'equip', 'consume-health', 'consume-mana', 'warning', 'error', ...
     * @param {{ name: string, icon?: string }} [item] - Optional item for equip (show icon)
     */
    displayNotification(message, type, item) {
        const useFloat = type && this.floatTypes.includes(type);
        if (useFloat && this.floatContainer) {
            this.displayFloatNotification(message, type, item);
            return;
        }
        
        // Center notifications (original behavior)
        const screenHeight = window.innerHeight;
        const maxNotificationAreaHeight = screenHeight / 5;
        
        const notification = document.createElement('div');
        notification.className = 'notification-item' + (type ? ` notification-item--${type}` : '');
        notification.style.top = '80px';
        notification.textContent = message;
        
        this.container.appendChild(notification);
        
        const messageRate = this.getMessageRate();
        const notificationsToKeep = messageRate > 3 ? 
            Math.max(2, this.maxVisibleNotifications - 2) : this.maxVisibleNotifications;
        
        while (this.notifications.length >= notificationsToKeep) {
            const oldestNotification = this.notifications.shift();
            if (oldestNotification && oldestNotification.element) {
                oldestNotification.element.remove();
            }
        }
        
        const lifetime = messageRate > 3 ? 0.3 : 0.7;
        this.notifications.push({
            element: notification,
            lifetime: lifetime,
            message: message,
            timestamp: Date.now()
        });
        
        this.deduplicateNotifications();
        
        if (this.notifications.length > 1) {
            let totalHeight = 0;
            const availableHeight = maxNotificationAreaHeight;
            for (let i = 0; i < this.notifications.length - 1; i++) {
                const notif = this.notifications[i];
                if (notif && notif.element) totalHeight += notif.element.offsetHeight + 5;
            }
            if (totalHeight > availableHeight) {
                this.compressNotifications(availableHeight);
            } else {
                const previousNotification = this.notifications[this.notifications.length - 2];
                if (previousNotification && previousNotification.element) {
                    const previousHeight = previousNotification.element.offsetHeight;
                    const previousTop = parseInt(previousNotification.element.style.top);
                    notification.style.top = `${previousTop + previousHeight + 5}px`;
                }
            }
        }
    }
    
    /**
     * Display a float notification (left side, above joystick, floats up). Red=health, blue=mana, yellow=equip, white=skip.
     * @param {string} message - Message to display
     * @param {string} type - 'equip' | 'consume-health' | 'consume-mana' | 'skip'
     * @param {{ name: string, icon?: string }} [item] - For equip/skip: show item icon
     */
    displayFloatNotification(message, type, item) {
        console.log('NotificationsUI: Displaying float notification', { message, type, item, floatContainer: this.floatContainer });
        
        if (!this.floatContainer) {
            console.error('NotificationsUI: Float container not found!');
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `notification-float notification-float--${type}`;
        
        if ((type === 'equip' || type === 'skip') && item) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'notification-float-icon';
            iconSpan.textContent = (item.icon != null && item.icon !== '') ? item.icon : '📦';
            iconSpan.setAttribute('aria-hidden', 'true');
            notification.appendChild(iconSpan);
        }
        const textSpan = document.createElement('span');
        textSpan.className = 'notification-float-text';
        textSpan.textContent = message;
        notification.appendChild(textSpan);
        
        this.floatContainer.appendChild(notification);
        console.log('NotificationsUI: Float notification appended', notification);
        
        // Limit float notifications
        const maxFloat = 6;
        while (this.floatNotifications.length >= maxFloat) {
            const old = this.floatNotifications.shift();
            if (old && old.element) old.element.remove();
        }
        
        // Equip notifications should float for 5 seconds, skip for 3 seconds minimum, others for 2.2 seconds
        const lifetime = type === 'equip' ? 5.0 : (type === 'skip' ? 3.0 : 2.2);
        
        this.floatNotifications.push({
            element: notification,
            lifetime: lifetime,
            message: message,
            timestamp: Date.now(),
            floatOffset: 0
        });
        
        this.layoutFloatNotifications();
    }
    
    /**
     * Position float notifications from bottom (newest at bottom), then they float up via update.
     */
    layoutFloatNotifications() {
        const gap = 6;
        let bottom = 0;
        for (let i = this.floatNotifications.length - 1; i >= 0; i--) {
            const n = this.floatNotifications[i];
            if (!n || !n.element) continue;
            n.element.style.bottom = `${bottom}px`;
            n.element.style.transform = `translateY(${-(n.floatOffset || 0)}px)`;
            bottom += n.element.offsetHeight + gap;
        }
    }
    
    /**
     * Update existing notifications
     * @param {number} delta - Time since last update in seconds
     */
    updateNotifications(delta) {
        // Float notifications: move up and expire
        const floatSpeed = 45 * delta; // px per second
        let floatNeedsLayout = false;
        for (let i = this.floatNotifications.length - 1; i >= 0; i--) {
            const n = this.floatNotifications[i];
            if (!n || !n.element) {
                this.floatNotifications.splice(i, 1);
                floatNeedsLayout = true;
                continue;
            }
            n.lifetime -= (1 / 60) * (delta * 60);
            n.floatOffset = (n.floatOffset || 0) + floatSpeed;
            if (n.lifetime <= 0) {
                n.element.remove();
                this.floatNotifications.splice(i, 1);
                floatNeedsLayout = true;
            } else {
                n.element.style.opacity = Math.max(0, n.lifetime / 0.6);
                n.element.style.transform = `translateY(${-n.floatOffset}px)`;
            }
        }
        if (floatNeedsLayout && this.floatNotifications.length > 0) {
            this.layoutFloatNotifications();
        }
        
        // Center notifications
        let needsReorganization = false;
        const messageRate = this.getMessageRate();
        const fastExpiry = messageRate > 3;
        
        // If message rate is very high, aggressively reduce visible notifications
        if (messageRate > 5 && this.notifications.length > 3) {
            // Keep only the most recent notifications
            const notificationsToKeep = Math.max(2, Math.floor(this.maxVisibleNotifications * 0.5));
            
            // Remove excess notifications from the beginning (oldest first)
            while (this.notifications.length > notificationsToKeep) {
                const oldestNotification = this.notifications.shift();
                if (oldestNotification && oldestNotification.element) {
                    oldestNotification.element.remove();
                }
            }
            
            needsReorganization = true;
        }
        
        // Process remaining notifications
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            
            // Skip invalid notifications
            if (!notification || !notification.element) {
                this.notifications.splice(i, 1);
                continue;
            }
            
            // Update notification lifetime - expire faster if many messages are coming in
            const expiryRate = fastExpiry ? 1.5 / 60 : 1 / 60;
            notification.lifetime -= expiryRate;
            
            // Remove expired notifications
            if (notification.lifetime <= 0) {
                notification.element.remove();
                this.notifications.splice(i, 1);
                needsReorganization = true;
            } else {
                // Update opacity for fade out - start fading earlier
                const fadeStartThreshold = fastExpiry ? 1.2 : 1;
                if (notification.lifetime < fadeStartThreshold) {
                    notification.element.style.opacity = notification.lifetime / fadeStartThreshold;
                }
                
                // Faster slide up for smoother animation - speed based on message rate
                const slideSpeed = fastExpiry ? 1.2 : 0.8;
                const currentTop = parseInt(notification.element.style.top);
                notification.element.style.top = `${currentTop - slideSpeed}px`;
            }
        }
        
        // If we removed notifications or have too many, reorganize the remaining ones
        if ((needsReorganization && this.notifications.length > 0) || 
            (this.notifications.length > 3 && fastExpiry)) {
            
            // Get screen height to calculate maximum notification area
            const screenHeight = window.innerHeight;
            const maxNotificationAreaHeight = screenHeight / 5;
            
            // Calculate total height of all notifications
            let totalHeight = 0;
            for (let i = 0; i < this.notifications.length; i++) {
                const notif = this.notifications[i];
                if (notif && notif.element) {
                    const height = notif.element.offsetHeight + 5; // Height + smaller margin
                    totalHeight += height;
                }
            }
            
            // If we exceed the max height, compress the notifications
            if (totalHeight > maxNotificationAreaHeight) {
                this.compressNotifications(maxNotificationAreaHeight);
            } else {
                // Just reposition notifications with proper spacing
                let currentTop = 80; // Start from the top position
                
                for (let i = 0; i < this.notifications.length; i++) {
                    const notification = this.notifications[i];
                    if (notification && notification.element) {
                        // Reset transform in case it was previously compressed
                        if (notification.element.style.transform.includes('scale')) {
                            notification.element.style.transform = 'translateX(-50%)';
                        }
                        
                        notification.element.style.top = `${currentTop}px`;
                        currentTop += notification.element.offsetHeight + 5; // Height + smaller margin
                    }
                }
            }
        }
        
        // Process more messages from the queue if we have space
        if (this.notifications.length < this.maxVisibleNotifications && this.messageQueue.length > 0) {
            this.processNextMessage();
        }
    }
    
    /**
     * Show level up animation using CSS animations
     * @param {number} level - New level
     */
    showLevelUp(level) {
        // Get the level up container and level elements
        const levelUpContainer = document.getElementById('level-up-container');
        const levelElement = levelUpContainer.querySelector('.level-up-level');

        // Set the level text
        levelElement.textContent = level;
        
        // Show the level up animation using CSS classes
        levelUpContainer.classList.remove('level-up-active');
        // Force a reflow to restart the animation
        void levelUpContainer.offsetWidth;
        levelUpContainer.classList.add('level-up-active');
    }
    
    /**
     * Helper method to calculate message rate (messages per second)
     * @returns {number} - Message rate
     */
    getMessageRate() {
        if (this.notifications.length < 2) return 1; // Default rate
        
        // Calculate time window (in seconds) for the last few messages
        const now = Date.now();
        const oldestTimestamp = this.notifications[0].timestamp;
        const timeWindow = (now - oldestTimestamp) / 1000;
        
        // Avoid division by zero
        if (timeWindow < 0.1) return 10; // Very high rate
        
        // Calculate messages per second
        return this.notifications.length / timeWindow;
    }
    
    /**
     * Helper method to compress notifications to fit in available space
     * @param {number} availableHeight - Available height for notifications
     */
    compressNotifications(availableHeight) {
        // Calculate how much space each notification can take
        const notificationCount = this.notifications.length;
        
        // If no notifications, nothing to do
        if (notificationCount === 0) {
            return;
        }
        
        const spacePerNotification = availableHeight / notificationCount;
        
        // Position each notification with compressed spacing
        let currentTop = 80; // Start from the top position
        
        // Apply more aggressive compression when we have many notifications
        const compressionFactor = notificationCount > 5 ? 0.03 : 0.02;
        
        for (let i = 0; i < this.notifications.length; i++) {
            const notification = this.notifications[i];
            
            // Skip invalid notifications
            if (!notification || !notification.element) {
                continue;
            }
            
            // Apply a scale reduction for better compactness
            // More aggressive scaling for higher message counts
            const scale = Math.max(0.8, 1 - (notificationCount * compressionFactor));
            notification.element.style.transform = `translateX(-50%) scale(${scale})`;
            
            // Set position
            notification.element.style.top = `${currentTop}px`;
            
            // Move to next position (use smaller spacing when compressed)
            // Use a minimum spacing to prevent overlap
            // For very high message counts, use even smaller spacing
            const minSpacing = notificationCount > 5 ? 20 : 25;
            currentTop += Math.max(minSpacing, spacePerNotification);
        }
    }
    
    /**
     * Helper method to deduplicate notifications
     */
    deduplicateNotifications() {
        // Create a map to count occurrences of each message
        const messageCounts = {};
        const messageIndices = {}; // Track indices of first occurrence
        
        // Count occurrences and track first occurrence
        for (let i = 0; i < this.notifications.length; i++) {
            const notification = this.notifications[i];
            
            // Skip invalid notifications
            if (!notification) {
                continue;
            }
            
            const message = notification.message;
            
            if (messageCounts[message] === undefined) {
                messageIndices[message] = i; // First occurrence
            }
            
            messageCounts[message] = (messageCounts[message] || 0) + 1;
        }
        
        // Handle duplicate messages
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            
            // Skip invalid notifications
            if (!notification || !notification.element) {
                this.notifications.splice(i, 1);
                continue;
            }
            
            const message = notification.message;
            
            if (messageCounts[message] > 1) {
                // If this is not the first occurrence of the message
                if (messageIndices[message] !== i) {
                    // For duplicates, either remove them or reduce their lifetime drastically
                    if (messageCounts[message] > 2) {
                        // If more than 2 duplicates, remove all but the first occurrence
                        notification.element.remove();
                        this.notifications.splice(i, 1);
                    } else {
                        // For just 2 duplicates, drastically reduce lifetime
                        notification.lifetime = Math.min(notification.lifetime, 0.8);
                    }
                } else {
                    // For the first occurrence, update the text to show count
                    if (messageCounts[message] > 2) {
                        notification.element.textContent = `${message} (${messageCounts[message]}x)`;
                    }
                    // Slightly reduce lifetime of first occurrence too
                    notification.lifetime = Math.min(notification.lifetime, 2.0);
                }
            }
        }
    }
    
    /**
     * Clear all notifications immediately
     * Useful when transitioning between game states or when too many messages appear
     */
    clearAllNotifications() {
        // Remove all visible notifications
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            if (notification && notification.element) {
                notification.element.remove();
            }
        }
        
        // Clear the notifications array
        this.notifications = [];
        
        // Clear the message queue or keep only the most recent few
        if (this.messageQueue.length > 5) {
            // Keep only the 5 most recent messages
            this.messageQueue = this.messageQueue.slice(-5);
        }
    }
}
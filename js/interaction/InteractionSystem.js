import * as THREE from '../../libs/three/three.module.js';
import { INTERACTION_RANGE } from '../config/input.js';
import { InteractionResultHandler } from '../InteractionResultHandler.js';
import { distanceSq2D, distanceApprox2D, fastSin, fastCos } from 'utils/FastMath.js';

/**
 * Centralized system for handling all interactions in the game
 * This class unifies keyboard, touch, and collision-based interactions
 */
export class InteractionSystem {
    constructor(game) {
        this.game = game;
        this.player = game.player;
        this.world = game.world;
        
        // Create interaction result handler
        this.interactionHandler = new InteractionResultHandler(game);
        
        // Track nearby interactive objects for visual indicators
        this.nearbyInteractiveObjects = [];
        
        // Track the currently highlighted object (closest to player)
        this.highlightedObject = null;
        
        // Track interaction cooldown to prevent spam
        this.interactionCooldown = 0;
        this.cooldownDuration = 500; // ms
    }
    
    /**
     * Update the interaction system
     * @param {number} delta - Time delta since last update
     */
    update(delta) {
        // Skip if game is paused
        if (this.game.isPaused) return;
        
        // Update interaction cooldown
        if (this.interactionCooldown > 0) {
            this.interactionCooldown -= delta * 1000; // Convert to ms
        }
        
        // Update nearby objects
        this.updateNearbyObjects();
        
        // Update visual indicators for interactive objects
        this.updateVisualIndicators();
    }
    
    /**
     * Update the list of nearby interactive objects
     */
    updateNearbyObjects() {
        const playerPosition = this.player.getPosition();
        
        // Get nearby interactive objects
        const rawObjects = this.world.getInteractiveObjectsNear(
            playerPosition,
            INTERACTION_RANGE
        );
        
        // Filter to only include valid interactive objects
        this.nearbyInteractiveObjects = rawObjects.filter(obj => {
            const isValid = obj && typeof obj.onInteract === 'function';
            if (!isValid) {
                console.warn('Filtered out invalid interactive object:', obj);
            }
            return isValid;
        });
        
        // Find the closest object for highlighting using squared distance
        if (this.nearbyInteractiveObjects.length > 0) {
            let closestObject = this.nearbyInteractiveObjects[0];
            let closestDistanceSq = distanceSq2D(
                playerPosition.x, playerPosition.z,
                closestObject.position.x, closestObject.position.z
            );

            for (let i = 1; i < this.nearbyInteractiveObjects.length; i++) {
                const obj = this.nearbyInteractiveObjects[i];
                const distanceSq = distanceSq2D(
                    playerPosition.x, playerPosition.z,
                    obj.position.x, obj.position.z
                );
                
                if (distanceSq < closestDistanceSq) {
                    closestDistanceSq = distanceSq;
                    closestObject = obj;
                }
            }
            
            // Update highlighted object
            if (this.highlightedObject !== closestObject) {
                // Remove highlight from previous object
                if (this.highlightedObject && this.highlightedObject.setHighlighted) {
                    this.highlightedObject.setHighlighted(false);
                }
                
                // Set new highlighted object
                this.highlightedObject = closestObject;
                
                // Add highlight to new object
                if (this.highlightedObject && this.highlightedObject.setHighlighted) {
                    this.highlightedObject.setHighlighted(true);
                }
            }
        } else if (this.highlightedObject) {
            // No nearby objects, remove highlight
            if (this.highlightedObject.setHighlighted) {
                this.highlightedObject.setHighlighted(false);
            }
            this.highlightedObject = null;
        }
    }
    
    /**
     * Update visual indicators for interactive objects
     */
    updateVisualIndicators() {
        // This could be expanded to add floating icons, particle effects, etc.
        // For now, we'll rely on the object's own setHighlighted method
    }
    
    /**
     * Handle interaction triggered by keyboard/controller
     * @returns {boolean} - Whether an interaction was performed
     */
    handleKeyboardInteraction() {
        // Check if on cooldown
        if (this.interactionCooldown > 0) return false;
        
        // Set player interaction state
        this.player.setInteracting(true);
        
        // Get player position and forward direction
        const playerPosition = this.player.getPosition();
        const playerRotation = this.player.getRotation();
        
        // Calculate forward direction from player rotation (FastMath for hot path)
        const playerForward = new THREE.Vector3(
            fastSin(playerRotation.y),
            0,
            fastCos(playerRotation.y)
        );
        
        // Find the object in front of the player
        let bestObject = null;
        let bestScore = -Infinity;
        
        for (const obj of this.nearbyInteractiveObjects) {
            // Calculate direction to object
            const objDirection = new THREE.Vector3()
                .subVectors(obj.position, playerPosition)
                .normalize();
            
            // Calculate dot product to determine how "in front" the object is
            // Higher dot product means more directly in front
            const dotProduct = playerForward.dot(objDirection);
            
            // Calculate distance factor (closer objects get priority) - use approx to avoid sqrt
            const distanceApprox = distanceApprox2D(
                playerPosition.x, playerPosition.z,
                obj.position.x, obj.position.z
            );
            const distanceFactor = 1.0 - (distanceApprox / INTERACTION_RANGE);
            
            // Only consider objects somewhat in front of the player (dot product > 0)
            if (dotProduct > 0) {
                // Calculate overall score based on direction and distance
                // Objects directly in front and close get highest scores
                const score = (dotProduct * 0.7) + (distanceFactor * 0.3);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestObject = obj;
                }
            }
        }
        
        // Interact with the best object if found
        if (bestObject) {
            this.interactWithObject(bestObject);
            
            // Set cooldown
            this.interactionCooldown = this.cooldownDuration;
            
            return true;
        } else {
            // No object found to interact with
            this.game.hudManager.showNotification("Nothing to interact with nearby");
            
            // Reset interaction state after a short delay
            setTimeout(() => {
                this.player.setInteracting(false);
            }, 500);
            
            return false;
        }
    }
    
    /**
     * Handle interaction triggered by collision
     * @param {Object} interactiveObject - The object to interact with
     * @returns {boolean} - Whether an interaction was performed
     */
    handleCollisionInteraction(interactiveObject) {
        // Check if on cooldown
        if (this.interactionCooldown > 0) return false;
        
        // Only interact if player is in interaction mode
        if (!this.player.isInteracting()) return false;
        
        // Interact with the object
        this.interactWithObject(interactiveObject);
        
        // Set cooldown
        this.interactionCooldown = this.cooldownDuration;
        
        return true;
    }
    
    /**
     * Handle interaction triggered by touch/click
     * @param {Object} interactiveObject - The object to interact with
     * @returns {boolean} - Whether an interaction was performed
     */
    handleTouchInteraction(interactiveObject) {
        // Check if on cooldown
        if (this.interactionCooldown > 0) return false;
        
        // Interact with the object
        this.interactWithObject(interactiveObject);
        
        // Set cooldown
        this.interactionCooldown = this.cooldownDuration;
        
        return true;
    }
    
    /**
     * Interact with an object
     * @param {Object} interactiveObject - The object to interact with
     */
    interactWithObject(interactiveObject) {
        // Validate that the object has an interaction handler
        if (!interactiveObject || typeof interactiveObject.onInteract !== 'function') {
            console.warn('Invalid interactive object - missing onInteract method:', interactiveObject);
            
            // Show notification to user
            if (this.game.hudManager) {
                this.game.hudManager.showNotification("Cannot interact with this object");
            }
            
            // Reset interaction state
            setTimeout(() => {
                this.player.setInteracting(false);
            }, 500);
            
            return;
        }
        
        try {
            // Call the object's interaction handler
            const result = interactiveObject.onInteract();
            
            // Use the interaction result handler
            this.interactionHandler.handleInteractionResult(result, interactiveObject);
        } catch (error) {
            console.error('Error during object interaction:', error);
            
            // Show error notification to user
            if (this.game.hudManager) {
                this.game.hudManager.showNotification("Error interacting with object");
            }
        }
        
        // Reset interaction state after a short delay
        setTimeout(() => {
            this.player.setInteracting(false);
        }, 500);
    }
    
    /**
     * Get nearby interactive objects
     * @returns {Array} - Array of nearby interactive objects
     */
    getNearbyObjects() {
        return this.nearbyInteractiveObjects;
    }
    
    /**
     * Get the currently highlighted object
     * @returns {Object|null} - The highlighted object or null
     */
    getHighlightedObject() {
        return this.highlightedObject;
    }
    
    /**
     * Get the nearest interactive object to the player
     * @returns {Object|null} - The nearest interactive object or null
     */
    getNearestInteractiveObject() {
        // If we already have a highlighted object (which is the closest), return it
        if (this.highlightedObject) {
            return this.highlightedObject;
        }
        
        // Otherwise, find the closest object
        if (!this.nearbyInteractiveObjects || this.nearbyInteractiveObjects.length === 0) {
            // Force an update of nearby objects
            this.updateNearbyObjects();
            
            // If still no objects, return null
            if (!this.nearbyInteractiveObjects || this.nearbyInteractiveObjects.length === 0) {
                return null;
            }
        }
        
        // Get player position
        const playerPosition = this.player.getPosition();
        
        // Find the closest object using squared distance
        let closestObject = this.nearbyInteractiveObjects[0];
        let dx = closestObject.position.x - playerPosition.x;
        let dz = closestObject.position.z - playerPosition.z;
        let closestDistanceSq = dx * dx + dz * dz;
        
        for (let i = 1; i < this.nearbyInteractiveObjects.length; i++) {
            const obj = this.nearbyInteractiveObjects[i];
            dx = obj.position.x - playerPosition.x;
            dz = obj.position.z - playerPosition.z;
            const distanceSq = dx * dx + dz * dz;
            
            if (distanceSq < closestDistanceSq) {
                closestDistanceSq = distanceSq;
                closestObject = obj;
            }
        }
        
        return closestObject;
    }
    
    /**
     * Get all interactive objects
     * @returns {Array} - Array of all interactive objects
     */
    getInteractiveObjects() {
        // If we have a world with an interactive manager, use it
        if (this.world && this.world.interactiveManager && 
            this.world.interactiveManager.getInteractiveObjects) {
            return this.world.interactiveManager.getInteractiveObjects();
        }
        
        // Otherwise, return an empty array
        return [];
    }
}
/**
 * PlayerMovement.js
 * Handles player movement, position, and camera updates
 */

import * as THREE from 'three';

export class PlayerMovement {
    /**
     * @param {import('./PlayerInterface.js').IPlayerState} playerState - Player state manager
     * @param {import('./PlayerInterface.js').IPlayerStats} playerStats - Player statistics
     * @param {THREE.Group} modelGroup - The player's model group
     * @param {THREE.PerspectiveCamera} camera - The main camera
     * @param {Object} [game=null] - The main game instance
     */
    constructor(playerState, playerStats, modelGroup, camera, game = null) {
        // Store references
        this.playerState = playerState;
        this.playerStats = playerStats;
        this.modelGroup = modelGroup;
        this.camera = camera;
        
        // Position and orientation
        this.position = new THREE.Vector3(0, 0, 0);
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        
        // Collision properties
        this.collisionRadius = 0.5;
        this.heightOffset = 1.0;
        
        // Jump state: velocity, count, max jumps, diminishing force (max total ~3x first jump)
        this.velocityY = 0;
        this.jumpCount = 0;
        this.maxJumps = 3;
        this.jumpForces = [12, 7, 4]; // Strong first jump so monk visibly rises
        this.gravity = 28;
        this.groundedTolerance = 0.2;
        
        // Game reference
        this.game = game;
    }
    
    /**
     * Trigger a jump. Up to 3 jumps with diminishing force (max total height ~3x first jump).
     */
    jump() {
        console.log('🚀 JUMP called! jumpCount:', this.jumpCount, 'velocityY before:', this.velocityY);
        if (this.jumpCount >= this.maxJumps) {
            console.log('❌ Jump blocked - already jumped', this.maxJumps, 'times');
            return;
        }
        this.velocityY += this.jumpForces[this.jumpCount];
        this.jumpCount++;
        console.log('✅ Jump executed! velocityY now:', this.velocityY, 'jumpCount:', this.jumpCount);
    }
    
    // setGame method removed - game is now passed in constructor
    
    updateMovement(delta) {
        if (this.playerState.isMoving()) {
            // Calculate direction to target
            const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position).normalize();
            
            // Calculate distance to target
            const distance = this.position.distanceTo(this.targetPosition);
            
            // Move towards target
            if (distance > 0.1) {
                // Calculate movement step
                const step = this.playerStats.getMovementSpeed() * delta;
                
                // Calculate new position (only update X and Z, let updateTerrainHeight handle Y)
                const newPosition = new THREE.Vector3(
                    this.position.x + direction.x * step,
                    this.position.y,
                    this.position.z + direction.z * step
                );
                
                // Update position (only X and Z)
                this.position.x = newPosition.x;
                this.position.z = newPosition.z;
                
                // Update model position - use the full position vector to ensure proper update
                if (this.modelGroup) {
                    this.modelGroup.position.set(this.position.x, this.modelGroup.position.y, this.position.z);
                }
                
                // Update rotation to face movement direction
                this.rotation.y = Math.atan2(direction.x, direction.z);
                if (this.modelGroup) {
                    this.modelGroup.rotation.y = this.rotation.y;
                }
            } else {
                // Reached target
                this.playerState.setMoving(false);
            }
        }
        
        // Apply jump physics (gravity + velocity)
        this.updateJumpPhysics(delta);
        
        // Update the world based on player position
        if (this.game && this.game.world) {
            // Get delta time from game if available, otherwise use a default value
            const delta = this.game.delta || 0.016;
            this.game.world.update(this.position, delta);
        }
    }
    
    updateJumpPhysics(delta) {
        if (!this.game || !this.game.world) {
            if (this.velocityY !== 0) console.log('⚠️ Jump physics skipped - no game.world');
            return;
        }
        const safeDelta = Math.min(Math.max(delta || 0.016, 0.001), 0.1);
        try {
            const terrainHeight = this.game.world.getTerrainHeight(this.position.x, this.position.z);
            if (terrainHeight === null || terrainHeight === undefined || !isFinite(terrainHeight)) {
                if (this.velocityY !== 0) console.log('⚠️ Jump physics skipped - invalid terrain height');
                return;
            }
            
            const groundY = terrainHeight + this.heightOffset;
            
            // Apply gravity and velocity when in air
            if (this.velocityY !== 0) {
                const oldY = this.position.y;
                this.velocityY -= this.gravity * safeDelta;
                this.position.y += this.velocityY * safeDelta;
                console.log(`🌊 Jump physics: Y ${oldY.toFixed(2)} → ${this.position.y.toFixed(2)}, velocityY: ${this.velocityY.toFixed(2)}, groundY: ${groundY.toFixed(2)}`);
            }
            
            // Land when we hit or pass ground
            if (this.position.y <= groundY + this.groundedTolerance) {
                if (this.velocityY !== 0 || this.jumpCount !== 0) {
                    console.log('🛬 LANDED at Y:', this.position.y.toFixed(2), 'groundY:', groundY.toFixed(2));
                }
                this.position.y = groundY;
                this.velocityY = 0;
                this.jumpCount = 0;
            }
            
            // Always sync model to movement position (critical for visible jump)
            if (this.modelGroup) {
                this.modelGroup.position.set(this.position.x, this.position.y, this.position.z);
            }
        } catch (err) {
            console.error('❌ Jump physics error:', err);
        }
    }
    
    handleKeyboardMovement(delta) {
        // Get movement direction from input handler
        // This now returns a direction that's already transformed based on camera rotation
        const direction = this.game.inputHandler.getMovementDirection();
        
        // If there's keyboard input, move the player
        if (direction.length() > 0) {
            // Calculate movement step
            const step = this.playerStats.getMovementSpeed() * delta;
            
            // Calculate new position (only update X and Z)
            const newPosition = new THREE.Vector3(
                this.position.x + direction.x * step,
                this.position.y,
                this.position.z + direction.z * step
            );
            
            // Update position
            this.position.x = newPosition.x;
            this.position.z = newPosition.z;
            
            // Update model position - use the full position vector to ensure proper update
            if (this.modelGroup) {
                this.modelGroup.position.set(this.position.x, this.modelGroup.position.y, this.position.z);
            }
            
            // Update rotation to face movement direction
            this.rotation.y = Math.atan2(direction.x, direction.z);
            if (this.modelGroup) {
                this.modelGroup.rotation.y = this.rotation.y;
            }
            
            // Set moving state
            this.playerState.setMoving(true);
            
            // Update target position to current position to prevent mouse movement overriding
            this.targetPosition.copy(this.position);
            
            // If the game has a player reference with setLookDirection method, update it
            // This ensures the player's look direction is synchronized with movement
            if (this.game && this.game.player && typeof this.game.player.setLookDirection === 'function') {
                // Create a normalized direction vector for the look direction
                const lookDirection = new THREE.Vector3(direction.x, 0, direction.z).normalize();
                this.game.player.setLookDirection(lookDirection);
            }
        }
    }
    
    updateTerrainHeight() {
        // Skip terrain snap when jumping (velocityY handles Y)
        if (this.velocityY !== 0) return;
        
        // Ensure player is always at the correct terrain height when grounded
        if (this.game && this.game.world) {
            try {
                const terrainHeight = this.game.world.getTerrainHeight(this.position.x, this.position.z);
                
                // Check if terrain height is valid
                if (terrainHeight === null || terrainHeight === undefined || !isFinite(terrainHeight)) {
                    return; // Skip this frame if terrain height is not available
                }
                
                // Always maintain a fixed height above terrain to prevent vibration
                const targetHeight = terrainHeight + this.heightOffset;
            
            // Check if the world's initial terrain has been created
            if (this.game.world.initialTerrainCreated) {
                // Use a very small smooth factor to prevent vibration
                const smoothFactor = 0.05; // Lower value = smoother transition
                this.position.y += (targetHeight - this.position.y) * smoothFactor;
            } else {
                // If initial terrain isn't created yet, just set the height directly
                this.position.y = targetHeight;
            }
            
                // Update model position - use the full position vector to ensure proper update
                if (this.modelGroup) {
                    this.modelGroup.position.set(this.position.x, this.position.y, this.position.z);
                }
            } catch (error) {
                console.debug(`Error updating terrain height for player: ${error.message}`);
            }
        }
    }
    
    updateCamera() {
        // Check if camera control is active - if so, don't update camera
        if (this.game && this.game.hudManager && this.game.hudManager.components.cameraControlUI &&
            this.game.hudManager.components.cameraControlUI.cameraUpdatePending) {
            // Skip camera update when camera control is active
            return;
        }
        
        // Position camera in a more top-down view with greater height and distance
        const cameraOffset = new THREE.Vector3(0, 15, 20);
        
        // Validate player position before using it
        if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
            console.warn("Invalid player position detected:", this.position);
            // Reset player position to a safe value
            this.position.set(0, 2, 0);
        }
        
        const cameraTarget = new THREE.Vector3(
            this.position.x,
            this.position.y, // Look directly at player's position for top-down view
            this.position.z
        );
        
        // Calculate camera position
        const cameraPosition = new THREE.Vector3(
            this.position.x + cameraOffset.x,
            this.position.y + cameraOffset.y,
            this.position.z + cameraOffset.z
        );
        
        // Validate camera position before applying
        if (!isNaN(cameraPosition.x) && !isNaN(cameraPosition.y) && !isNaN(cameraPosition.z)) {
            // Update camera position
            this.camera.position.copy(cameraPosition);
            
            // Validate camera target before looking at it
            if (!isNaN(cameraTarget.x) && !isNaN(cameraTarget.y) && !isNaN(cameraTarget.z)) {
                this.camera.lookAt(cameraTarget);
            }
        } else {
            console.warn("Invalid camera position calculated:", cameraPosition);
        }
    }
    
    moveTo(target) {
        // Set target position
        this.targetPosition.copy(target);
        
        // Start moving
        this.playerState.setMoving(true);
    }
    
    setPosition(x, y, z) {
        // Validate input coordinates
        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            console.debug("Attempted to set invalid player position:", x, y, z);
            // Use last valid position or default to origin
            return;
        }
        
        // Update position
        this.position.set(x, y, z);
        
        // Update model position (if it exists) - use the full position vector to ensure proper update
        if (this.modelGroup) {
            this.modelGroup.position.set(x, y, z);
        }
    }
    
    getPosition() {
        return this.position;
    }
    
    getRotation() {
        return this.rotation;
    }
    
    getCollisionRadius() {
        return this.collisionRadius;
    }
    
    getHeightOffset() {
        return this.heightOffset;
    }
}
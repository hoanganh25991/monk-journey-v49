/**
 * PlayerMovement.js
 * Handles player movement, position, and camera updates
 */

import * as THREE from '../../libs/three/three.module.js';
import { normalize2D, tempVec2, fastAtan2 } from 'utils/FastMath.js';

/** Max height above ground the player can reach (3 jumps). World units (terrain scale ~0–10, camera ~15–20). */
const MAX_JUMP_HEIGHT = 50;

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
        this.jumpForces = [30, 21, 15]; // 0.75 of previous - lower jump height
        this.gravity = 32; // Heavier gravity = faster fall back
        this.groundedTolerance = 0.2;
        this.isHoldingJump = false;
        // Hold jump at max: when used all 3 jumps and holding, cancel gravity to hover (no upward boost)
        this.holdJumpHover = true;
        
        // When false (e.g. freeze from frost_titan), position must not be changed by movement or moveTo
        this.canMove = true;
        
        // Game reference
        this.game = game;
    }
    
    /**
     * Whether the player is currently in the air (above ground).
     * @returns {boolean}
     */
    _isInAir() {
        if (!this.game?.world) return false;
        // Use getPlayerGroundHeight which includes structure tops
        const groundHeight = this.game.world.getPlayerGroundHeight 
            ? this.game.world.getPlayerGroundHeight(this.position.x, this.position.z)
            : this.game.world.getTerrainHeight(this.position.x, this.position.z);
        if (groundHeight == null || !isFinite(groundHeight)) return false;
        const groundY = groundHeight + this.heightOffset;
        return this.position.y > groundY + this.groundedTolerance;
    }

    /**
     * Trigger a jump. Up to 3 jumps with diminishing force.
     * When falling after using all 3 jumps, tapping jump again resets and grants 3 more jumps.
     */
    jump() {
        // Used all 3 jumps: allow another set of 3 only while in air (falling)
        if (this.jumpCount >= this.maxJumps) {
            if (this._isInAir()) {
                this.jumpCount = 0;
            } else {
                return;
            }
        }

        // Apply jump force with cap to prevent infinite stacking
        const jumpForce = this.jumpForces[this.jumpCount];
        if (this.jumpCount === 0) {
            // First jump: set velocity directly
            this.velocityY = jumpForce;
        } else {
            // Subsequent jumps: add but cap total velocity to prevent excessive stacking
            this.velocityY += jumpForce;
            // Cap velocity to prevent flying too high from rapid jumps
            const maxVelocity = this.jumpForces[0] * 1.5; // Max 1.5x first jump velocity
            this.velocityY = Math.min(this.velocityY, maxVelocity);
        }
        this.jumpCount++;
    }
    
    /**
     * Sets whether the player is holding the jump button
     * @param {boolean} holding - True if the jump button is being held
     */
    setHoldingJump(holding) {
        this.isHoldingJump = holding;
    }
    
    // setGame method removed - game is now passed in constructor
    
    updateMovement(delta) {
        // Do not apply any position change while frozen (e.g. frost_titan freeze)
        if (this.canMove === false) return;
        if (this.playerState.isMoving()) {
            // Calculate direction to target
            const dx = this.targetPosition.x - this.position.x;
            const dy = this.targetPosition.y - this.position.y;
            const dz = this.targetPosition.z - this.position.z;
            
            // Calculate squared distance for performance
            const distanceSq = dx * dx + dy * dy + dz * dz;
            
            // Move towards target (0.1 * 0.1 = 0.01)
            if (distanceSq > 0.01) {
                // Use FastMath for 2D normalization (movement is horizontal)
                normalize2D(tempVec2, dx, dz);
                const step = this.playerStats.getMovementSpeed() * delta;

                // Calculate new position (only update X and Z, let updateTerrainHeight handle Y)
                const newX = this.position.x + tempVec2.x * step;
                const newZ = this.position.z + tempVec2.z * step;

                // Update position (only X and Z)
                this.position.x = newX;
                this.position.z = newZ;

                // Keep model at origin (world rebasing moves the world, not the player)
                if (this.modelGroup) {
                    this.modelGroup.position.set(0, 0, 0);
                }

                // Update rotation to face movement direction
                this.rotation.y = fastAtan2(tempVec2.x, tempVec2.z);
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
            return;
        }
        const safeDelta = Math.min(Math.max(delta || 0.016, 0.001), 0.1);
        try {
            // Use getPlayerGroundHeight which includes structure tops
            const groundHeight = this.game.world.getPlayerGroundHeight 
                ? this.game.world.getPlayerGroundHeight(this.position.x, this.position.z)
                : this.game.world.getTerrainHeight(this.position.x, this.position.z);
            
            if (groundHeight === null || groundHeight === undefined || !isFinite(groundHeight)) {
                return;
            }
            
            const groundY = groundHeight + this.heightOffset;
            const maxY = groundY + MAX_JUMP_HEIGHT;

            // Check if player is in the air
            const isInAir = this.position.y > groundY + this.groundedTolerance || this.velocityY > 0;

            // Apply gravity and velocity when in air
            if (isInAir) {
                // Natural flying: holding Space provides upward lift that diminishes logarithmically with height
                if (this.holdJumpHover && this.isHoldingJump && this.jumpCount >= this.maxJumps) {
                    // Calculate how close we are to max height (0 = at ground, 1 = at max)
                    const heightAboveGround = this.position.y - groundY;
                    const heightRatio = Math.max(0, Math.min(1, heightAboveGround / MAX_JUMP_HEIGHT));
                    
                    // Logarithmic lift: diminishes exponentially as you approach max height
                    // At 0% height: full lift (1.3x gravity) - rises quickly
                    // At 50% height: ~12.5% lift - rises slowly
                    // At 90% height: ~0.1% lift - barely rises
                    // At 100% height: ~0% lift - can't go higher
                    const liftStrength = Math.pow(1 - heightRatio, 3);
                    const liftForce = this.gravity * 1.3 * liftStrength;
                    
                    // Apply lift and gravity: net force determines if rising or falling
                    const netForce = liftForce - this.gravity;
                    this.velocityY += netForce * safeDelta;
                    
                    // Immediate velocity damping when near/at max to prevent overshoot
                    if (heightRatio > 0.9) {
                        const dampingFactor = 0.95; // Reduce velocity by 5% per frame near max
                        this.velocityY *= dampingFactor;
                    }
                } else {
                    // Not holding Space or haven't used 3 jumps: gravity pulls down immediately
                    this.velocityY -= this.gravity * safeDelta;
                }

                // Update position
                this.position.y += this.velocityY * safeDelta;

                // Soft cap: if somehow above max, gently push back
                const heightAboveGround = this.position.y - groundY;
                if (heightAboveGround > MAX_JUMP_HEIGHT) {
                    const overshoot = heightAboveGround - MAX_JUMP_HEIGHT;
                    this.velocityY -= overshoot * 5 * safeDelta; // Gentle push back
                }
            }

            // Land when we hit or pass ground
            if (this.position.y <= groundY + this.groundedTolerance) {
                this.position.y = groundY;
                this.velocityY = 0;
                this.jumpCount = 0;
            }
            
            // Keep model at origin (world rebasing: ground moves to groundY - playerY, so player stays at 0,0,0)
            if (this.modelGroup) {
                this.modelGroup.position.set(0, 0, 0);
            }
        } catch (err) {
            console.error('❌ Jump physics error:', err);
        }
    }
    
    handleKeyboardMovement(delta) {
        if (this.canMove === false) return;
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
            
            // Keep model at origin (world rebasing moves the world, not the player)
            if (this.modelGroup) {
                this.modelGroup.position.set(0, 0, 0);
            }
            
            // Update rotation to face movement direction
            this.rotation.y = fastAtan2(direction.x, direction.z);
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
        // Skip terrain snap when jumping or in the air (velocityY and jump physics handle Y)
        if (this.velocityY !== 0 || this._isInAir()) {
            return;
        }
        
        // Ensure player is always at the correct terrain height when grounded
        if (this.game && this.game.world) {
            try {
                // Use getPlayerGroundHeight which includes structure tops
                const groundHeight = this.game.world.getPlayerGroundHeight 
                    ? this.game.world.getPlayerGroundHeight(this.position.x, this.position.z)
                    : this.game.world.getTerrainHeight(this.position.x, this.position.z);
                
                // Check if ground height is valid
                if (groundHeight === null || groundHeight === undefined || !isFinite(groundHeight)) {
                    return; // Skip this frame if ground height is not available
                }
                
                // Always maintain a fixed height above ground to prevent vibration
                const targetHeight = groundHeight + this.heightOffset;
            
            // Check if the world's initial terrain has been created
            if (this.game.world.initialTerrainCreated) {
                // Use a very small smooth factor to prevent vibration
                const smoothFactor = 0.05; // Lower value = smoother transition
                this.position.y += (targetHeight - this.position.y) * smoothFactor;
            } else {
                // If initial terrain isn't created yet, just set the height directly
                this.position.y = targetHeight;
            }
            
                // Keep model at origin (world rebasing)
                if (this.modelGroup) {
                    this.modelGroup.position.set(0, 0, 0);
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
        
        // Camera and player are at origin for rendering (world rebasing). Use fixed offset from (0,0,0) for clean precision on all devices.
        const cameraOffset = new THREE.Vector3(0, 15, 20);
        const cameraPosition = new THREE.Vector3(cameraOffset.x, cameraOffset.y, cameraOffset.z);
        const cameraTarget = new THREE.Vector3(0, 0, 0);
        
        if (!isNaN(cameraPosition.x) && !isNaN(cameraPosition.y) && !isNaN(cameraPosition.z)) {
            this.camera.position.copy(cameraPosition);
            this.camera.lookAt(cameraTarget);
        }
    }
    
    moveTo(target) {
        if (this.canMove === false) return;
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
        
        // Update position (logical world position for game logic)
        this.position.set(x, y, z);
        
        // Keep model at origin for rendering (world rebasing)
        if (this.modelGroup) {
            this.modelGroup.position.set(0, 0, 0);
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
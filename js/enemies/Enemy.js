import * as THREE from '../../libs/three/three.module.js';
import { EnemyModelFactory } from './models/EnemyModelFactory.js';
import { ENEMY_BEHAVIOR_SETTINGS, ENEMY_TYPE_BEHAVIOR } from '../config/enemy-behavior.js';
import { ENEMY_CONFIG } from '../config/game-balance.js';

export class Enemy {
    // Static counter for generating unique IDs
    static idCounter = 0;
    
    /**
     * @param {THREE.Scene} scene - Generation options
     * @param {import("../player/Player.js").Player} player - Item level (defaults to player level)
     * @param {Object} options.subType - Force a specific subType
     */
    constructor(scene, player, config) {
        this.scene = scene;
        this.player = player;
        
        // Assign a unique ID to each enemy
        this.id = Enemy.idCounter++;
        
        // Enemy configuration
        this.type = config.type || 'skeleton';
        this.name = config.name || 'Enemy';
        this.health = config.health || 50;
        this.maxHealth = config.health || 50;
        this.damage = config.damage || 10;
        this.speed = config.speed || 3;
        this.attackRange = config.attackRange || 1.5;
        this.attackSpeed = config.attackSpeed || 1.5;
        this.experienceValue = config.experienceValue || 20;
        this.color = config.color || 0xcccccc;
        this.scale = config.scale || 1;
        this.isBoss = config.isBoss || false;
        this.behavior = config.behavior || 'aggressive';
        // Ranged enemies can attack player in the air; melee cannot
        this.isRanged = (this.behavior === 'ranged' || this.attackRange > 4);
        // Thrown projectile appearance and trajectory (for ranged enemies)
        this.projectileType = config.projectileType ?? (this.isRanged ? 'arrow' : null);
        this.projectileFlightStyle = config.projectileFlightStyle ?? 'direct';
        this.isActive = true;
        /** @type {import("./EnemyProjectileManager.js").EnemyProjectileManager|null} */
        this.projectileManager = null;
        
        // Flag for minimap identification
        this.isEnemy = true;
        
        // For multiplayer targeting
        this.targetPlayer = player; // Default target is the local player
        
        // Enemy state
        this.state = {
            isMoving: false,
            isAttacking: false,
            isDead: false,
            attackCooldown: 0,
            isKnockedBack: false,
            knockbackEndTime: 0,
            isAggressive: false,
            aggressionEndTime: 0,
            isStunned: false,
            stunEndTime: 0
        };
        
        // Apply behavior settings from config
        this.applyBehaviorSettings();
        
        // Enemy position and orientation
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler(0, 0, 0);
        
        // Enemy collision
        this.collisionRadius = 0.5 * this.scale;
        // Height offset to position model on ground (legs are 0.6 tall, positioned at y=0, so bottom is at -0.3)
        this.heightOffset = 0.3 * this.scale;
        
        // Special height offset for necromancer_lord boss to prevent underground clipping
        if (this.type === 'necromancer_lord') {
            this.heightOffset += 0.5;
        }
        
        // Enemy model
        this.modelGroup = null;
        this.model = null;
        
        // Reference to game world for terrain height
        this.world = null;
        
        // Flag to control terrain height updates (useful for bosses with fixed positions)
        // Disable terrain height updates for bosses to prevent sinking
        this.allowTerrainHeightUpdates = !this.isBoss;
        
        // Flag to track if initial position has been set (for bosses)
        this.initialPositionSet = false;
        
        // Store the initial Y position for bosses to prevent sinking
        this.initialYPosition = null;
    }
    
    async init() {
        // Create enemy model (async - lazy-loads model module)
        await this.createModel();
    }
    
    applyBehaviorSettings() {
        // Get type-specific behavior settings or use default
        const typeBehavior = ENEMY_TYPE_BEHAVIOR[this.type] || ENEMY_TYPE_BEHAVIOR['default'];
        
        // Apply detection range
        this.detectionRange = typeBehavior.detectionRange || ENEMY_BEHAVIOR_SETTINGS.detectionRange;
        
        // Apply attack range multiplier
        this.attackRange *= (typeBehavior.attackRangeMultiplier || ENEMY_BEHAVIOR_SETTINGS.attackRangeMultiplier);
        
        // Apply aggression settings
        this.persistentAggression = typeBehavior.persistentAggression || 
                                   ENEMY_BEHAVIOR_SETTINGS.aggressionSettings.persistentAggression;
        this.aggressionTimeout = typeBehavior.aggressionTimeout || 
                                ENEMY_BEHAVIOR_SETTINGS.aggressionSettings.aggressionTimeout;
    }

    async createModel() {
        // Create a group for the enemy
        this.modelGroup = new THREE.Group();
        
        // Create the appropriate model using the factory (async - lazy-loads model module)
        this.model = await EnemyModelFactory.createModelAsync(this, this.modelGroup);
        
        // Create the actual 3D model
        this.model.createModel();
        
        // Scale model if needed
        if (this.scale !== 1) {
            this.modelGroup.scale.set(this.scale, this.scale, this.scale);
        }
        
        // Apply LOD when enabled (reduces geometry for distant enemies)
        const profile = this.game?.world?.performanceProfile;
        if (profile?.lodEnabled && profile?.enemyLod) {
            this._setupLOD(profile.enemyLod);
        }
        
        // Add model to scene
        this.scene.add(this.modelGroup);
    }

    /**
     * Setup LOD (Level of Detail) - shows low-poly proxy when far from camera
     * @param {Object} lodConfig - { highDetail, hide } distances in meters
     */
    _setupLOD(lodConfig) {
        const highDetailDist = lodConfig.highDetail ?? 50;
        const hideDist = lodConfig.hide ?? 200;
        if (this.modelGroup.children.length === 0) return;

        const fullDetailGroup = new THREE.Group();
        while (this.modelGroup.children.length > 0) {
            fullDetailGroup.add(this.modelGroup.children[0]);
        }

        const lowPolyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.6);
        const lowPolyMat = new THREE.MeshBasicMaterial({
            color: this.color || 0xcccccc,
            transparent: true,
            opacity: 0.9
        });
        const lowPolyMesh = new THREE.Mesh(lowPolyGeo, lowPolyMat);
        lowPolyMesh.position.y = 0.6;
        lowPolyMesh.castShadow = false;
        lowPolyMesh.receiveShadow = false;

        this.lodObject = new THREE.LOD();
        this.lodObject.addLevel(fullDetailGroup, 0);
        this.lodObject.addLevel(lowPolyMesh, highDetailDist);
        this.modelGroup.add(this.lodObject);
    }

    /**
     * Update LOD based on camera distance (call each frame when LOD is enabled)
     * @param {THREE.Camera} camera
     */
    updateLOD(camera) {
        if (!this.lodObject || !this.modelGroup) return;
        this.lodObject.update(camera);
    }
    
    /**
     * Calculate rotation to face a target position
     * @param {THREE.Vector3} targetPosition - The position to face
     */
    faceTarget(targetPosition) {
        const directionX = targetPosition.x - this.position.x;
        const directionZ = targetPosition.z - this.position.z;
        const length = Math.sqrt(directionX * directionX + directionZ * directionZ);
        
        if (length > 0) {
            const normalizedDirectionX = directionX / length;
            const normalizedDirectionZ = directionZ / length;
            const newRotation = Math.atan2(normalizedDirectionX, normalizedDirectionZ);
            
            // Debug log rotation changes (only log occasionally to avoid spam)
            if (Math.random() < 0.01) { // ~1% chance each frame
                const rotationDegrees = (newRotation * 180 / Math.PI).toFixed(1);
                console.debug(`Enemy ${this.id} facing target at ${rotationDegrees}°`);
            }
            
            this.rotation.y = newRotation;
        }
    }

    updateAnimations(delta) {
        // Use the model's updateAnimations method
        if (this.model && typeof this.model.updateAnimations === 'function') {
            this.model.updateAnimations(delta);
        }
    }
    
    /**
     * Play idle animation
     */
    playIdleAnimation() {
        // Set state to idle
        if (this.state) {
            this.state.isMoving = false;
            this.state.isAttacking = false;
        }
        
        // Update animations will handle the actual animation
        // based on the state we just set
    }
    
    /**
     * Play walk animation
     */
    playWalkAnimation() {
        // Set state to moving
        if (this.state) {
            this.state.isMoving = true;
            this.state.isAttacking = false;
        }
    }
    
    /**
     * Play attack animation
     */
    playAttackAnimation() {
        // Set state to attacking
        if (this.state) {
            this.state.isAttacking = true;
        }
    }

    update(delta) {
        // Handle death animation if in progress
        if (this.deathAnimationInProgress && this.deathAnimationData) {
            const data = this.deathAnimationData;
            const elapsed = Date.now() - data.startTime;
            const progress = Math.min(elapsed / data.duration, 1);
            
            // Ease out function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            // Update position and rotation
            this.position.x = data.startPosition.x + (data.targetPosition.x - data.startPosition.x) * easeOut;
            this.position.y = data.startPosition.y + (data.targetPosition.y - data.startPosition.y) * easeOut;
            this.position.z = data.startPosition.z + (data.targetPosition.z - data.startPosition.z) * easeOut;
            
            // Update model group position to match
            if (data.modelGroup) {
                data.modelGroup.position.copy(this.position);
                
                // Safely update rotation
                if (data.modelGroup.rotation) {
                    data.modelGroup.rotation.x = data.startRotation.x + (data.targetRotation.x - data.startRotation.x) * easeOut;
                }
            }
            
            // Check if animation is complete
            if (progress >= 1) {
                // Final position and rotation
                this.position.copy(data.targetPosition);
                if (data.modelGroup && data.modelGroup.rotation) {
                    data.modelGroup.rotation.x = data.targetRotation.x;
                }
                
                // Mark animation as complete
                this.deathAnimationInProgress = false;
                this.deathAnimationData = null;
            }
            
            return;
        }
        
        // Skip update if not active (pooled) or dead
        if (!this.isActive || this.state.isDead) {
            return;
        }
        
        // For bosses, ensure Y position is maintained at all times
        if (this.isBoss && this.initialPositionSet && this.initialYPosition !== null) {
            // Force Y position to always be the initial value
            if (this.position.y !== this.initialYPosition) {
                this.position.y = this.initialYPosition;
                
                // Also force the model's Y position
                if (this.modelGroup) {
                    this.modelGroup.position.y = this.initialYPosition;
                }
            }
        }
        
        // Handle knockback
        if (this.state.isKnockedBack) {
            if (Date.now() < this.state.knockbackEndTime) {
                // Continue knockback
                this.updateTerrainHeight();
                this.updateAnimations(delta);
                return;
            } else {
                // End knockback
                this.state.isKnockedBack = false;
            }
        }
        
        // Handle stun state
        if (this.state.isStunned) {
            if (Date.now() < this.state.stunEndTime) {
                // Enemy is stunned, only update terrain height and animations
                this.updateTerrainHeight();
                this.updateAnimations(delta);
                return;
            } else {
                // Stun has ended
                this.state.isStunned = false;
                console.debug(`${this.name} is no longer stunned`);
            }
        }
        
        // Update terrain height
        this.updateTerrainHeight();
        
        // Periodically validate position (every ~2 seconds to avoid performance impact)
        if (Math.random() < 0.01) { // ~1% chance per frame
            this.validatePosition();
        }
        
        // Regenerate health based on enemy type
        this.regenerateHealth(delta);
        
        // Update attack cooldown
        if (this.state.attackCooldown > 0) {
            this.state.attackCooldown -= delta;
        }
        
        // Reset movement state
        this.state.isMoving = false;
        
        // Find the closest player (local or remote)
        this.findClosestPlayer();
        
        // Get distance to target player
        const playerPosition = this.targetPlayer.getPosition();
        const dx = playerPosition.x - this.position.x;
        const dz = playerPosition.z - this.position.z;
        const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);
        
        // Debug log for targeting - log every 2 seconds to avoid spam
        if (Math.random() < 0.01) { // ~1% chance each frame to log
            const targetType = this.targetPlayer === this.player ? "player" : "remote player";
            console.debug(`Enemy ${this.id} targeting ${targetType}, distance: ${distanceToPlayer.toFixed(2)}, attack range: ${this.attackRange.toFixed(2)}`);
        }
        
        // Special abilities for certain enemy types
        if (this.type === 'frost_titan') {
            // Initialize special ability cooldowns if not already
            if (!this.specialAbilityCooldowns) {
                this.specialAbilityCooldowns = {
                    iceStorm: 0,
                    frostNova: 0
                };
            }
            
            // Reduce cooldowns
            if (this.specialAbilityCooldowns.iceStorm > 0) {
                this.specialAbilityCooldowns.iceStorm -= delta;
            }
            
            if (this.specialAbilityCooldowns.frostNova > 0) {
                this.specialAbilityCooldowns.frostNova -= delta;
            }
            
            // Ice Storm ability (ranged)
            if (distanceToPlayer <= 10 && distanceToPlayer > this.attackRange && this.specialAbilityCooldowns.iceStorm <= 0) {
                this.castIceStorm(playerPosition);
                this.specialAbilityCooldowns.iceStorm = 8; // 8 second cooldown
                return;
            }
            
            // Frost Nova ability (close range)
            if (distanceToPlayer <= this.attackRange * 1.5 && this.specialAbilityCooldowns.frostNova <= 0) {
                this.castFrostNova();
                this.specialAbilityCooldowns.frostNova = 5; // 5 second cooldown
                return;
            }
        }
        
        // Melee enemies cannot attack when player is in the air; only ranged can
        let playerInAir = false;
        if (this.world && this.targetPlayer.getPosition) {
            const pp = this.targetPlayer.getPosition();
            try {
                const terrainY = this.world.getTerrainHeight(pp.x, pp.z);
                if (terrainY != null && isFinite(terrainY)) {
                    const groundY = terrainY + 1.0; // player heightOffset
                    playerInAir = pp.y > groundY + 0.35;
                }
            } catch (_) { /* ignore */ }
        }
        const canAttackTarget = distanceToPlayer <= this.attackRange && (!playerInAir || this.isRanged);

        // Check if target (player or remote player) is in attack range
        if (canAttackTarget) {
            console.debug(`Enemy ${this.id} in attack range of target, distance: ${distanceToPlayer.toFixed(2)}, attack range: ${this.attackRange.toFixed(2)}, cooldown: ${this.state.attackCooldown.toFixed(2)}`);
            
            // Stop moving when in attack range
            this.state.isMoving = false;
            
            // Still face the target even when not moving
            this.faceTarget(playerPosition);
            
            // Attack target if cooldown is ready
            if (this.state.attackCooldown <= 0) {
                console.debug(`Enemy ${this.id} attacking target, cooldown ready`);
                this.attackPlayer(); // This will attack whatever is set as targetPlayer
                this.state.attackCooldown = 1 / this.attackSpeed;
            } else {
                console.debug(`Enemy ${this.id} waiting for attack cooldown: ${this.state.attackCooldown.toFixed(2)}`);
            }
            
            // Set aggressive state when target is in attack range
            this.state.isAggressive = true;
            this.state.aggressionEndTime = Date.now() + (this.aggressionTimeout * 1000);
        } else if (distanceToPlayer <= this.attackRange && playerInAir && !this.isRanged) {
            // In range but player in air and we're melee: just face target, don't attack
            this.state.isMoving = false;
            this.faceTarget(playerPosition);
        } else if (distanceToPlayer <= this.detectionRange || this.state.isAggressive) {
            // Move towards target if within detection range or if enemy is in aggressive state
            
            // Check if aggression should end
            if (this.state.isAggressive && Date.now() > this.state.aggressionEndTime && !this.persistentAggression) {
                this.state.isAggressive = false;
            }
            
            // Only chase if within detection range or still aggressive
            if (distanceToPlayer <= this.detectionRange || this.state.isAggressive) {
                this.state.isMoving = true;
                
                // Calculate direction to target
                const directionX = playerPosition.x - this.position.x;
                const directionZ = playerPosition.z - this.position.z;
                
                // Normalize direction
                const length = Math.sqrt(directionX * directionX + directionZ * directionZ);
                const normalizedDirectionX = directionX / length;
                const normalizedDirectionZ = directionZ / length;
                
                // Update rotation to face target
                this.faceTarget(playerPosition);
                
                // Calculate new position
                // Apply 1.5x speed multiplier for faster movement
                const speedMultiplier = 1.5;
                const moveSpeed = this.speed * delta * speedMultiplier;
                const newX = this.position.x + normalizedDirectionX * moveSpeed;
                const newZ = this.position.z + normalizedDirectionZ * moveSpeed;
                
                // Calculate proper Y position based on terrain height
                let newY = this.position.y;
                if (this.world && this.allowTerrainHeightUpdates) {
                    const terrainHeight = this.world.getTerrainHeight(newX, newZ);
                    if (terrainHeight !== null) {
                        newY = terrainHeight + this.heightOffset;
                    }
                }
                
                // Update position
                this.setPosition(newX, newY, newZ);
                console.debug(`Enemy ${this.id} moving toward player, distance: ${distanceToPlayer.toFixed(2)}`);
                
                // If target is within detection range, refresh aggression timer
                if (distanceToPlayer <= this.detectionRange) {
                    this.state.isAggressive = true;
                    this.state.aggressionEndTime = Date.now() + (this.aggressionTimeout * 1000);
                }
            }
        }
        
        // Update model rotation to match enemy rotation
        if (this.modelGroup) {
            this.modelGroup.rotation.copy(this.rotation);
        }
        
        // Update animations
        this.updateAnimations(delta);
    }

    /**
     * Find the closest player (local or remote) to target
     */
    findClosestPlayer() {
        // Start with the local player as the default target
        this.targetPlayer = this.player;
        let closestDistance = Number.MAX_VALUE;
        
        // Get local player position
        const localPlayerPos = this.player.getPosition();
        let dx = localPlayerPos.x - this.position.x;
        let dz = localPlayerPos.z - this.position.z;
        closestDistance = Math.sqrt(dx * dx + dz * dz);
        
        // Check if we have access to the game and multiplayer manager
        if (this.player.game && 
            this.player.game.multiplayerManager && 
            this.player.game.multiplayerManager.remotePlayerManager) {
            
            // Get all remote players
            const remotePlayers = this.player.game.multiplayerManager.remotePlayerManager.getPlayers();
            
            // Check each remote player
            remotePlayers.forEach((remotePlayer, peerId) => {
                if (remotePlayer && remotePlayer.group) {
                    const remotePos = remotePlayer.group.position;
                    dx = remotePos.x - this.position.x;
                    dz = remotePos.z - this.position.z;
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    
                    // If this remote player is closer, target them instead
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        // Create a wrapper object that mimics the player interface
                        this.targetPlayer = {
                            getPosition: () => remotePos,
                            takeDamage: (amount) => {
                                // For remote players, we'll notify the host about the damage
                                // The actual damage will be applied by the host
                                if (this.player.game.multiplayerManager.isHost) {
                                    // If we're the host, broadcast damage to the specific player
                                    // Use the connection manager's sendToPeer method to ensure proper serialization
                                    this.player.game.multiplayerManager.connection.sendToPeer(peerId, {
                                        type: 'playerDamage',
                                        amount: amount,
                                        enemyId: this.id
                                    });
                                }
                            }
                        };
                    }
                }
            });
        }
    }
    
    attackPlayer() {
        // Set attack state
        this.state.isAttacking = true;
        console.debug(`ENEMY ATTACK: Enemy ${this.id} executing attack`);
        
        // Play attack animation
        this.playAttackAnimation();
        
        // Ranged enemies fire a visible projectile; damage is applied when it hits
        if (this.isRanged && this.projectileManager && this.projectileType && this.targetPlayer) {
            this.projectileManager.spawn(this);
            setTimeout(() => {
                this.state.isAttacking = false;
            }, 500);
            return;
        }
        
        // Melee (or fallback): deal damage immediately
        if (this.targetPlayer) {
            const isRemotePlayer = this.targetPlayer !== this.player;
            console.debug(`ENEMY TARGET: Enemy ${this.id} has target: ${isRemotePlayer ? 'REMOTE PLAYER' : 'PLAYER'}`);
            
            if (typeof this.targetPlayer.takeDamage === 'function') {
                try {
                    console.debug(`ENEMY DAMAGE: Enemy ${this.id} dealing ${this.damage} damage to player`);
                    
                    // Apply damage to the target
                    this.targetPlayer.takeDamage(this.damage);
                } catch (error) {
                    console.error(`Error in enemy attack: ${error.message}`);
                }
            } else {
                console.error(`Enemy ${this.id} target doesn't have takeDamage function`);
            }
        } else {
            console.error(`Enemy ${this.id} has no target to attack`);
        }
        
        // Reset attack state after a short delay
        setTimeout(() => {
            this.state.isAttacking = false;
        }, 500);
    }
    
    castIceStorm(targetPosition) {
        // Set attack state
        this.state.isAttacking = true;
        
        // Create ice storm effect
        // (This would be implemented with particle effects and area damage)
        console.debug(`${this.name} casts Ice Storm at position ${targetPosition.x}, ${targetPosition.z}`);
        
        // Deal damage to player if in area
        const playerPos = this.player.getPosition();
        const dx = targetPosition.x - playerPos.x;
        const dz = targetPosition.z - playerPos.z;
        const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);
        
        if (distanceToPlayer < 5) {
            this.player.takeDamage(this.damage * 1.5);
            // Apply slow effect to player
            this.player.applyEffect('slow', 3);
        }
        
        // Reset attack state after a delay
        setTimeout(() => {
            this.state.isAttacking = false;
        }, 1000);
    }
    
    castFrostNova() {
        // Set attack state
        this.state.isAttacking = true;
        
        // Create frost nova effect
        // (This would be implemented with particle effects and area damage)
        console.debug(`${this.name} casts Frost Nova`);
        
        // Deal damage to player if in area
        const playerPos = this.player.getPosition();
        const dx = this.position.x - playerPos.x;
        const dz = this.position.z - playerPos.z;
        const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);
        
        if (distanceToPlayer < this.attackRange * 1.5) {
            this.player.takeDamage(this.damage);
            // Apply freeze effect to player
            this.player.applyEffect('freeze', 2);
        }
        
        // Reset attack state after a delay
        setTimeout(() => {
            this.state.isAttacking = false;
        }, 800);
    }
    
    /**
     * Handle enemy taking damage with defense calculations
     * @param {number} amount - The raw damage amount
     * @param {boolean} knockback - Whether to apply knockback
     * @param {THREE.Vector3} knockbackDirection - Direction of knockback
     * @param {boolean} ignoreDefense - Whether to ignore defense (for true damage)
     * @returns {number} - The actual damage taken after reductions
     */
    takeDamage(amount, knockback = false, knockbackDirection = null, ignoreDefense = false) {
        // Prevent damage if already dead
        if (this.state.isDead) {
            return 0;
        }
        
        // Calculate actual damage after defense
        let actualDamage = amount;
        
        // Apply defense reduction if not ignoring defense
        if (!ignoreDefense) {
            // Base defense value - can be customized per enemy type
            let defenseValue = 0;
            
            // Get defense based on enemy type
            if (this.type === 'skeleton_king' || this.type === 'necromancer_lord' || 
                this.type === 'demon_lord' || this.type === 'frost_titan') {
                // Boss enemies have higher defense
                defenseValue = 25;
            } else if (this.type.includes('golem') || this.type === 'mountain_troll' || 
                       this.type === 'corrupted_treant' || this.type === 'ancient_guardian') {
                // Tank enemies have medium-high defense
                defenseValue = 15;
            } else if (this.type.includes('skeleton') || this.type.includes('zombie')) {
                // Undead enemies have low defense
                defenseValue = 5;
            } else {
                // Default defense for other enemies
                defenseValue = 10;
            }
            
            // Apply defense formula: damage reduction percentage based on defense
            // Formula: reduction = defense / (defense + 100)
            // This gives diminishing returns for high defense values
            const reductionPercent = defenseValue / (defenseValue + 100);
            actualDamage = amount * (1 - reductionPercent);
            
            console.debug(`Enemy ${this.name} defense: ${defenseValue}, damage reduction: ${(reductionPercent * 100).toFixed(1)}%, raw damage: ${amount}, actual damage: ${actualDamage.toFixed(1)}`);
        }
        
        // Round the damage to avoid floating point issues
        actualDamage = Math.round(actualDamage);
        
        // Ensure minimum damage of 1
        actualDamage = Math.max(1, actualDamage);
        
        // Reduce health by the actual damage
        this.health -= actualDamage;
        
        // Check if dead
        if (this.health <= 0) {
            this.die();
            return actualDamage;
        }
        
        // Apply knockback if specified
        if (knockback) {
            this.applyKnockback(knockbackDirection);
        }
        
        // Update health bar
        this.updateHealthBar();
        
        return actualDamage;
    }
    
    /**
     * Updates the enemy's health bar (if any)
     * This method is called when health changes
     */
    updateHealthBar() {
        // Implementation for health bar update
        // This can be empty for now as it's just to prevent the error
        // In a future update, this could be implemented to show visual health bars
    }
    
    /**
     * Regenerates health based on enemy type
     * Different enemy types have different regeneration rates
     * @param {number} delta - Time since last update in seconds
     */
    regenerateHealth(delta) {
        // Skip regeneration if dead
        if (this.state.isDead) {
            return;
        }
        
        // Get regeneration rate for this enemy type
        const regenerationRate = ENEMY_CONFIG.HEALTH_REGENERATION_RATES[this.type] || 
                                ENEMY_CONFIG.HEALTH_REGENERATION_RATES['default'] || 0;
        
        // Skip if no regeneration
        if (regenerationRate <= 0) {
            return;
        }
        
        // Calculate health to regenerate
        const healthToRegenerate = regenerationRate * delta;
        
        // Apply regeneration (don't exceed max health)
        if (this.health < this.maxHealth) {
            this.health = Math.min(this.health + healthToRegenerate, this.maxHealth);
            
            // Update health bar
            this.updateHealthBar();
            
            // Visual feedback for significant regeneration (optional)
            if (healthToRegenerate > 1) {
                this.showRegenerationEffect();
            }
        }
    }
    
    /**
     * Shows a visual effect when the enemy regenerates a significant amount of health
     * This is a placeholder that could be implemented with particle effects
     */
    showRegenerationEffect() {
        // This is a placeholder for visual feedback
        // In a future update, this could show particles or other visual effects
        
        // For now, just log to console in debug mode
        if (this.health > this.maxHealth * 0.9) {
            console.debug(`${this.name} regenerated to near full health`);
        }
    }
    
    applyKnockback(direction) {
        // Set knockback state
        this.state.isKnockedBack = true;
        this.state.knockbackEndTime = Date.now() + 300; // 300ms knockback duration
        
        // Apply knockback movement only for non-boss enemies
        if (direction && !this.isBoss) {
            const knockbackDistance = 1.0; // Knockback distance in units
            const newX = this.position.x + direction.x * knockbackDistance;
            const newZ = this.position.z + direction.z * knockbackDistance;
            
            // Calculate proper Y position based on terrain height
            let newY = this.position.y;
            if (this.world && this.allowTerrainHeightUpdates) {
                const terrainHeight = this.world.getTerrainHeight(newX, newZ);
                if (terrainHeight !== null) {
                    newY = terrainHeight + this.heightOffset;
                }
            }
            
            this.setPosition(newX, newY, newZ);
        }
    }
    
    die() {
        // Prevent multiple death animations - only check if animation is in progress
        if (this.deathAnimationInProgress) {
            return;
        }
        
        // Set dead state
        this.state.isDead = true;
        
        // Clean up any status effects this enemy applied to the player
        // This is especially important for Frost Titan's freeze effect
        if (this.player && this.player.statusEffects) {
            // Remove freeze effect when Frost Titan dies
            if (this.type === 'frost_titan' && this.player.hasEffect('freeze')) {
                this.player.removeEffect('freeze');
                console.debug(`Removed freeze effect from player when ${this.name} died`);
            }
            
            // Also remove slow effect if this enemy applied it (Ice Storm)
            if (this.type === 'frost_titan' && this.player.hasEffect('slow')) {
                this.player.removeEffect('slow');
                console.debug(`Removed slow effect from player when ${this.name} died`);
            }
        }
        
        // Track when the enemy died (used for timeout cleanup)
        this.deathStartTime = Date.now();
        
        // Check if we're in multiplayer mode
        if (this.player.game && 
            this.player.game.multiplayerManager && 
            this.player.game.multiplayerManager.isActive()) {
            
            // Get the number of players (local + remote)
            const remotePlayerCount = this.player.game.multiplayerManager.remotePlayerManager ? 
                this.player.game.multiplayerManager.remotePlayerManager.getPlayers().size : 0;
            const totalPlayerCount = remotePlayerCount + 1; // +1 for local player
            
            // Calculate experience per player (divide equally)
            const expPerPlayer = Math.floor(this.experienceValue / totalPlayerCount);
            
            // Award experience to local player
            this.player.addExperience(expPerPlayer);
            
            // If we're the host, broadcast experience to all remote players
            if (this.player.game.multiplayerManager.isHost) {
                this.player.game.multiplayerManager.connection.broadcast({
                    type: 'shareExperience',
                    amount: expPerPlayer,
                    enemyId: this.id,
                    playerCount: totalPlayerCount
                });
                
                console.debug(`[Multiplayer] Shared ${expPerPlayer} experience with ${totalPlayerCount} players from enemy ${this.id}`);
            }
        } else {
            // Single player mode - award all experience to the player
            this.player.addExperience(this.experienceValue);
        }
        
        // Set a flag to track animation completion
        this.deathAnimationInProgress = true;
        
        // For bosses, use a simplified death animation to prevent lag
        if (this.isBoss) {
            this.playSimplifiedDeathAnimation();
        } else {
            // Regular enemies use the normal death animation
            this.playDeathAnimation();
        }
        
        // We no longer need to remove the enemy here
        // The EnemyManager will handle removal after the animation completes
        // This prevents the modelGroup from being null during the animation
    }
    
    /**
     * Simplified death animation for bosses to prevent lag
     */
    playSimplifiedDeathAnimation() {
        // Prevent animation if already has animation data (already started)
        if (this.deathAnimationData) {
            return;
        }
        
        if (this.modelGroup) {
            // For bosses, use a simpler animation with no requestAnimationFrame
            // This prevents potential lag from complex animations
            
            // Apply a simple fade out effect
            if (this.modelGroup.traverse) {
                this.modelGroup.traverse((object) => {
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => {
                                if (material.opacity !== undefined) {
                                    material.transparent = true;
                                    material.opacity = 0.5; // Semi-transparent
                                }
                            });
                        } else if (object.material.opacity !== undefined) {
                            object.material.transparent = true;
                            object.material.opacity = 0.5; // Semi-transparent
                        }
                    }
                });
            }
            
            // Use a simple timeout instead of animation frames
            setTimeout(() => {
                // Mark animation as complete after a short delay
                this.deathAnimationInProgress = false;
                
                // Make sure we clean up any animation frame if it was somehow set
                if (this.deathAnimationFrameId) {
                    cancelAnimationFrame(this.deathAnimationFrameId);
                    this.deathAnimationFrameId = null;
                }
            }, 500); // 500ms delay - much shorter than regular animation
        } else {
            // No model to animate, mark as complete immediately
            this.deathAnimationInProgress = false;
        }
    }
    
    playDeathAnimation() {
        // Prevent animation if already has animation data (already started)
        if (this.deathAnimationData) {
            return;
        }
        
        // Implement death animation
        // This could be different based on enemy type
        if (this.modelGroup) {
            // Simple death animation - fall over
            const targetPosition = new THREE.Vector3(
                this.position.x,
                this.position.y - 0.5,
                this.position.z
            );
            
            const targetRotation = new THREE.Euler(
                Math.PI / 2,
                this.rotation.y,
                this.rotation.z
            );
            
            // Animate falling over
            const startPosition = this.position.clone();
            const startRotation = this.rotation.clone();
            const startTime = Date.now();
            const duration = 1000; // 1 second animation
            
            // Store animation frame ID so we can cancel it if needed
            this.deathAnimationFrameId = null;
            
            // Store a reference to the model group that we'll use throughout the animation
            // This prevents issues if the main modelGroup reference is set to null
            const animationModelGroup = this.modelGroup;
            
            // Store animation data for game loop update instead of requestAnimationFrame
            this.deathAnimationData = {
                startPosition: startPosition,
                startRotation: startRotation,
                targetPosition: targetPosition,
                targetRotation: targetRotation,
                startTime: startTime,
                duration: duration,
                modelGroup: animationModelGroup
            };
            
            // Animation will be updated in the update() method via game loop
        } else {
            // No model to animate, mark as complete immediately
            this.deathAnimationInProgress = false;
        }
    }

    removeFromScene() {
        // Clear any ongoing death animation data
        if (this.deathAnimationInProgress) {
            this.deathAnimationInProgress = false;
            this.deathAnimationData = null;
        }
        
        // Remove model from scene
        if (this.modelGroup) {
            // For bosses, do a more thorough cleanup to prevent memory leaks
            if (this.isBoss) {
                console.debug(`Performing thorough cleanup for boss ${this.id}`);
                
                // Ensure all animations are stopped
                if (this.model && this.model.mixer) {
                    this.model.mixer.stopAllAction();
                    this.model.mixer.uncacheRoot(this.modelGroup);
                }
                
                // Dispose of any textures
                this.modelGroup.traverse((object) => {
                    if (object.material) {
                        const materials = Array.isArray(object.material) ? object.material : [object.material];
                        
                        materials.forEach(material => {
                            // Dispose textures
                            for (const prop in material) {
                                if (material[prop] && material[prop].isTexture) {
                                    material[prop].dispose();
                                }
                            }
                            
                            // Dispose material
                            material.dispose();
                        });
                    }
                    
                    // Dispose geometry
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                });
            } else {
                // Regular enemy cleanup
                this.modelGroup.traverse((object) => {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }
            
            // Remove from scene
            this.scene.remove(this.modelGroup);
            this.modelGroup = null;
            
            // Force a garbage collection hint (not guaranteed to run)
            if (this.isBoss && window.gc) {
                try {
                    window.gc();
                } catch (e) {
                    // Ignore if gc is not available
                }
            }
        }
        
        // Clear any special ability cooldowns for boss enemies
        if (this.isBoss && this.specialAbilityCooldowns) {
            this.specialAbilityCooldowns = null;
        }
    }

    updateTerrainHeight() {
        // Ensure we have world reference - try to get it from game if not available
        if (!this.world && this.player && this.player.game && this.player.game.world) {
            this.world = this.player.game.world;
            console.debug(`Enemy ${this.id} acquired world reference from game`);
        }
        
        // For bosses, we NEVER update Y position after initial setup
        if (this.isBoss) {
            if (this.modelGroup) {
                // For bosses, only update rotation
                this.modelGroup.rotation.y = this.rotation.y;
                
                // Set initial Y position only once
                if (!this.initialPositionSet && this.world) {
                    try {
                        const terrainHeight = this.world.getTerrainHeight(this.position.x, this.position.z);
                        if (terrainHeight !== null && terrainHeight !== undefined && isFinite(terrainHeight)) {
                        // Store the initial Y position for bosses
                        this.initialYPosition = terrainHeight + this.heightOffset;
                        this.position.y = this.initialYPosition;
                        
                        // Update model position and rotation
                        this.modelGroup.position.copy(this.position);
                        this.modelGroup.rotation.copy(this.rotation);
                        
                            // Mark as initialized
                            this.initialPositionSet = true;
                            console.debug(`Boss ${this.name} initial Y position set to ${this.initialYPosition}`);
                        }
                    } catch (error) {
                        console.debug(`Error getting terrain height for boss initialization: ${error.message}`);
                    }
                } else if (this.initialPositionSet && this.initialYPosition !== null) {
                    // Always restore the Y position to the initial value for bosses
                    // This ensures they never sink regardless of what other code might do
                    this.position.y = this.initialYPosition;
                    
                    // Force the model's Y position to match
                    this.modelGroup.position.copy(this.position);
                    this.modelGroup.rotation.copy(this.rotation);
                }
            }
            return;
        }
        
        // For non-boss enemies, update position based on terrain height if world is available and terrain updates are allowed
        if (this.world && this.allowTerrainHeightUpdates) {
            // Throttle terrain height calls for performance - only update if position changed significantly
            if (!this.lastTerrainCheckPosition || 
                Math.abs(this.position.x - this.lastTerrainCheckPosition.x) > 0.5 ||
                Math.abs(this.position.z - this.lastTerrainCheckPosition.z) > 0.5) {
                
                try {
                    const terrainHeight = this.world.getTerrainHeight(this.position.x, this.position.z);
                    if (terrainHeight !== null && terrainHeight !== undefined && isFinite(terrainHeight)) {
                        this.position.y = terrainHeight + this.heightOffset;
                    }
                } catch (error) {
                    console.debug(`Error getting terrain height for enemy movement: ${error.message}`);
                }
                
                // Cache the position where we last checked terrain height
                if (!this.lastTerrainCheckPosition) {
                    this.lastTerrainCheckPosition = new THREE.Vector3();
                }
                this.lastTerrainCheckPosition.set(this.position.x, this.position.y, this.position.z);
            }
            
            // Always update model position and rotation
            if (this.modelGroup) {
                this.modelGroup.position.copy(this.position);
                this.modelGroup.rotation.copy(this.rotation);
            }
        } else if (this.modelGroup) {
            // If no world or terrain updates disabled, just update model position and rotation
            this.modelGroup.position.copy(this.position);
            this.modelGroup.rotation.copy(this.rotation);
        }
    }

    setPosition(x, y, z) {
        // Special handling for bosses
        if (this.isBoss) {
            if (this.initialPositionSet && this.initialYPosition !== null) {
                // For bosses with established position, only update X and Z
                this.position.x = x;
                this.position.z = z;
                
                // ALWAYS use the stored initial Y position to prevent sinking
                this.position.y = this.initialYPosition;
                
                // Update model position, ensuring Y is correct
                if (this.modelGroup) {
                    this.modelGroup.position.x = this.position.x;
                    this.modelGroup.position.z = this.position.z;
                    this.modelGroup.position.y = this.initialYPosition;
                }
                
                // Debug log to track boss position
                if (Math.random() < 0.01) { // Log occasionally to avoid spam
                    console.debug(`Boss ${this.name} position maintained at Y=${this.initialYPosition}`);
                }
                return;
            } else if (!this.initialPositionSet) {
                // For initial boss positioning, we'll set all coordinates
                // but we'll also store the Y position for future reference
                this.position.set(x, y, z);
                
                // If we have a world reference, get the terrain height
                if (this.world) {
                    const terrainHeight = this.world.getTerrainHeight(x, z);
                    if (terrainHeight !== null) {
                        // Use terrain height + offset for Y position
                        this.initialYPosition = terrainHeight + this.heightOffset;
                        this.position.y = this.initialYPosition;
                    } else {
                        // If terrain height is not available, use provided Y
                        this.initialYPosition = y;
                    }
                } else {
                    // No world reference, use provided Y
                    this.initialYPosition = y;
                }
                
                // Update model position and rotation
                if (this.modelGroup) {
                    this.modelGroup.position.copy(this.position);
                    this.modelGroup.rotation.copy(this.rotation);
                }
                
                // Mark as initialized
                this.initialPositionSet = true;
                console.debug(`Boss ${this.name} initial position set at Y=${this.initialYPosition}`);
                return;
            }
        }
        
        // For non-boss enemies, update all coordinates normally
        this.position.set(x, y, z);
        
        // Update model position and rotation
        if (this.modelGroup) {
            this.modelGroup.position.copy(this.position);
            this.modelGroup.rotation.copy(this.rotation);
        }
    }
    
    /**
     * Disable terrain height updates for this enemy
     * Useful for bosses or enemies that need fixed positioning
     */
    disableTerrainHeightUpdates() {
        this.allowTerrainHeightUpdates = false;
    }
    
    /**
     * Enable terrain height updates for this enemy
     */
    enableTerrainHeightUpdates() {
        this.allowTerrainHeightUpdates = true;
    }
    
    /**
     * Force recalculate terrain height at current position
     * Useful for debugging or when enemies need to be repositioned
     */
    forceTerrainHeightUpdate() {
        if (this.world && !this.isBoss) {
            try {
                const terrainHeight = this.world.getTerrainHeight(this.position.x, this.position.z);
                if (terrainHeight !== null && terrainHeight !== undefined && isFinite(terrainHeight)) {
                const oldY = this.position.y;
                this.position.y = terrainHeight + this.heightOffset;
                
                if (this.modelGroup) {
                    this.modelGroup.position.copy(this.position);
                }
                
                    console.debug(`Enemy ${this.id} terrain height updated: ${oldY.toFixed(2)} -> ${this.position.y.toFixed(2)}`);
                }
            } catch (error) {
                console.debug(`Error forcing terrain height update for enemy: ${error.message}`);
            }
        }
    }
    
    /**
     * Validate and fix enemy position if it's invalid
     * @returns {boolean} True if position was valid or successfully fixed
     */
    validatePosition() {
        // Check for invalid coordinates
        if (!isFinite(this.position.x) || !isFinite(this.position.y) || !isFinite(this.position.z)) {
            console.warn(`Enemy ${this.id} has invalid position:`, this.position);
            
            // Try to fix by resetting to a safe position
            if (this.player) {
                const playerPos = this.player.getPosition();
                this.position.x = playerPos.x + (Math.random() - 0.5) * 10;
                this.position.z = playerPos.z + (Math.random() - 0.5) * 10;
                
                // Recalculate terrain height
                this.forceTerrainHeightUpdate();
                
                console.debug(`Enemy ${this.id} position reset near player`);
                return false;
            }
        }
        
        // Check if enemy is too far underground or floating too high
        if (this.world && !this.isBoss) {
            try {
                const terrainHeight = this.world.getTerrainHeight(this.position.x, this.position.z);
                if (terrainHeight !== null && terrainHeight !== undefined && isFinite(terrainHeight)) {
                const expectedY = terrainHeight + this.heightOffset;
                const yDifference = Math.abs(this.position.y - expectedY);
                
                // If enemy is more than 5 units away from expected terrain height
                if (yDifference > 5) {
                    console.warn(`Enemy ${this.id} position Y mismatch: current=${this.position.y.toFixed(2)}, expected=${expectedY.toFixed(2)}`);
                    this.position.y = expectedY;
                    
                    if (this.modelGroup) {
                        this.modelGroup.position.copy(this.position);
                    }
                    
                    console.debug(`Enemy ${this.id} Y position corrected`);
                    return false;
                }
                }
            } catch (error) {
                console.debug(`Error validating enemy position terrain height: ${error.message}`);
            }
        }
        
        return true;
    }

    getPosition() {
        return this.position;
    }
    
    getCollisionRadius() {
        return this.collisionRadius;
    }
    
    /**
     * Stun the enemy for a specified duration
     * @param {number} duration - Duration of stun in seconds
     */
    stun(duration) {
        this.state.isStunned = true;
        this.state.stunEndTime = Date.now() + (duration * 1000);
        console.debug(`${this.name} stunned for ${duration} seconds`);
    }
    
    getHealth() {
        return this.health;
    }
    
    getExperienceValue() {
        return this.experienceValue;
    }
    
    getType() {
        return this.type;
    }
    
    getName() {
        return this.name;
    }
    
    getMaxHealth() {
        return this.maxHealth;
    }
    
    isBossEnemy() {
        return this.isBoss;
    }
    
    isDead() {
        return this.state.isDead;
    }
    
    remove() {
        this.removeFromScene();
    }
}
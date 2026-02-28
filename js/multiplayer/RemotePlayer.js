/**
 * RemotePlayer.js
 * Represents a remote player in the multiplayer game
 */

import * as THREE from '../../libs/three/three.module.js';
import { getGLTFLoader } from '../utils/GLTFLoaderWithMeshopt.js';
import { DEFAULT_CHARACTER_MODEL, CHARACTER_MODELS } from '../config/player-models.js';
import { createPlayerTomb } from '../player/PlayerTomb.js';

export class RemotePlayer {
    /**
     * Initialize a remote player
     * @param {Game} game - The main game instance
     * @param {string} peerId - The ID of the remote player
     * @param {string} [playerColor] - The color assigned to the player
     * @param {string} [modelId] - The ID of the model to use for this player
     */
    constructor(game, peerId, playerColor, modelId) {
        this.game = game;
        this.peerId = peerId;
        this.model = null;
        this.mixer = null;
        this.animations = new Map();
        this.currentAnimation = null;
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = new THREE.Euler();
        this.interpolationFactor = 0.22; // Snappier follow for "nearly exact" feel (was 0.1)
        // Input-driven movement (host simulates from member input)
        this._inputDriven = false;
        this.position = new THREE.Vector3();
        this.inputMoveX = 0;
        this.inputMoveZ = 0;
        this.jumpRequested = false;
        this.velocityY = 0;
        this.jumpCount = 0;
        this.movementSpeed = 18; // Match default from game-balance
        this.gravity = 32;
        this.groundedTolerance = 0.2;
        this.heightOffset = 1.0;
        this.nameTag = null;
        this.playerColor = playerColor || '#FFFFFF'; // Default to white if no color provided
        this.colorIndicator = null;
        this.modelId = modelId || DEFAULT_CHARACTER_MODEL; // Use default model if none provided
        /** Whether this remote player is dead (enemies skip as target; show tomb). */
        this.isDead = false;
        /** Tomb mesh shown when dead (replaces model). */
        this.tombGroup = null;

        // Create a group to hold the player model and name tag
        this.group = new THREE.Group();
        (this.game.getWorldGroup?.() || this.game.scene).add(this.group);
    }

    /** First segment of room/peer ID for consistent Player xxxxxxxx naming (same as UI). */
    getRoomIdPrefix() {
        if (!this.peerId) return '????';
        const segment = this.peerId.split('-')[0];
        return segment && segment.length >= 8 ? segment : this.peerId.substring(0, 8);
    }

    /**
     * Whether this remote player is alive (not dead). Enemies use this to skip dead players as targets.
     * @returns {boolean}
     */
    isAlive() {
        return !this.isDead;
    }

    /**
     * Set dead state (e.g. when they died on their device and host broadcast playerDied).
     * When dead: hide model and show tomb with "bia mộ"; enemies skip as target.
     * @param {boolean} dead
     */
    setDead(dead) {
        this.isDead = !!dead;
        if (!this.group) return;
        this.group.rotation.x = 0;
        if (this.model) this.model.visible = !dead;
        if (this.nameTag) this.nameTag.visible = !dead;
        if (this.colorIndicator) this.colorIndicator.visible = !dead;
        if (dead) {
            if (!this.tombGroup) {
                this.tombGroup = createPlayerTomb();
                this.group.add(this.tombGroup);
            }
            this.tombGroup.visible = true;
        } else {
            if (this.tombGroup) this.tombGroup.visible = false;
        }
    }

    /**
     * Initialize the remote player
     */
    async init() {
        try {
            // Clone the player model
            await this.clonePlayerModel();
            
            // Create name tag
            this.createNameTag();
            
            // Create color indicator
            this.createColorIndicator();
        } catch (error) {
            console.error(`Error initializing remote player ${this.peerId}:`, error);
        }
    }
    
    /**
     * Create a color indicator circle around the player's feet
     */
    createColorIndicator() {
        // Create a ring geometry for the indicator
        const geometry = new THREE.RingGeometry(0.6, 0.8, 32);
        
        // Create a material with the player's color
        const material = new THREE.MeshBasicMaterial({ 
            color: this.playerColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        
        // Create the mesh
        this.colorIndicator = new THREE.Mesh(geometry, material);
        
        // Rotate to lay flat on the ground
        this.colorIndicator.rotation.x = -Math.PI / 2;
        
        // Position slightly above ground to avoid z-fighting
        this.colorIndicator.position.y = 0.02;
        
        // Add to group
        this.group.add(this.colorIndicator);
    }
    
    /**
     * Load the player model based on modelId
     */
    async clonePlayerModel() {
        try {
            console.debug(`[RemotePlayer ${this.peerId}] Loading model with ID: ${this.modelId}`);
            
            // Get the model configuration
            const modelConfig = this.getModelConfig(this.modelId);
            
            if (modelConfig && modelConfig.path) {
                // Load the model from the path
                await this.loadModelFromPath(modelConfig.path, modelConfig.baseScale || 1.0);
            } else {
                console.warn(`[RemotePlayer ${this.peerId}] Model config not found for ID: ${this.modelId}`);
                // Create a simple placeholder model
                this.createPlaceholderModel(0x00ff00); // Green placeholder
            }
        } catch (error) {
            console.error(`[RemotePlayer ${this.peerId}] Error loading model:`, error);
            
            // Create a simple placeholder model as fallback
            this.createPlaceholderModel(0xff0000); // Red placeholder for error
        }
    }
    
    /**
     * Get model configuration by ID
     * @param {string} modelId - The ID of the model to get
     * @returns {Object} The model configuration
     */
    getModelConfig(modelId) {
        // CHARACTER_MODELS is imported at the top of the file
        const model = CHARACTER_MODELS.find(m => m.id === modelId);
        return model || CHARACTER_MODELS.find(m => m.id === DEFAULT_CHARACTER_MODEL);
    }
    
    /**
     * Load a model from a file path
     * @param {string} path - Path to the model file
     * @param {number} scale - Scale factor for the model
     */
    async loadModelFromPath(path, scale = 1.0) {
        return new Promise((resolve, reject) => {
            // Use GLTFLoader to load the model
            const loader = getGLTFLoader();
            
            loader.load(
                path,
                (gltf) => {
                    this.model = gltf.scene;
                    
                    // Apply shadows to all meshes
                    this.model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });
                    
                    // Scale the model
                    this.model.scale.set(scale, scale, scale);
                    
                    // Position adjustments if needed
                    this.model.position.y = -1.0;
                    
                    // Add to group
                    this.group.add(this.model);
                    
                    // Set up animations if they exist
                    if (gltf.animations && gltf.animations.length > 0) {
                        this.mixer = new THREE.AnimationMixer(this.model);
                        
                        // Store animations
                        gltf.animations.forEach(animation => {
                            const action = this.mixer.clipAction(animation);
                            this.animations.set(animation.name, action);
                            console.debug(`[RemotePlayer ${this.peerId}] Found animation: ${animation.name}`);
                        });
                        
                        // Try to play idle animation by default, with walking as fallback
                        this.playAnimation('idle', 'walking');
                        
                        // If no standard animations found, try to play the first available animation
                        if (!this.currentAnimation && this.animations.size > 0) {
                            const firstAnimName = Array.from(this.animations.keys())[0];
                            this.playAnimation(firstAnimName);
                        }
                    }
                    
                    resolve(this.model);
                },
                (xhr) => {
                    console.debug(`[RemotePlayer ${this.peerId}] Loading model: ${(xhr.loaded / xhr.total * 100)}% loaded`);
                },
                (error) => {
                    console.error(`[RemotePlayer ${this.peerId}] Error loading model:`, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Create a placeholder model with the specified color
     * @param {number} color - The color for the placeholder
     */
    createPlaceholderModel(color) {
        const geometry = new THREE.BoxGeometry(1, 2, 1);
        const material = new THREE.MeshBasicMaterial({ color: color });
        this.model = new THREE.Mesh(geometry, material);
        this.group.add(this.model);
    }
    
    /**
     * Set up animations for the remote player
     */
    setupAnimations() {
        try {
            // If the model has animations, set up the mixer
            if (this.model && this.model.animations && this.model.animations.length > 0) {
                // Create animation mixer
                this.mixer = new THREE.AnimationMixer(this.model);
                
                // Store animations
                this.model.animations.forEach(animation => {
                    const action = this.mixer.clipAction(animation);
                    this.animations.set(animation.name, action);
                });
                
                // Set default animation
                this.playAnimation('idle');
            }
        } catch (error) {
            console.error(`Error setting up animations for remote player ${this.peerId}:`, error);
        }
    }
    
    /**
     * Create a name tag for the remote player
     */
    createNameTag() {
        // Create a canvas for the name tag
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw border with player color
        context.strokeStyle = this.playerColor;
        context.lineWidth = 3;
        context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        // Draw text
        context.fillStyle = '#ffffff';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`Player ${this.getRoomIdPrefix()}`, canvas.width / 2, canvas.height / 2);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create sprite material
        const material = new THREE.SpriteMaterial({ map: texture });
        
        // Create sprite
        this.nameTag = new THREE.Sprite(material);
        this.nameTag.scale.set(2, 0.5, 1);
        this.nameTag.position.y = 3; // Position above player
        
        // Add to group
        this.group.add(this.nameTag);
    }
    
    /**
     * Update the remote player's position
     * @param {Object} position - The new position
     */
    updatePosition(position) {
        if (!position) {
            console.debug(`[RemotePlayer ${this.peerId}] Received null position`);
            return;
        }
        
        // Validate position values
        if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
            console.debug(`[RemotePlayer ${this.peerId}] Received invalid position with NaN values:`, position);
            return;
        }
        
        // Set target position and keep internal position in sync (for input-driven host and for lerp base)
        this.targetPosition.set(position.x, position.y, position.z);
        this.position.set(position.x, position.y, position.z);
    }
    
    /**
     * Set movement input (host only). Enables input-driven simulation for this remote player.
     * @param {number} moveX - World-space movement X (-1..1)
     * @param {number} moveZ - World-space movement Z (-1..1)
     */
    setMovementInput(moveX, moveZ) {
        this._inputDriven = true;
        this.inputMoveX = moveX;
        this.inputMoveZ = moveZ;
        // If we had initial position sync before first input, start simulation from there
        if (this.position.x === 0 && this.position.y === 0 && this.position.z === 0 &&
            (this.targetPosition.x !== 0 || this.targetPosition.y !== 0 || this.targetPosition.z !== 0)) {
            this.position.copy(this.targetPosition);
        }
    }
    
    /**
     * Request one jump (host only). Called when member sends jumpPressed.
     */
    requestJump() {
        this.jumpRequested = true;
    }
    
    /**
     * Update the remote player's rotation
     * @param {Object|number} rotation - The new rotation (either an object with x,y,z or just the y value)
     */
    updateRotation(rotation) {
        if (rotation === undefined || rotation === null) return;
        
        // Handle different rotation formats
        if (typeof rotation === 'number') {
            // Just y rotation provided as a number
            if (isNaN(rotation)) {
                console.debug(`[RemotePlayer ${this.peerId}] Received invalid rotation number:`, rotation);
                return;
            }
            this.targetRotation.set(0, rotation, 0);
        } else if (typeof rotation === 'object') {
            // Full rotation object or y-only object
            if (rotation.y !== undefined && !isNaN(rotation.y)) {
                // If we have at least a valid y rotation, use it
                const x = (rotation.x !== undefined && !isNaN(rotation.x)) ? rotation.x : 0;
                const z = (rotation.z !== undefined && !isNaN(rotation.z)) ? rotation.z : 0;
                this.targetRotation.set(x, rotation.y, z);
            } else {
                console.debug(`[RemotePlayer ${this.peerId}] Received invalid rotation object:`, rotation);
                return;
            }
        } else {
            console.debug(`[RemotePlayer ${this.peerId}] Received invalid rotation type:`, typeof rotation);
            return;
        }
    }
    
    /**
     * Update the remote player's animation
     * @param {string} animation - The new animation name
     */
    updateAnimation(animation) {
        if (!animation) {
            console.debug(`[RemotePlayer ${this.peerId}] Received null animation`);
            return;
        }
        
        if (animation === this.currentAnimation) {
            // Animation unchanged, no need to update
            return;
        }
        
        // Map common animation names to standard ones if needed
        let animationToPlay = animation;
        
        // Handle common animation mappings
        if (animation === 'run' || animation === 'running') {
            animationToPlay = 'walking';
        } else if (animation === 'stand' || animation === 'standing') {
            animationToPlay = 'idle';
        }
        
        // Try to play the animation with fallbacks
        const success = this.playAnimation(animationToPlay, 'idle');
        
        if (!success) {
            console.debug(`[RemotePlayer ${this.peerId}] Failed to play animation: ${animationToPlay}`);
            
            // If we couldn't play the requested animation, try to ensure at least some animation is playing
            if (!this.currentAnimation && this.animations.size > 0) {
                const firstAnimName = Array.from(this.animations.keys())[0];
                this.playAnimation(firstAnimName);
            }
        }
    }
    
    /**
     * Set the player's color
     * @param {string} color - The color to set
     */
    setPlayerColor(color) {
        if (!color) return;
        
        // Update stored color
        this.playerColor = color;
        
        // Update color indicator if it exists
        if (this.colorIndicator && this.colorIndicator.material) {
            this.colorIndicator.material.color.set(color);
        } else {
            // Create color indicator if it doesn't exist
            this.createColorIndicator();
        }
        
        // Update name tag color if it exists
        if (this.nameTag && this.nameTag.material && this.nameTag.material.map) {
            // Redraw the name tag with the new color
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            
            // Draw background
            context.fillStyle = 'rgba(0, 0, 0, 0.5)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw border with player color
            context.strokeStyle = this.playerColor;
            context.lineWidth = 3;
            context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
            
            // Draw text
            context.fillStyle = '#ffffff';
            context.font = '24px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(`Player ${this.getRoomIdPrefix()}`, canvas.width / 2, canvas.height / 2);

            // Update texture
            this.nameTag.material.map.dispose();
            this.nameTag.material.map = new THREE.CanvasTexture(canvas);
            this.nameTag.material.needsUpdate = true;
        }
    }
    
    /**
     * Play an animation
     * @param {string} name - The name of the animation to play
     * @param {string} [fallbackName] - Fallback animation name if primary not found
     * @param {number} [transitionDuration=0.2] - Duration of crossfade transition in seconds
     * @returns {boolean} True if animation was found and played
     */
    playAnimation(name, fallbackName = null, transitionDuration = 0.2) {
        if (!this.mixer || !this.animations.has(name)) {
            if (fallbackName && this.animations.has(fallbackName)) {
                // Try fallback animation
                return this.playAnimation(fallbackName, null, transitionDuration);
            }
            
            // If no fallback or fallback not found
            console.debug(`[RemotePlayer ${this.peerId}] Animation not found: ${name}`);
            return false;
        }
        
        // If this is already the current animation, don't restart it
        if (this.currentAnimation === name) {
            return true;
        }
        
        // Stop current animation with crossfade
        if (this.currentAnimation && this.animations.has(this.currentAnimation)) {
            const currentAction = this.animations.get(this.currentAnimation);
            currentAction.fadeOut(transitionDuration);
        }
        
        // Play new animation
        const newAction = this.animations.get(name);
        newAction.reset().fadeIn(transitionDuration).play();
        
        // Update current animation
        this.currentAnimation = name;
        console.debug(`[RemotePlayer ${this.peerId}] Playing animation: ${name}`);
        
        return true;
    }
    
    /**
     * Cast a skill animation
     * @param {string} skillName - The name of the skill being cast
     * @returns {boolean} True if the skill animation was played successfully
     */
    /**
     * Cast a skill with visual effects
     * @param {string} skillName - The name of the skill to cast
     * @param {string} [variant] - The variant of the skill (optional)
     * @param {string} [targetEnemyId] - The ID of the target enemy (optional)
     * @returns {boolean} - Whether the skill was cast successfully
     */
    castSkill(skillName, variant, targetEnemyId) {
        // Map skill names to appropriate animations
        const skillAnimationMap = {
            // Default mappings - can be expanded for specific skills
            'Fist of Thunder': 'attack',
            'Deadly Reach': 'attack',
            'Crippling Wave': 'attack',
            'Way of the Hundred Fists': 'attack',
            'Lashing Tail Kick': 'attack',
            'Tempest Rush': 'attack',
            'Wave of Light': 'attack',
            'Dashing Strike': 'attack',
            'Exploding Palm': 'attack',
            'Sweeping Wind': 'attack',
            'Serenity': 'idle',
            'Inner Sanctuary': 'idle',
            'Breath of Heaven': 'idle',
            'Mystic Ally': 'attack',
            'Seven-Sided Strike': 'attack',
            'Mantra of Evasion': 'idle',
            'Mantra of Retribution': 'idle',
            'Mantra of Healing': 'idle',
            'Mantra of Conviction': 'idle'
        };
        
        // Get the animation name for this skill
        const animationName = skillAnimationMap[skillName] || 'attack';
        
        // Log variant and target enemy information if available
        if (variant && targetEnemyId) {
            console.debug(`[RemotePlayer ${this.peerId}] Casting skill: ${skillName} with variant: ${variant}, targeting enemy: ${targetEnemyId}, and animation: ${animationName}`);
        } else if (variant) {
            console.debug(`[RemotePlayer ${this.peerId}] Casting skill: ${skillName} with variant: ${variant} and animation: ${animationName}`);
        } else if (targetEnemyId) {
            console.debug(`[RemotePlayer ${this.peerId}] Casting skill: ${skillName} targeting enemy: ${targetEnemyId} with animation: ${animationName}`);
        } else {
            console.debug(`[RemotePlayer ${this.peerId}] Casting skill: ${skillName} with animation: ${animationName}`);
        }
        
        // Play the animation
        const animationPlayed = this.playAnimation(animationName, 'attack', 0.2);
        
        // Create the skill visual effect with variant and target enemy information
        this.createSkillEffect(skillName, variant, targetEnemyId);
        
        return animationPlayed;
    }
    
    /**
     * Create a visual effect for a skill
     * @param {string} skillName - The name of the skill
     * @param {string} [variant] - The variant of the skill (optional)
     * @param {string} [targetEnemyId] - The ID of the target enemy (optional)
     */
    createSkillEffect(skillName, variant, targetEnemyId) {
        if (!this.game || !this.game.scene) {
            console.warn(`[RemotePlayer ${this.peerId}] Cannot create skill effect: no game or scene reference`);
            return;
        }
        
        try {
            // Import necessary modules
            import('../skills/Skill.js').then(({ Skill }) => {
                import('../config/skills.js').then(async ({ SKILLS }) => {
                    // Find the skill configuration
                    const skillConfig = SKILLS.find(config => config.name === skillName);
                    
                    if (!skillConfig) {
                        console.warn(`[RemotePlayer ${this.peerId}] Skill configuration not found for: ${skillName}`);
                        return;
                    }
                    
                    // Create a deep copy of the skill config
                    const skillConfigCopy = JSON.parse(JSON.stringify(skillConfig));
                    
                    // Apply variant if provided
                    if (variant) {
                        console.debug(`[RemotePlayer ${this.peerId}] Applying variant ${variant} to skill ${skillName}`);
                        skillConfigCopy.variant = variant;
                    }
                    
                    // Create a new skill instance with the possibly modified config
                    const skill = new Skill(skillConfigCopy);
                    
                    // Set the game reference
                    skill.setGame(this.game);
                    
                    // Get the player's position and rotation
                    const position = this.group.position.clone();
                    const rotation = { y: this.model ? this.model.rotation.y : 0 };
                    
                    // Set target enemy if provided
                    let targetEnemy = null;
                    if (targetEnemyId && this.game.enemyManager) {
                        targetEnemy = this.game.enemyManager.getEnemyById(targetEnemyId);
                        if (targetEnemy) {
                            console.debug(`[RemotePlayer ${this.peerId}] Found target enemy with ID: ${targetEnemyId}`);
                            skill.targetEnemy = targetEnemy;
                        } else {
                            console.debug(`[RemotePlayer ${this.peerId}] Target enemy with ID: ${targetEnemyId} not found - enemy may be dead already`);
                            // Continue with skill cast even if target enemy is not found
                            // This prevents skills from not being cast when enemies die during network transmission
                        }
                    }
                    
                    // Create the skill effect
                    if (variant && targetEnemyId) {
                        console.debug(`[RemotePlayer ${this.peerId}] Creating skill effect for: ${skillName} with variant: ${variant} targeting enemy: ${targetEnemyId}`);
                    } else if (variant) {
                        console.debug(`[RemotePlayer ${this.peerId}] Creating skill effect for: ${skillName} with variant: ${variant}`);
                    } else if (targetEnemyId) {
                        console.debug(`[RemotePlayer ${this.peerId}] Creating skill effect for: ${skillName} targeting enemy: ${targetEnemyId}`);
                    } else {
                        console.debug(`[RemotePlayer ${this.peerId}] Creating skill effect for: ${skillName}`);
                    }
                    
                    // Create the skill effect - even if target enemy wasn't found (async - lazy-loads effect module)
                    // This ensures skills are still cast visually even if the target is gone
                    const skillEffect = await skill.createEffect(position, rotation);
                    
                    // Add the effect to the scene
                    if (skillEffect) {
                        (this.game.getWorldGroup?.() || this.game.scene).add(skillEffect);
                        
                        // Store the skill in the game's active skills if possible
                        if (this.game.player && this.game.player.skills) {
                            this.game.player.skills.addRemotePlayerSkill(skill);
                        }
                    }
                });
            });
        } catch (error) {
            console.error(`[RemotePlayer ${this.peerId}] Error creating skill effect:`, error);
        }
    }

    /**
     * Update the remote player
     * @param {number} deltaTime - Time elapsed since the last frame
     */
    update(deltaTime) {
        const safeDelta = Math.min(Math.max(deltaTime || 0.016, 0.001), 0.1);
        
        if (this._inputDriven) {
            this._updateInputDriven(safeDelta);
        } else {
            // Interpolate position (member: position sync from host)
            this.group.position.lerp(this.targetPosition, this.interpolationFactor);
        }
        
        // Interpolate rotation
        if (this.model) {
            const currentQuaternion = new THREE.Quaternion().setFromEuler(this.model.rotation);
            const targetQuaternion = new THREE.Quaternion().setFromEuler(this.targetRotation);
            currentQuaternion.slerp(targetQuaternion, this.interpolationFactor);
            this.model.quaternion.copy(currentQuaternion);
        }
        
        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Make name tag face the camera
        if (this.nameTag && this.game.camera) {
            this.nameTag.lookAt(this.game.camera.position);
        }
    }
    
    /**
     * Apply input-driven movement and jump (host only).
     * @param {number} delta - Frame delta time
     */
    _updateInputDriven(delta) {
        const dx = this.inputMoveX;
        const dz = this.inputMoveZ;
        const lenSq = dx * dx + dz * dz;
        if (lenSq > 0.01) {
            const len = Math.sqrt(lenSq);
            const step = this.movementSpeed * delta;
            this.position.x += (dx / len) * step;
            this.position.z += (dz / len) * step;
            this.targetRotation.y = Math.atan2(dx, dz);
            if (this.currentAnimation !== 'walking') this.updateAnimation('walking');
        } else {
            if (this.currentAnimation !== 'idle') this.updateAnimation('idle');
        }
        
        // Jump (one-shot when jumpRequested)
        if (this.jumpRequested) {
            this.jumpRequested = false;
            const groundY = this._getGroundY();
            if (groundY !== null && this.position.y <= groundY + this.groundedTolerance + 0.5) {
                this.velocityY = 25;
                this.jumpCount = 1;
            }
        }
        
        // Gravity and ground
        const groundY = this._getGroundY();
        if (groundY !== null) {
            const inAir = this.position.y > groundY + this.groundedTolerance || this.velocityY > 0;
            if (inAir) {
                this.velocityY -= this.gravity * delta;
                this.position.y += this.velocityY * delta;
                if (this.position.y <= groundY + this.groundedTolerance) {
                    this.position.y = groundY + this.heightOffset;
                    this.velocityY = 0;
                    this.jumpCount = 0;
                }
            } else {
                this.position.y = groundY + this.heightOffset;
                this.velocityY = 0;
            }
        }
        
        this.group.position.copy(this.position);
        this.targetPosition.copy(this.position);
    }
    
    /**
     * Get ground Y at current XZ (for input-driven movement).
     * @returns {number|null}
     */
    _getGroundY() {
        if (!this.game?.world) return null;
        const h = this.game.world.getPlayerGroundHeight
            ? this.game.world.getPlayerGroundHeight(this.position.x, this.position.z)
            : this.game.world.getTerrainHeight(this.position.x, this.position.z);
        return h != null && isFinite(h) ? h : null;
    }
    
    /**
     * Dispose of the remote player
     */
    dispose() {
        // Remove from scene
        this.game.scene.remove(this.group);
        
        // Dispose of geometries and materials
        if (this.model) {
            this.model.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        // Dispose of name tag
        if (this.nameTag && this.nameTag.material) {
            if (this.nameTag.material.map) this.nameTag.material.map.dispose();
            this.nameTag.material.dispose();
        }
        
        // Dispose of color indicator
        if (this.colorIndicator && this.colorIndicator.material) {
            this.colorIndicator.geometry.dispose();
            this.colorIndicator.material.dispose();
        }
        
        // Clear references
        this.model = null;
        this.mixer = null;
        this.animations.clear();
        this.nameTag = null;
        this.colorIndicator = null;
        this.group = null;
    }
}
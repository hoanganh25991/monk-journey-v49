import * as THREE from '../../../libs/three/three.module.js';
import { fastSin } from 'utils/FastMath.js';

/**
 * Interface for enemy models
 * This class defines the contract that all enemy model implementations must follow
 */
export class EnemyModel {
    /**
     * Create a new enemy model
     * @param {Object} enemy - The enemy instance this model belongs to
     * @param {THREE.Group} modelGroup - The THREE.js group to add model parts to
     */
    constructor(enemy, modelGroup) {
        this.enemy = enemy;
        this.modelGroup = modelGroup;
        
        // Ensure child classes implement required methods
        if (this.constructor === EnemyModel) {
            throw new Error("EnemyModel is an abstract class and cannot be instantiated directly");
        }
    }
    
    /**
     * Create the 3D model for this enemy type
     * Must be implemented by all subclasses
     */
    createModel() {
        throw new Error("Method 'createModel()' must be implemented by subclass");
    }
    
    /**
     * Load a 3D model from a GLB file (for future implementation)
     * @param {string} path - Path to the GLB file
     * @returns {Promise} - Promise that resolves when the model is loaded
     */
    async loadFromGLB(path) {
        // This is a placeholder for future implementation
        // Will be used to load models from GLB files
        console.debug(`Loading model from ${path} - not yet implemented`);
        return Promise.resolve();
    }
    
    /**
     * Update model animations
     * @param {number} delta - Time since last update in seconds
     * 
     * IMPORTANT: Do not modify this.modelGroup.rotation.y in subclasses!
     * The Y rotation (facing direction) is managed by the Enemy class to ensure
     * enemies face the player correctly. Only modify individual child rotations
     * or X/Z rotations of the model group for animations.
     */
    updateAnimations(delta) {
        // Default implementation for basic animations
        // Always called each frame - ensures visible move/attack/idle feedback
        if (!this.modelGroup || !this.enemy) return;
        
        if (this.enemy.state.isAttacking) {
            this.animateAttack(delta);
        } else if (this.enemy.state.isMoving) {
            this.animateMovement(delta);
        } else {
            this.animateIdle(delta);
        }
    }
    
    /**
     * Subtle idle animation - always visible when not moving/attacking
     */
    animateIdle(delta) {
        if (!this.modelGroup || this.modelGroup.children.length < 2) return;
        const time = Date.now() * 0.001;
        const body = this.modelGroup.children[0];
        if (body && body.scale) {
            const breath = 1.0 + fastSin(time * 2) * 0.03;
            body.scale.set(breath, breath, breath);
        }
    }
    
    /**
     * Animate enemy movement - more pronounced for visibility
     */
    animateMovement(delta) {
        if (!this.modelGroup) return;
        const time = Date.now() * 0.001;
        const walkSpeed = 6;
        const walkAmplitude = 0.25;
        const armSwing = 0.55;
        
        if (this.modelGroup.children.length >= 6) {
            const leftLeg = this.modelGroup.children[4];
            const rightLeg = this.modelGroup.children[5];
            if (leftLeg?.position) leftLeg.position.z = fastSin(time * walkSpeed) * walkAmplitude;
            if (rightLeg?.position) rightLeg.position.z = -fastSin(time * walkSpeed) * walkAmplitude;
        }
        if (this.modelGroup.children.length >= 4) {
            const leftArm = this.modelGroup.children[2];
            const rightArm = this.modelGroup.children[3];
            if (leftArm?.rotation) leftArm.rotation.x = fastSin(time * walkSpeed) * armSwing;
            if (rightArm?.rotation) rightArm.rotation.x = -fastSin(time * walkSpeed) * armSwing;
        }
    }
    
    /**
     * Animate enemy attack - more dramatic swing
     */
    animateAttack(delta) {
        if (!this.modelGroup || this.modelGroup.children.length < 4) return;
        const time = Date.now() * 0.001;
        const rightArm = this.modelGroup.children[3];
        if (rightArm?.rotation) {
            rightArm.rotation.x = -0.8 - fastSin(time * 12) * 0.6;
        }
    }
}
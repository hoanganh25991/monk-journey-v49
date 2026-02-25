import * as THREE from '../../../libs/three/three.module.js';
import { EnemyModel } from './EnemyModel.js';

/**
 * SimpleEnemyModel - A basic enemy model implementation
 * Reuses the createSimplePlaceholder function from EnemyPreview
 */
export class SimpleEnemyModel extends EnemyModel {
    constructor(enemy, modelGroup) {
        super(enemy, modelGroup);
        this.createModel();
    }
    
    /**
     * Create the 3D model for this enemy type
     * Implementation based on EnemyPreview.createSimplePlaceholder
     */
    createModel() {
        // Get enemy color or use default
        const enemyColor = this.enemy.color || 0xcccccc;
        
        // Create a body (cube)
        const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: enemyColor,
            roughness: 0.7,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        body.receiveShadow = true;
        this.modelGroup.add(body);
        
        // Create a head (sphere)
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: enemyColor,
            roughness: 0.7,
            metalness: 0.3
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.85;
        head.castShadow = true;
        head.receiveShadow = true;
        this.modelGroup.add(head);
        
        // Create arms
        const armGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: enemyColor,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.65, 0.75, 0);
        leftArm.castShadow = true;
        leftArm.receiveShadow = true;
        this.modelGroup.add(leftArm);
        
        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.65, 0.75, 0);
        rightArm.castShadow = true;
        rightArm.receiveShadow = true;
        this.modelGroup.add(rightArm);
        
        // Create legs
        const legGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: enemyColor,
            roughness: 0.7,
            metalness: 0.3
        });
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.3, -0.4, 0);
        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        this.modelGroup.add(leftLeg);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.3, -0.4, 0);
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;
        this.modelGroup.add(rightLeg);
        
        // Add eyes (for all enemies)
        const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,  // Red eyes for all enemies
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 1.9, 0.3);
        this.modelGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 1.9, 0.3);
        this.modelGroup.add(rightEye);
        return this.modelGroup;
    }
    
    /**
     * Update model animations
     * @param {number} delta - Time since last update in seconds
     */
    updateAnimations(delta) {
        if (!this.modelGroup || this.modelGroup.children.length < 6) {
            return;
        }
        
        const time = Date.now() * 0.001;
        
        const body = this.modelGroup.children[0];
        const head = this.modelGroup.children[1];
        const leftArm = this.modelGroup.children[2];
        const rightArm = this.modelGroup.children[3];
        const leftLeg = this.modelGroup.children[4];
        const rightLeg = this.modelGroup.children[5];
        
        if (!body.userData.originalY) {
            body.userData.originalY = body.position.y;
            head.userData.originalY = head.position.y;
            leftArm.userData.originalPos = leftArm.position.clone();
            rightArm.userData.originalPos = rightArm.position.clone();
            leftLeg.userData.originalPos = leftLeg.position.clone();
            rightLeg.userData.originalPos = rightLeg.position.clone();
            leftArm.userData.originalRot = leftArm.rotation.clone();
            rightArm.userData.originalRot = rightArm.rotation.clone();
        }
        
        if (this.enemy.state.isAttacking) {
            const attackSpeed = 10;
            const attackCycle = (time * attackSpeed) % (Math.PI * 2);
            
            body.rotation.x = 0;
            body.rotation.z = 0;
            
            if (attackCycle < Math.PI) {
                const progress = attackCycle / Math.PI;
                rightArm.rotation.x = -progress * Math.PI * 0.7;
                rightArm.rotation.z = rightArm.userData.originalRot.z - progress * 0.3;
                rightArm.position.z = rightArm.userData.originalPos.z + progress * 0.2;
            } else {
                const progress = (attackCycle - Math.PI) / Math.PI;
                rightArm.rotation.x = -Math.PI * 0.7 + progress * Math.PI * 0.7;
                rightArm.rotation.z = rightArm.userData.originalRot.z - 0.3 + progress * 0.3;
                rightArm.position.z = rightArm.userData.originalPos.z + 0.2 - progress * 0.2;
            }
            
            leftArm.rotation.x = Math.sin(time * attackSpeed) * 0.2;
            
        } else if (this.enemy.state.isMoving) {
            const walkSpeed = 6;
            const walkAmp = 0.15;
            const armSwing = 0.4;
            
            body.rotation.x = 0;
            body.rotation.z = 0;
            
            leftLeg.position.z = leftLeg.userData.originalPos.z + Math.sin(time * walkSpeed) * walkAmp;
            rightLeg.position.z = rightLeg.userData.originalPos.z - Math.sin(time * walkSpeed) * walkAmp;
            
            leftArm.rotation.x = Math.sin(time * walkSpeed) * armSwing;
            rightArm.rotation.x = -Math.sin(time * walkSpeed) * armSwing;
            leftArm.rotation.z = leftArm.userData.originalRot.z;
            rightArm.rotation.z = rightArm.userData.originalRot.z;
            rightArm.position.z = rightArm.userData.originalPos.z;
            
            const bodyBob = Math.abs(Math.sin(time * walkSpeed)) * 0.08;
            body.position.y = body.userData.originalY + bodyBob;
            head.position.y = head.userData.originalY + bodyBob;
            
        } else {
            const idleSpeed = 1.8;
            const idleAmp = 0.04;
            
            body.rotation.x = Math.sin(time * idleSpeed) * idleAmp * 0.5;
            body.rotation.z = Math.cos(time * idleSpeed * 0.7) * idleAmp * 0.3;
            
            head.rotation.x = Math.sin(time * 1.2) * 0.06;
            head.rotation.y = Math.sin(time * 0.9) * 0.12;
            
            const breathe = Math.sin(time * idleSpeed) * 0.03;
            body.position.y = body.userData.originalY + breathe;
            head.position.y = head.userData.originalY + breathe;
            
            leftArm.rotation.x = Math.sin(time * idleSpeed * 0.5) * 0.05;
            rightArm.rotation.x = Math.cos(time * idleSpeed * 0.5) * 0.05;
            leftArm.rotation.z = leftArm.userData.originalRot.z;
            rightArm.rotation.z = rightArm.userData.originalRot.z;
            rightArm.position.z = rightArm.userData.originalPos.z;
            
            leftLeg.position.z = leftLeg.userData.originalPos.z;
            rightLeg.position.z = rightLeg.userData.originalPos.z;
        }
    }
}
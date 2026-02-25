import * as THREE from '../../../libs/three/three.module.js';
import { EnemyModel } from './EnemyModel.js';

export class InfernalGolemModel extends EnemyModel {
    constructor(enemy, modelGroup) {
        super(enemy, modelGroup);
    }
    
    createModel() {
        const isIceGolem = this.enemy.type === 'ice_golem';
        const bodyColor = isIceGolem ? (this.enemy.color || 0x88ccff) : 0x333333;
        const crackColor = isIceGolem ? 0x66aaff : 0xff3300;
        const crackEmissive = isIceGolem ? 0x4488dd : 0xff3300;

        // Create body (large, rocky structure)
        const bodyGeometry = new THREE.BoxGeometry(1.5, 1.5, 1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: bodyColor,
            roughness: 1.0,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        
        this.modelGroup.add(body);
        
        // Create head (smaller box)
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: bodyColor,
            roughness: 1.0,
            metalness: 0.2
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        
        this.modelGroup.add(head);
        
        // Create glowing cracks (lava orange or ice blue)
        const crackGeometry = new THREE.BoxGeometry(0.1, 1.4, 0.1);
        const crackMaterial = new THREE.MeshStandardMaterial({ 
            color: crackColor,
            emissive: crackEmissive,
            emissiveIntensity: 1.0
        });
        
        // Vertical crack
        const verticalCrack = new THREE.Mesh(crackGeometry, crackMaterial);
        verticalCrack.position.set(0, 0.75, 0.51);
        
        this.modelGroup.add(verticalCrack);
        
        // Horizontal crack
        const horizontalCrack = new THREE.Mesh(crackGeometry, crackMaterial);
        horizontalCrack.position.set(0, 0.75, 0.51);
        horizontalCrack.rotation.z = Math.PI / 2;
        
        this.modelGroup.add(horizontalCrack);
        
        // Create arms (large, rocky cylinders)
        const armGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: bodyColor,
            roughness: 1.0,
            metalness: 0.2
        });
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-1.0, 0.9, 0);
        leftArm.rotation.z = Math.PI / 2;
        leftArm.castShadow = true;
        
        this.modelGroup.add(leftArm);
        
        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(1.0, 0.9, 0);
        rightArm.rotation.z = -Math.PI / 2;
        rightArm.castShadow = true;
        
        this.modelGroup.add(rightArm);
        
        // Create fists (large spheres)
        const fistGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const fistMaterial = new THREE.MeshStandardMaterial({ 
            color: bodyColor,
            roughness: 1.0,
            metalness: 0.2
        });
        
        // Left fist
        const leftFist = new THREE.Mesh(fistGeometry, fistMaterial);
        leftFist.position.set(-1.8, 0.9, 0);
        leftFist.castShadow = true;
        
        this.modelGroup.add(leftFist);
        
        // Right fist
        const rightFist = new THREE.Mesh(fistGeometry, fistMaterial);
        rightFist.position.set(1.8, 0.9, 0);
        rightFist.castShadow = true;
        
        this.modelGroup.add(rightFist);
        
        // Create legs (thick cylinders)
        const legGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: bodyColor,
            roughness: 1.0,
            metalness: 0.2
        });
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.5, 0, 0);
        leftLeg.castShadow = true;
        
        this.modelGroup.add(leftLeg);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.5, 0, 0);
        rightLeg.castShadow = true;
        
        this.modelGroup.add(rightLeg);
        
        // Add glowing eyes (lava orange or ice blue)
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: crackColor,
            emissive: crackEmissive,
            emissiveIntensity: 1.0
        });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 1.8, 0.4);
        
        this.modelGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 1.8, 0.4);
        
        this.modelGroup.add(rightEye);
    }
    
    updateAnimations(delta) {
        if (!this.modelGroup || this.modelGroup.children.length < 10) {
            return;
        }
        
        const time = Date.now() * 0.001;
        
        const body = this.modelGroup.children[0];
        const head = this.modelGroup.children[1];
        const verticalCrack = this.modelGroup.children[2];
        const horizontalCrack = this.modelGroup.children[3];
        const leftArm = this.modelGroup.children[4];
        const rightArm = this.modelGroup.children[5];
        const leftFist = this.modelGroup.children[6];
        const rightFist = this.modelGroup.children[7];
        const leftLeg = this.modelGroup.children[8];
        const rightLeg = this.modelGroup.children[9];
        
        if (!body.userData.initialized) {
            body.userData.originalY = body.position.y;
            head.userData.originalY = head.position.y;
            leftArm.userData.originalRot = leftArm.rotation.clone();
            rightArm.userData.originalRot = rightArm.rotation.clone();
            body.userData.initialized = true;
        }
        
        const crackPulse = 0.8 + Math.sin(time * 2) * 0.4;
        if (verticalCrack.material) {
            verticalCrack.material.emissiveIntensity = crackPulse;
        }
        if (horizontalCrack.material) {
            horizontalCrack.material.emissiveIntensity = crackPulse;
        }
        
        if (this.modelGroup.children.length > 10) {
            const leftEye = this.modelGroup.children[10];
            const rightEye = this.modelGroup.children[11];
            if (leftEye && leftEye.material) {
                leftEye.material.emissiveIntensity = 0.8 + Math.sin(time * 3) * 0.4;
            }
            if (rightEye && rightEye.material) {
                rightEye.material.emissiveIntensity = 0.8 + Math.sin(time * 3) * 0.4;
            }
        }
        
        if (this.enemy.state.isAttacking) {
            const attackSpeed = 6;
            const attackCycle = (time * attackSpeed) % (Math.PI * 2);
            
            if (attackCycle < Math.PI * 0.7) {
                const progress = attackCycle / (Math.PI * 0.7);
                rightArm.rotation.x = -progress * Math.PI * 0.6;
                rightFist.position.y = 0.9 + progress * 0.8;
                rightFist.position.x = 1.8 - progress * 0.5;
                body.rotation.x = -progress * 0.2;
            } else {
                const progress = (attackCycle - Math.PI * 0.7) / (Math.PI * 1.3);
                rightArm.rotation.x = -Math.PI * 0.6 + progress * Math.PI * 0.6;
                rightFist.position.y = 1.7 - progress * 0.8;
                rightFist.position.x = 1.3 + progress * 0.5;
                body.rotation.x = -0.2 + progress * 0.2;
            }
            
            leftArm.rotation.x = Math.sin(time * attackSpeed * 0.5) * 0.2;
            
            if (verticalCrack.material) {
                verticalCrack.material.emissiveIntensity = 1.2 + Math.sin(time * attackSpeed * 2) * 0.5;
            }
            if (horizontalCrack.material) {
                horizontalCrack.material.emissiveIntensity = 1.2 + Math.sin(time * attackSpeed * 2) * 0.5;
            }
            
        } else if (this.enemy.state.isMoving) {
            const walkSpeed = 3;
            const walkAmp = 0.2;
            
            body.rotation.x = 0;
            
            leftLeg.rotation.x = Math.sin(time * walkSpeed) * 0.4;
            rightLeg.rotation.x = -Math.sin(time * walkSpeed) * 0.4;
            
            leftArm.rotation.x = -Math.sin(time * walkSpeed) * 0.3;
            rightArm.rotation.x = Math.sin(time * walkSpeed) * 0.3;
            
            leftFist.position.y = 0.9 + Math.abs(Math.sin(time * walkSpeed)) * 0.1;
            rightFist.position.y = 0.9 + Math.abs(Math.cos(time * walkSpeed)) * 0.1;
            leftFist.position.x = -1.8;
            rightFist.position.x = 1.8;
            
            const bodyBob = Math.abs(Math.sin(time * walkSpeed)) * 0.15;
            body.position.y = body.userData.originalY + bodyBob;
            head.position.y = head.userData.originalY + bodyBob;
            
        } else {
            const idleSpeed = 1;
            
            body.rotation.x = Math.sin(time * idleSpeed) * 0.02;
            
            head.rotation.x = Math.sin(time * 0.8) * 0.05;
            head.rotation.y = Math.sin(time * 0.6) * 0.08;
            
            const breathe = Math.sin(time * idleSpeed) * 0.03;
            body.position.y = body.userData.originalY + breathe;
            head.position.y = head.userData.originalY + breathe;
            
            leftArm.rotation.x = Math.sin(time * idleSpeed * 0.5) * 0.05;
            rightArm.rotation.x = Math.cos(time * idleSpeed * 0.5) * 0.05;
            
            leftFist.position.y = 0.9;
            rightFist.position.y = 0.9;
            leftFist.position.x = -1.8;
            rightFist.position.x = 1.8;
            
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
        }
    }
}
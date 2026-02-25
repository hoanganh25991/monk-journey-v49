import * as THREE from '../../../libs/three/three.module.js';
import { EnemyModel } from './EnemyModel.js';

export class ZombieModel extends EnemyModel {
    constructor(enemy, modelGroup) {
        super(enemy, modelGroup);
    }
    
    createModel() {
        // Create body (slightly hunched box)
        const bodyGeometry = new THREE.BoxGeometry(0.8, 1, 0.4);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.enemy.color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.rotation.x = 0.2;
        body.castShadow = true;
        
        this.modelGroup.add(body);
        
        // Create head (deformed sphere)
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: this.enemy.color });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.2;
        head.position.z = 0.1;
        head.scale.set(1, 0.9, 1.1);
        head.castShadow = true;
        
        this.modelGroup.add(head);
        
        // Create arms (uneven cylinders)
        const leftArmGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8);
        const rightArmGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: this.enemy.color });
        
        // Left arm (longer)
        const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
        leftArm.position.set(-0.5, 0.6, 0);
        leftArm.rotation.z = Math.PI / 3;
        leftArm.castShadow = true;
        
        this.modelGroup.add(leftArm);
        
        // Right arm (shorter)
        const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
        rightArm.position.set(0.5, 0.6, 0);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        
        this.modelGroup.add(rightArm);
        
        // Create legs (uneven cylinders)
        const leftLegGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8);
        const rightLegGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.5, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: this.enemy.color });
        
        // Left leg (normal)
        const leftLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
        leftLeg.position.set(-0.25, 0, 0);
        leftLeg.castShadow = true;
        
        this.modelGroup.add(leftLeg);
        
        // Right leg (shorter)
        const rightLeg = new THREE.Mesh(rightLegGeometry, legMaterial);
        rightLeg.position.set(0.25, -0.05, 0);
        rightLeg.castShadow = true;
        
        this.modelGroup.add(rightLeg);
        
        // Add some torn clothes
        const clothGeometry = new THREE.BoxGeometry(0.9, 0.4, 0.5);
        const clothMaterial = new THREE.MeshStandardMaterial({ color: 0x554433 });
        const cloth = new THREE.Mesh(clothGeometry, clothMaterial);
        cloth.position.y = 0.7;
        cloth.castShadow = true;
        
        this.modelGroup.add(cloth);
    }
    
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
        
        if (!body.userData.initialized) {
            body.userData.originalY = body.position.y;
            head.userData.originalY = head.position.y;
            body.userData.initialized = true;
        }
        
        if (this.enemy.state.isAttacking) {
            const attackSpeed = 7;
            const attackCycle = (time * attackSpeed) % (Math.PI * 2);
            
            this.modelGroup.rotation.z = 0;
            this.modelGroup.rotation.x = 0;
            
            if (attackCycle < Math.PI) {
                const progress = attackCycle / Math.PI;
                leftArm.rotation.x = -progress * Math.PI * 0.6;
                leftArm.rotation.z = Math.PI / 3 + progress * 0.3;
                rightArm.rotation.x = -progress * Math.PI * 0.5;
                rightArm.rotation.z = -Math.PI / 4 - progress * 0.2;
            } else {
                const progress = (attackCycle - Math.PI) / Math.PI;
                leftArm.rotation.x = -Math.PI * 0.6 + progress * Math.PI * 0.6;
                leftArm.rotation.z = Math.PI / 3 + 0.3 - progress * 0.3;
                rightArm.rotation.x = -Math.PI * 0.5 + progress * Math.PI * 0.5;
                rightArm.rotation.z = -Math.PI / 4 - 0.2 + progress * 0.2;
            }
            
            head.rotation.x = Math.sin(time * attackSpeed) * 0.1;
            
        } else if (this.enemy.state.isMoving) {
            const walkSpeed = 4;
            const shambleAmp = 0.08;
            
            this.modelGroup.rotation.z = Math.sin(time * walkSpeed * 0.5) * shambleAmp;
            this.modelGroup.rotation.x = 0.15;
            
            leftLeg.rotation.x = Math.sin(time * walkSpeed) * 0.35;
            rightLeg.rotation.x = -Math.sin(time * walkSpeed) * 0.3;
            
            leftArm.rotation.x = Math.sin(time * walkSpeed * 0.8) * 0.3;
            leftArm.rotation.z = Math.PI / 3 + Math.sin(time * walkSpeed * 0.5) * 0.1;
            rightArm.rotation.x = -Math.sin(time * walkSpeed * 0.8) * 0.25;
            rightArm.rotation.z = -Math.PI / 4;
            
            const bodyBob = Math.abs(Math.sin(time * walkSpeed)) * 0.1;
            body.position.y = body.userData.originalY + bodyBob;
            head.position.y = head.userData.originalY + bodyBob;
            
            head.rotation.x = Math.sin(time * walkSpeed * 1.2) * 0.08;
            head.rotation.y = Math.sin(time * walkSpeed * 0.6) * 0.12;
            
        } else {
            const idleSpeed = 1.2;
            
            this.modelGroup.rotation.z = Math.sin(time * idleSpeed) * 0.04;
            this.modelGroup.rotation.x = 0.05;
            
            head.rotation.x = Math.sin(time * 0.9) * 0.1;
            head.rotation.y = Math.sin(time * 0.7) * 0.15;
            
            const breathe = Math.sin(time * idleSpeed) * 0.04;
            body.position.y = body.userData.originalY + breathe;
            head.position.y = head.userData.originalY + breathe;
            
            leftArm.rotation.x = Math.sin(time * idleSpeed * 0.5) * 0.08;
            leftArm.rotation.z = Math.PI / 3;
            rightArm.rotation.x = Math.cos(time * idleSpeed * 0.5) * 0.06;
            rightArm.rotation.z = -Math.PI / 4;
            
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
        }
    }
}
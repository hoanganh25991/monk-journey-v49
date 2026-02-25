import * as THREE from '../../../libs/three/three.module.js';
import { EnemyModel } from './EnemyModel.js';

export class ShadowBeastModel extends EnemyModel {
    constructor(enemy, modelGroup) {
        super(enemy, modelGroup);
    }
    
    createModel() {
        // Create body (dark, amorphous shape)
        const bodyGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            roughness: 1.0,
            metalness: 0.0,
            transparent: true,
            opacity: 0.8
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8;
        body.scale.set(1, 0.8, 1.2);
        body.castShadow = true;
        
        this.modelGroup.add(body);
        
        // Create head (part of the amorphous shape)
        const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            roughness: 1.0,
            metalness: 0.0,
            transparent: true,
            opacity: 0.8
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        
        this.modelGroup.add(head);
        
        // Create glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.0
        });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 1.6, 0.3);
        
        this.modelGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 1.6, 0.3);
        
        this.modelGroup.add(rightEye);
        
        // Create tendrils/arms
        const tendrilGeometry = new THREE.CylinderGeometry(0.1, 0.05, 1.2, 8);
        const tendrilMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            roughness: 1.0,
            metalness: 0.0,
            transparent: true,
            opacity: 0.7
        });
        
        // Create 4 tendrils
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const tendril = new THREE.Mesh(tendrilGeometry, tendrilMaterial);
            tendril.position.set(
                Math.cos(angle) * 0.5,
                0.8,
                Math.sin(angle) * 0.5
            );
            tendril.rotation.x = Math.PI / 2;
            tendril.rotation.z = angle;
            tendril.castShadow = true;
            
            this.modelGroup.add(tendril);
        }
        
        // Create shadow aura
        const auraGeometry = new THREE.RingGeometry(1, 1.5, 32);
        const auraMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = 0.1;
        
        this.modelGroup.add(aura);
    }
    
    updateAnimations(delta) {
        if (!this.modelGroup || this.modelGroup.children.length < 9) {
            return;
        }
        
        const time = Date.now() * 0.001;
        
        const body = this.modelGroup.children[0];
        const head = this.modelGroup.children[1];
        const leftEye = this.modelGroup.children[2];
        const rightEye = this.modelGroup.children[3];
        const aura = this.modelGroup.children[8];
        
        if (!body.userData.initialized) {
            body.userData.originalY = body.position.y;
            head.userData.originalY = head.position.y;
            body.userData.initialized = true;
        }
        
        const morphSpeed = 2;
        const morphAmp = 0.15;
        body.scale.x = 1 + Math.sin(time * morphSpeed) * morphAmp;
        body.scale.y = 0.8 + Math.cos(time * morphSpeed * 1.3) * morphAmp;
        body.scale.z = 1.2 + Math.sin(time * morphSpeed * 0.8) * morphAmp;
        
        head.scale.x = 1 + Math.sin(time * morphSpeed * 1.5) * 0.1;
        head.scale.y = 1 + Math.cos(time * morphSpeed * 1.2) * 0.1;
        head.scale.z = 1 + Math.sin(time * morphSpeed * 0.9) * 0.1;
        
        const eyePulse = 1.0 + Math.sin(time * 5) * 0.3;
        leftEye.scale.set(eyePulse, eyePulse, eyePulse);
        rightEye.scale.set(eyePulse, eyePulse, eyePulse);
        if (leftEye.material) {
            leftEye.material.emissiveIntensity = 0.8 + Math.sin(time * 6) * 0.4;
            rightEye.material.emissiveIntensity = 0.8 + Math.sin(time * 6) * 0.4;
        }
        
        if (aura) {
            aura.rotation.z = time * 0.5;
            const auraScale = 1.0 + Math.sin(time * 2) * 0.2;
            aura.scale.set(auraScale, auraScale, 1);
            if (aura.material) {
                aura.material.opacity = 0.2 + Math.sin(time * 3) * 0.15;
            }
        }
        
        for (let i = 4; i < 8; i++) {
            const tendril = this.modelGroup.children[i];
            if (tendril) {
                const baseAngle = ((i - 4) / 4) * Math.PI * 2;
                const waveAngle = baseAngle + time * 2;
                const waveRadius = 0.5 + Math.sin(time * 3 + baseAngle) * 0.2;
                
                tendril.position.x = Math.cos(waveAngle) * waveRadius;
                tendril.position.z = Math.sin(waveAngle) * waveRadius;
                tendril.rotation.z = waveAngle;
                
                const tendrilScale = 1.0 + Math.sin(time * 4 + baseAngle) * 0.3;
                tendril.scale.y = tendrilScale;
            }
        }
        
        if (this.enemy.state.isAttacking) {
            const attackSpeed = 10;
            const attackIntensity = Math.sin(time * attackSpeed);
            
            body.scale.x = 1 + attackIntensity * 0.3;
            body.scale.z = 1.2 + attackIntensity * 0.3;
            
            for (let i = 4; i < 8; i++) {
                const tendril = this.modelGroup.children[i];
                if (tendril) {
                    const baseAngle = ((i - 4) / 4) * Math.PI * 2;
                    const attackAngle = baseAngle + time * 5;
                    const attackRadius = 0.8 + Math.sin(time * attackSpeed) * 0.4;
                    
                    tendril.position.x = Math.cos(attackAngle) * attackRadius;
                    tendril.position.z = Math.sin(attackAngle) * attackRadius;
                    tendril.scale.y = 1.5 + Math.sin(time * attackSpeed) * 0.5;
                }
            }
            
            if (aura) {
                aura.rotation.z = time * 2;
                const attackAuraScale = 1.5 + Math.sin(time * attackSpeed) * 0.5;
                aura.scale.set(attackAuraScale, attackAuraScale, 1);
            }
            
        } else if (this.enemy.state.isMoving) {
            const hover = Math.sin(time * 4) * 0.08;
            body.position.y = body.userData.originalY + hover;
            head.position.y = head.userData.originalY + hover;
        }
    }
}
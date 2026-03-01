import * as THREE from '../../../libs/three/three.module.js';
import { fastSin, fastCos } from 'utils/FastMath.js';
import { EnemyModel } from './EnemyModel.js';

export class NecromancerModel extends EnemyModel {
    static _worldQuat = new THREE.Quaternion();

    constructor(enemy, modelGroup) {
        super(enemy, modelGroup);
    }
    
    createModel() {
        // Create body (robed figure)
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1.8, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x330033,
            roughness: 0.9,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        
        this.modelGroup.add(body);
        
        // Create head (pointed cone, purple like the robe)
        const headGeometry = new THREE.ConeGeometry(0.35, 0.5, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x330033,
            roughness: 0.9,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.9; // cone center: point ends up at ~2.15
        head.castShadow = true;
        
        this.modelGroup.add(head);
        
        // Create staff
        const staffGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
        const staffMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x553311,
            roughness: 0.8,
            metalness: 0.2
        });
        const staff = new THREE.Mesh(staffGeometry, staffMaterial);
        staff.position.set(0.6, 1.0, 0);
        staff.rotation.z = Math.PI / 12;
        staff.castShadow = true;
        
        this.modelGroup.add(staff);
        
        // Create staff orb
        const orbGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const orbMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x9900cc,
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0x330066,
            emissiveIntensity: 0.5
        });
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        orb.position.set(0.6, 2.0, 0);
        orb.castShadow = true;
        
        this.modelGroup.add(orb);
        
        // Add necromancer lord specific elements
        if (this.enemy.type === 'necromancer_lord') {
            // Create floating skulls
            const skullGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const skullMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xdddddd,
                roughness: 0.8,
                metalness: 0.2
            });
            
            // Create 3 floating skulls
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                const skull = new THREE.Mesh(skullGeometry, skullMaterial);
                skull.position.set(
                    fastCos(angle) * 0.8,
                    1.5,
                    fastSin(angle) * 0.8
                );
                skull.castShadow = true;
                
                this.modelGroup.add(skull);
            }
            
            // Create larger staff orb
            orb.scale.set(1.5, 1.5, 1.5);
            orb.material.emissiveIntensity = 0.8;
            
            // Create aura
            const auraGeometry = new THREE.RingGeometry(1, 1.1, 32);
            const auraMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x9900cc,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            const aura = new THREE.Mesh(auraGeometry, auraMaterial);
            aura.rotation.x = -Math.PI / 2;
            aura.position.y = 0.1;
            
            this.modelGroup.add(aura);
        }
    }
    
    updateAnimations(delta) {
        // Call the base class animations
        super.updateAnimations(delta);
        
        // Necromancer specific animations
        const time = Date.now() * 0.001; // Convert to seconds
        const root = this.getAnimationRoot();
        if (!root || root.children.length < 4) return;

        // Use model group world rotation so we work with LOD (root may be fullDetailGroup)
        this.modelGroup.updateMatrixWorld(true);
        const _worldQuat = NecromancerModel._worldQuat;
        this.modelGroup.getWorldQuaternion(_worldQuat);
        _worldQuat.invert();

        // Keep cone head upright in world space
        const head = root.children[1];
        if (head) head.quaternion.copy(_worldQuat);

        const staff = root.children[2];
        const orb = root.children[3];

        // Animate the orb pulsing
        if (orb) {
            const pulseFactor = 1.0 + fastSin(time * 2.0) * 0.2;
            orb.scale.set(pulseFactor, pulseFactor, pulseFactor);
            orb.material.emissiveIntensity = 0.5 + fastSin(time * 3.0) * 0.3;
        }

        // Attack animation - raise staff and make orb glow brighter
        if (this.enemy.state.isAttacking && staff && orb) {
            staff.rotation.z = Math.PI / 12 + fastSin(time * 8.0) * 0.3;
            orb.material.emissiveIntensity = 1.0 + fastSin(time * 10.0) * 0.5;
            const attackPulse = 1.0 + fastSin(time * 15.0) * 0.5;
            orb.scale.set(attackPulse, attackPulse, attackPulse);
        }

        // Animate floating skulls for necromancer lord
        if (this.enemy.type === 'necromancer_lord') {
            for (let i = 4; i < 7; i++) {
                const skull = root.children[i];
                if (skull) {
                    const baseAngle = ((i - 4) / 3) * Math.PI * 2;
                    const angle = baseAngle + time * 0.5;
                    skull.position.x = fastCos(angle) * 0.8;
                    skull.position.z = fastSin(angle) * 0.8;
                    skull.position.y = 1.5 + fastSin(time * 2.0 + baseAngle) * 0.2;
                    if (this.enemy.state.isAttacking) {
                        skull.position.x = fastCos(angle) * (0.8 + fastSin(time * 8.0) * 0.3);
                        skull.position.z = fastSin(angle) * (0.8 + fastSin(time * 8.0) * 0.3);
                        skull.rotation.y = time * 10.0;
                    } else {
                        skull.rotation.y = time * 2.0;
                    }
                }
            }
        }
    }
}
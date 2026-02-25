import * as THREE from '../../libs/three/three.module.js';
import { fastSin, fastCos } from '../utils/FastMath.js';
import { ItemModelFactory } from '../items/models/ItemModelFactory.js';

/**
 * PlayerEquipmentVisuals - Manages add-on models for equipped items
 * Uses ItemModelFactory to create proper item models (not procedural meshes)
 * that attach to the player as modular add-ons
 */
export class PlayerEquipmentVisuals {
    constructor(scene, playerModel, game = null) {
        this.scene = scene;
        this.playerModel = playerModel;
        this.game = game;
        
        this.weaponMesh = null;
        this.itemModelInstances = [];  // ItemModel instances for updateAnimations
        this.armorEffects = [];
        this.elementalParticles = [];
        this.glowEffects = [];
        
        this.attachmentPoints = {
            rightHand: null,
            leftHand: null,
            back: null,
            chest: null,
            head: null,
            leftShoulder: null,
            rightShoulder: null,
            shoulderCenter: null,
            waist: null,
            feet: null,
            handsCenter: null
        };
    }
    
    /**
     * Initialize attachment points on player model
     */
    initAttachmentPoints() {
        if (!this.playerModel || !this.playerModel.modelGroup) {
            return;
        }
        
        const modelGroup = this.playerModel.modelGroup;
        
        this.attachmentPoints.rightHand = new THREE.Group();
        this.attachmentPoints.rightHand.position.set(0.5, 1.2, 0.3);
        modelGroup.add(this.attachmentPoints.rightHand);
        
        this.attachmentPoints.leftHand = new THREE.Group();
        this.attachmentPoints.leftHand.position.set(-0.5, 1.2, 0.3);
        modelGroup.add(this.attachmentPoints.leftHand);
        
        this.attachmentPoints.back = new THREE.Group();
        this.attachmentPoints.back.position.set(0, 1.0, -0.4);
        modelGroup.add(this.attachmentPoints.back);
        
        this.attachmentPoints.chest = new THREE.Group();
        this.attachmentPoints.chest.position.set(0, 1.0, 0);
        modelGroup.add(this.attachmentPoints.chest);
        
        this.attachmentPoints.head = new THREE.Group();
        this.attachmentPoints.head.position.set(0, 1.7, 0);
        modelGroup.add(this.attachmentPoints.head);

        this.attachmentPoints.leftShoulder = new THREE.Group();
        this.attachmentPoints.leftShoulder.position.set(-0.4, 1.5, 0.05);
        modelGroup.add(this.attachmentPoints.leftShoulder);

        this.attachmentPoints.rightShoulder = new THREE.Group();
        this.attachmentPoints.rightShoulder.position.set(0.4, 1.5, 0.05);
        modelGroup.add(this.attachmentPoints.rightShoulder);

        this.attachmentPoints.shoulderCenter = new THREE.Group();
        this.attachmentPoints.shoulderCenter.position.set(0, 1.5, 0.05);
        modelGroup.add(this.attachmentPoints.shoulderCenter);

        this.attachmentPoints.waist = new THREE.Group();
        this.attachmentPoints.waist.position.set(0, 0.95, 0.08);
        modelGroup.add(this.attachmentPoints.waist);

        this.attachmentPoints.feet = new THREE.Group();
        this.attachmentPoints.feet.position.set(0, 0.15, 0.15);
        modelGroup.add(this.attachmentPoints.feet);

        this.attachmentPoints.handsCenter = new THREE.Group();
        this.attachmentPoints.handsCenter.position.set(0, 1.2, 0.35);
        modelGroup.add(this.attachmentPoints.handsCenter);
    }
    
    /**
     * Update equipment visuals based on inventory
     */
    updateEquipmentVisuals(equipment) {
        if (!equipment) return;
        
        this.clearAllVisuals();
        
        if (equipment.weapon) {
            this.createWeaponVisual(equipment.weapon);
        }
        
        if (equipment.armor) {
            this.createArmorVisual(equipment.armor);
        }
        
        if (equipment.helmet) {
            this.createHelmetVisual(equipment.helmet);
        }

        if (equipment.gloves) {
            this.createGlovesVisual(equipment.gloves);
        }

        if (equipment.boots) {
            this.createBootsVisual(equipment.boots);
        }

        if (equipment.belt) {
            this.createBeltVisual(equipment.belt);
        }

        if (equipment.shoulder) {
            this.createShoulderVisual(equipment.shoulder);
        }
        
        if (equipment.accessory1 || equipment.accessory2) {
            this.createAccessoryEffects(equipment.accessory1, equipment.accessory2);
        }
    }
    
    /**
     * Create weapon visual using ItemModelFactory add-on models
     * Uses proper item models (StaffModel, DaggerModel, etc.) instead of procedural meshes
     */
    createWeaponVisual(weapon) {
        if (!weapon || !this.attachmentPoints.rightHand) return;
        
        const item = this.ensureItemShape(weapon, 'weapon');
        const weaponGroup = new THREE.Group();
        weaponGroup.name = 'weapon-addon';
        this.attachmentPoints.rightHand.add(weaponGroup);
        
        try {
            const itemModel = ItemModelFactory.createModel(item, weaponGroup);
            this.weaponMesh = weaponGroup;
            this.itemModelInstances.push(itemModel);
            
            ItemModelFactory.applyRarityEffects(itemModel, weapon.rarity || 'common');
            
            if (weapon.visual && weapon.visual.effects) {
                this.addWeaponEffects(this.weaponMesh, weapon);
            }
        } catch (err) {
            console.warn('PlayerEquipmentVisuals: ItemModelFactory failed, using fallback:', err);
            this.attachmentPoints.rightHand.remove(weaponGroup);
            this.createWeaponVisualFallback(weapon);
        }
    }
    
    /**
     * Ensure item has shape expected by ItemModelFactory (id, type, subType)
     */
    ensureItemShape(item, type) {
        return {
            id: item.id || item.templateId || item.name || 'equipped',
            type: item.type || type,
            subType: item.subType || (type === 'weapon' ? 'staff' : ''),
            rarity: item.rarity || 'common',
            ...item
        };
    }
    
    /**
     * Fallback when ItemModelFactory fails (e.g. unknown subtype)
     */
    createWeaponVisualFallback(weapon) {
        let mesh;
        switch (weapon.subType) {
            case 'fist': mesh = this.createFistWeaponVisual(weapon); break;
            case 'staff': mesh = this.createStaffWeaponVisual(weapon); break;
            case 'sword': mesh = this.createSwordWeaponVisual(weapon); break;
            case 'dagger': mesh = this.createDaggerWeaponVisual(weapon); break;
            default: mesh = this.createDefaultWeaponVisual(weapon);
        }
        if (mesh) {
            this.attachmentPoints.rightHand.add(mesh);
            this.weaponMesh = mesh;
            if (weapon.visual && weapon.visual.effects) {
                this.addWeaponEffects(mesh, weapon);
            }
        }
    }
    
    /**
     * Create fist weapon visual (gauntlets)
     */
    createFistWeaponVisual(weapon) {
        const group = new THREE.Group();
        
        const gauntletGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.2);
        const color = this.getWeaponColor(weapon);
        const gauntletMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.8
        });
        
        const rightGauntlet = new THREE.Mesh(gauntletGeometry, gauntletMaterial);
        rightGauntlet.position.set(0, -0.1, 0);
        rightGauntlet.castShadow = true;
        group.add(rightGauntlet);
        
        const leftGauntlet = new THREE.Mesh(gauntletGeometry, gauntletMaterial);
        leftGauntlet.position.set(-1, -0.1, 0);
        leftGauntlet.castShadow = true;
        
        if (this.attachmentPoints.leftHand) {
            this.attachmentPoints.leftHand.add(leftGauntlet);
        }
        
        if (weapon.rarity === 'legendary' || weapon.rarity === 'mythic') {
            const spikeGeometry = new THREE.ConeGeometry(0.03, 0.15, 6);
            for (let i = 0; i < 3; i++) {
                const spike = new THREE.Mesh(spikeGeometry, gauntletMaterial);
                spike.position.set(i * 0.05 - 0.05, 0.05, 0.12);
                spike.rotation.x = Math.PI / 2;
                rightGauntlet.add(spike);
                
                const leftSpike = new THREE.Mesh(spikeGeometry, gauntletMaterial);
                leftSpike.position.set(i * 0.05 - 0.05, 0.05, 0.12);
                leftSpike.rotation.x = Math.PI / 2;
                leftGauntlet.add(leftSpike);
            }
        }
        
        return group;
    }
    
    /**
     * Create staff weapon visual
     */
    createStaffWeaponVisual(weapon) {
        const group = new THREE.Group();
        
        const color = this.getWeaponColor(weapon);
        
        const staffGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8);
        const staffMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const staff = new THREE.Mesh(staffGeometry, staffMaterial);
        staff.position.set(0, -0.5, 0);
        staff.castShadow = true;
        group.add(staff);
        
        const orbGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const orbMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.7,
            emissive: color,
            emissiveIntensity: 0.5
        });
        
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        orb.position.set(0, 0.3, 0);
        orb.castShadow = true;
        orb.userData.isOrb = true;
        group.add(orb);
        
        if (weapon.rarity === 'legendary' || weapon.rarity === 'mythic') {
            const ringGeometry = new THREE.TorusGeometry(0.2, 0.02, 8, 16);
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.8
            });
            
            for (let i = 0; i < 2; i++) {
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.position.set(0, 0.3, 0);
                ring.rotation.x = Math.PI / 2;
                ring.userData.ringIndex = i;
                group.add(ring);
            }
        }
        
        return group;
    }
    
    /**
     * Create sword weapon visual
     */
    createSwordWeaponVisual(weapon) {
        const group = new THREE.Group();
        
        const color = this.getWeaponColor(weapon);
        
        const bladeGeometry = new THREE.BoxGeometry(0.08, 0.8, 0.02);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.9
        });
        
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(0, 0.2, 0);
        blade.castShadow = true;
        group.add(blade);
        
        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, -0.3, 0);
        handle.castShadow = true;
        group.add(handle);
        
        const guardGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.05);
        const guard = new THREE.Mesh(guardGeometry, bladeMaterial);
        guard.position.set(0, -0.15, 0);
        guard.castShadow = true;
        group.add(guard);
        
        return group;
    }
    
    /**
     * Create dagger weapon visual (smaller blade)
     */
    createDaggerWeaponVisual(weapon) {
        const group = new THREE.Group();
        const color = this.getWeaponColor(weapon);
        
        const bladeGeometry = new THREE.BoxGeometry(0.04, 0.35, 0.015);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.9
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(0, 0.1, 0);
        blade.castShadow = true;
        group.add(blade);
        
        const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.7,
            metalness: 0.3
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, -0.08, 0);
        handle.castShadow = true;
        group.add(handle);
        
        return group;
    }
    
    /**
     * Create default weapon visual
     */
    createDefaultWeaponVisual(weapon) {
        const group = new THREE.Group();
        
        const color = this.getWeaponColor(weapon);
        const geometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.7
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        group.add(mesh);
        
        return group;
    }
    
    /**
     * Get weapon color based on rarity and element
     */
    getWeaponColor(weapon) {
        const rarityColors = {
            common: 0xCCCCCC,
            uncommon: 0x1EFF00,
            rare: 0x0070DD,
            epic: 0xA335EE,
            legendary: 0xFF8000,
            mythic: 0xFF0000
        };
        
        return rarityColors[weapon.rarity] || 0xCCCCCC;
    }
    
    /**
     * Add elemental effects to weapon
     */
    addWeaponEffects(weaponMesh, weapon) {
        if (!weapon.visual || !weapon.visual.effects) return;
        
        weapon.visual.effects.forEach(effect => {
            if (effect.type === 'glow') {
                this.addGlowEffect(weaponMesh, effect);
            } else if (effect.type === 'particles') {
                this.addParticleEffect(weaponMesh, effect);
            } else if (effect.type === 'trail') {
                this.addTrailEffect(weaponMesh, effect);
            }
        });
    }
    
    /**
     * Add glow effect to mesh
     */
    addGlowEffect(mesh, effect) {
        const glowGeometry = mesh.children[0]?.geometry || new THREE.SphereGeometry(0.2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: effect.color || 0xFFFFFF,
            transparent: true,
            opacity: 0.3
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.scale.set(1.2, 1.2, 1.2);
        glow.userData.isGlow = true;
        glow.userData.intensity = effect.intensity || 1.0;
        
        mesh.add(glow);
        this.glowEffects.push(glow);
    }
    
    /**
     * Add particle effect to mesh
     */
    addParticleEffect(mesh, effect) {
        const particleCount = 15;
        const particleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: this.getEffectColor(effect.effect),
            transparent: true,
            opacity: 0.7
        });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 0.3;
            particle.position.set(
                Math.cos(angle) * radius,
                (i / particleCount) * 0.5,
                Math.sin(angle) * radius
            );
            
            particle.userData.angle = angle;
            particle.userData.radius = radius;
            particle.userData.speed = 0.5 + Math.random() * 0.5;
            
            mesh.add(particle);
            this.elementalParticles.push(particle);
        }
    }
    
    /**
     * Get effect color based on effect name
     */
    getEffectColor(effectName) {
        const colors = {
            golden_sparkle: 0xFFD700,
            flame_aura: 0xFF4500,
            frost_aura: 0x00BFFF,
            lightning_aura: 0xFFFF00,
            shadow_aura: 0x4B0082,
            nature_aura: 0x00FF00
        };
        
        return colors[effectName] || 0xFFFFFF;
    }
    
    /**
     * Create armor visual effects
     */
    createArmorVisual(armor) {
        if (!armor || !this.attachmentPoints.chest) return;
        
        // Always show armor chest overlay (subtle for common, stronger for rare+)
        this.createArmorChestOverlay(armor);
        if (armor.rarity === 'legendary' || armor.rarity === 'mythic') {
            this.createArmorAura(armor);
        }
    }
    
    /**
     * Create subtle armor overlay on chest (visible for all rarities)
     */
    createArmorChestOverlay(armor) {
        const color = this.getWeaponColor(armor);
        const overlayGeometry = new THREE.BoxGeometry(0.5, 0.4, 0.15);
        const overlayMaterial = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.6,
            metalness: 0.4,
            transparent: true,
            opacity: 0.7
        });
        const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlay.position.set(0, 0, 0.08);
        overlay.castShadow = true;
        overlay.userData.isArmorOverlay = true;
        this.attachmentPoints.chest.add(overlay);
        this.armorEffects.push(overlay);
    }
    
    /**
     * Create armor aura effect
     */
    createArmorAura(armor) {
        const color = this.getWeaponColor(armor);
        
        const auraGeometry = new THREE.RingGeometry(0.8, 1.0, 32);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = 0.1;
        aura.userData.isAura = true;
        
        if (this.playerModel && this.playerModel.modelGroup) {
            this.playerModel.modelGroup.add(aura);
            this.armorEffects.push(aura);
        }
    }
    
    /**
     * Create helmet visual
     */
    createHelmetVisual(helmet) {
        if (!helmet || !this.attachmentPoints.head) return;

        const item = this.ensureItemShape(helmet, 'armor');
        if (item.subType !== 'helmet') item.subType = 'helmet';

        const helmetGroup = new THREE.Group();
        helmetGroup.name = 'helmet-addon';
        this.attachmentPoints.head.add(helmetGroup);

        try {
            const itemModel = ItemModelFactory.createModel(item, helmetGroup);
            this.itemModelInstances.push(itemModel);
            ItemModelFactory.applyRarityEffects(itemModel, helmet.rarity || 'common');
            helmetGroup.scale.multiplyScalar(4); // HelmetModel is scaled for item preview; scale up for player
            this.armorEffects.push(helmetGroup);
        } catch (err) {
            console.warn('PlayerEquipmentVisuals: HelmetModel failed, using fallback:', err);
            const color = this.getWeaponColor(helmet);
            const helmetGeometry = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const helmetMaterial = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.3,
                metalness: 0.9
            });
            const helmetMesh = new THREE.Mesh(helmetGeometry, helmetMaterial);
            helmetMesh.castShadow = true;
            this.attachmentPoints.head.add(helmetMesh);
            this.armorEffects.push(helmetMesh);
        }
    }

    /**
     * Create gloves visual (hands)
     */
    createGlovesVisual(gloves) {
        if (!gloves || !this.attachmentPoints.handsCenter) return;

        const item = this.ensureItemShape(gloves, 'armor');
        if (item.subType !== 'gloves') item.subType = 'gloves';

        const glovesGroup = new THREE.Group();
        glovesGroup.name = 'gloves-addon';
        this.attachmentPoints.handsCenter.add(glovesGroup);

        try {
            const itemModel = ItemModelFactory.createModel(item, glovesGroup);
            this.itemModelInstances.push(itemModel);
            ItemModelFactory.applyRarityEffects(itemModel, gloves.rarity || 'common');
            glovesGroup.scale.multiplyScalar(3.5);
            this.armorEffects.push(glovesGroup);
        } catch (err) {
            console.warn('PlayerEquipmentVisuals: GlovesModel failed, using fallback:', err);
            const color = this.getWeaponColor(gloves);
            const gauntletGeometry = new THREE.BoxGeometry(0.15, 0.12, 0.2);
            const gauntletMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.5 });
            [-0.2, 0.2].forEach(x => {
                const g = new THREE.Mesh(gauntletGeometry, gauntletMaterial);
                g.position.set(x, 0, 0);
                g.castShadow = true;
                glovesGroup.add(g);
            });
            this.attachmentPoints.handsCenter.add(glovesGroup);
            this.armorEffects.push(glovesGroup);
        }
    }

    /**
     * Create boots visual (feet)
     */
    createBootsVisual(boots) {
        if (!boots || !this.attachmentPoints.feet) return;

        const item = this.ensureItemShape(boots, 'armor');
        if (item.subType !== 'boots') item.subType = 'boots';

        const bootsGroup = new THREE.Group();
        bootsGroup.name = 'boots-addon';
        this.attachmentPoints.feet.add(bootsGroup);

        try {
            const itemModel = ItemModelFactory.createModel(item, bootsGroup);
            this.itemModelInstances.push(itemModel);
            ItemModelFactory.applyRarityEffects(itemModel, boots.rarity || 'common');
            bootsGroup.scale.multiplyScalar(3);
            this.armorEffects.push(bootsGroup);
        } catch (err) {
            console.warn('PlayerEquipmentVisuals: BootsModel failed, using fallback:', err);
            const color = this.getWeaponColor(boots);
            const bootGeometry = new THREE.BoxGeometry(0.12, 0.1, 0.25);
            const bootMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3 });
            [-0.12, 0.12].forEach(x => {
                const b = new THREE.Mesh(bootGeometry, bootMaterial);
                b.position.set(x, 0, 0);
                b.castShadow = true;
                bootsGroup.add(b);
            });
            this.attachmentPoints.feet.add(bootsGroup);
            this.armorEffects.push(bootsGroup);
        }
    }

    /**
     * Create belt visual (waist)
     */
    createBeltVisual(belt) {
        if (!belt || !this.attachmentPoints.waist) return;

        const item = this.ensureItemShape(belt, 'armor');
        if (item.subType !== 'belt') item.subType = 'belt';

        const beltGroup = new THREE.Group();
        beltGroup.name = 'belt-addon';
        this.attachmentPoints.waist.add(beltGroup);

        try {
            const itemModel = ItemModelFactory.createModel(item, beltGroup);
            this.itemModelInstances.push(itemModel);
            ItemModelFactory.applyRarityEffects(itemModel, belt.rarity || 'common');
            beltGroup.scale.multiplyScalar(3);
            this.armorEffects.push(beltGroup);
        } catch (err) {
            console.warn('PlayerEquipmentVisuals: BeltModel failed, using fallback:', err);
            const color = this.getWeaponColor(belt);
            const beltGeometry = new THREE.TorusGeometry(0.35, 0.04, 8, 32, Math.PI * 1.8);
            const beltMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.4 });
            const beltMesh = new THREE.Mesh(beltGeometry, beltMaterial);
            beltMesh.rotation.x = Math.PI / 2;
            beltMesh.castShadow = true;
            beltGroup.add(beltMesh);
            this.attachmentPoints.waist.add(beltGroup);
            this.armorEffects.push(beltGroup);
        }
    }

    /**
     * Create shoulder visual (pauldrons)
     */
    createShoulderVisual(shoulder) {
        if (!shoulder || !this.attachmentPoints.shoulderCenter) return;

        const item = this.ensureItemShape(shoulder, 'armor');
        if (item.subType !== 'shoulders') item.subType = 'shoulders';

        const shoulderGroup = new THREE.Group();
        shoulderGroup.name = 'shoulder-addon';
        this.attachmentPoints.shoulderCenter.add(shoulderGroup);

        try {
            const itemModel = ItemModelFactory.createModel(item, shoulderGroup);
            this.itemModelInstances.push(itemModel);
            ItemModelFactory.applyRarityEffects(itemModel, shoulder.rarity || 'common');
            shoulderGroup.scale.multiplyScalar(3.5);
            this.armorEffects.push(shoulderGroup);
        } catch (err) {
            console.warn('PlayerEquipmentVisuals: ShoulderModel failed, using fallback:', err);
            const color = this.getWeaponColor(shoulder);
            const pauldronGeometry = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
            const pauldronMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.5 });
            const leftP = new THREE.Mesh(pauldronGeometry, pauldronMaterial.clone());
            leftP.position.set(-0.35, 0, 0);
            leftP.rotation.z = Math.PI / 6;
            leftP.castShadow = true;
            shoulderGroup.add(leftP);
            const rightP = new THREE.Mesh(pauldronGeometry, pauldronMaterial);
            rightP.position.set(0.35, 0, 0);
            rightP.rotation.z = -Math.PI / 6;
            rightP.castShadow = true;
            shoulderGroup.add(rightP);
            this.attachmentPoints.shoulderCenter.add(shoulderGroup);
            this.armorEffects.push(shoulderGroup);
        }
    }
    
    /**
     * Create accessory effects (rings, amulets)
     */
    createAccessoryEffects(accessory1, accessory2) {
        const accessories = [accessory1, accessory2].filter(a => a);
        
        accessories.forEach((accessory, index) => {
            if (accessory.rarity === 'legendary' || accessory.rarity === 'mythic') {
                this.createAccessoryParticles(accessory, index);
            }
        });
    }
    
    /**
     * Create particle effects for accessories
     */
    createAccessoryParticles(accessory, index) {
        const color = this.getWeaponColor(accessory);
        const particleCount = 8;
        
        const particleGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6
        });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            const angle = (i / particleCount) * Math.PI * 2 + index * Math.PI;
            const radius = 0.6 + index * 0.2;
            particle.position.set(
                Math.cos(angle) * radius,
                1.0 + i * 0.1,
                Math.sin(angle) * radius
            );
            
            particle.userData.angle = angle;
            particle.userData.radius = radius;
            particle.userData.speed = 0.3 + Math.random() * 0.3;
            particle.userData.heightOffset = i * 0.1;
            
            if (this.playerModel && this.playerModel.modelGroup) {
                this.playerModel.modelGroup.add(particle);
                this.elementalParticles.push(particle);
            }
        }
    }
    
    /**
     * Update all visual effects (call each frame)
     */
    update(delta) {
        const time = Date.now() * 0.001;

        this.itemModelInstances.forEach(m => {
            if (m && m.updateAnimations) m.updateAnimations(delta);
        });
        
        this.elementalParticles.forEach(particle => {
            if (particle.userData.angle !== undefined) {
                const angle = particle.userData.angle + time * particle.userData.speed;
                const radius = particle.userData.radius + fastSin(time * 2) * 0.1;
                
                particle.position.x = fastCos(angle) * radius;
                particle.position.z = fastSin(angle) * radius;
                
                if (particle.userData.heightOffset !== undefined) {
                    particle.position.y = 1.0 + particle.userData.heightOffset + fastSin(time * 3 + angle) * 0.1;
                }
            }
        });
        
        this.glowEffects.forEach(glow => {
            if (glow.userData.isGlow) {
                const pulse = 1.0 + fastSin(time * 3) * 0.2;
                glow.scale.set(pulse, pulse, pulse);
                
                if (glow.material) {
                    glow.material.opacity = 0.2 + fastSin(time * 2) * 0.15;
                }
            }
        });
        
        this.armorEffects.forEach(effect => {
            if (effect.userData.isAura) {
                effect.rotation.z = time * 0.5;
                const auraScale = 1.0 + fastSin(time * 2) * 0.15;
                effect.scale.set(auraScale, auraScale, 1);
                
                if (effect.material) {
                    effect.material.opacity = 0.25 + fastSin(time * 3) * 0.1;
                }
            }
        });
        
        if (this.weaponMesh) {
            this.weaponMesh.traverse(child => {
                if (child.userData.isOrb && child.material) {
                    const orbPulse = 0.4 + fastSin(time * 4) * 0.2;
                    child.material.emissiveIntensity = orbPulse;
                }
                
                if (child.userData.ringIndex !== undefined) {
                    const ringSpeed = 2 + child.userData.ringIndex;
                    child.rotation.x = Math.PI / 2 + time * ringSpeed;
                }
            });
        }
    }
    
    /**
     * Clear all equipment visuals
     */
    clearAllVisuals() {
        const hadItemModelWeapon = this.itemModelInstances.length > 0;
        this.itemModelInstances.forEach(m => { if (m && m.dispose) m.dispose(); });
        this.itemModelInstances = [];

        if (this.weaponMesh) {
            if (!hadItemModelWeapon) {
                this.weaponMesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
            if (this.weaponMesh.parent) {
                this.weaponMesh.parent.remove(this.weaponMesh);
            }
            this.weaponMesh = null;
        }
        
        this.armorEffects.forEach(effect => {
            if (effect.geometry) effect.geometry.dispose();
            if (effect.material) effect.material.dispose();
            if (effect.parent) effect.parent.remove(effect);
        });
        this.armorEffects = [];
        
        this.elementalParticles.forEach(particle => {
            if (particle.geometry) particle.geometry.dispose();
            if (particle.material) particle.material.dispose();
            if (particle.parent) particle.parent.remove(particle);
        });
        this.elementalParticles = [];
        
        this.glowEffects.forEach(glow => {
            if (glow.geometry) glow.geometry.dispose();
            if (glow.material) glow.material.dispose();
            if (glow.parent) glow.parent.remove(glow);
        });
        this.glowEffects = [];
    }
    
    /**
     * Cleanup all resources
     */
    dispose() {
        this.clearAllVisuals();
        
        Object.values(this.attachmentPoints).forEach(point => {
            if (point && point.parent) {
                point.parent.remove(point);
            }
        });
    }
}

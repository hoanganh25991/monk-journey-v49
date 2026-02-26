import * as THREE from '../../libs/three/three.module.js';
import { ItemModelFactory } from './models/ItemModelFactory.js';
import storageService from '../save-manager/StorageService.js';
import { STORAGE_KEYS } from '../config/storage-keys.js';
import { isItemConsumable, isItemEquippable } from '../config/item-types.js';

/** Manages item drops: visuals, pickup, and level-scaled growth (drops scale with level). */
export class ItemDropManager {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.droppedItems = new Map();
        this.autoRemoveDelay = 10;
        this.autoRemoveDistance = 16 * 16;
        this.pickupCheckInterval = 0.3;
        this.timeSinceLastPickupCheck = 0;
        this.rotationSpeed = 2.0;
    }

    dropItem(item, position) {
        const itemGroup = new THREE.Group();
        itemGroup.position.copy(position);
        itemGroup.position.x += (Math.random() - 0.5) * 0.5;
        itemGroup.position.z += (Math.random() - 0.5) * 0.5;

        const terrainY = (this.game?.world && this.game.world.getTerrainHeight(position.x, position.z)) ?? null;
        itemGroup.position.y = (terrainY != null ? terrainY : position.y) + 0.5;

        const itemModel = ItemModelFactory.createModel(item, itemGroup);
        itemModel.createModel();

        const { color } = ItemModelFactory.getRarityLevelColor(item.rarity || 'common', item.level ?? 1);
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.4, 0.6, 16),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(itemGroup.position);
        ring.position.y += 0.05;
        this.scene.add(ring);

        ItemModelFactory.applyRarityEffects(itemModel, item);
        this.ensureMaterialsSafe(itemGroup);

        this.scene.add(itemGroup);
        const dropId = `drop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        this.droppedItems.set(dropId, { item, group: itemGroup, model: itemModel, ring, dropTime: Date.now() });

        if (this.game?.hudManager) this.game.hudManager.showNotification(`${item.name} dropped!`);
        if (typeof this.game?.notifyItemDropped === 'function') this.game.notifyItemDropped();
        return dropId;
    }
    

    update(delta) {
        if (!this.game?.player) return;
        this.timeSinceLastPickupCheck += delta;
        const shouldCheck = this.timeSinceLastPickupCheck >= this.pickupCheckInterval;
        const playerPos = shouldCheck ? this.game.player.getPosition() : null;
        if (shouldCheck) this.timeSinceLastPickupCheck = 0;

        const autoRemoveSq = this.autoRemoveDistance ** 2;
        const autoPickVal = storageService.loadDataSync(STORAGE_KEYS.AUTO_PICK_ITEMS);
        const autoPick = autoPickVal !== false && autoPickVal !== 'false';

        for (const [id, d] of this.droppedItems.entries()) {
            if (d.group) {
                d.group.rotation.y += delta * this.rotationSpeed;
                if (Math.random() < 0.01 && this.game?.world) {
                    const th = this.game.world.getTerrainHeight(d.group.position.x, d.group.position.z);
                    if (th != null && Math.abs(d.group.position.y - (th + 0.5)) > 0.1) {
                        d.group.position.y = th + 0.5;
                        if (d.ring) d.ring.position.y = th + 0.55;
                    }
                }
            }
            if (shouldCheck && playerPos && d.group) {
                const dx = d.group.position.x - playerPos.x, dz = d.group.position.z - playerPos.z;
                const distSq = dx * dx + dz * dz;
                if (distSq > autoRemoveSq) { this.removeDroppedItem(id, d); continue; }
                if (distSq < 2.25 && autoPick) { this.pickupItem(id); continue; }
            }
            if ((Date.now() - (d.dropTime || 0)) / 1000 >= this.autoRemoveDelay) {
                this.removeDroppedItem(id, d, true);
            }
        }
    }
    
    removeDroppedItem(itemId, itemData, showNotification = false) {
        if (itemData.model?.dispose) itemData.model.dispose();
        if (itemData.ring) {
            itemData.ring.geometry?.dispose();
            itemData.ring.material?.dispose();
            this.scene.remove(itemData.ring);
        }
        if (itemData.group) this.scene.remove(itemData.group);
        this.droppedItems.delete(itemId);
        if (showNotification && this.game?.hudManager) this.game.hudManager.showNotification(`${itemData.item.name} disappeared!`);
    }
    
    pickupItem(itemId) {
        const itemData = this.droppedItems.get(itemId);
        if (!itemData) return;
        const item = itemData.item;
        const hud = this.game?.hudManager;

        if (this.game?.player) {
            this.game.player.addToInventory(item);
            const autoConsume = storageService.loadDataSync(STORAGE_KEYS.AUTO_CONSUME_ITEMS);
            const autoEquip = storageService.loadDataSync(STORAGE_KEYS.AUTO_EQUIP_ITEMS);
            let didConsume = false;
            if ((autoConsume === true || autoConsume === 'true') && isItemConsumable(item) && hud?.components?.inventoryUI?.useConsumableItem) {
                hud.components.inventoryUI.useConsumableItem(item);
                didConsume = true;
            }
            if (hud && !didConsume) {
                hud.showNotification(`Pick ${item.name}`);
                if (isItemEquippable(item)) {
                    if (autoEquip === true || autoEquip === 'true') {
                        const result = this.tryAutoEquip(item);
                        if (result === 'equipped') hud.showNotification(`Equip ${item.name}`, 'equip', { item });
                        else if (result === 'similar') hud.showNotification(`Skip ${item.name} (similar)`, 'skip', { item });
                        else if (result === 'weaker') hud.showNotification(`Skip ${item.name} (weaker)`, 'skip', { item });
                    } else hud.showNotification(`Skip ${item.name} (auto-equip off)`, 'skip', { item });
                }
            }
        }

        if (itemData.model?.dispose) itemData.model.dispose();
        if (itemData.ring) {
            itemData.ring.geometry?.dispose();
            itemData.ring.material?.dispose();
            this.scene.remove(itemData.ring);
        }
        if (itemData.group) this.scene.remove(itemData.group);
        this.droppedItems.delete(itemId);
    }
    
    tryAutoEquip(item) {
        if (!this.game?.player || !isItemEquippable(item)) return 'weaker';
        const inv = this.game.player.inventory;
        let slot = item.type;
        if (item.type === 'accessory') {
            if (item.subType === 'talisman') slot = 'talisman';
            else slot = (!inv.equipment.accessory1 || !inv.equipment.accessory2) ? (inv.equipment.accessory1 ? 'accessory2' : 'accessory1') : 'accessory1';
        }
        if (item.type === 'armor' && item.subType) {
            const map = { helmet: 'helmet', boots: 'boots', gloves: 'gloves', belt: 'belt', shoulders: 'shoulder', robe: 'armor' };
            slot = map[item.subType] || slot;
        }
        if (!Object.prototype.hasOwnProperty.call(inv.equipment, slot)) return 'weaker';
        const current = inv.equipment[slot];
        const stat = (i) => {
            if (!i) return 0;
            const b = i.baseStats || {};
            const s = (i.secondaryStats || []).reduce((sum, x) => sum + (x.value || 0), 0);
            if (slot === 'weapon') return (b.damage || 0) + s;
            if (['armor', 'helmet', 'boots', 'gloves', 'belt', 'shoulder'].includes(slot)) return (b.defense || 0) + s;
            return (b.damage || 0) + (b.defense || 0) + (b.manaBonus || 0) + (b.healthBonus || 0) + s;
        };
        const newS = stat(item), curS = stat(current);
        if (!current || newS > curS) { inv.equipItem(item); return 'equipped'; }
        if (curS > 0 && Math.abs(newS - curS) / curS <= 0.15) return 'similar';
        return 'weaker';
    }

    ensureMaterialsSafe(itemGroup) {
        if (!itemGroup) return;
        itemGroup.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m, i) => {
                if (!m) return;
                if (m.type === 'MeshBasicMaterial' || m.type === 'MeshLambertMaterial') {
                    delete m.roughness; delete m.metalness; delete m.emissiveIntensity;
                }
                m.needsUpdate = true;
            });
        });
    }

    clear() {
        for (const [id, data] of this.droppedItems.entries()) this.removeDroppedItem(id, data);
    }
}
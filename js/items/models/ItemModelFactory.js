import { ItemModel } from './ItemModel.js';
import { StaffModel } from './weapons/StaffModel.js';
import { DaggerModel } from './weapons/DaggerModel.js';
import { FistModel } from './weapons/FistModel.js';
import { HelmetModel } from './armor/HelmetModel.js';
import { RobeModel } from './armor/RobeModel.js';
import { BootsModel } from './armor/BootsModel.js';
import { BeltModel } from './armor/BeltModel.js';
import { GlovesModel } from './armor/GlovesModel.js';
import { ShoulderModel } from './armor/ShoulderModel.js';
import { AmuletModel } from './accessory/AmuletModel.js';
import { TalismanModel } from './accessory/TalismanModel.js';
import { RingModel } from './accessory/RingModel.js';
import { PotionModel } from './consumable/PotionModel.js';
import { FoodModel } from './consumable/FoodModel.js';
import { ScrollModel } from './consumable/ScrollModel.js';
import { CrystalModel } from './consumable/CrystalModel.js';
import { SkillConsumableModel } from './consumable/SkillConsumableModel.js';

/**
 * Factory class for creating item models
 * Selects the appropriate model class based on item type and subtype
 */
export class ItemModelFactory {
    /**
     * Create a new item model
     * @param {Item} item - The item to create a model for
     * @param {THREE.Group} modelGroup - Optional group to add the model to
     * @returns {ItemModel} The created item model
     */
    static createModel(item, modelGroup) {
        const type = item.type;
        const subType = item.subType;
        
        // Select model class based on type and subType
        switch (type) {
            case 'weapon':
                switch (subType) {
                    case 'staff':
                        return new StaffModel(item, modelGroup);
                    case 'dagger':
                        return new DaggerModel(item, modelGroup);
                    case 'fist':
                        return new FistModel(item, modelGroup);
                    default:
                        console.warn(`No specific model for weapon subtype: ${subType}, using default`);
                        return new ItemModel(item, modelGroup);
                }
                
            case 'armor':
                switch (subType) {
                    case 'helmet':
                        return new HelmetModel(item, modelGroup);
                    case 'robe':
                        return new RobeModel(item, modelGroup);
                    case 'boots':
                        return new BootsModel(item, modelGroup);
                    case 'belt':
                        return new BeltModel(item, modelGroup);
                    case 'gloves':
                        return new GlovesModel(item, modelGroup);
                    case 'shoulders':
                        return new ShoulderModel(item, modelGroup);
                    default:
                        console.warn(`No specific model for armor subtype: ${subType}, using default`);
                        return new ItemModel(item, modelGroup);
                }
                
            case 'accessory':
                switch (subType) {
                    case 'amulet':
                        return new AmuletModel(item, modelGroup);
                    case 'talisman':
                        return new TalismanModel(item, modelGroup);
                    case 'ring':
                        return new RingModel(item, modelGroup);
                    // Add more accessory subtypes as they are implemented
                    default:
                        console.warn(`No specific model for accessory subtype: ${subType}, using default`);
                        return new ItemModel(item, modelGroup);
                }
                
            case 'consumable':
                switch (subType) {
                    case 'potion':
                        return new PotionModel(item, modelGroup);
                    case 'food':
                        return new FoodModel(item, modelGroup);
                    case 'scroll':
                        return new ScrollModel(item, modelGroup);
                    case 'crystal':
                        return new CrystalModel(item, modelGroup);
                    case 'skill':
                        return new SkillConsumableModel(item, modelGroup);
                    default:
                        console.warn(`No specific model for consumable subtype: ${subType}, using default`);
                        return new ItemModel(item, modelGroup);
                }
                
            default:
                console.warn(`Unknown item type: ${type}, using default model`);
                return new ItemModel(item, modelGroup);
        }
    }
    
    /**
     * Apply rarity + level-based effects. Higher level = more vivid, cooler, stronger feel.
     * @param {ItemModel} model - The item model
     * @param {string|{ rarity: string, level?: number }} rarityOrItem - Rarity string or item with .rarity and .level
     */
    static applyRarityEffects(model, rarityOrItem) {
        const rarity = typeof rarityOrItem === 'string' ? rarityOrItem : (rarityOrItem?.rarity || 'common');
        const level = (rarityOrItem && typeof rarityOrItem === 'object' && rarityOrItem.level != null) ? rarityOrItem.level : 1;
        const { color, glow } = ItemModelFactory.getRarityLevelColor(rarity, level);
        model.applyColor(color);
        if (glow > 0) model.addGlowEffect(color, glow);
    }

    /**
     * Get drop/ring color and glow from rarity + level. Level scales vividness (muted early → vivid/cool later).
     * @param {string} rarity - Item rarity
     * @param {number} level - Item level
     * @returns {{ color: number, glow: number }}
     */
    static getRarityLevelColor(rarity, level = 1) {
        // Muted (low-level) base colors
        const muted = {
            common: 0x9a9a9a,
            uncommon: 0x4a7c4a,
            rare: 0x3a5090,
            epic: 0x5a3a7a,
            legendary: 0x8a5a2a,
            mythic: 0x7a2a2a
        };
        // Vivid, cooler high-level colors (stronger feel)
        const vivid = {
            common: 0xd4d8e0,
            uncommon: 0x00e676,
            rare: 0x00b8d4,
            epic: 0xb388ff,
            legendary: 0xffab40,
            mythic: 0xff1744
        };
        const glowMax = { common: 0, uncommon: 0.25, rare: 0.4, epic: 0.5, legendary: 0.6, mythic: 0.7 };
        const base = muted[rarity] ?? muted.common;
        const top = vivid[rarity] ?? vivid.common;
        const glowCap = glowMax[rarity] ?? 0;
        // 0 at level 1, 1 by level 50; smooth curve
        const t = Math.min(1, (level - 1) / 45);
        const vividness = t * t;
        const r = Math.round((base >> 16 & 0xff) * (1 - vividness) + (top >> 16 & 0xff) * vividness);
        const g = Math.round((base >> 8 & 0xff) * (1 - vividness) + (top >> 8 & 0xff) * vividness);
        const b = Math.round((base & 0xff) * (1 - vividness) + (top & 0xff) * vividness);
        const color = (r << 16) | (g << 8) | b;
        return { color, glow: glowCap * vividness };
    }
}
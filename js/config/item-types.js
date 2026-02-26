/**
 * Item types: central definitions for consumable/equippable matching (drops, pickup, equip).
 */

export const ITEM_TYPE_CONSUMABLE = 'consumable';
export const EQUIPPABLE_MAIN_TYPES = Object.freeze(['weapon', 'armor', 'accessory']);
export const ARMOR_EQUIP_SUBTYPES = Object.freeze(['helmet', 'boots', 'gloves', 'belt', 'shoulders', 'robe']);
export const ACCESSORY_SUBTYPES = Object.freeze(['amulet', 'ring', 'talisman']);

export function isItemConsumable(item) {
    if (!item) return false;
    return item.type === ITEM_TYPE_CONSUMABLE || item.consumable === true;
}

export function isItemEquippable(item) {
    if (!item) return false;
    if (!EQUIPPABLE_MAIN_TYPES.includes(item.type)) return false;
    if (item.type === 'armor' && item.subType) return ARMOR_EQUIP_SUBTYPES.includes(item.subType);
    return true;
}

/**
 * PlayerInventory.js
 * Manages the player's inventory and equipment
 */

export class PlayerInventory {
    constructor() {
        // Initialize inventory
        this.inventory = [];
        this.gold = 0;
        
        // Initialize equipment with expanded slots
        this.equipment = {
            weapon: null,
            armor: null,
            helmet: null,
            boots: null,
            gloves: null,
            belt: null,
            shoulder: null,
            accessory1: null,
            accessory2: null,
            talisman: null
        };
        
        // Equipment stat bonuses cache
        this.equipmentBonuses = {
            manaBonus: 0,
            healthBonus: 0,
            attackBonus: 0,
            defenseBonus: 0,
            speedBonus: 0
        };
        
        // Reference to player model for visual updates
        this.playerModel = null;
    }
    
    /**
     * Set player model reference for equipment visuals
     */
    setPlayerModel(playerModel) {
        this.playerModel = playerModel;
    }
    
    // Inventory management
    addToInventory(item) {
        // Check if item already exists in inventory
        const existingItem = this.inventory.find(i => i.name === item.name);
        
        if (existingItem) {
            // Increase amount
            const addQty = item.amount ?? 1;
            existingItem.amount = (existingItem.amount ?? 1) + addQty;
        } else {
            // Add new item (default amount to 1)
            this.inventory.push({ ...item, amount: item.amount ?? 1 });
        }
    }
    
    removeFromInventory(itemName, amount = 1) {
        // Find item in inventory
        const itemIndex = this.inventory.findIndex(i => i.name === itemName);
        
        if (itemIndex >= 0) {
            const entry = this.inventory[itemIndex];
            const current = entry.amount ?? 1; // treat missing amount as 1 (e.g. consumables)
            entry.amount = current - amount;

            // Remove item if amount is 0 or less
            if (entry.amount <= 0) {
                this.inventory.splice(itemIndex, 1);
            }

            return true;
        }

        return false;
    }
    
    // Equipment management
    equipItem(item) {
        // Check if item is equippable
        if (!item.type) {
            return false;
        }
        
        // Determine the correct equipment slot
        let slot = item.type;
        
        // Handle armor subtypes -> specific slots (helmet, boots, gloves, belt, shoulder)
        if (item.type === 'armor' && item.subType) {
            const armorSlotMap = {
                helmet: 'helmet',
                boots: 'boots',
                gloves: 'gloves',
                belt: 'belt',
                shoulders: 'shoulder',
                robe: 'armor'
            };
            slot = armorSlotMap[item.subType] || 'armor';
        }
        
        // Handle special cases for accessories
        if (item.type === 'accessory') {
            if (item.subType === 'talisman') {
                slot = 'talisman';
            } else if (!this.equipment.accessory1) {
                slot = 'accessory1';
            } else if (!this.equipment.accessory2) {
                slot = 'accessory2';
            } else {
                // Both accessory slots are full, replace the first one
                slot = 'accessory1';
            }
        }
        
        // Check if the slot exists
        if (!this.equipment.hasOwnProperty(slot)) {
            return false;
        }
        
        // Find the item in inventory to get the actual inventory instance
        const inventoryItem = this.inventory.find(i => i.name === item.name);
        if (!inventoryItem) {
            // Item not in inventory, cannot equip
            return false;
        }
        
        // Unequip current item if any
        if (this.equipment[slot]) {
            this.addToInventory(this.equipment[slot]);
        }
        
        // Equip the item from inventory (use a copy to avoid reference issues)
        this.equipment[slot] = { ...inventoryItem };
        
        // Remove from inventory
        this.removeFromInventory(item.name, 1);
        
        // Recalculate equipment bonuses
        this.calculateEquipmentBonuses();
        
        // Update equipment visuals (weapon, armor, etc.)
        if (this.playerModel && this.playerModel.updateEquipmentVisuals) {
            this.playerModel.updateEquipmentVisuals(this.equipment);
        }
        
        return true;
    }
    
    unequipItem(slot) {
        // Check if slot is valid
        if (!this.equipment.hasOwnProperty(slot)) {
            return false;
        }
        
        // Check if item is equipped
        if (!this.equipment[slot]) {
            return false;
        }
        
        // Add to inventory
        this.addToInventory(this.equipment[slot]);
        
        // Remove from equipment
        this.equipment[slot] = null;
        
        // Recalculate equipment bonuses
        this.calculateEquipmentBonuses();
        
        // Update equipment visuals
        if (this.playerModel && this.playerModel.updateEquipmentVisuals) {
            this.playerModel.updateEquipmentVisuals(this.equipment);
        }
        
        return true;
    }
    
    /**
     * Calculate all stat bonuses from equipped items
     */
    calculateEquipmentBonuses() {
        // Reset bonuses
        this.equipmentBonuses = {
            manaBonus: 0,
            healthBonus: 0,
            attackBonus: 0,
            defenseBonus: 0,
            speedBonus: 0
        };
        
        // Loop through all equipped items
        Object.values(this.equipment).forEach(item => {
            if (!item) return;
            
            // Process base stats
            if (item.baseStats) {
                // Add mana bonus
                if (item.baseStats.manaBonus) {
                    this.equipmentBonuses.manaBonus += item.baseStats.manaBonus;
                }
                
                // Add health bonus
                if (item.baseStats.healthBonus) {
                    this.equipmentBonuses.healthBonus += item.baseStats.healthBonus;
                }
                
                // Add attack bonus
                if (item.baseStats.damage) {
                    this.equipmentBonuses.attackBonus += item.baseStats.damage;
                }
                
                // Add defense bonus
                if (item.baseStats.defense) {
                    this.equipmentBonuses.defenseBonus += item.baseStats.defense;
                }
                
                // Add speed bonus
                if (item.baseStats.movementSpeed) {
                    this.equipmentBonuses.speedBonus += item.baseStats.movementSpeed;
                }
            }
            
            // Process secondary stats
            if (item.secondaryStats && Array.isArray(item.secondaryStats)) {
                item.secondaryStats.forEach(stat => {
                    if (stat.type === 'manaBonus') {
                        this.equipmentBonuses.manaBonus += stat.value;
                    } else if (stat.type === 'healthBonus') {
                        this.equipmentBonuses.healthBonus += stat.value;
                    } else if (stat.type === 'attackPower') {
                        this.equipmentBonuses.attackBonus += stat.value;
                    } else if (stat.type === 'defense') {
                        this.equipmentBonuses.defenseBonus += stat.value;
                    } else if (stat.type === 'movementSpeed') {
                        this.equipmentBonuses.speedBonus += stat.value;
                    }
                });
            }
        });
    }
    
    // Gold management
    addGold(amount) {
        this.gold += amount;
    }
    
    removeGold(amount) {
        if (this.gold >= amount) {
            this.gold -= amount;
            return true;
        }
        return false;
    }
    
    // Getters
    getInventory() {
        return this.inventory;
    }
    
    getEquipment() {
        return this.equipment;
    }
    
    getGold() {
        return this.gold;
    }
    
    /**
     * Get equipment stat bonuses
     * @returns {Object} Equipment stat bonuses
     */
    getEquipmentBonuses() {
        return this.equipmentBonuses;
    }
    
    /**
     * Get mana bonus from equipment
     * @returns {number} Total mana bonus
     */
    getManaBonus() {
        return this.equipmentBonuses.manaBonus;
    }
    
    /**
     * Get health bonus from equipment
     * @returns {number} Total health bonus
     */
    getHealthBonus() {
        return this.equipmentBonuses.healthBonus;
    }
    
    /**
     * Get attack bonus from equipment
     * @returns {number} Total attack bonus
     */
    getAttackBonus() {
        return this.equipmentBonuses.attackBonus;
    }
    
    /**
     * Get defense bonus from equipment
     * @returns {number} Total defense bonus
     */
    getDefenseBonus() {
        return this.equipmentBonuses.defenseBonus;
    }
    
    /**
     * Get speed bonus from equipment
     * @returns {number} Total speed bonus
     */
    getSpeedBonus() {
        return this.equipmentBonuses.speedBonus;
    }
}
/**
 * Utility functions for skill tree management
 */
import { BUFF_EFFECTS } from '../config/skill-tree.js';

/**
 * Normalize stored buff value to level (0..maxLevel). Handles legacy boolean true/false.
 * @param {boolean|number} value
 * @param {number} maxLevel
 * @returns {number}
 */
export function buffLevelFromStorage(value, maxLevel = 3) {
    if (value === true) return 1;
    if (typeof value === 'number' && value >= 0) return Math.min(maxLevel, Math.floor(value));
    return 0;
}

/**
 * Apply buff scaling to a skill config. Modifies config in place.
 * Buff levels are applied from BUFF_EFFECTS: multiply (e.g. radius) or add (e.g. cooldown).
 * @param {string} skillName
 * @param {Object} skillConfig - Mutable skill config (radius, cooldown, etc.)
 * @param {Object.<string, number|boolean>} buffLevels - Buff name -> level (or true for 1)
 */
export function applyBuffScalingToSkillConfig(skillName, skillConfig, buffLevels) {
    const effects = BUFF_EFFECTS[skillName];
    if (!effects || !buffLevels || typeof buffLevels !== 'object') return;
    for (const [buffName, levelOrBool] of Object.entries(buffLevels)) {
        const level = buffLevelFromStorage(levelOrBool, 3);
        if (level <= 0) continue;
        const effect = effects[buffName];
        if (!effect) continue;
        const { property, type, perLevel } = effect;
        const current = skillConfig[property];
        if (type === 'multiply') {
            const base = current !== undefined && current !== null ? Number(current) : 1;
            skillConfig[property] = base * (1 + perLevel * level);
        } else if (type === 'add') {
            const base = current !== undefined && current !== null ? Number(current) : 0;
            skillConfig[property] = base + perLevel * level;
        }
    }
}

/**
 * Clone buffs into each variant by reference
 * This function adds a reference to each buff in the variants
 * @param {Object} skillTrees - The skill trees object
 * @returns {Object} - The modified skill trees object
 */
export function cloneBuffsIntoVariants(skillTrees) {
    // Create a deep copy of the skill trees to avoid modifying the original
    const modifiedSkillTrees = JSON.parse(JSON.stringify(skillTrees));
    
    // Iterate through each skill
    Object.keys(modifiedSkillTrees).forEach(skillName => {
        const skill = modifiedSkillTrees[skillName];
        
        // Skip if skill doesn't have both variants and buffs
        if (!skill.variants || !skill.buffs) return;
        
        // Get the buffs for this skill
        const buffs = skill.buffs;
        
        // Iterate through each variant
        Object.keys(skill.variants).forEach(variantName => {
            const variant = skill.variants[variantName];
            
            // Add a reference to the buffs in the variant
            variant.buffs = {};
            
            // Filter buffs for this variant
            Object.keys(buffs).forEach(buffName => {
                const buff = buffs[buffName];
                const requiredVariant = buff.requiredVariant || "any";
                
                // If the buff is for any variant or specifically for this variant, add it
                if (requiredVariant === "any" || requiredVariant === variantName) {
                    // Store a reference to the buff
                    variant.buffs[buffName] = buff;
                }
            });
        });
    });
    
    return modifiedSkillTrees;
}

/**
 * Apply the cloned buffs to the skill trees
 * This function modifies the skill trees in place
 * @param {Object} skillTrees - The skill trees object to modify
 */
export function applyBuffsToVariants(skillTrees) {
    // Iterate through each skill
    Object.keys(skillTrees).forEach(skillName => {
        const skill = skillTrees[skillName];
        
        // Skip if skill doesn't have both variants and buffs
        if (!skill.variants || !skill.buffs) return;
        
        // Get the buffs for this skill
        const buffs = skill.buffs;
        
        // Iterate through each variant
        Object.keys(skill.variants).forEach(variantName => {
            const variant = skill.variants[variantName];
            
            // Add a reference to the buffs in the variant
            variant.buffs = {};
            
            // Filter buffs for this variant
            Object.keys(buffs).forEach(buffName => {
                const buff = buffs[buffName];
                const requiredVariant = buff.requiredVariant || "any";
                
                // If the buff is for any variant or specifically for this variant, add it
                if (requiredVariant === "any" || requiredVariant === variantName) {
                    // Store a reference to the buff
                    variant.buffs[buffName] = buff;
                }
            });
        });
    });
}
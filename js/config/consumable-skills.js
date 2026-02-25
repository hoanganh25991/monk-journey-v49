/**
 * Consumable Skill Effects Configuration
 * Maps skill effect IDs to their behavior when a consumable is used.
 * These are instant effects that help the player (freeze nearby enemies, stun, etc.)
 */

/**
 * @typedef {Object} ConsumableSkillEffect
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {number} radius - Effect radius in world units
 * @property {number} duration - Effect duration in seconds
 * @property {string} [enemyEffect] - Effect type: 'freeze', 'stun', 'slow', 'burn'
 * @property {number} [damage] - Optional damage amount
 * @property {number} [slowFactor] - For slow: 0-1 (0.3 = 30% speed)
 */

/**
 * Registry of consumable skill effects (freeze, stun, etc.)
 * Used when player consumes a skill crystal/orb
 */
export const CONSUMABLE_SKILL_EFFECTS = {
    freeze: {
        id: 'freeze',
        name: 'Freezing Burst',
        radius: 6,
        duration: 2.5,
        enemyEffect: 'freeze',
        description: 'Freezes nearby enemies in place'
    },
    stun: {
        id: 'stun',
        name: 'Stunning Shock',
        radius: 5,
        duration: 2,
        enemyEffect: 'stun',
        description: 'Stuns nearby enemies'
    },
    slow: {
        id: 'slow',
        name: 'Chilling Aura',
        radius: 5,
        duration: 2,
        enemyEffect: 'slow',
        slowFactor: 0.4,
        description: 'Slows nearby enemies'
    },
    burn: {
        id: 'burn',
        name: 'Flame Burst',
        radius: 4,
        duration: 5,
        enemyEffect: 'burn',
        damage: 15,
        description: 'Burns nearby enemies'
    },
    shock: {
        id: 'shock',
        name: 'Lightning Surge',
        radius: 5,
        duration: 1.5,
        enemyEffect: 'stun',
        damage: 8,
        description: 'Shocks nearby enemies'
    }
};

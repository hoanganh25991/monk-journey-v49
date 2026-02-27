/**
 * Elemental Effect Configuration
 * Used by consumable items to grant temporary elemental visuals on skills and attacks.
 * When active, the player's skills and attacks display vivid elemental overlays (fire, water, thunder, etc.).
 */

/**
 * @typedef {Object} ElementalEffectConfig
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {number} color - Base color (hex)
 * @property {number} emissiveColor - Emissive/glow color (hex)
 * @property {number} [particleColor] - Optional particle color (defaults to color)
 * @property {string} icon - Emoji or icon for UI
 * @property {string} [particleStyle] - 'sparks' | 'mist' | 'embers' | 'bubbles' | 'cracks' | 'flakes'
 * @property {number} [intensity] - 0–1 visual intensity (default 0.8)
 */

/**
 * Registry of elemental effects for skill/attack visuals
 */
export const ELEMENTAL_EFFECTS = {
    fire: {
        id: 'fire',
        name: 'Flame',
        color: 0xff6600,
        emissiveColor: 0xff3300,
        particleColor: 0xffaa00,
        icon: '🔥',
        particleStyle: 'embers',
        intensity: 0.9,
        description: 'Skills and attacks burn with fire'
    },
    water: {
        id: 'water',
        name: 'Tide',
        color: 0x3399ff,
        emissiveColor: 0x00aaff,
        particleColor: 0x88ddff,
        icon: '💧',
        particleStyle: 'bubbles',
        intensity: 0.85,
        description: 'Skills and attacks flow with water'
    },
    thunder: {
        id: 'thunder',
        name: 'Storm',
        color: 0xccbbff,
        emissiveColor: 0xaaccff,
        particleColor: 0xffffff,
        icon: '⚡',
        particleStyle: 'sparks',
        intensity: 0.95,
        description: 'Skills and attacks crackle with lightning'
    },
    wind: {
        id: 'wind',
        name: 'Gale',
        color: 0xddffdd,
        emissiveColor: 0xaaffcc,
        particleColor: 0xeeffdd,
        icon: '💨',
        particleStyle: 'mist',
        intensity: 0.75,
        description: 'Skills and attacks swirl with wind'
    },
    earth: {
        id: 'earth',
        name: 'Stone',
        color: 0x8b7355,
        emissiveColor: 0x996633,
        particleColor: 0xccaa88,
        icon: '🪨',
        particleStyle: 'cracks',
        intensity: 0.8,
        description: 'Skills and attacks carry earth and stone'
    },
    ice: {
        id: 'ice',
        name: 'Frost',
        color: 0xaaddff,
        emissiveColor: 0x88ccff,
        particleColor: 0xffffff,
        icon: '❄️',
        particleStyle: 'flakes',
        intensity: 0.85,
        description: 'Skills and attacks gleam with frost'
    },
    light: {
        id: 'light',
        name: 'Radiance',
        color: 0xffffcc,
        emissiveColor: 0xffffaa,
        particleColor: 0xffffff,
        icon: '✨',
        particleStyle: 'sparks',
        intensity: 0.9,
        description: 'Skills and attacks shine with holy light'
    },
    shadow: {
        id: 'shadow',
        name: 'Void',
        color: 0x332266,
        emissiveColor: 0x554488,
        particleColor: 0x8866aa,
        icon: '🌑',
        particleStyle: 'mist',
        intensity: 0.8,
        description: 'Skills and attacks trail shadow'
    }
};

/**
 * Get elemental config by id
 * @param {string} id
 * @returns {ElementalEffectConfig|null}
 */
export function getElementalEffect(id) {
    return ELEMENTAL_EFFECTS[id] || null;
}

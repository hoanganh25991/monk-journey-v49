/**
 * Coach (player aura) configuration.
 * Coach is a visual "coat" or aura rendered on top of the player model.
 * Different types (neutral, elemental) have distinct colors and particle styles.
 * Strength (0–1) scales intensity and particle complexity over time.
 */

/** Scale for aura ring/glow and particle motion. 0 = no rotation, 1 = default. Set to 0 so only shoulder pauldrons (grey dome parts) rotate. */
export const COACH_AURA_ROTATION_SPEED = 0;

/** Scale size of the coach aura when shown. 1 = original, >1 = bigger (e.g. 1.25). */
export const COACH_SCALE = 1.25;

/** @typedef {'none'|'default'|'fire'|'water'|'earth'|'air'|'lightning'|'nature'|'shadow'|'light'|'void'} CoachElement */

/**
 * @typedef {Object} CoachTypeConfig
 * @property {string} id - Unique id (e.g. 'fire', 'water')
 * @property {string} name - Display name
 * @property {CoachElement} element - Element for matching weapon/gear
 * @property {number} primaryColor - Hex color for main aura
 * @property {number} secondaryColor - Hex color for accent/particles
 * @property {number} [tertiaryColor] - Optional third color for complex effects
 * @property {Object} particles - Particle behavior
 * @property {string} particles.style - 'rise' | 'orbit' | 'drip' | 'spiral' | 'burst'
 * @property {number} [particles.baseCount] - Base count; scaled by strength
 * @property {number} [particles.speed] - Animation speed multiplier
 */

/**
 * Coach type definitions: colors and particle styles per element.
 * @type {CoachTypeConfig[]}
 */
export const COACH_TYPES = [
    {
        id: 'none',
        name: 'No coach',
        element: 'none',
        primaryColor: 0xffffff,
        secondaryColor: 0xcccccc,
        particles: { style: 'orbit', baseCount: 0, speed: 1 }
    },
    {
        id: 'default',
        name: 'Spirit coach',
        element: 'default',
        primaryColor: 0xffe4b5,
        secondaryColor: 0xffd700,
        tertiaryColor: 0xfff8dc,
        particles: { style: 'rise', baseCount: 10, speed: 1.0 }
    },
    {
        id: 'fire',
        name: 'Flame coach',
        element: 'fire',
        primaryColor: 0xff4500,
        secondaryColor: 0xffaa00,
        tertiaryColor: 0xff2200,
        particles: { style: 'rise', baseCount: 12, speed: 1.8 }
    },
    {
        id: 'water',
        name: 'Tide coach',
        element: 'water',
        primaryColor: 0x00bfff,
        secondaryColor: 0x87ceeb,
        tertiaryColor: 0x1e90ff,
        particles: { style: 'drip', baseCount: 10, speed: 1.2 }
    },
    {
        id: 'earth',
        name: 'Stone coach',
        element: 'earth',
        primaryColor: 0x8b4513,
        secondaryColor: 0xdaa520,
        tertiaryColor: 0x654321,
        particles: { style: 'orbit', baseCount: 8, speed: 0.6 }
    },
    {
        id: 'air',
        name: 'Zephyr coach',
        element: 'air',
        primaryColor: 0xe0ffff,
        secondaryColor: 0xb0e0e6,
        tertiaryColor: 0xffffff,
        particles: { style: 'spiral', baseCount: 14, speed: 2.0 }
    },
    {
        id: 'lightning',
        name: 'Storm coach',
        element: 'lightning',
        primaryColor: 0xffff00,
        secondaryColor: 0xffffff,
        tertiaryColor: 0x00ffff,
        particles: { style: 'burst', baseCount: 16, speed: 2.5 }
    },
    {
        id: 'nature',
        name: 'Verdant coach',
        element: 'nature',
        primaryColor: 0x228b22,
        secondaryColor: 0x90ee90,
        tertiaryColor: 0x006400,
        particles: { style: 'rise', baseCount: 10, speed: 1.0 }
    },
    {
        id: 'shadow',
        name: 'Shadow coach',
        element: 'shadow',
        primaryColor: 0x2f004f,
        secondaryColor: 0x4b0082,
        tertiaryColor: 0x1a001a,
        particles: { style: 'orbit', baseCount: 12, speed: 1.2 }
    },
    {
        id: 'light',
        name: 'Radiant coach',
        element: 'light',
        primaryColor: 0xfff8dc,
        secondaryColor: 0xffd700,
        tertiaryColor: 0xffffff,
        particles: { style: 'spiral', baseCount: 14, speed: 1.5 }
    },
    {
        id: 'void',
        name: 'Void coach',
        element: 'void',
        primaryColor: 0x4b0082,
        secondaryColor: 0x8a2be2,
        tertiaryColor: 0x000033,
        particles: { style: 'orbit', baseCount: 15, speed: 0.8 }
    }
];

/**
 * Get coach config by element or id.
 * @param {CoachElement|string} elementOrId
 * @returns {CoachTypeConfig}
 */
export function getCoachType(elementOrId) {
    const t = COACH_TYPES.find(
        c => c.element === elementOrId || c.id === elementOrId
    );
    return t || COACH_TYPES[0]; // none
}

/**
 * Infer coach element from equipped weapon (visual.element, id, secondaryStats).
 * @param {Object} [weapon] - Equipped weapon item
 * @returns {CoachElement}
 */
export function getCoachElementFromWeapon(weapon) {
    if (!weapon) return 'none';
    if (weapon.visual && weapon.visual.element) {
        const el = String(weapon.visual.element).toLowerCase();
        if (COACH_TYPES.some(c => c.element === el)) return el;
    }
    const id = (weapon.id || weapon.templateId || '').toLowerCase();
    const name = (weapon.name || '').toLowerCase();
    if (id.includes('storm') || id.includes('lightning') || name.includes('storm') || name.includes('lightning')) return 'lightning';
    if (id.includes('void') || name.includes('void')) return 'void';
    if (id.includes('fire') || name.includes('flame')) return 'fire';
    if (id.includes('water') || id.includes('tide') || name.includes('tidal')) return 'water';
    if (id.includes('earth') || id.includes('stone') || name.includes('earth')) return 'earth';
    if (id.includes('elemental') || id.includes('harmony') || id.includes('cosmic') || id.includes('pillar')) return 'light';
    const secondary = weapon.secondaryStats || weapon.processedSecondaryStats || [];
    for (const s of secondary) {
        const elem = s.elements || (s.element ? [s.element] : []);
        const arr = Array.isArray(elem) ? elem : [elem];
        if (arr.length) return String(arr[0]).toLowerCase();
    }
    return 'none'; // Only show coach when weapon has an element (fire, water, etc.)
}

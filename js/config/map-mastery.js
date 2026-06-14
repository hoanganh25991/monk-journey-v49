/**
 * Map mastery — cosmetic coach tint unlocked by completing zone shrine contracts.
 */

/** @typedef {import('./coach.js').CoachElement} CoachElement */

/** Default coach element granted per map when its zone contract is completed. */
export const MAP_MASTERY_COACH = {
    default: 'default',
    terrant: 'nature',
    forest: 'nature',
    desert: 'earth',
    mountains: 'water',
    swamp: 'shadow',
    magical: 'void',
    mixed: 'light',
    'highland-vale': 'air',
    'ember-wastes': 'fire',
    'whisper-woods': 'air',
    'crimson-bog': 'shadow',
    'sky-prairie': 'light',
    'veil-garden': 'nature',
    'frost-hollow': 'water',
    'sand-shrine': 'earth',
    'thorn-marsh': 'nature',
    'eldritch-grove': 'void'
};

/**
 * @param {string} mapId
 * @returns {CoachElement|string}
 */
export function getMapMasteryCoachElement(mapId) {
    return MAP_MASTERY_COACH[mapId] || 'default';
}

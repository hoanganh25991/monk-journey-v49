/**
 * Default sensory profiles per map — sky, fog, ambient loop.
 * Merged with map JSON `sensory` block when present.
 */

const BASE = {
    default: {
        sky: { timeOfDay: 'day', weather: 'clear', horizonTop: 0x8eb4d4, horizonBottom: 0xc8a86e },
        fog: { color: 0x9aacb8, densityMultiplier: 1.0 },
        ambient: { loopId: 'ambientPlains', volume: 0.25 }
    },
    terrant: {
        sky: { timeOfDay: 'day', weather: 'clear', horizonTop: 0x7eb8e8, horizonBottom: 0xe8c878 },
        fog: { color: 0xb8c8a0, densityMultiplier: 0.9 },
        ambient: { loopId: 'ambientPlains', volume: 0.28 }
    },
    forest: {
        sky: { timeOfDay: 'dusk', weather: 'clear', horizonTop: 0x2a5040, horizonBottom: 0x1a2830 },
        fog: { color: 0x5a8060, densityMultiplier: 1.2 },
        ambient: { loopId: 'ambientForest', volume: 0.3 }
    },
    desert: {
        sky: { timeOfDay: 'dusk', weather: 'clear', horizonTop: 0xe87840, horizonBottom: 0xf0c060 },
        fog: { color: 0xd8b878, densityMultiplier: 0.85 },
        ambient: { loopId: 'ambientDesert', volume: 0.22 }
    },
    mountains: {
        sky: { timeOfDay: 'day', weather: 'clear', horizonTop: 0x6080a8, horizonBottom: 0xc0d0e0 },
        fog: { color: 0x90a8c0, densityMultiplier: 1.3 },
        ambient: { loopId: 'ambientMountains', volume: 0.26 }
    },
    swamp: {
        sky: { timeOfDay: 'dawn', weather: 'fog', horizonTop: 0x4a5840, horizonBottom: 0x3a4030 },
        fog: { color: 0x5a6840, densityMultiplier: 1.5 },
        ambient: { loopId: 'ambientSwamp', volume: 0.32 }
    },
    magical: {
        sky: { timeOfDay: 'dusk', weather: 'clear', horizonTop: 0x403080, horizonBottom: 0x8060c0 },
        fog: { color: 0x7060a0, densityMultiplier: 1.1 },
        ambient: { loopId: 'ambientMagical', volume: 0.28 }
    },
    mixed: {
        sky: { timeOfDay: 'day', weather: 'clear', horizonTop: 0x7eb0d8, horizonBottom: 0xd0b878 },
        fog: { color: 0x98a8b0, densityMultiplier: 1.0 },
        ambient: { loopId: 'ambientPlains', volume: 0.24 }
    },
    'highland-vale': {
        sky: { timeOfDay: 'day', weather: 'clear', horizonTop: 0x7090b8, horizonBottom: 0xd8e0e8 },
        fog: { color: 0xa0b0c8, densityMultiplier: 1.2 },
        ambient: { loopId: 'ambientMountains', volume: 0.27 }
    },
    'ember-wastes': {
        sky: { timeOfDay: 'dusk', weather: 'storm', horizonTop: 0x802820, horizonBottom: 0xd06030 },
        fog: { color: 0xa05030, densityMultiplier: 1.0 },
        ambient: { loopId: 'ambientDesert', volume: 0.3 }
    },
    'whisper-woods': {
        sky: { timeOfDay: 'dusk', weather: 'fog', horizonTop: 0x304838, horizonBottom: 0x506858 },
        fog: { color: 0x506850, densityMultiplier: 1.4 },
        ambient: { loopId: 'ambientForest', volume: 0.32 }
    },
    'crimson-bog': {
        sky: { timeOfDay: 'dawn', weather: 'fog', horizonTop: 0x502028, horizonBottom: 0x403028 },
        fog: { color: 0x604038, densityMultiplier: 1.6 },
        ambient: { loopId: 'ambientSwamp', volume: 0.34 }
    },
    'sky-prairie': {
        sky: { timeOfDay: 'day', weather: 'clear', horizonTop: 0x88c0f0, horizonBottom: 0xf0d890 },
        fog: { color: 0xc0d0a0, densityMultiplier: 0.8 },
        ambient: { loopId: 'ambientPlains', volume: 0.3 }
    },
    'veil-garden': {
        sky: { timeOfDay: 'dusk', weather: 'clear', horizonTop: 0x504090, horizonBottom: 0xa080d0 },
        fog: { color: 0x8070b0, densityMultiplier: 1.0 },
        ambient: { loopId: 'ambientMagical', volume: 0.3 }
    },
    'frost-hollow': {
        sky: { timeOfDay: 'day', weather: 'clear', horizonTop: 0x8098b8, horizonBottom: 0xe0e8f0 },
        fog: { color: 0xb0c0d8, densityMultiplier: 1.25 },
        ambient: { loopId: 'ambientMountains', volume: 0.25 }
    },
    'sand-shrine': {
        sky: { timeOfDay: 'dusk', weather: 'clear', horizonTop: 0xd07040, horizonBottom: 0xf0d070 },
        fog: { color: 0xd0a868, densityMultiplier: 0.9 },
        ambient: { loopId: 'ambientDesert', volume: 0.26 }
    },
    'thorn-marsh': {
        sky: { timeOfDay: 'dawn', weather: 'fog', horizonTop: 0x405030, horizonBottom: 0x384028 },
        fog: { color: 0x506040, densityMultiplier: 1.45 },
        ambient: { loopId: 'ambientSwamp', volume: 0.3 }
    },
    'eldritch-grove': {
        sky: { timeOfDay: 'night', weather: 'clear', horizonTop: 0x201840, horizonBottom: 0x604090 },
        fog: { color: 0x504070, densityMultiplier: 1.15 },
        ambient: { loopId: 'ambientMagical', volume: 0.32 }
    }
};

/** Footstep set per map archetype (dirt, stone, sand, wood). */
export const MAP_FOOTSTEP_SET = {
    default: 'dirt',
    terrant: 'dirt',
    forest: 'dirt',
    desert: 'sand',
    mountains: 'stone',
    swamp: 'dirt',
    magical: 'stone',
    mixed: 'dirt',
    'highland-vale': 'stone',
    'ember-wastes': 'sand',
    'whisper-woods': 'dirt',
    'crimson-bog': 'dirt',
    'sky-prairie': 'dirt',
    'veil-garden': 'stone',
    'frost-hollow': 'stone',
    'sand-shrine': 'sand',
    'thorn-marsh': 'dirt',
    'eldritch-grove': 'stone'
};

/**
 * Resolve sensory profile for a map.
 * @param {Object} mapData
 * @returns {Object}
 */
export function getMapSensoryProfile(mapData) {
    const id = mapData?.id || 'default';
    const base = BASE[id] || BASE.default;
    if (!mapData?.sensory) return { ...base, footstepSet: MAP_FOOTSTEP_SET[id] || 'dirt' };
    return {
        sky: { ...base.sky, ...mapData.sensory.sky },
        fog: { ...base.fog, ...mapData.sensory.fog },
        ambient: { ...base.ambient, ...mapData.sensory.ambient },
        footstepSet: mapData.sensory.footstepSet || MAP_FOOTSTEP_SET[id] || 'dirt'
    };
}

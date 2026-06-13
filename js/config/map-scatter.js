import { ENVIRONMENT_OBJECTS } from './environment.js';

/**
 * Scatter density profiles for map ground clutter (IMP0001 Phase 1).
 * Merged with optional map JSON `scatter` block.
 */

const SCATTER_TYPES = {
    prairie: [
        { type: ENVIRONMENT_OBJECTS.FLOWER, weight: 5, minSize: 0.3, maxSize: 0.75 },
        { type: ENVIRONMENT_OBJECTS.TALL_GRASS, weight: 6, minSize: 0.4, maxSize: 0.9 },
        { type: ENVIRONMENT_OBJECTS.SMALL_PLANT, weight: 4, minSize: 0.3, maxSize: 0.7 },
        { type: ENVIRONMENT_OBJECTS.ROCK, weight: 2, minSize: 0.35, maxSize: 0.9 }
    ],
    forest: [
        { type: ENVIRONMENT_OBJECTS.FERN, weight: 4, minSize: 0.35, maxSize: 0.85 },
        { type: ENVIRONMENT_OBJECTS.MUSHROOM, weight: 3, minSize: 0.25, maxSize: 0.6 },
        { type: ENVIRONMENT_OBJECTS.FOREST_FLOWER, weight: 4, minSize: 0.3, maxSize: 0.7 },
        { type: ENVIRONMENT_OBJECTS.STUMP, weight: 2, minSize: 0.5, maxSize: 1.0 },
        { type: ENVIRONMENT_OBJECTS.FOREST_DEBRIS, weight: 3, minSize: 0.35, maxSize: 0.8 }
    ],
    desert: [
        { type: ENVIRONMENT_OBJECTS.DESERT_PLANT, weight: 4, minSize: 0.35, maxSize: 0.9 },
        { type: ENVIRONMENT_OBJECTS.ASH_PILE, weight: 3, minSize: 0.4, maxSize: 1.0 },
        { type: ENVIRONMENT_OBJECTS.LAVA_ROCK, weight: 4, minSize: 0.4, maxSize: 1.1 },
        { type: ENVIRONMENT_OBJECTS.ROCK, weight: 3, minSize: 0.35, maxSize: 0.95 }
    ],
    mountains: [
        { type: ENVIRONMENT_OBJECTS.ALPINE_FLOWER, weight: 3, minSize: 0.25, maxSize: 0.55 },
        { type: ENVIRONMENT_OBJECTS.MOUNTAIN_ROCK, weight: 5, minSize: 0.5, maxSize: 1.3 },
        { type: ENVIRONMENT_OBJECTS.SNOW_PATCH, weight: 3, minSize: 0.5, maxSize: 1.2 },
        { type: ENVIRONMENT_OBJECTS.PINE_TREE, weight: 2, minSize: 0.7, maxSize: 1.4 }
    ]
};

/** Zone-keyed scatter for multi-biome maps (e.g. default, mixed). */
export const ZONE_SCATTER_TYPES = {
    Terrant: SCATTER_TYPES.prairie,
    Forest: SCATTER_TYPES.forest,
    Desert: SCATTER_TYPES.desert,
    Mountains: SCATTER_TYPES.mountains,
    Swamp: [
        { type: ENVIRONMENT_OBJECTS.SWAMP_PLANT, weight: 5, minSize: 0.4, maxSize: 1.0 },
        { type: ENVIRONMENT_OBJECTS.GLOWING_MUSHROOM, weight: 3, minSize: 0.3, maxSize: 0.7 },
        { type: ENVIRONMENT_OBJECTS.LILY_PAD, weight: 2, minSize: 0.4, maxSize: 0.9 }
    ],
    Magical: [
        { type: ENVIRONMENT_OBJECTS.GLOWING_FLOWERS, weight: 4, minSize: 0.35, maxSize: 0.85 },
        { type: ENVIRONMENT_OBJECTS.RUNE_STONE, weight: 2, minSize: 0.4, maxSize: 0.9 },
        { type: ENVIRONMENT_OBJECTS.SMALL_CRYSTAL, weight: 3, minSize: 0.3, maxSize: 0.65 }
    ]
};

/** Top 5 maps — scatter pass enabled by default */
export const MAP_SCATTER_PROFILES = {
    default: {
        enabled: true,
        gridStep: 52,
        fillChance: 0.38,
        types: SCATTER_TYPES.prairie
    },
    terrant: {
        enabled: true,
        gridStep: 48,
        fillChance: 0.42,
        types: SCATTER_TYPES.prairie
    },
    forest: {
        enabled: true,
        gridStep: 44,
        fillChance: 0.48,
        types: SCATTER_TYPES.forest
    },
    desert: {
        enabled: true,
        gridStep: 50,
        fillChance: 0.36,
        types: SCATTER_TYPES.desert
    },
    mountains: {
        enabled: true,
        gridStep: 54,
        fillChance: 0.34,
        types: SCATTER_TYPES.mountains
    }
};

/**
 * @param {Object} mapData
 * @returns {Object|null} scatter profile or null if disabled
 */
export function getMapScatterProfile(mapData) {
    if (!mapData?.id) return null;
    const base = MAP_SCATTER_PROFILES[mapData.id];
    if (!base && !mapData.scatter) return null;

    const merged = {
        ...(base || { enabled: true, gridStep: 52, fillChance: 0.35, types: SCATTER_TYPES.prairie }),
        ...mapData.scatter
    };
    if (merged.enabled === false) return null;
    return merged;
}

/**
 * Pick a scatter type from weighted list.
 * @param {Array} types
 * @param {() => number} rng
 */
export function pickScatterType(types, rng) {
    const total = types.reduce((s, t) => s + (t.weight || 1), 0);
    let roll = rng() * total;
    for (const t of types) {
        roll -= t.weight || 1;
        if (roll <= 0) {
            const min = t.minSize ?? 0.4;
            const max = t.maxSize ?? 1.0;
            return { type: t.type, scale: min + rng() * (max - min) };
        }
    }
    const fallback = types[0];
    return { type: fallback.type, scale: fallback.minSize ?? 0.5 };
}

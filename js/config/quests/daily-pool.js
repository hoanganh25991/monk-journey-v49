/**
 * Rotating daily shrine challenge templates (IMP0002 Phase 4)
 */

/** @typedef {import('./index.js').QuestDefinition} QuestDefinition */

/** @param {Partial<QuestDefinition>} def @returns {QuestDefinition} */
function dailyChallenge(def) {
    return {
        isMainQuest: false,
        requiredLevel: 1,
        onComplete: 'moment:quest.complete',
        ...def
    };
}

/** @type {QuestDefinition[]} */
export const DAILY_QUEST_POOL = [
    dailyChallenge({
        id: 'daily_template_hunt',
        name: 'Morning Hunt',
        description: 'Clear the path before meditation.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        objective: {
            type: 'kill',
            target: 'any',
            count: 8,
            progress: 0,
            hint: 'Defeat 8 enemies anywhere on the map.'
        },
        reward: { experience: 80, gold: 60 }
    }),
    dailyChallenge({
        id: 'daily_template_bones',
        name: 'Bone Breaker',
        description: 'Skeletons stir at dawn.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        objective: {
            type: 'kill',
            target: 'skeleton',
            count: 6,
            progress: 0,
            hint: 'Defeat skeleton warriors.'
        },
        reward: { experience: 90, gold: 70 }
    }),
    dailyChallenge({
        id: 'daily_template_chests',
        name: 'Hidden Riches',
        description: 'Fortune favors the early riser.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        objective: {
            type: 'interact',
            target: 'chest',
            count: 2,
            progress: 0,
            hint: 'Open 2 treasure chests.'
        },
        reward: { experience: 70, gold: 90 }
    }),
    dailyChallenge({
        id: 'daily_template_wanderer',
        name: 'Wanderer\'s Step',
        description: 'Walk the border of a new zone.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        objective: {
            type: 'explore',
            target: 'zone',
            count: 1,
            progress: 0,
            discovered: [],
            hint: 'Enter any biome zone you have not visited today.'
        },
        reward: { experience: 75, gold: 55 }
    }),
    dailyChallenge({
        id: 'daily_template_elite',
        name: 'Elite Challenge',
        description: 'One crown falls before noon.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 3 },
        objective: {
            type: 'kill_boss',
            target: 'any',
            count: 1,
            progress: 0,
            hint: 'Defeat any elite boss.'
        },
        reward: { experience: 120, gold: 100 }
    }),
    dailyChallenge({
        id: 'daily_template_fury',
        name: 'Relentless Fury',
        description: 'Push your limits in quick combat.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 2 },
        objective: {
            type: 'kill',
            target: 'any',
            count: 12,
            progress: 0,
            hint: 'Defeat 12 enemies before the day ends.'
        },
        reward: { experience: 100, gold: 80 }
    }),
    dailyChallenge({
        id: 'daily_template_combo',
        name: 'Flowing Strikes',
        description: 'Chain your attacks without pause.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        objective: {
            type: 'combo',
            target: '5',
            count: 1,
            progress: 0,
            hint: 'Land a 5-hit combo on enemies.'
        },
        reward: { experience: 85, gold: 65 }
    }),
    dailyChallenge({
        id: 'daily_template_vigil',
        name: 'Still Vigil',
        description: 'Hold your ground without falling.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        objective: {
            type: 'survive',
            target: 'daily',
            count: 1,
            progress: 0,
            hint: 'Stay alive for 30 seconds without dying.'
        },
        reward: { experience: 90, gold: 70 }
    })
];

/** @param {number} dayIndex @returns {QuestDefinition} */
export function getDailyTemplateForDay(dayIndex) {
    const idx = ((dayIndex % DAILY_QUEST_POOL.length) + DAILY_QUEST_POOL.length) % DAILY_QUEST_POOL.length;
    return DAILY_QUEST_POOL[idx];
}

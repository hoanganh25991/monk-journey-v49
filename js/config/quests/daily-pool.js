/**
 * Rotating daily shrine challenge templates (IMP0002 Phase 4)
 */

import { dailyQuestReward } from './quest-balance.js';

/** @typedef {import('./index.js').QuestDefinition} QuestDefinition */

/** @param {Partial<QuestDefinition>} def @returns {QuestDefinition} */
function dailyChallenge(def) {
    const minLevel = def.offer?.minLevel ?? 1;
    const difficulty = def._dailyDifficulty ?? 'normal';
    const baseReward = dailyQuestReward(minLevel, difficulty);
    const { _dailyDifficulty, ...rest } = def;

    return {
        isMainQuest: false,
        requiredLevel: minLevel,
        onComplete: 'moment:quest.complete',
        ...rest,
        reward: baseReward
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
        _dailyDifficulty: 'normal',
        objective: {
            type: 'kill',
            target: 'any',
            count: 8,
            progress: 0,
            hint: 'Defeat 8 enemies anywhere on the map.'
        }
    }),
    dailyChallenge({
        id: 'daily_template_bones',
        name: 'Bone Breaker',
        description: 'Skeletons stir at dawn.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        _dailyDifficulty: 'easy',
        objective: {
            type: 'kill',
            target: 'skeleton',
            count: 6,
            progress: 0,
            hint: 'Defeat skeleton warriors.'
        }
    }),
    dailyChallenge({
        id: 'daily_template_chests',
        name: 'Hidden Riches',
        description: 'Fortune favors the early riser.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        _dailyDifficulty: 'easy',
        objective: {
            type: 'interact',
            target: 'chest',
            count: 2,
            progress: 0,
            hint: 'Open 2 treasure chests.'
        }
    }),
    dailyChallenge({
        id: 'daily_template_wanderer',
        name: 'Wanderer\'s Step',
        description: 'Walk the border of a new zone.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        _dailyDifficulty: 'easy',
        objective: {
            type: 'explore',
            target: 'zone',
            count: 1,
            progress: 0,
            discovered: [],
            hint: 'Enter any biome zone you have not visited today.'
        }
    }),
    dailyChallenge({
        id: 'daily_template_elite',
        name: 'Elite Challenge',
        description: 'One crown falls before noon.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 3 },
        _dailyDifficulty: 'hard',
        objective: {
            type: 'kill_boss',
            target: 'any',
            count: 1,
            progress: 0,
            hint: 'Defeat any elite boss.'
        }
    }),
    dailyChallenge({
        id: 'daily_template_fury',
        name: 'Relentless Fury',
        description: 'Push your limits in quick combat.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 2 },
        _dailyDifficulty: 'normal',
        objective: {
            type: 'kill',
            target: 'any',
            count: 12,
            progress: 0,
            hint: 'Defeat 12 enemies before the day ends.'
        }
    }),
    dailyChallenge({
        id: 'daily_template_combo',
        name: 'Flowing Strikes',
        description: 'Chain your attacks without pause.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        _dailyDifficulty: 'normal',
        objective: {
            type: 'combo',
            target: '5',
            count: 1,
            progress: 0,
            hint: 'Land a 5-hit combo on enemies.'
        }
    }),
    dailyChallenge({
        id: 'daily_template_vigil',
        name: 'Still Vigil',
        description: 'Hold your ground without falling.',
        category: 'daily',
        offer: { type: 'shrine', minLevel: 1 },
        _dailyDifficulty: 'normal',
        objective: {
            type: 'survive',
            target: 'daily',
            count: 1,
            progress: 0,
            hint: 'Stay alive for 30 seconds without dying.'
        }
    })
];

/** @param {number} dayIndex @returns {QuestDefinition} */
export function getDailyTemplateForDay(dayIndex) {
    const idx = ((dayIndex % DAILY_QUEST_POOL.length) + DAILY_QUEST_POOL.length) % DAILY_QUEST_POOL.length;
    return DAILY_QUEST_POOL[idx];
}

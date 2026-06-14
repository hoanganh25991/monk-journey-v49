/**
 * Per-map shrine contracts — offered at map shrines (IMP0002 Phase 3)
 */

import { ZONE_TYPES } from '../zone.js';
import { zoneQuestReward } from './quest-balance.js';

/** @typedef {import('./index.js').QuestDefinition} QuestDefinition */

/** @param {Partial<QuestDefinition>} def @returns {QuestDefinition} */
function zoneContract(def) {
    const minLevel = def.requiredLevel ?? def.offer?.minLevel ?? 1;
    const count = def.objective?.count ?? 1;
    const type = def.objective?.type ?? 'kill';
    const baseReward = zoneQuestReward(type, minLevel, count);
    const coachTint = def.reward?.coachTint;

    return {
        isMainQuest: false,
        requiredLevel: minLevel,
        onComplete: 'moment:quest.complete',
        ...def,
        reward: { ...baseReward, mapMastery: true, coachTint }
    };
}

/** @type {QuestDefinition[]} */
export const ZONE_CONTRACT_QUESTS = [
    zoneContract({
        id: 'zone_terrant_vigil',
        name: 'Plains Vigil',
        description: 'Hunt the wolves that stalk the central plains.',
        category: 'zone',
        mapId: 'terrant',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 1, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill',
            target: 'feral_wolf',
            count: 15,
            progress: 0,
            hint: 'Track feral wolves across the Terrant grasslands.'
        },
        reward: { coachTint: 'nature' }
    }),
    zoneContract({
        id: 'zone_forest_rotwood',
        name: 'Rotwood Cleansing',
        description: 'Corrupted treants choke the deep woods. Cut them down.',
        category: 'zone',
        mapId: 'forest',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 3, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill',
            target: 'corrupted_treant',
            count: 3,
            progress: 0,
            hint: 'Seek corrupted treants among the oldest trees.'
        },
        reward: { coachTint: 'nature' }
    }),
    zoneContract({
        id: 'zone_desert_relic',
        name: 'Sandbound Relic',
        description: 'Treasure chests lie half-buried in the dunes.',
        category: 'zone',
        mapId: 'desert',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 3, prerequisiteQuestIds: [] },
        objective: {
            type: 'interact',
            target: 'chest',
            count: 3,
            progress: 0,
            hint: 'Open chests scattered through the Desert ruins.'
        },
        reward: { coachTint: 'earth' }
    }),
    zoneContract({
        id: 'zone_mountains_yeti',
        name: "Yeti's Shadow",
        description: 'An ancient yeti guards the high passes.',
        category: 'zone',
        mapId: 'mountains',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 5, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill_boss',
            target: 'ancient_yeti',
            count: 1,
            progress: 0,
            hint: 'Challenge the ancient yeti in the mountain peaks.'
        },
        reward: { coachTint: 'water' }
    }),
    zoneContract({
        id: 'zone_swamp_mirewalker',
        name: 'Mirewalker',
        description: 'Bog lurkers drag travelers under the mire.',
        category: 'zone',
        mapId: 'swamp',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 4, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill',
            target: 'bog_lurker',
            count: 10,
            progress: 0,
            hint: 'Cull bog lurkers in the swamp shallows.'
        },
        reward: { coachTint: 'shadow' }
    }),
    zoneContract({
        id: 'zone_magical_runes',
        name: 'Rune Seeker',
        description: 'Magical currents split this realm. Walk both halves.',
        category: 'zone',
        mapId: 'magical',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 5, prerequisiteQuestIds: [] },
        objective: {
            type: 'explore',
            target: 'region',
            count: 2,
            progress: 0,
            discovered: [],
            hint: 'Explore distant quadrants of the Magical realm.'
        },
        reward: { coachTint: 'void' }
    }),
    zoneContract({
        id: 'zone_mixed_pilgrim',
        name: 'Realm Pilgrim',
        description: 'Walk the four great biomes bound in one world.',
        category: 'zone',
        mapId: 'mixed',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 3, prerequisiteQuestIds: [] },
        objective: {
            type: 'explore',
            target: 'zone',
            count: 4,
            progress: 0,
            discovered: [],
            hint: `Visit ${ZONE_TYPES.TERRANT}, ${ZONE_TYPES.FOREST}, ${ZONE_TYPES.DESERT}, and ${ZONE_TYPES.SWAMP}.`
        },
        reward: { coachTint: 'light' }
    }),
    zoneContract({
        id: 'zone_mixed_sentinel',
        name: 'Realm Sentinel',
        description: 'Hold the crossroads against endless invaders.',
        category: 'zone',
        mapId: 'mixed',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 6, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill',
            target: 'any',
            count: 25,
            progress: 0,
            hint: 'Defeat foes anywhere in the Mixed Realms.'
        },
        reward: { coachTint: 'lightning' }
    }),
    zoneContract({
        id: 'zone_highland_watch',
        name: 'Highland Watch',
        description: 'Winter wolves prowl the highland vale.',
        category: 'zone',
        mapId: 'highland-vale',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 4, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill',
            target: 'winter_wolf',
            count: 12,
            progress: 0,
            hint: 'Hunt winter wolves across the highland snows.'
        },
        reward: { coachTint: 'air' }
    }),
    zoneContract({
        id: 'zone_ember_hunt',
        name: 'Ember Hunt',
        description: 'Ash demons crawl from scorched badlands.',
        category: 'zone',
        mapId: 'ember-wastes',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 5, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill',
            target: 'ash_demon',
            count: 8,
            progress: 0,
            hint: 'Drive ash demons back in the Ember Wastes.'
        },
        reward: { coachTint: 'fire' }
    }),
    zoneContract({
        id: 'zone_whisper_silent',
        name: 'Silent Path',
        description: 'Cross the misty woods without falling in battle.',
        category: 'zone',
        mapId: 'whisper-woods',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 3, prerequisiteQuestIds: [] },
        objective: {
            type: 'survive',
            target: 'whisper-woods',
            count: 1,
            progress: 0,
            hint: 'Stay alive in Whisper Woods for one vigil (45 seconds).'
        },
        reward: { coachTint: 'air' }
    }),
    zoneContract({
        id: 'zone_crimson_bloodroot',
        name: 'Bloodroot',
        description: 'The plague lord festers in the crimson bog.',
        category: 'zone',
        mapId: 'crimson-bog',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 6, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill_boss',
            target: 'plague_lord',
            count: 1,
            progress: 0,
            hint: 'Find and defeat the plague lord in Crimson Bog.'
        },
        reward: { coachTint: 'shadow' }
    }),
    zoneContract({
        id: 'zone_sky_offering',
        name: 'Sky Temple Offering',
        description: 'Leave an offering at the prairie shrine.',
        category: 'zone',
        mapId: 'sky-prairie',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 1, prerequisiteQuestIds: [] },
        objective: {
            type: 'interact',
            target: 'shrine',
            count: 1,
            progress: 0,
            hint: 'Interact with the sky temple shrine after accepting this contract.'
        },
        reward: { coachTint: 'light' }
    }),
    zoneContract({
        id: 'zone_veil_petals',
        name: 'Veil Petals',
        description: 'Collect lotus petals from the veil garden blooms.',
        category: 'zone',
        mapId: 'veil-garden',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 4, prerequisiteQuestIds: [] },
        objective: {
            type: 'interact',
            target: 'chest',
            count: 5,
            progress: 0,
            hint: 'Open bloom caches hidden among the veil petals.'
        },
        reward: { coachTint: 'nature' }
    }),
    zoneContract({
        id: 'zone_frost_icebound',
        name: 'Icebound',
        description: 'Frost elementals guard the hollow.',
        category: 'zone',
        mapId: 'frost-hollow',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 5, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill',
            target: 'frost_elemental',
            count: 6,
            progress: 0,
            hint: 'Shatter frost elementals in the frozen basin.'
        },
        reward: { coachTint: 'water' }
    }),
    zoneContract({
        id: 'zone_sand_truth',
        name: 'Buried Truth',
        description: 'Uncover the chest cluster beneath the sand shrine.',
        category: 'zone',
        mapId: 'sand-shrine',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 4, prerequisiteQuestIds: [] },
        objective: {
            type: 'interact',
            target: 'chest',
            count: 3,
            progress: 0,
            hint: 'Find and open buried chests near the sand temples.'
        },
        reward: { coachTint: 'earth' }
    }),
    zoneContract({
        id: 'zone_thorn_trail',
        name: 'Thorn Trail',
        description: 'Poison toads infest the thorn marsh.',
        category: 'zone',
        mapId: 'thorn-marsh',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 4, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill',
            target: 'poison_toad',
            count: 20,
            progress: 0,
            hint: 'Clear poison toads along the thorn marsh trails.'
        },
        reward: { coachTint: 'nature' }
    }),
    zoneContract({
        id: 'zone_eldritch_seal',
        name: 'Eldritch Seal',
        description: 'An ancient guardian blocks the grove seal.',
        category: 'zone',
        mapId: 'eldritch-grove',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 7, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill_boss',
            target: 'ancient_guardian',
            count: 1,
            progress: 0,
            hint: 'Break the ancient guardian in Eldritch Grove.'
        },
        reward: { coachTint: 'void' }
    }),
    zoneContract({
        id: 'zone_default_vigil',
        name: 'Endless Vigil',
        description: 'The default realm never rests. Hold the line.',
        category: 'zone',
        mapId: 'default',
        offer: { type: 'shrine', structure: 'shrine', minLevel: 2, prerequisiteQuestIds: [] },
        objective: {
            type: 'kill',
            target: 'any',
            count: 25,
            progress: 0,
            hint: 'Defeat enemies anywhere in the Default World.'
        },
        reward: { coachTint: 'default' }
    })
];

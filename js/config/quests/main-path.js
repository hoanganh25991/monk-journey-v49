/**
 * Main storyline quests — Path of the Monk (Acts I–V: main_01–main_14)
 */

import { MAIN_QUEST_REWARDS } from './quest-balance.js';

/** @typedef {import('./index.js').QuestDefinition} QuestDefinition */

/** @type {QuestDefinition[]} */
export const MAIN_PATH_QUESTS = [
    {
        id: 'main_01',
        name: 'First Steps',
        description: 'Prove your path by defeating the foes that block the road.',
        category: 'main',
        mapId: 'terrant',
        offer: {
            type: 'auto',
            minLevel: 1,
            prerequisiteQuestIds: []
        },
        objective: {
            type: 'kill',
            target: 'any',
            count: 5,
            progress: 0,
            hint: 'Fight any foes near the path ahead.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_01,
            items: [{ name: 'Health Potion', amount: 2 }]
        },
        isMainQuest: true,
        requiredLevel: 1,
        nextQuestId: 'main_02',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_02',
        name: 'The Broken Shrine',
        description: 'A fallen shrine near the trail still holds corruption. Cleanse it.',
        category: 'main',
        mapId: 'terrant',
        offer: {
            type: 'auto',
            minLevel: 2,
            prerequisiteQuestIds: ['main_01'],
            position: { x: 35, z: 25 }
        },
        objective: {
            type: 'interact',
            target: 'shrine',
            count: 1,
            progress: 0,
            hint: 'Find the broken shrine east of the spawn trail.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_02,
            items: [{
                name: 'Monk Bracers',
                type: 'accessory',
                damage: 0,
                damageReduction: 0.05,
                amount: 1
            }]
        },
        isMainQuest: true,
        requiredLevel: 2,
        nextQuestId: 'main_03',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_03',
        name: 'Whispers in the Woods',
        description: 'Forest predators stalk the border. Thin their numbers.',
        category: 'main',
        mapId: 'forest',
        offer: {
            type: 'auto',
            minLevel: 3,
            prerequisiteQuestIds: ['main_02']
        },
        objective: {
            type: 'kill',
            target: 'forest_spider|feral_wolf',
            count: 8,
            progress: 0,
            hint: 'Hunt spiders and wolves in the Forest.'
        },
        reward: { ...MAIN_QUEST_REWARDS.main_03 },
        isMainQuest: true,
        requiredLevel: 3,
        nextQuestId: 'main_04',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_04',
        name: 'King of Bones',
        description: 'The Skeleton King has risen in the ancient ruins. End his reign.',
        category: 'main',
        mapId: 'forest',
        offer: {
            type: 'auto',
            minLevel: 5,
            prerequisiteQuestIds: ['main_03'],
            position: { x: -41, z: -335 }
        },
        objective: {
            type: 'kill_boss',
            target: 'skeleton_king',
            count: 1,
            progress: 0,
            hint: 'Search the ruins in the Forest for the Skeleton King.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_04,
            items: [{
                name: 'Monk Staff',
                type: 'weapon',
                damage: 15,
                damageReduction: 0,
                amount: 1
            }]
        },
        isMainQuest: true,
        requiredLevel: 5,
        nextQuestId: 'main_05',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_05',
        name: 'Bog Lanterns',
        description: 'Lantern-lit bog paths are choked with the walking dead. Purge them.',
        category: 'main',
        mapId: 'swamp',
        offer: {
            type: 'auto',
            minLevel: 6,
            prerequisiteQuestIds: ['main_04']
        },
        objective: {
            type: 'kill',
            target: 'zombie',
            count: 10,
            progress: 0,
            hint: 'Enter the Swamp and defeat the wandering dead.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_05,
            items: [{
                name: 'Monk Robe',
                type: 'armor',
                damage: 0,
                damageReduction: 0.1,
                amount: 1
            }]
        },
        isMainQuest: true,
        requiredLevel: 6,
        nextQuestId: 'main_06',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_06',
        name: 'The Swamp Witch',
        description: 'A swamp witch brews poison at the heart of the mire. Silence her.',
        category: 'main',
        mapId: 'swamp',
        offer: {
            type: 'auto',
            minLevel: 7,
            prerequisiteQuestIds: ['main_05']
        },
        objective: {
            type: 'kill_boss',
            target: 'swamp_witch',
            count: 1,
            progress: 0,
            hint: 'Track the Swamp Witch deeper into the bog.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_06,
            items: [{
                name: 'Poison Ward Trinket',
                type: 'accessory',
                damage: 0,
                damageReduction: 0.08,
                amount: 1
            }]
        },
        isMainQuest: true,
        requiredLevel: 7,
        nextQuestId: 'main_07',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_07',
        name: 'Desert of Silence',
        description: 'Buried chests in the desert sands hold clues to the next seal.',
        category: 'main',
        mapId: 'desert',
        offer: {
            type: 'auto',
            minLevel: 8,
            prerequisiteQuestIds: ['main_06']
        },
        objective: {
            type: 'interact',
            target: 'chest',
            count: 2,
            progress: 0,
            hint: 'Open treasure chests among the Desert ruins.'
        },
        reward: { ...MAIN_QUEST_REWARDS.main_07 },
        isMainQuest: true,
        requiredLevel: 8,
        nextQuestId: 'main_08',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_08',
        name: 'Ash Demons',
        description: 'Ash demons crawl from the wastes. Drive them back.',
        category: 'main',
        mapId: 'desert',
        offer: {
            type: 'auto',
            minLevel: 9,
            prerequisiteQuestIds: ['main_07']
        },
        objective: {
            type: 'kill',
            target: 'ash_demon|demon',
            count: 12,
            progress: 0,
            hint: 'Hunt ash demons and lesser demons in the Desert.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_08,
            items: [{
                name: 'Monk Sandals',
                type: 'boots',
                damage: 0,
                damageReduction: 0.05,
                amount: 1
            }]
        },
        isMainQuest: true,
        requiredLevel: 9,
        nextQuestId: 'main_09',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_09',
        name: 'Lord of Cinder',
        description: 'The Inferno Lord commands the burning wastes. Face him.',
        category: 'main',
        mapId: 'desert',
        offer: {
            type: 'auto',
            minLevel: 10,
            prerequisiteQuestIds: ['main_08'],
            position: { x: -25, z: -331 }
        },
        objective: {
            type: 'kill_boss',
            target: 'inferno_lord|demon_lord',
            count: 1,
            progress: 0,
            hint: 'Confront the Inferno Lord at the desert temple.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_09,
            items: [{
                name: 'Legendary Monk Helmet',
                type: 'helmet',
                damage: 5,
                damageReduction: 0.15,
                amount: 1
            }]
        },
        isMainQuest: true,
        requiredLevel: 10,
        nextQuestId: 'main_10',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_10',
        name: 'Frost Trial',
        description: 'A frost titan guards the hollow basin. Break its icy reign.',
        category: 'main',
        mapId: 'frost-hollow',
        offer: {
            type: 'auto',
            minLevel: 12,
            prerequisiteQuestIds: ['main_09'],
            position: { x: 57, z: -89 }
        },
        objective: {
            type: 'kill_boss',
            target: 'frost_titan',
            count: 1,
            progress: 0,
            hint: 'Descend into the ice caves of Frost Hollow.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_10,
            items: [{
                name: 'Frost Monk Wraps',
                type: 'accessory',
                damage: 0,
                damageReduction: 0.1,
                amount: 1
            }]
        },
        isMainQuest: true,
        requiredLevel: 12,
        nextQuestId: 'main_11',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_11',
        name: 'Void Harbinger',
        description: 'A void harbinger stalks the eldritch grove. Banish it before the veil tears.',
        category: 'main',
        mapId: 'eldritch-grove',
        offer: {
            type: 'auto',
            minLevel: 14,
            prerequisiteQuestIds: ['main_10'],
            position: { x: -320, z: -320 }
        },
        objective: {
            type: 'kill_boss',
            target: 'void_harbinger',
            count: 1,
            progress: 0,
            hint: 'Find the dark sanctum at the grove\'s edge.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_11,
            items: [{
                name: 'Void Ward Amulet',
                type: 'accessory',
                damage: 8,
                damageReduction: 0.08,
                amount: 1
            }]
        },
        isMainQuest: true,
        requiredLevel: 14,
        nextQuestId: 'main_12',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_12',
        name: 'Seal the Rift',
        description: 'Three corrupted shrines anchor a rift in the Magical realm. Cleanse them all.',
        category: 'main',
        mapId: 'magical',
        offer: {
            type: 'auto',
            minLevel: 16,
            prerequisiteQuestIds: ['main_11']
        },
        objective: {
            type: 'interact',
            target: 'shrine',
            count: 3,
            progress: 0,
            hint: 'Cleanse three shrines scattered across the Magical map.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_12,
            items: [{ name: 'Health Potion', amount: 5 }]
        },
        isMainQuest: true,
        requiredLevel: 16,
        nextQuestId: 'main_13',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_13',
        name: 'Demon Lord',
        description: 'The demon lord marshals the mixed realms. End the invasion at its source.',
        category: 'main',
        mapId: 'mixed',
        offer: {
            type: 'auto',
            minLevel: 18,
            prerequisiteQuestIds: ['main_12'],
            position: { x: 0, z: 0 }
        },
        objective: {
            type: 'kill_boss',
            target: 'demon_lord',
            count: 1,
            progress: 0,
            hint: 'Confront the Demon Lord at the heart of the Mixed Realms.'
        },
        reward: {
            ...MAIN_QUEST_REWARDS.main_13,
            items: [{
                name: 'Legendary Monk Vestments',
                type: 'armor',
                damage: 10,
                damageReduction: 0.2,
                amount: 1
            }]
        },
        isMainQuest: true,
        requiredLevel: 18,
        nextQuestId: 'main_14',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_14',
        name: 'Master of the Journey',
        description: 'Prove mastery by sealing five shrine contracts across the realms.',
        category: 'main',
        offer: {
            type: 'auto',
            minLevel: 20,
            prerequisiteQuestIds: ['main_13']
        },
        objective: {
            type: 'zone_contracts',
            target: 'any',
            count: 5,
            progress: 0,
            hint: 'Complete five zone shrine contracts on any maps.'
        },
        reward: { ...MAIN_QUEST_REWARDS.main_14 },
        isMainQuest: true,
        requiredLevel: 20,
        nextQuestId: null,
        onComplete: 'moment:quest.complete'
    }
];

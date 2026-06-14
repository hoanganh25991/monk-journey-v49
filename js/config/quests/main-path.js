/**
 * Main storyline quests — Path of the Monk (Acts I–III: main_01–main_09)
 */

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
            experience: 100,
            gold: 50,
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
            experience: 150,
            gold: 75,
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
        reward: {
            experience: 250,
            gold: 100
        },
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
            experience: 500,
            gold: 250,
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
            experience: 700,
            gold: 300,
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
            experience: 900,
            gold: 400,
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
        reward: {
            experience: 1000,
            gold: 450
        },
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
            experience: 1200,
            gold: 500,
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
            experience: 2000,
            gold: 1000,
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
        nextQuestId: null,
        onComplete: 'moment:quest.complete'
    }
];

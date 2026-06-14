/**
 * Main storyline quests — Path of the Monk (legacy IDs; Phase 2 replaces with main_01–main_14)
 */

/** @typedef {import('./index.js').QuestDefinition} QuestDefinition */

/** @type {QuestDefinition[]} */
export const MAIN_PATH_QUESTS = [
    {
        id: 'main_quest_1',
        name: 'The Beginning of the Journey',
        description: 'Defeat the enemies in the forest to prove your worth.',
        category: 'main',
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
        nextQuestId: 'main_quest_2',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_quest_2',
        name: 'The Skeleton Threat',
        description: 'Skeletons have been spotted in the ruins. Defeat them to secure the area.',
        category: 'main',
        offer: {
            type: 'auto',
            minLevel: 2,
            prerequisiteQuestIds: ['main_quest_1']
        },
        objective: {
            type: 'kill',
            target: 'skeleton',
            count: 8,
            progress: 0,
            hint: 'Search the ruins east of the village for bone warriors.'
        },
        reward: {
            experience: 200,
            gold: 100,
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
        nextQuestId: 'main_quest_3',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_quest_3',
        name: 'The Skeleton King',
        description: 'The Skeleton King has risen in the ancient ruins. Defeat him to restore peace.',
        category: 'main',
        mapId: 'forest',
        offer: {
            type: 'auto',
            minLevel: 4,
            prerequisiteQuestIds: ['main_quest_2']
        },
        objective: {
            type: 'kill_boss',
            target: 'skeleton_king',
            count: 1,
            progress: 0,
            hint: 'Seek the Skeleton King in the Forest ruins.'
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
        requiredLevel: 4,
        nextQuestId: 'main_quest_4',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_quest_4',
        name: 'The Swamp of Despair',
        description: 'Zombies have infested the swamp. Clear them out to make the area safe again.',
        category: 'main',
        mapId: 'swamp',
        offer: {
            type: 'auto',
            minLevel: 6,
            prerequisiteQuestIds: ['main_quest_3']
        },
        objective: {
            type: 'kill',
            target: 'zombie',
            count: 12,
            progress: 0,
            hint: 'Enter the Swamp zone and purge the wandering dead.'
        },
        reward: {
            experience: 800,
            gold: 350,
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
        nextQuestId: 'main_quest_5',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_quest_5',
        name: 'The Demon Invasion',
        description: 'Demons have begun invading from the mountains. Defeat them to protect the realm.',
        category: 'main',
        mapId: 'mountains',
        offer: {
            type: 'auto',
            minLevel: 8,
            prerequisiteQuestIds: ['main_quest_4']
        },
        objective: {
            type: 'kill',
            target: 'demon',
            count: 15,
            progress: 0,
            hint: 'Drive demons back from the mountain passes.'
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
        requiredLevel: 8,
        nextQuestId: 'main_quest_6',
        onComplete: 'moment:quest.complete'
    },
    {
        id: 'main_quest_6',
        name: 'The Final Battle',
        description: 'The Demon Lord has appeared. Defeat him to save the world from destruction.',
        category: 'main',
        offer: {
            type: 'auto',
            minLevel: 10,
            prerequisiteQuestIds: ['main_quest_5']
        },
        objective: {
            type: 'kill_boss',
            target: 'demon_lord',
            count: 1,
            progress: 0,
            hint: 'Confront the Demon Lord where corruption burns brightest.'
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

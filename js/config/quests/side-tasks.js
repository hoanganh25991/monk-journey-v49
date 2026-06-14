/**
 * Optional side quests — Wanderer's Tasks
 */

/** @typedef {import('./index.js').QuestDefinition} QuestDefinition */

/** @type {QuestDefinition[]} */
export const SIDE_TASK_QUESTS = [
    {
        id: 'side_quest_1',
        name: 'Treasure Hunter',
        description: 'Find and open treasure chests scattered around the world.',
        category: 'side',
        offer: {
            type: 'board',
            structure: 'village',
            minLevel: 1,
            prerequisiteQuestIds: []
        },
        objective: {
            type: 'interact',
            target: 'chest',
            count: 3,
            progress: 0,
            hint: 'Open chests near villages and along the road.'
        },
        reward: {
            experience: 50,
            gold: 100
        },
        isMainQuest: false,
        requiredLevel: 1
    },
    {
        id: 'side_quest_2',
        name: 'Explorer',
        description: 'Discover all zones in the world.',
        category: 'side',
        offer: {
            type: 'board',
            structure: 'village',
            minLevel: 1,
            prerequisiteQuestIds: []
        },
        objective: {
            type: 'explore',
            target: 'zone',
            count: 4,
            progress: 0,
            discovered: [],
            hint: 'Walk into Terrant, Forest, Desert, and Swamp zones.'
        },
        reward: {
            experience: 150,
            gold: 75,
            items: [{ name: 'Map Fragment', amount: 1 }]
        },
        isMainQuest: false,
        requiredLevel: 1
    },
    {
        id: 'side_quest_3',
        name: 'Skeleton Slayer',
        description: 'Defeat 20 skeletons to thin their numbers.',
        category: 'side',
        offer: {
            type: 'board',
            structure: 'tavern',
            minLevel: 3,
            prerequisiteQuestIds: []
        },
        objective: {
            type: 'kill',
            target: 'skeleton',
            count: 20,
            progress: 0,
            hint: 'Hunt skeletons wherever bones litter the ground.'
        },
        reward: {
            experience: 200,
            gold: 150,
            items: [{ name: 'Bone Dust', amount: 5 }]
        },
        isMainQuest: false,
        requiredLevel: 3
    },
    {
        id: 'side_quest_4',
        name: 'Zombie Hunter',
        description: 'Cleanse the swamp by defeating 25 zombies.',
        category: 'side',
        mapId: 'swamp',
        offer: {
            type: 'board',
            structure: 'tavern',
            minLevel: 5,
            prerequisiteQuestIds: ['main_04']
        },
        objective: {
            type: 'kill',
            target: 'zombie',
            count: 25,
            progress: 0,
            hint: 'Stay in the Swamp and break the undead tide.'
        },
        reward: {
            experience: 300,
            gold: 200,
            items: [{ name: 'Putrid Essence', amount: 3 }]
        },
        isMainQuest: false,
        requiredLevel: 5
    },
    {
        id: 'side_quest_5',
        name: 'Demon Slayer',
        description: 'Defeat 30 demons to weaken their invasion force.',
        category: 'side',
        offer: {
            type: 'board',
            structure: 'tavern',
            minLevel: 7,
            prerequisiteQuestIds: ['main_05']
        },
        objective: {
            type: 'kill',
            target: 'demon',
            count: 30,
            progress: 0,
            hint: 'Cull demons in the highlands and mountain approaches.'
        },
        reward: {
            experience: 400,
            gold: 300,
            items: [{ name: 'Demon Heart', amount: 2 }]
        },
        isMainQuest: false,
        requiredLevel: 7
    },
    {
        id: 'side_quest_6',
        name: 'Master Treasure Hunter',
        description: 'Find and open 10 treasure chests throughout the world.',
        category: 'side',
        offer: {
            type: 'board',
            structure: 'village',
            minLevel: 5,
            prerequisiteQuestIds: ['side_quest_1']
        },
        objective: {
            type: 'interact',
            target: 'chest',
            count: 10,
            progress: 0,
            hint: 'Search every biome for hidden chests.'
        },
        reward: {
            experience: 500,
            gold: 400,
            items: [{
                name: 'Lucky Charm',
                type: 'accessory',
                damage: 2,
                damageReduction: 0.02,
                amount: 1
            }]
        },
        isMainQuest: false,
        requiredLevel: 5
    },
    {
        id: 'side_quest_7',
        name: 'Rare Materials',
        description: 'Collect rare materials from defeated bosses.',
        category: 'side',
        offer: {
            type: 'board',
            structure: 'tavern',
            minLevel: 8,
            prerequisiteQuestIds: ['main_04']
        },
        objective: {
            type: 'kill_boss',
            target: 'any',
            count: 3,
            progress: 0,
            hint: 'Defeat three elite bosses — they bear crowns of power.'
        },
        reward: {
            experience: 600,
            gold: 500,
            items: [{ name: 'Enchanted Crystal', amount: 1 }]
        },
        isMainQuest: false,
        requiredLevel: 8
    }
];

/**
 * Chapter quests — GDD-aligned (quest.md §5, §6; design/systems/quest-system.md).
 * Each main story quest: narrative, emotional theme, objectives, boss, reflection quote, rewards.
 */

/** @typedef {{ type: string, target?: string, count: number, progress?: number }} ChapterObjective */

/**
 * @typedef {Object} ChapterQuest
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} lesson - Life lesson quote (reflection screen)
 * @property {string} area
 * @property {ChapterObjective[]} objectives
 * @property {{ enemyType: string, name: string }} boss
 * @property {{ xp: number, skillPoints?: number, item?: string }} rewards
 * @property {string|null} nextQuestId
 */

/** @type {ChapterQuest[]} */
export const CHAPTER_QUESTS = [
    {
        id: 'chapter_1_restless_village',
        title: 'The Restless Village',
        description: 'A village consumed by anger—disputes over land, old grudges. A Rage Beast has taken root and feeds on their anger. Calm the conflicts and face the beast so the village can find peace.',
        lesson: 'Anger burns the one who carries it.',
        area: 'The Restless Village',
        objectives: [
            { type: 'kill', target: 'any', count: 3, progress: 0 },
            { type: 'defeat_boss', target: 'skeleton_king', count: 1, progress: 0 },
        ],
        boss: { enemyType: 'skeleton_king', name: 'Rage Beast' },
        rewards: { xp: 250, skillPoints: 1 },
        nextQuestId: 'chapter_2_forest_of_doubt',
    },
    {
        id: 'chapter_2_forest_of_doubt',
        title: 'Forest of Doubt',
        description: 'A dense, misty forest where travelers lose their way and their courage. Something whispers in the dark. Face the Doubt Serpent so the forest can be free of paralyzing fear.',
        lesson: 'Fear grows in silence.',
        area: 'Forest of Doubt',
        objectives: [
            { type: 'kill', target: 'any', count: 4, progress: 0 },
            { type: 'defeat_boss', target: 'demon_lord', count: 1, progress: 0 },
        ],
        boss: { enemyType: 'demon_lord', name: 'Doubt Serpent' },
        rewards: { xp: 250, skillPoints: 1 },
        nextQuestId: 'chapter_3_mountain_of_desire',
    },
    {
        id: 'chapter_3_mountain_of_desire',
        title: 'Mountain of Desire',
        description: 'A mountain where treasure hunters are obsessed with gold and power. A Golden Titan guards the peak. Navigate temptations and face the Titan to learn that gratitude—not accumulation—brings peace.',
        lesson: 'Gratitude ends endless hunger.',
        area: 'Mountain of Desire',
        objectives: [
            { type: 'kill', target: 'greed_spawn', count: 6, progress: 0 },
            { type: 'defeat_boss', target: 'golden_titan', count: 1, progress: 0 },
        ],
        boss: { enemyType: 'golden_titan', name: 'Golden Titan' },
        rewards: { xp: 250, skillPoints: 1 },
        nextQuestId: 'chapter_4_desert_of_loneliness',
    },
    {
        id: 'chapter_4_desert_of_loneliness',
        title: 'Desert of Loneliness',
        description: 'A vast desert where travelers feel cut off—no landmarks, no companions. An Echo Phantom amplifies loneliness. Endure the emptiness, find connection, then face the Phantom.',
        lesson: 'You are never truly alone.',
        area: 'Desert of Loneliness',
        objectives: [
            { type: 'kill', target: 'echo_spawn', count: 5, progress: 0 },
            { type: 'defeat_boss', target: 'echo_phantom', count: 1, progress: 0 },
        ],
        boss: { enemyType: 'echo_phantom', name: 'Echo Phantom' },
        rewards: { xp: 250, skillPoints: 1 },
        nextQuestId: 'chapter_5_inner_temple',
    },
    {
        id: 'chapter_5_inner_temple',
        title: 'Inner Temple',
        description: 'The final trial. Here the test is not an external monster but the self. A Shadow Self mirrors your skills and choices. Face this reflection and transcend the untrained self to earn Enlightenment Mode.',
        lesson: 'Your greatest opponent is your untrained self.',
        area: 'Inner Temple',
        objectives: [
            { type: 'defeat_boss', target: 'shadow_self', count: 1, progress: 0 },
        ],
        boss: { enemyType: 'shadow_self', name: 'Shadow Self' },
        rewards: { xp: 300, skillPoints: 1 },
        nextQuestId: null, // Unlocks Path of Mastery
    },
];

/**
 * Life lessons by chapter (for reflection screen).
 * @type {Record<string, string>}
 */
export const CHAPTER_LESSONS = Object.fromEntries(
    CHAPTER_QUESTS.map((q) => [q.id, q.lesson])
);

/**
 * Get chapter quest by id.
 * @param {string} id
 * @returns {ChapterQuest|undefined}
 */
export function getChapterQuestById(id) {
    return CHAPTER_QUESTS.find((q) => q.id === id);
}

/**
 * Get the first chapter quest (story start).
 * @returns {ChapterQuest}
 */
export function getFirstChapterQuest() {
    return CHAPTER_QUESTS[0];
}

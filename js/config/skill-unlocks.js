/**
 * Skill unlock progression — skills unlock as the player completes chapter quests.
 * Matches quest log / story progress: only unlocked skills can be selected and used.
 * Multiplayer: each player's unlocked set is based on their own completed chapters (from their save).
 */

/** Skill names available from the start (no chapter required). */
export const STARTER_SKILL_NAMES = Object.freeze([
    'Fist of Thunder',
    'Wave of Light',
    'Shield of Zen',
]);

/**
 * Skills that unlock when a chapter quest is completed.
 * Order matters for UI: first chapter that unlocks a skill is shown in "Complete Chapter X to unlock".
 * @type {{ chapterQuestId: string, chapterLabel: string, skillNames: string[] }[]}
 */
export const SKILL_UNLOCK_BY_CHAPTER = Object.freeze([
    {
        chapterQuestId: 'chapter_1_restless_village',
        chapterLabel: 'Chapter 1 — The Restless Village',
        skillNames: ['Deadly Reach', 'Breath of Heaven'],
    },
    {
        chapterQuestId: 'chapter_2_forest_of_doubt',
        chapterLabel: 'Chapter 2 — Forest of Doubt',
        skillNames: ['Wave Strike', 'Cyclone Strike'],
    },
    {
        chapterQuestId: 'chapter_3_mountain_of_desire',
        chapterLabel: 'Chapter 3 — Mountain of Desire',
        skillNames: ['Seven-Sided Strike', 'Inner Sanctuary'],
    },
    {
        chapterQuestId: 'chapter_4_desert_of_loneliness',
        chapterLabel: 'Chapter 4 — Desert of Loneliness',
        skillNames: ['Mystic Allies', 'Exploding Palm', 'Flying Dragon', 'Flying Kick'],
    },
    {
        chapterQuestId: 'chapter_5_inner_temple',
        chapterLabel: 'Chapter 5 — Inner Temple',
        skillNames: ['Mystic Strike', 'Imprisoned Fists', 'Bul Palm', 'Bul Breath Of Heaven', 'Bul Shadow Clone'],
    },
]);

/** Map skill name -> first chapter that unlocks it (for "Complete Chapter X to unlock" tooltip). */
const SKILL_TO_CHAPTER = (() => {
    const map = {};
    SKILL_UNLOCK_BY_CHAPTER.forEach(({ chapterQuestId, chapterLabel, skillNames }) => {
        skillNames.forEach(name => {
            if (!map[name]) map[name] = { chapterQuestId, chapterLabel };
        });
    });
    return map;
})();

/**
 * Get the set of skill names that are unlocked for the given completed chapter quest IDs.
 * @param {Set<string>|Iterable<string>} completedChapterQuestIds - Completed chapter quest IDs (e.g. from QuestManager)
 * @returns {Set<string>} Set of unlocked skill names
 */
export function getUnlockedSkillNames(completedChapterQuestIds) {
    const completed = completedChapterQuestIds instanceof Set
        ? completedChapterQuestIds
        : new Set(completedChapterQuestIds || []);
    const unlocked = new Set(STARTER_SKILL_NAMES);
    SKILL_UNLOCK_BY_CHAPTER.forEach(({ chapterQuestId, skillNames }) => {
        if (completed.has(chapterQuestId)) {
            skillNames.forEach(name => unlocked.add(name));
        }
    });
    return unlocked;
}

/**
 * Get the chapter that unlocks a skill (for UI tooltip). Starter skills return null.
 * @param {string} skillName
 * @returns {{ chapterQuestId: string, chapterLabel: string } | null}
 */
export function getChapterThatUnlocksSkill(skillName) {
    if (STARTER_SKILL_NAMES.includes(skillName)) return null;
    return SKILL_TO_CHAPTER[skillName] || null;
}

/**
 * Check if a skill name is unlocked for the given completed chapter IDs.
 * @param {string} skillName
 * @param {Set<string>|Iterable<string>} completedChapterQuestIds
 * @returns {boolean}
 */
export function isSkillUnlocked(skillName, completedChapterQuestIds) {
    return getUnlockedSkillNames(completedChapterQuestIds).has(skillName);
}

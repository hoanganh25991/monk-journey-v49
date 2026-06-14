/**
 * Quest definitions registry — edit content here, not QuestManager logic.
 */

import { MAIN_PATH_QUESTS } from './main-path.js';
import { SIDE_TASK_QUESTS } from './side-tasks.js';
import { ZONE_CONTRACT_QUESTS } from './zone-contracts.js';
import { DAILY_QUEST_POOL } from './daily-pool.js';

/**
 * @typedef {Object} QuestObjective
 * @property {string} type
 * @property {string} target
 * @property {number} count
 * @property {number} progress
 * @property {string} [hint]
 * @property {string[]} [discovered]
 */

/**
 * @typedef {Object} QuestDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {'main'|'zone'|'side'|'daily'} category
 * @property {string} [mapId]
 * @property {Object} offer
 * @property {QuestObjective} objective
 * @property {Object} reward
 * @property {boolean} isMainQuest
 * @property {number} requiredLevel
 * @property {string|null} [nextQuestId]
 * @property {string[]} [prerequisiteQuestIds]
 * @property {string} [onComplete]
 */

const ALL_QUEST_DEFINITIONS = [
    ...MAIN_PATH_QUESTS,
    ...SIDE_TASK_QUESTS,
    ...ZONE_CONTRACT_QUESTS,
    ...DAILY_QUEST_POOL
];

const QUEST_BY_ID = new Map(ALL_QUEST_DEFINITIONS.map(q => [q.id, q]));

/** @returns {QuestDefinition[]} */
export function getAllQuestTemplates() {
    return ALL_QUEST_DEFINITIONS;
}

/** @param {string} questId @returns {QuestDefinition|undefined} */
export function getQuestTemplateById(questId) {
    return QUEST_BY_ID.get(questId);
}

/** @param {'main'|'zone'|'side'|'daily'} category @returns {QuestDefinition[]} */
export function getQuestsByCategory(category) {
    return ALL_QUEST_DEFINITIONS.filter(q => q.category === category);
}

/**
 * Deep-clone a quest template for runtime use (active or available pool).
 * @param {QuestDefinition} template
 * @returns {QuestDefinition}
 */
export function cloneQuestTemplate(template) {
    const copy = JSON.parse(JSON.stringify(template));
    copy.objective.progress = 0;
    if (copy.objective.type === 'explore' && !copy.objective.discovered) {
        copy.objective.discovered = [];
    }
    return copy;
}

/** @param {QuestDefinition} quest @returns {number} */
export function getQuestMinLevel(quest) {
    return quest.requiredLevel ?? quest.offer?.minLevel ?? 1;
}

/** @param {QuestDefinition} quest @returns {string[]} */
export function getQuestPrerequisiteIds(quest) {
    return quest.prerequisiteQuestIds ?? quest.offer?.prerequisiteQuestIds ?? [];
}

export { MAIN_PATH_QUESTS, SIDE_TASK_QUESTS, ZONE_CONTRACT_QUESTS, DAILY_QUEST_POOL };

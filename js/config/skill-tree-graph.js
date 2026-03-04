/**
 * GDD skill tree graph (quest.md §4; design/systems/skill-tree.md).
 * Graph of nodes with id, name, description, requiredNodes, paths (Body / Mind / Harmony).
 * Enlightenment Mode unlocks after Chapter 5 (completedChapterQuestIds includes chapter_5_inner_temple).
 */

/** Path identifiers */
export const SKILL_TREE_PATHS = Object.freeze({
    BODY: 'body',
    MIND: 'mind',
    HARMONY: 'harmony',
});

/** Chapter 5 quest ID — completing it unlocks Enlightenment Mode */
export const CHAPTER_5_QUEST_ID = 'chapter_5_inner_temple';

/**
 * @typedef {Object} SkillTreeNode
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} icon - Emoji or icon key
 * @property {number} maxLevel
 * @property {number} costPerLevel - Skill points per level
 * @property {string[]} requiredNodes - Node IDs that must be unlocked (any level) before this node
 * @property {string} path - One of SKILL_TREE_PATHS
 * @property {boolean} [requireChapter5] - If true, completedChapterQuestIds must include CHAPTER_5_QUEST_ID
 * @property {number} [requiredLevel] - Minimum player level to unlock this node (default 1). Phase 7.3: skills-by-level.
 * @property {string[]} [variants] - Optional variant names (e.g. damage, speed, stun)
 */

/** @type {SkillTreeNode[]} */
const NODES = [
    // —— Body path ——
    {
        id: 'quick_strike',
        name: 'Quick Strike',
        description: 'A fast, precise strike. Variants: increased damage, speed, stun chance, life steal.',
        icon: '⚡',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: [],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 1,
    },
    {
        id: 'flowing_combo',
        name: 'Flowing Combo',
        description: 'Chain strikes in a flowing sequence. Variants: damage, speed, stun, life steal.',
        icon: '🌀',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['quick_strike'],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 2,
    },
    {
        id: 'wind_dash',
        name: 'Wind Dash',
        description: 'Dash through the air like the wind. Variants: damage, speed, stun, life steal.',
        icon: '💨',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['flowing_combo'],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 3,
    },
    {
        id: 'palm_burst',
        name: 'Palm Burst',
        description: 'Release energy in a burst from your palm. Variants: damage, speed, stun, life steal.',
        icon: '✋',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['wind_dash'],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 4,
    },
    {
        id: 'ground_stomp',
        name: 'Ground Stomp',
        description: 'Stomp the ground to shock nearby enemies. Variants: damage, speed, stun, life steal.',
        icon: '🦶',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['palm_burst'],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 5,
    },
    // —— Mind path ——
    {
        id: 'inner_focus',
        name: 'Inner Focus',
        description: 'Focus your mind to strengthen your abilities. Variants: cooldown, radius, heal allies, duration.',
        icon: '🧘',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: [],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 1,
    },
    {
        id: 'energy_wave',
        name: 'Energy Wave',
        description: 'Send a wave of mental energy at foes. Variants: cooldown, radius, heal, duration.',
        icon: '〰️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['inner_focus'],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 2,
    },
    {
        id: 'meditation_field',
        name: 'Meditation Field',
        description: 'Create a field of calm that supports allies. Variants: cooldown, radius, heal, duration.',
        icon: '🕉️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['energy_wave'],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 3,
    },
    {
        id: 'spirit_shield',
        name: 'Spirit Shield',
        description: 'Shield yourself with spiritual energy. Variants: cooldown, radius, heal, duration.',
        icon: '🛡️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['meditation_field'],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 4,
    },
    {
        id: 'calm_pulse',
        name: 'Calm Pulse',
        description: 'Emit a pulse of calm that weakens enemy aggression. Variants: cooldown, radius, heal, duration.',
        icon: '💫',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['spirit_shield'],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 5,
    },
    // —— Harmony path ——
    {
        id: 'balance_aura',
        name: 'Balance Aura',
        description: 'An aura that balances body and mind. Variants: aura size, duration, healing, slow.',
        icon: '☯️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: [],
        path: SKILL_TREE_PATHS.HARMONY,
        requiredLevel: 1,
    },
    {
        id: 'reflect_harm',
        name: 'Reflect Harm',
        description: 'Reflect a portion of harm back to attackers. Variants: aura size, duration, healing, slow.',
        icon: '↩️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['balance_aura'],
        path: SKILL_TREE_PATHS.HARMONY,
        requiredLevel: 2,
    },
    {
        id: 'slow_time',
        name: 'Slow Time',
        description: 'Bend time briefly in a small area. Variants: aura size, duration, healing, slow.',
        icon: '⏳',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['reflect_harm'],
        path: SKILL_TREE_PATHS.HARMONY,
        requiredLevel: 3,
    },
    {
        id: 'serenity_field',
        name: 'Serenity Field',
        description: 'A field of serenity that restores and protects. Variants: aura size, duration, healing, slow.',
        icon: '🌿',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['slow_time'],
        path: SKILL_TREE_PATHS.HARMONY,
        requiredLevel: 4,
    },
    {
        id: 'enlightenment_mode',
        name: 'Enlightenment Mode',
        description: 'Transcend the untrained self. Short buff with synergy to other skills. Unlocked after Chapter 5.',
        icon: '✨',
        maxLevel: 3,
        costPerLevel: 2,
        requiredNodes: ['serenity_field'],
        path: SKILL_TREE_PATHS.HARMONY,
        requireChapter5: true,
        requiredLevel: 5,
    },
];

/** @type {Record<string, SkillTreeNode>} */
export const SKILL_TREE_GRAPH_NODES = Object.fromEntries(NODES.map((n) => [n.id, { ...n }]));

/** Ordered list of node IDs by path (for UI layout) */
export const SKILL_TREE_PATH_ORDER = Object.freeze({
    [SKILL_TREE_PATHS.BODY]: ['quick_strike', 'flowing_combo', 'wind_dash', 'palm_burst', 'ground_stomp'],
    [SKILL_TREE_PATHS.MIND]: ['inner_focus', 'energy_wave', 'meditation_field', 'spirit_shield', 'calm_pulse'],
    [SKILL_TREE_PATHS.HARMONY]: ['balance_aura', 'reflect_harm', 'slow_time', 'serenity_field', 'enlightenment_mode'],
});

/**
 * Get node by id
 * @param {string} nodeId
 * @returns {SkillTreeNode|undefined}
 */
export function getSkillTreeNodeById(nodeId) {
    return SKILL_TREE_GRAPH_NODES[nodeId];
}

/**
 * Get all node IDs for a path
 * @param {string} path - One of SKILL_TREE_PATHS
 * @returns {string[]}
 */
export function getSkillTreeNodesByPath(path) {
    return SKILL_TREE_PATH_ORDER[path] || [];
}

/**
 * Check if a node is unlocked (prerequisites met; requiredLevel; if requireChapter5, chapter 5 completed).
 * @param {SkillTreeNode} node
 * @param {Object.<string, number>} nodeLevels - Map nodeId -> currentLevel
 * @param {Set<string>} [completedChapterQuestIds] - Set of completed chapter quest IDs
 * @param {number} [playerLevel] - Player level (for requiredLevel check; default 1)
 * @returns {boolean}
 */
export function isSkillTreeNodeUnlocked(node, nodeLevels, completedChapterQuestIds = new Set(), playerLevel = 1) {
    const minLevel = node.requiredLevel ?? 1;
    if ((playerLevel ?? 1) < minLevel) return false;
    for (const reqId of node.requiredNodes || []) {
        const level = nodeLevels[reqId] ?? 0;
        if (level < 1) return false;
    }
    if (node.requireChapter5) {
        if (!completedChapterQuestIds || !completedChapterQuestIds.has(CHAPTER_5_QUEST_ID)) return false;
    }
    return true;
}

/**
 * Check if the player can spend one more level on this node (unlocked, not max level).
 * @param {SkillTreeNode} node
 * @param {Object.<string, number>} nodeLevels
 * @param {Set<string>} [completedChapterQuestIds]
 * @param {number} [playerLevel] - Player level (for requiredLevel check; default 1)
 * @returns {boolean}
 */
export function canLevelSkillTreeNode(node, nodeLevels, completedChapterQuestIds, playerLevel = 1) {
    const current = nodeLevels[node.id] ?? 0;
    if (current >= node.maxLevel) return false;
    return isSkillTreeNodeUnlocked(node, nodeLevels, completedChapterQuestIds, playerLevel);
}

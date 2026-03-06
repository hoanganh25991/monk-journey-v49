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
 * @property {string|null} [skillRef] - Skill name from skills.js linked to this node (shows stats & variants panel)
 * @property {string} [story] - Lore/story text displayed when the player selects this node
 */

/** @type {SkillTreeNode[]} */
const NODES = [
    // —— Body path ——
    {
        id: 'quick_strike',
        name: 'Quick Strike',
        description: 'A fast, precise strike. Scales with each level to boost primary attack speed and power.',
        icon: '⚡',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: [],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 1,
        skillRef: 'Deadly Reach',
        story: 'The first lesson of the monastery: strike before thought. Master Shui once said — "the hand that hesitates is already broken." Quick Strike trains the body to move on instinct, turning raw aggression into precise, devastating blows.',
    },
    {
        id: 'flowing_combo',
        name: 'Flowing Combo',
        description: 'Chain strikes in a flowing sequence. Each hit opens a window for the next, building momentum.',
        icon: '🌀',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['quick_strike'],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 2,
        skillRef: 'Fist of Thunder',
        story: 'Water does not stop between rocks — it flows around them. Flowing Combo teaches the monk to link strikes together in an unbroken current, each blow feeding into the next until enemies have no chance to recover.',
    },
    {
        id: 'wind_dash',
        name: 'Wind Dash',
        description: 'Dash through the air like the wind. Closes gaps or repositions in an instant.',
        icon: '💨',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['flowing_combo'],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 3,
        skillRef: 'Flying Kick',
        story: 'The wind leaves no footprints. Wind Dash is the art of pure movement — arriving where you are needed before the enemy can react. Senior monks who master this node are said to appear as a blur, gone before the echo of their strike fades.',
    },
    {
        id: 'palm_burst',
        name: 'Palm Burst',
        description: 'Release a focused burst of chi energy from the palm, staggering nearby enemies.',
        icon: '✋',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['wind_dash'],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 4,
        skillRef: 'Exploding Palm',
        story: 'Chi compressed to its limit becomes destruction. The Palm Burst technique channels months of training into a single open-handed release — the air itself recoils. Those struck feel the reverberations long after the monk has moved on.',
    },
    {
        id: 'ground_stomp',
        name: 'Ground Stomp',
        description: 'Stomp the ground to send a shockwave through nearby enemies, stunning them briefly.',
        icon: '🦶',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['palm_burst'],
        path: SKILL_TREE_PATHS.BODY,
        requiredLevel: 5,
        skillRef: 'Cyclone Strike',
        story: 'The mountain does not move — but when it does, everything trembles. Ground Stomp is the pinnacle of body mastery: planting the foot with such force that the earth itself becomes a weapon, rippling outward to punish all who stand too close.',
    },
    // —— Mind path ——
    {
        id: 'inner_focus',
        name: 'Inner Focus',
        description: 'Calm the mind to reduce skill cooldowns and increase mana efficiency.',
        icon: '🧘',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: [],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 1,
        skillRef: 'Breath of Heaven',
        story: 'Before the monk strikes, he is still. Inner Focus is not meditation for rest — it is the discipline of finding silence in the eye of a storm. Each level sharpens that silence, letting skills flow with less effort and recover faster.',
    },
    {
        id: 'energy_wave',
        name: 'Energy Wave',
        description: 'Project a wave of mental energy that damages and pushes back foes at range.',
        icon: '〰️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['inner_focus'],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 2,
        skillRef: 'Wave Strike',
        story: 'Thought given form. The monks of the Mind path learned to project their focused will outward — visible to those with the eyes to see it, felt by all. Energy Wave is the first step in that projection, a ripple that grows into a tide.',
    },
    {
        id: 'meditation_field',
        name: 'Meditation Field',
        description: 'Project a calming aura that heals allies and weakens enemies within the field.',
        icon: '🕉️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['energy_wave'],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 3,
        skillRef: 'Inner Sanctuary',
        story: 'Some battlefields become sanctuaries. A monk who reaches the Meditation Field technique no longer fights only with fists — they reshape the ground they stand on, turning chaos into calm and confusion into resolve for those who stand beside them.',
    },
    {
        id: 'spirit_shield',
        name: 'Spirit Shield',
        description: 'Wrap yourself in spiritual force, reducing damage taken for a short time.',
        icon: '🛡️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['meditation_field'],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 4,
        skillRef: 'Shield of Zen',
        story: "The mind protects what the body cannot. Spirit Shield is the monk's answer to overwhelm — a wall built not from stone but from sheer concentrated will. Enemies strike at the monk and find their force returned to them like a mirror.",
    },
    {
        id: 'calm_pulse',
        name: 'Calm Pulse',
        description: 'Emit a pulse of calming energy that disrupts enemies and reduces their aggression.',
        icon: '💫',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['spirit_shield'],
        path: SKILL_TREE_PATHS.MIND,
        requiredLevel: 5,
        skillRef: 'Breath of Heaven',
        story: "Anger is a weapon that cuts both ways. The Calm Pulse technique weaponizes serenity itself — a wave of pure peace that unravels the fury in an enemy's heart, leaving them confused, slowed, and vulnerable to follow-up strikes.",
    },
    // —— Harmony path ——
    {
        id: 'balance_aura',
        name: 'Balance Aura',
        description: 'Emit a persistent aura that slowly restores health and improves defense for the monk.',
        icon: '☯️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: [],
        path: SKILL_TREE_PATHS.HARMONY,
        requiredLevel: 1,
        skillRef: 'Inner Sanctuary',
        story: 'Body and mind alone are incomplete. Balance Aura is the first lesson of the Harmony path: that a monk in true equilibrium radiates strength outward. Allies feel steadier. Enemies feel uneasy. The battle tilts before a single strike is thrown.',
    },
    {
        id: 'reflect_harm',
        name: 'Reflect Harm',
        description: 'Part of incoming damage is reflected back to attackers.',
        icon: '↩️',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['balance_aura'],
        path: SKILL_TREE_PATHS.HARMONY,
        requiredLevel: 2,
        skillRef: 'Shield of Zen',
        story: "Harm is not destroyed — it is redirected. The second Harmony principle teaches that resisting force is waste; the enlightened monk steps aside and lets the attacker's own violence return home. Reflect Harm is that principle made flesh.",
    },
    {
        id: 'slow_time',
        name: 'Slow Time',
        description: 'Briefly warp time around the monk, slowing all enemies in the area.',
        icon: '⏳',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['reflect_harm'],
        path: SKILL_TREE_PATHS.HARMONY,
        requiredLevel: 3,
        skillRef: 'Cyclone Strike',
        story: "Time is not fixed — it bends to the sufficiently trained mind. Slow Time is the monastery's most jealously guarded technique; only monks who have mastered both Body and Mind dare attempt it. For one breathless moment, the world holds still and the monk acts.",
    },
    {
        id: 'serenity_field',
        name: 'Serenity Field',
        description: 'Create a field of profound serenity that heals allies and repels enemies.',
        icon: '🌿',
        maxLevel: 5,
        costPerLevel: 1,
        requiredNodes: ['slow_time'],
        path: SKILL_TREE_PATHS.HARMONY,
        requiredLevel: 4,
        skillRef: 'Inner Sanctuary',
        story: "The highest form of combat is the battle that never happens. The Serenity Field projects the monk's inner peace outward with such force that enemies at its edge feel their will to fight dissolve. Allies within it heal rapidly, their bodies remembering what wholeness feels like.",
    },
    {
        id: 'enlightenment_mode',
        name: 'Enlightenment Mode',
        description: 'Transcend the untrained self. A short but powerful transformation that empowers all skills.',
        icon: '✨',
        maxLevel: 3,
        costPerLevel: 2,
        requiredNodes: ['serenity_field'],
        path: SKILL_TREE_PATHS.HARMONY,
        requireChapter5: true,
        requiredLevel: 5,
        skillRef: null,
        story: 'There is a moment, past all technique and training, where the monk ceases to be a monk and becomes something else entirely. Enlightenment Mode cannot be taught — it can only be earned, arriving only after the Inner Temple has been faced and survived. In this state, all barriers between self and universe dissolve.',
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

/**
 * Chapter quests — GDD-aligned (quest.md §5, §6; design/systems/quest-system.md).
 * Each main story quest: narrative, emotional theme, objectives, boss, reflection quote, rewards.
 *
 * Tone (Phase 7.6): Quests are one-time help—the monk helps a place once, learns a lesson, moves on.
 * Lessons and quest text are kid/teen-friendly: life lessons about growth, harmony, and being better
 * (anger, fear, gratitude, connection, self-mastery) without heavy or scary content.
 *
 * Naming: Each quest has an `area` (e.g. "Mountain of Desire"). When this chapter's map is shown
 * in the map selector, the UI uses this area as the single display name (localized via
 * chapters-vi.js when locale is "vi") so players see one clear name per map, not both map name and area.
 *
 * Locale: Default comes from chapters.js; other locales from chapters-{locale}.js (e.g. chapters-vi.js).
 * All locale files are translation-only (like JSON). This file holds logic only.
 */

import { getEnemyTypesForChapterIndex } from './chapter-maps-zones.js';
import { EN_ENTRIES, reflectionUi as REFLECTION_UI_EN, questUi as QUEST_UI_EN, mapSelectionUi as MAP_SELECTION_UI_EN } from './chapters.js';

/** Default map bounds (typical playable area); quest markers stay inside this range. */
const QUEST_MAP_RADIUS = 280;

/**
 * Quest marker position for a chapter so markers are spread around the map instead of one spot.
 * @param {number} chapterIndex - 0-based index in CHAPTER_QUESTS (chapter 1 → 0, chapter 2 → 1, …)
 * @returns {{ x: number, z: number }}
 */
export function getQuestMarkerPositionForChapter(chapterIndex) {
    const n = 18; // number of directions; matches map count for variety
    const angle = (chapterIndex % n) * (2 * Math.PI / n);
    const ring = Math.floor(chapterIndex / n) % 4; // 0..3 = inner to outer
    const radius = 55 + ring * 75 + (chapterIndex % 3) * 15; // 55–220, varied
    const r = Math.min(radius, QUEST_MAP_RADIUS);
    return {
        x: Math.round(r * Math.cos(angle)),
        z: Math.round(r * Math.sin(angle)),
    };
}

/** @typedef {{ type: string, target?: string, count: number, progress?: number, group?: string, label?: string }} ChapterObjective */
// Optional `group`: objectives with the same group form a "choice group". Completion when requireChoiceGroupsAtLeast groups are fully complete (and all objectives without group are complete).
// Optional `label`: short narrative label for UI (e.g. "Clear the outskirts").

/**
 * Whether this chapter quest has choice groups (objectives with .group); used for UI callouts.
 * @param {{ objectives?: Array<{ group?: string }> }} quest - Chapter quest (template or active)
 * @returns {boolean}
 */
export function chapterQuestHasChoiceGroups(quest) {
    const objectives = quest?.objectives || [];
    return objectives.some(o => o && o.group);
}

/**
 * @typedef {Object} ChapterQuest
 * @property {string} id
 * @property {{ x: number, z: number }} position - World position of quest marker (first quest near 0,0,0)
 * @property {ChapterObjective[]} objectives
 * @property {number} [requireChoiceGroupsAtLeast] - When objectives use `group`, need at least this many groups complete (default 1)
 * @property {{ enemyType: string }} boss - Display name comes from chapters.js (EN_ENTRIES / locale)
 * @property {{ xp: number, skillPoints?: number, item?: string }} rewards
 * @property {string|null} nextQuestId
 * @property {string[]} [nextQuestIds] - Optional: multiple possible next chapters (open flow)
 * @property {string[]} [reflectionRewards] - Optional: 3 item template IDs; reflection choice gives that item (makes chapter more interesting)
 * @property {boolean} [replayable] - If true, chapter can be replayed after completion to pick a different reflection reward
 */

function slug(s) {
    return s.toLowerCase().replace(/\s+/g, '_').replace(/['']/g, '');
}

/** Id and nextQuestId are always derived from chapter number + EN_ENTRIES.area (chapters.js). */
function chapterId(chapterNum, entry) {
    return entry && entry.area ? `chapter_${chapterNum}_${slug(entry.area)}` : null;
}

// Logic overrides for chapters 1–5 only (hand-crafted objectives, choice groups, reflection rewards). Chapters 6–100 use procedural logic below.
/** @type {Record<number, Partial<ChapterQuest>>} */
const CHAPTER_1_5_LOGIC = {
    1: {
        objectives: [
            { type: 'kill', target: 'skeleton', count: 3, progress: 0, group: 'clear', label: 'Clear the outskirts' },
            { type: 'kill', target: 'shadow_beast', count: 2, progress: 0, group: 'silence', label: "Silence the beast's call" },
            { type: 'defeat_boss', target: 'skeleton_king', count: 1, progress: 0 },
        ],
        requireChoiceGroupsAtLeast: 1,
        boss: { enemyType: 'skeleton_king' },
        rewards: { xp: 250, skillPoints: 1 },
        reflectionRewards: ['basicRing', 'basicAmulet', 'basicTalisman'],
        replayable: true,
    },
    2: {
        objectives: [
            { type: 'kill', target: 'zombie', count: 2, progress: 0, group: 'mist', label: 'Calm the mist' },
            { type: 'kill', target: 'corrupted_treant', count: 1, progress: 0, group: 'mist' },
            { type: 'kill', target: 'feral_wolf', count: 3, progress: 0, group: 'pack', label: "Face the serpent's pack" },
            { type: 'defeat_boss', target: 'demon_lord', count: 1, progress: 0 },
        ],
        requireChoiceGroupsAtLeast: 1,
        boss: { enemyType: 'demon_lord' },
        rewards: { xp: 250, skillPoints: 1 },
        reflectionRewards: ['elementalRing', 'enlightenedAmulet', 'chakraTalisman'],
        replayable: true,
    },
    3: {
        objectives: [
            { type: 'kill', target: 'forest_spider', count: 3, progress: 0, group: 'path', label: 'Clear the path' },
            { type: 'kill', target: 'feral_wolf', count: 2, progress: 0, group: 'path' },
            { type: 'kill', target: 'corrupted_treant', count: 1, progress: 0, group: 'sentinels', label: "Break the titan's sentinels" },
            { type: 'kill', target: 'shadow_beast', count: 2, progress: 0, group: 'sentinels' },
            { type: 'defeat_boss', target: 'golden_titan', count: 1, progress: 0 },
        ],
        requireChoiceGroupsAtLeast: 1,
        boss: { enemyType: 'golden_titan' },
        rewards: { xp: 250, skillPoints: 1 },
        reflectionRewards: ['crescentMoonRing', 'spiritCoreAmulet', 'dragonscaleTalisman'],
        replayable: true,
    },
    4: {
        objectives: [
            { type: 'kill', target: 'skeleton', count: 2, progress: 0, group: 'echoes', label: 'Silence the echoes' },
            { type: 'kill', target: 'necromancer', count: 2, progress: 0, group: 'echoes' },
            { type: 'kill', target: 'ruin_crawler', count: 3, progress: 0, group: 'shadows', label: "Face the phantom's shadows" },
            { type: 'kill', target: 'cursed_spirit', count: 1, progress: 0, group: 'shadows' },
            { type: 'defeat_boss', target: 'echo_phantom', count: 1, progress: 0 },
        ],
        requireChoiceGroupsAtLeast: 1,
        boss: { enemyType: 'echo_phantom' },
        rewards: { xp: 250, skillPoints: 1 },
        reflectionRewards: ['infinityBand', 'celestialHeart', 'cosmicNexus'],
        replayable: true,
    },
    5: {
        objectives: [
            { type: 'defeat_boss', target: 'shadow_self', count: 1, progress: 0 },
        ],
        boss: { enemyType: 'shadow_self' },
        rewards: { xp: 300, skillPoints: 1 },
        reflectionRewards: ['eternityLoop', 'soulNexus', 'cosmicNexus'],
        replayable: true,
    },
};

// Boss enemy types for chapters 6–100 (cycle). Display names from chapters.js EN_ENTRIES.
const BOSS_CYCLE = [
    { enemyType: 'skeleton_king' },
    { enemyType: 'demon_lord' },
    { enemyType: 'golden_titan' },
    { enemyType: 'echo_phantom' },
    { enemyType: 'shadow_self' },
    { enemyType: 'swamp_horror' },
    { enemyType: 'frost_titan' },
    { enemyType: 'necromancer_lord' },
];

// Single loop: build all chapters from EN_ENTRIES. Id = chapter_N_slug(area); content lives in chapters.js / chapters-vi.js.
/** @type {ChapterQuest[]} */
export const CHAPTER_QUESTS = (function () {
    const list = [];
    const end = Math.min(100, EN_ENTRIES.length);
    for (let i = 1; i <= end; i++) {
        const entry = EN_ENTRIES[i - 1];
        if (!entry || !entry.area) break;
        const chapterIndex = list.length;
        const id = chapterId(i, entry);
        const nextEntry = EN_ENTRIES[i];
        const nextQuestId = (i < end && chapterId(i + 1, nextEntry)) || null;

        const override = CHAPTER_1_5_LOGIC[i];
        if (override) {
            list.push({
                id,
                position: getQuestMarkerPositionForChapter(chapterIndex),
                nextQuestId,
                ...override,
            });
            continue;
        }

        // Chapters 6–100: procedural objectives from map enemy types + boss cycle
        const enemyTypes = getEnemyTypesForChapterIndex(chapterIndex);
        const boss = BOSS_CYCLE[(i - 1) % BOSS_CYCLE.length];
        const killObjectives = [];
        if (enemyTypes.length >= 2) {
            const mid = Math.max(1, Math.floor(enemyTypes.length / 2));
            const common = enemyTypes.slice(0, mid);
            const rarer = enemyTypes.slice(mid);
            const type1 = common[(chapterIndex + 0) % common.length];
            const type2 = common[(chapterIndex + 1) % common.length];
            const count1 = 2 + (i % 2);
            const count2 = 1 + (i % 2);
            killObjectives.push({ type: 'kill', target: type1, count: count1, progress: 0 });
            if (type2 !== type1) killObjectives.push({ type: 'kill', target: type2, count: count2, progress: 0 });
            if (rarer.length > 0) {
                const rareType = rarer[(chapterIndex + i) % rarer.length];
                killObjectives.push({ type: 'kill', target: rareType, count: 1, progress: 0 });
            }
        } else if (enemyTypes.length === 1) {
            killObjectives.push({ type: 'kill', target: enemyTypes[0], count: 3 + (i % 3), progress: 0 });
        }
        killObjectives.push({ type: 'defeat_boss', target: boss.enemyType, count: 1, progress: 0 });

        list.push({
            id,
            position: getQuestMarkerPositionForChapter(chapterIndex),
            objectives: killObjectives,
            boss: { enemyType: boss.enemyType },
            rewards: { xp: 250 + (i % 3) * 25, skillPoints: i % 5 === 0 ? 1 : 0 },
            nextQuestId,
        });
    }
    return list;
})();

/**
 * Life lessons by chapter (for reflection screen). From chapters.js.
 * @type {Record<string, string>}
 */
export const CHAPTER_LESSONS = Object.fromEntries(
    CHAPTER_QUESTS.map((q, i) => [q.id, EN_ENTRIES[i]?.lesson ?? ''])
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

const DEFAULT_LOCALE = 'en';

// --- Locale loading (chapters-vi.js etc.). EN = default; others loaded on demand. ---
/** @type {Record<string, { questOverlay: Record<string, { title: string, description: string, lesson: string, area: string, bossName: string }>, reflection: Record<string, string>, quest: Record<string, string>, mapSelection: Record<string, string> }>} */
const localeCache = {};
/** @type {Record<string, Promise<void>>} */
const localeLoadPromises = {};

/**
 * Load a locale module (e.g. chapters-vi.js). Cached after first load.
 * @param {string} locale - 'en' | 'vi' | ...
 * @returns {Promise<void>}
 */
export async function ensureLocaleLoaded(locale) {
    if (locale === 'en' || !locale) return;
    if (localeCache[locale]) return;
    if (localeLoadPromises[locale]) return localeLoadPromises[locale];
    const load = (async () => {
        try {
            const mod = await import(`./chapters-${locale}.js`);
            const VI_ENTRIES = mod.VI_ENTRIES || [];
            const BOSS_VI = mod.BOSS_VI || [];
            const reflection = mod.reflectionUi || {};
            const quest = mod.questUi || {};
            const mapSelection = mod.mapSelectionUi || {};
            const questOverlay = {};
            for (let i = 0; i < VI_ENTRIES.length && i < CHAPTER_QUESTS.length; i++) {
                const q = CHAPTER_QUESTS[i];
                const vi = VI_ENTRIES[i];
                questOverlay[q.id] = {
                    title: vi.title,
                    description: vi.description,
                    lesson: vi.lesson,
                    area: vi.area,
                    bossName: vi.bossName ?? BOSS_VI[i % BOSS_VI.length],
                };
            }
            localeCache[locale] = { questOverlay, reflection, quest, mapSelection };
        } catch (_) {
            localeCache[locale] = { questOverlay: {}, reflection: {}, quest: {}, mapSelection: {} };
        }
    })();
    localeLoadPromises[locale] = load;
    return load;
}

/**
 * @param {import('./chapter-quests.js').ChapterQuest} quest
 * @param {string} [locale]
 * @returns {{ title: string, description: string, lesson: string, area: string, bossName: string }}
 */
export function getChapterQuestDisplay(quest, locale = DEFAULT_LOCALE) {
    const id = quest?.id;
    const idx = quest ? CHAPTER_QUESTS.indexOf(quest) : -1;
    const enEntry = idx >= 0 && EN_ENTRIES[idx] ? EN_ENTRIES[idx] : null;
    const en = {
        title: enEntry?.title ?? '',
        description: enEntry?.description ?? '',
        lesson: enEntry?.lesson ?? '',
        area: enEntry?.area ?? '',
        bossName: enEntry?.bossName ?? '',
    };
    if (locale === 'en' || !locale) return en;
    const cached = localeCache[locale];
    if (!cached || !id) return en;
    const overlay = cached.questOverlay[id];
    if (!overlay) return en;
    return {
        title: overlay.title ?? en.title,
        description: overlay.description ?? en.description,
        lesson: overlay.lesson ?? en.lesson,
        area: overlay.area ?? en.area,
        bossName: overlay.bossName ?? en.bossName,
    };
}

/** @typedef {'title'|'description'|'lesson'|'area'|'bossName'} QuestTextKey */

/**
 * @param {string} questId
 * @param {string} [locale]
 * @param {QuestTextKey} [key]
 * @returns {string}
 */
export function getChapterQuestText(questId, locale = DEFAULT_LOCALE, key) {
    const quest = getChapterQuestById(questId);
    if (!quest || !key) return '';
    const display = getChapterQuestDisplay(quest, locale);
    const v = display[key];
    return typeof v === 'string' ? v : '';
}

/**
 * @param {string} key
 * @param {string} [locale]
 * @returns {string}
 */
export function getReflectionUiString(key, locale = DEFAULT_LOCALE) {
    if (locale === 'en' || !locale) return REFLECTION_UI_EN[key] ?? '';
    const cached = localeCache[locale];
    const strings = cached?.reflection ?? {};
    return strings[key] ?? REFLECTION_UI_EN[key] ?? '';
}

/**
 * @param {string} key
 * @param {string} [locale]
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function getQuestUiString(key, locale = DEFAULT_LOCALE, params = {}) {
    const en = QUEST_UI_EN[key] ?? '';
    if (locale === 'en' || !locale) {
        let s = en;
        Object.keys(params).forEach((k) => {
            s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
        });
        return s;
    }
    const cached = localeCache[locale];
    const strings = cached?.quest ?? {};
    let s = strings[key] ?? en;
    Object.keys(params).forEach((k) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
    return s;
}

/**
 * @param {string} key
 * @param {string} [locale]
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function getMapSelectionUiString(key, locale = DEFAULT_LOCALE, params = {}) {
    const en = MAP_SELECTION_UI_EN[key] ?? '';
    if (locale === 'en' || !locale) {
        let s = en;
        Object.keys(params).forEach((k) => {
            s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
        });
        return s;
    }
    const cached = localeCache[locale];
    const strings = cached?.mapSelection ?? {};
    let s = strings[key] ?? en;
    Object.keys(params).forEach((k) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
    return s;
}

/**
 * Vietnamese locale for chapter quests (dedicated -vi file).
 * Default is EN from chapter-quests.js; this file provides VI only. Fallback to EN when missing.
 */

import { CHAPTER_QUESTS } from './chapter-quests.js';
import { VI_ENTRIES } from './chapters-vi.js';

const DEFAULT_LOCALE = 'en';

const BOSS_VI = [
    'Kẻ Canh Giữ Xung Đột', 'Bóng Nghi Ngờ', 'Hình Tượng Tham Lam', 'Linh Hồn Cô Đơn',
    'Gương Bản Thể', 'Bãi Lầy Hối Tiếc', 'Trái Tim Băng Giá', 'Chúa Ảo Ảnh',
];

let cached = null;
let loadPromise = null;

/**
 * Build VI quest map for chapters 1–100. Cached after first call.
 * @returns {Promise<Record<string, { title: string, description: string, lesson: string, area: string, bossName: string }>>}
 */
export async function buildChapterQuestViAsync() {
    if (cached) return cached;
    const out = {};
    for (let i = 0; i < VI_ENTRIES.length && i < CHAPTER_QUESTS.length; i++) {
        const quest = CHAPTER_QUESTS[i];
        const vi = VI_ENTRIES[i];
        out[quest.id] = {
            title: vi.title,
            description: vi.description,
            lesson: vi.lesson,
            area: vi.area,
            bossName: vi.bossName ?? BOSS_VI[i % BOSS_VI.length],
        };
    }
    cached = out;
    return out;
}

/**
 * Load VI for all chapters. Safe to call multiple times; loads only once.
 * @returns {Promise<void>}
 */
export async function ensureViChaptersLoaded() {
    if (loadPromise == null) loadPromise = buildChapterQuestViAsync();
    return loadPromise;
}

export function getCachedChapterQuestVi() {
    return cached;
}

/**
 * Get display strings for a chapter quest. Default EN from quest; VI from this locale with fallback to EN.
 * @param {import('./chapter-quests.js').ChapterQuest} quest
 * @param {string} [locale] - 'en' | 'vi'
 * @returns {{ title: string, description: string, lesson: string, area: string, bossName: string }}
 */
export function getChapterQuestDisplay(quest, locale = DEFAULT_LOCALE) {
    const id = quest?.id;
    const fromQuest = {
        title: quest?.title ?? '',
        description: quest?.description ?? '',
        lesson: quest?.lesson ?? '',
        area: quest?.area ?? '',
        bossName: quest?.boss?.name ?? '',
    };
    if (locale !== 'vi') return fromQuest;
    const viMap = getCachedChapterQuestVi();
    if (!viMap || !id) return fromQuest;
    const vi = viMap[id];
    return {
        title: vi?.title ?? fromQuest.title,
        description: vi?.description ?? fromQuest.description,
        lesson: vi?.lesson ?? fromQuest.lesson,
        area: vi?.area ?? fromQuest.area,
        bossName: vi?.bossName ?? fromQuest.bossName,
    };
}

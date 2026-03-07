/**
 * Index for chapter quest VI (1–100): loads pack files + long story on demand.
 * Packs: 1–5, 6–15, …, 96–100. Long narrative from vuong-lam-story-vi-long.js (plan-08 “long version”).
 */

import { CHAPTER_QUESTS } from './chapter-quests.js';

const BOSS_VI = [
    'Kẻ Canh Giữ Xung Đột', 'Bóng Nghi Ngờ', 'Hình Tượng Tham Lam', 'Linh Hồn Cô Đơn',
    'Gương Bản Thể', 'Bãi Lầy Hối Tiếc', 'Trái Tim Băng Giá', 'Chúa Ảo Ảnh',
];

let cached = null;
/** @type {string[]|null} Long VI narrative per chapter (0–99), set after build. */
let cachedStoryLongVi = null;

/**
 * Load all 11 packs and long VI story; build quest map for chapters 1–100. Cached after first call.
 * @returns {Promise<Record<string, { title: string, description: string, lesson: string, area: string, bossName: string }>>}
 */
export async function buildChapterQuestViAsync() {
    if (cached) return cached;

    const [packs, { VUONG_LAM_STORY_VI_LONG }] = await Promise.all([
        Promise.all([
            import('./chapters-6-100-vi/chapters-1-5-vi.js'),
            import('./chapters-6-100-vi/chapters-6-15-vi.js'),
            import('./chapters-6-100-vi/chapters-16-25-vi.js'),
            import('./chapters-6-100-vi/chapters-26-35-vi.js'),
            import('./chapters-6-100-vi/chapters-36-45-vi.js'),
            import('./chapters-6-100-vi/chapters-46-55-vi.js'),
            import('./chapters-6-100-vi/chapters-56-65-vi.js'),
            import('./chapters-6-100-vi/chapters-66-75-vi.js'),
            import('./chapters-6-100-vi/chapters-76-85-vi.js'),
            import('./chapters-6-100-vi/chapters-86-95-vi.js'),
            import('./chapters-6-100-vi/chapters-96-100-vi.js'),
        ]),
        import('./vuong-lam-story-vi-long.js'),
    ]);

    const [p1_5, p6_15, p16_25, p26_35, p36_45, p46_55, p56_65, p66_75, p76_85, p86_95, p96_100] = packs.map((m) => m.VI_ENTRIES);
    const all = [...p1_5, ...p6_15, ...p16_25, ...p26_35, ...p36_45, ...p46_55, ...p56_65, ...p66_75, ...p76_85, ...p86_95, ...p96_100];
    const out = {};
    for (let i = 0; i < all.length && i < CHAPTER_QUESTS.length; i++) {
        const quest = CHAPTER_QUESTS[i];
        const vi = all[i];
        out[quest.id] = {
            title: vi.title,
            description: vi.description,
            lesson: vi.lesson,
            area: vi.area,
            bossName: vi.bossName ?? BOSS_VI[i % BOSS_VI.length],
        };
    }
    cached = out;
    cachedStoryLongVi = Array.isArray(VUONG_LAM_STORY_VI_LONG) ? VUONG_LAM_STORY_VI_LONG : null;
    return out;
}

export function getCachedChapterQuestVi() {
    return cached;
}

/**
 * Long VI narrative for one chapter (0–99). Use after ensureViChaptersLoaded() when locale is VI.
 * @param {number} index Chapter index 0–99
 * @returns {string|undefined}
 */
export function getStoryLongVi(index) {
    if (cachedStoryLongVi && index >= 0 && index < cachedStoryLongVi.length) return cachedStoryLongVi[index];
    return undefined;
}

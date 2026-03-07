/**
 * Vietnamese short quest text for chapters 1–100. Data in chapters-vi.js (single file).
 * EN comes from chapter-quests.js; no chapters-en — we use that as the base.
 */

import { CHAPTER_QUESTS } from './chapter-quests.js';
import { VI_ENTRIES } from './chapters-vi.js';

const BOSS_VI = [
    'Kẻ Canh Giữ Xung Đột', 'Bóng Nghi Ngờ', 'Hình Tượng Tham Lam', 'Linh Hồn Cô Đơn',
    'Gương Bản Thể', 'Bãi Lầy Hối Tiếc', 'Trái Tim Băng Giá', 'Chúa Ảo Ảnh',
];

let cached = null;

/**
 * Build quest map for chapters 1–100 from VI_ENTRIES. Cached after first call.
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

export function getCachedChapterQuestVi() {
    return cached;
}

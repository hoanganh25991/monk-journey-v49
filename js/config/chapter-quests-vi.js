/**
 * Vietnamese locale for chapter quests (dedicated -vi file).
 * Default EN from chapter-quests.js; this file provides VI. Fallback to EN when missing.
 * Also holds UI string getters (reflection, quest, map selection) that use EN from chapter-quests.js and VI from here.
 */

import {
    CHAPTER_QUESTS,
    getChapterQuestById,
    REFLECTION_UI_STRINGS_EN,
    QUEST_UI_STRINGS_EN,
    MAP_SELECTION_UI_STRINGS_EN,
} from './chapter-quests.js';
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

/** @typedef {'title'|'description'|'lesson'|'area'|'bossName'} QuestTextKey */

/**
 * Get a single localized string for a chapter quest.
 * @param {string} questId
 * @param {string} [locale] - 'en' | 'vi'
 * @param {QuestTextKey} key
 * @returns {string}
 */
export function getChapterQuestText(questId, locale = DEFAULT_LOCALE, key) {
    const quest = getChapterQuestById(questId);
    if (!quest || !key) return '';
    const display = getChapterQuestDisplay(quest, locale);
    const value = display[key];
    return typeof value === 'string' ? value : '';
}

/** UI strings (VI) for reflection screen */
const REFLECTION_UI_STRINGS_VI = {
    continueJourney: 'Tiếp tục hành trình',
    enterPathOfMastery: 'Vào Đường Tu Tập',
    reflectionQuestionPrompt: 'Bạn đã nhận ra điều gì?',
    reflectionOption1: 'Sự khó khăn—và cơ hội giúp đỡ.',
    reflectionOption2: 'Sự bình yên sau cơn bão.',
    reflectionOption3: 'Cả hai: hành động và bình an cùng nhau.',
};

/** UI strings (VI) for quest messages */
const QUEST_UI_STRINGS_VI = {
    travelToGetNextQuest: 'Đi tới "{label}" để nhận nhiệm vụ tiếp theo.',
    storyQuestAvailable: 'Có nhiệm vụ cốt truyện. Hãy xem nhật ký nhiệm vụ bên trái.',
    journeyHint: 'Hành trình của bạn: hoàn thành mục tiêu trong nhật ký nhiệm vụ, rồi đối mặt trùm chương.',
    questProgressCount: 'Nhiệm vụ: {current}/{count} {type}',
    questProgressEnemiesDefeated: 'Tiến độ: {current}/{count} kẻ địch đã hạ',
    questProgressFound: 'Tiến độ: {current}/{count} {objectType} đã tìm',
    zoneDiscovered: 'Đã khám phá: {zoneName}',
    questCompletedTitle: 'Hoàn thành: {title}',
    questCompletedRewards: 'Bạn đã hoàn thành nhiệm vụ và nhận phần thưởng!',
    newQuestAvailable: 'Nhiệm vụ mới: {name}',
    newQuestAtLevel: 'Nhiệm vụ "{name}" sẽ mở khi đạt cấp {level}.',
    acceptQuestPrompt: 'Bạn có muốn nhận nhiệm vụ này không?',
    newQuestTitle: 'Nhiệm vụ mới: {title}',
    newMainQuestAvailable: 'Nhiệm vụ chính mới: {name}',
    newSideQuestAvailable: 'Nhiệm vụ phụ mới: {name}',
    gainedExperience: 'Nhận {xp} kinh nghiệm',
    gainedSkillPoints: 'Nhận {count} điểm kỹ năng',
    gainedGold: 'Nhận {gold} vàng',
    equipped: 'Đã trang bị {itemName}',
    received: 'Nhận {itemName} x{amount}',
    enemies: 'kẻ địch',
    boss: 'trùm',
    nextMapFallback: 'bản đồ tiếp theo',
    otherPathsAvailable: 'Các lối đi khác đang chờ trong bảng Câu chuyện.',
    choiceInQuestHint: 'Bạn có thể giúp đỡ theo nhiều cách; hoàn thành ít nhất một lối để tiến bước.',
    choiceCallout: 'Lựa chọn',
    storyQuestAwaitsOnMap: 'Có nhiệm vụ cốt truyện đang chờ. Hãy tìm dấu nhiệm vụ trên bản đồ (ký hiệu !) để bắt đầu.',
    findQuestMarkerHint: '→ Tìm dấu nhiệm vụ (dấu ! vàng trên bản đồ) để bắt đầu hành trình.',
    noActiveQuests: 'Không có nhiệm vụ',
    reviewMore: 'Xem thêm ({count})',
    showLess: 'Thu gọn',
    activeQuestsTitle: 'Nhiệm vụ',
    lessonLabel: 'Bài học',
    close: 'Đóng',
};

/** UI strings (VI) for map selection overlay */
const MAP_SELECTION_UI_STRINGS_VI = {
    selectMapTitle: 'Chọn bản đồ',
    currentMap: 'Hiện tại: {name}',
    currentMapNone: 'Hiện tại: —',
    returnToDefaultWorld: 'Đã về Thế giới mặc định.',
    mapSetToReloading: 'Đã đặt bản đồ "{mapName}". Đang tải lại...',
    selectMapPlaceholder: 'Chọn một bản đồ',
    chooseMapPlaceholder: 'Chọn bản đồ trong danh sách để xem chi tiết',
    statSize: 'Kích thước:',
    statStructures: 'Công trình:',
    statPaths: 'Đường đi:',
    statEnvironment: 'Môi trường:',
    statEnemies: 'Kẻ địch:',
    enemiesRandom: 'Ngẫu nhiên',
    btnMapSelector: 'Chọn bản đồ',
    btnReturnToProceduralWorld: 'Về thế giới mặc định',
    btnGenerateNewMap: 'Tạo bản đồ mới',
    btnSaveAndClose: 'Lưu & Đóng',
    btnApplyAndReload: 'Dịch chuyển',
    btnApplyAndReloadTitle: 'Dịch chuyển tới bản đồ này',
    arrivedAtMap: 'Bạn đã đến {mapName}.',
    teleporting: 'Đang dịch chuyển…',
    loadingMap: 'Đang tải bản đồ...',
    teleportToOriginTitle: 'Dịch chuyển về gốc',
    btnStoryBook: 'Truyện',
    storyBookTitle: 'Hành Trình',
    storyChapterLabel: 'Chương {n}',
    storyPrevChapter: '‹ Trước',
    storyNextChapter: 'Sau ›',
    storyCloseBook: 'Đóng',
    storySaveBook: 'Lưu',
    storySaveBookEmoji: '💾',
    storyVuongLamLabel: 'Câu chuyện Vương Lâm (Tiên Nghịch)',
    storyNoLongStory: 'Chưa có truyện dài cho chương này.',
    storyChaptersBtn: 'Chương',
    storyChaptersPanelTitle: 'Nhảy tới chương',
};

export function getReflectionUiString(key, locale = DEFAULT_LOCALE) {
    const strings = locale === 'vi' ? REFLECTION_UI_STRINGS_VI : REFLECTION_UI_STRINGS_EN;
    return strings[key] ?? REFLECTION_UI_STRINGS_EN[key] ?? '';
}

export function getQuestUiString(key, locale = DEFAULT_LOCALE, params = {}) {
    const strings = locale === 'vi' ? QUEST_UI_STRINGS_VI : QUEST_UI_STRINGS_EN;
    let s = strings[key] ?? QUEST_UI_STRINGS_EN[key] ?? '';
    Object.keys(params).forEach((k) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
    return s;
}

export function getMapSelectionUiString(key, locale = DEFAULT_LOCALE, params = {}) {
    const strings = locale === 'vi' ? MAP_SELECTION_UI_STRINGS_VI : MAP_SELECTION_UI_STRINGS_EN;
    let s = strings[key] ?? MAP_SELECTION_UI_STRINGS_EN[key] ?? '';
    Object.keys(params).forEach((k) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
    return s;
}

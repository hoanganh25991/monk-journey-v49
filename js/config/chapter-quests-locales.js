/**
 * Chapter quest & story strings by locale (EN / VI).
 * Consumers should use getChapterQuestText / getChapterQuestDisplay with game.questStoryLocale.
 * For chapters 6–100, text falls back to quest data from chapter-quests.js when no locale entry exists.
 */

import { getChapterQuestById } from './chapter-quests.js';
import { buildChapterQuestViAsync } from './chapter-quests-vi.js';

const DEFAULT_LOCALE = 'en';

/** @typedef {'title'|'description'|'lesson'|'area'|'bossName'} QuestTextKey */

/** @type {Record<string, Record<string, { title: string, description: string, lesson: string, area: string, bossName: string }>>} */
export const CHAPTER_QUEST_TEXTS = {
    en: {
        chapter_1_restless_village: {
            title: 'The Restless Village',
            description: 'A village consumed by anger—disputes over land, old grudges. A Rage Beast has taken root and feeds on their anger. Calm the conflicts and face the beast so the village can find peace.',
            lesson: 'Anger burns the one who carries it.',
            area: 'The Restless Village',
            bossName: 'Rage Beast',
        },
        chapter_2_forest_of_doubt: {
            title: 'Forest of Doubt',
            description: 'A dense, misty forest where travelers lose their way and their courage. Something whispers in the dark. Face the Doubt Serpent so the forest can be free of paralyzing fear.',
            lesson: 'Fear grows in silence.',
            area: 'Forest of Doubt',
            bossName: 'Doubt Serpent',
        },
        chapter_3_mountain_of_desire: {
            title: 'Mountain of Desire',
            description: 'A mountain where treasure hunters are obsessed with gold and power. A Golden Titan guards the peak. Navigate temptations and face the Titan to learn that gratitude—not accumulation—brings peace.',
            lesson: 'Gratitude ends endless hunger.',
            area: 'Mountain of Desire',
            bossName: 'Golden Titan',
        },
        chapter_4_desert_of_loneliness: {
            title: 'Desert of Loneliness',
            description: 'A vast desert where travelers feel cut off—no landmarks, no companions. An Echo Phantom amplifies loneliness. Endure the emptiness, find connection, then face the Phantom.',
            lesson: 'You are never truly alone.',
            area: 'Desert of Loneliness',
            bossName: 'Echo Phantom',
        },
        chapter_5_inner_temple: {
            title: 'Inner Temple',
            description: 'The final trial. Here the test is not an external monster but the self. A Shadow Self mirrors your skills and choices. Face this reflection and transcend the untrained self to earn Enlightenment Mode.',
            lesson: 'Your greatest opponent is your untrained self.',
            area: 'Inner Temple',
            bossName: 'Shadow Self',
        },
    },
    vi: {}, // All chapter VI (1–100) loaded on demand via ensureViChaptersLoaded() from chapter-quests-vi.js packs
};

let viChaptersLoadPromise = null;

/**
 * Load VI for all chapters (1–100) from packs and merge into CHAPTER_QUEST_TEXTS.vi.
 * Safe to call multiple times; loads only once.
 * @returns {Promise<void>}
 */
export async function ensureViChaptersLoaded() {
    if (viChaptersLoadPromise == null) {
        viChaptersLoadPromise = buildChapterQuestViAsync().then((built) => {
            Object.assign(CHAPTER_QUEST_TEXTS.vi, built);
        });
    }
    return viChaptersLoadPromise;
}

/**
 * Get a single localized string for a chapter quest.
 * @param {string} questId - Chapter quest id (e.g. 'chapter_1_restless_village')
 * @param {string} [locale] - 'en' | 'vi'; defaults to DEFAULT_LOCALE
 * @param {QuestTextKey} key - 'title' | 'description' | 'lesson' | 'area' | 'bossName'
 * @returns {string} Localized string, or fallback to EN, or empty string
 */
export function getChapterQuestText(questId, locale = DEFAULT_LOCALE, key) {
    const loc = locale === 'vi' ? 'vi' : 'en';
    const byLocale = CHAPTER_QUEST_TEXTS[loc];
    const byId = byLocale && byLocale[questId];
    if (byId && typeof byId[key] === 'string') return byId[key];
    const fallback = CHAPTER_QUEST_TEXTS.en && CHAPTER_QUEST_TEXTS.en[questId];
    if (fallback && typeof fallback[key] === 'string') return fallback[key];
    // Chapters 6–100: fallback to quest data from chapter-quests.js
    const quest = getChapterQuestById(questId);
    if (quest && key) {
        if (key === 'bossName') return quest.boss?.name ?? '';
        if (key in quest && typeof quest[key] === 'string') return quest[key];
    }
    return '';
}

/** UI strings for reflection screen (buttons, R-Q5 question) by locale */
export const REFLECTION_UI_STRINGS = {
    en: {
        continueJourney: 'Continue Journey',
        enterPathOfMastery: 'Enter Path of Mastery',
        reflectionQuestionPrompt: 'What did you notice?',
        reflectionOption1: 'The struggle—and the chance to help.',
        reflectionOption2: 'The calm that followed the storm.',
        reflectionOption3: 'Both: action and peace together.',
    },
    vi: {
        continueJourney: 'Tiếp tục hành trình',
        enterPathOfMastery: 'Vào Đường Tu Tập',
        reflectionQuestionPrompt: 'Bạn đã nhận ra điều gì?',
        reflectionOption1: 'Sự khó khăn—và cơ hội giúp đỡ.',
        reflectionOption2: 'Sự bình yên sau cơn bão.',
        reflectionOption3: 'Cả hai: hành động và bình an cùng nhau.',
    },
};

/**
 * Quest instruction / notification messages (placeholders: {label}, {current}, {count}, {name}, {level}, {xp}, {gold}, {itemName}, {amount}, {zoneName}, {title}, {type}, {objectType}).
 * Used by QuestManager for hints, progress, completion, and rewards.
 */
export const QUEST_UI_STRINGS = {
    en: {
        travelToGetNextQuest: 'Travel to "{label}" to get your next quest.',
        storyQuestAvailable: 'A story quest is available. Look for the quest log on the left.',
        journeyHint: 'Your journey: complete the objectives in the quest log, then face the chapter boss.',
        questProgressCount: 'Quest: {current}/{count} {type}',
        questProgressEnemiesDefeated: 'Quest progress: {current}/{count} enemies defeated',
        questProgressFound: 'Quest progress: {current}/{count} {objectType}s found',
        zoneDiscovered: 'Zone discovered: {zoneName}',
        questCompletedTitle: 'Quest Completed: {title}',
        questCompletedRewards: 'You have completed the quest and received your rewards!',
        newQuestAvailable: 'New Quest Available: {name}',
        newQuestAtLevel: 'New quest "{name}" will be available at level {level}.',
        acceptQuestPrompt: 'Would you like to accept this quest?',
        newQuestTitle: 'New Quest: {title}',
        newMainQuestAvailable: 'New Main Quest Available: {name}',
        newSideQuestAvailable: 'New Side Quest Available: {name}',
        gainedExperience: 'Gained {xp} experience',
        gainedSkillPoints: 'Gained {count} skill point(s)',
        gainedGold: 'Gained {gold} gold',
        equipped: 'Equipped {itemName}',
        received: 'Received {itemName} x{amount}',
        enemies: 'enemies',
        boss: 'boss',
        nextMapFallback: 'the next map',
        otherPathsAvailable: 'Other paths await in the Story panel.',
        choiceInQuestHint: 'You can help in more than one way; complete at least one path to progress.',
        choiceCallout: 'Choice',
        storyQuestAwaitsOnMap: 'A story quest awaits. Find the quest marker on the map (marked with !) to begin.',
        findQuestMarkerHint: '→ Find the quest marker (yellow ! on the map) to start your journey.',
        noActiveQuests: 'No active quests',
        reviewMore: 'Review more ({count})',
        showLess: 'Show less',
        activeQuestsTitle: 'Active Quests',
        lessonLabel: 'Lesson',
        close: 'Close',
    },
    vi: {
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
        activeQuestsTitle: 'Nhiệm vụ', // Nhiệm vụ đang làm
        lessonLabel: 'Bài học',
        close: 'Đóng',
    },
};

/**
 * Get a localized quest UI string and replace placeholders.
 * @param {string} key - Key in QUEST_UI_STRINGS (e.g. 'travelToGetNextQuest')
 * @param {string} [locale] - 'en' | 'vi'; defaults to DEFAULT_LOCALE
 * @param {Record<string, string|number>} [params] - e.g. { label: 'Forest', current: 2, count: 5 }
 * @returns {string}
 */
export function getQuestUiString(key, locale = DEFAULT_LOCALE, params = {}) {
    const loc = locale === 'vi' ? 'vi' : 'en';
    const strings = QUEST_UI_STRINGS[loc] || QUEST_UI_STRINGS.en;
    let s = strings[key] || QUEST_UI_STRINGS.en[key] || '';
    Object.keys(params).forEach(k => {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
    return s;
}

/**
 * Get reflection button label.
 * @param {string} key - 'continueJourney' | 'enterPathOfMastery'
 * @param {string} [locale] - 'en' | 'vi'
 * @returns {string}
 */
export function getReflectionUiString(key, locale = DEFAULT_LOCALE) {
    const loc = locale === 'vi' ? 'vi' : 'en';
    const strings = REFLECTION_UI_STRINGS[loc] || REFLECTION_UI_STRINGS.en;
    return strings[key] || REFLECTION_UI_STRINGS.en[key] || '';
}

/** Map Selection overlay UI strings (placeholders: {name}, {mapName}) */
export const MAP_SELECTION_UI_STRINGS = {
    en: {
        selectMapTitle: 'Select Map',
        currentMap: 'Current: {name}',
        currentMapNone: 'Current: —',
        returnToDefaultWorld: 'Returned to Default World.',
        mapSetToReloading: 'Map set to "{mapName}". Reloading...',
        selectMapPlaceholder: 'Select a map',
        chooseMapPlaceholder: 'Choose a map from the list to view details',
        statSize: 'Size:',
        statStructures: 'Structures:',
        statPaths: 'Paths:',
        statEnvironment: 'Environment:',
        statEnemies: 'Enemies:',
        enemiesRandom: 'Random',
        btnMapSelector: 'Map Selector',
        btnReturnToProceduralWorld: 'Return to Procedural World',
        btnGenerateNewMap: 'Generate New Map',
        btnSaveAndClose: 'Save & Close',
        btnApplyAndReload: 'Teleport',
        btnApplyAndReloadTitle: 'Teleport to this map',
        arrivedAtMap: 'You have arrived at {mapName}.',
        teleporting: 'Teleporting…',
        loadingMap: 'Loading map...',
        teleportToOriginTitle: 'Teleport to Origin',
        btnStoryBook: 'Story',
        storyBookTitle: 'The Journey',
        storyChapterLabel: 'Chapter {n}',
        storyPrevChapter: '‹ Previous',
        storyNextChapter: 'Next ›',
        storyCloseBook: 'Close',
        storySaveBook: 'Save',
        storySaveBookEmoji: '💾',
        storyVuongLamLabel: 'Tale of Vương Lâm (Renegade Immortal)',
        storyNoLongStory: 'No long story for this chapter.',
        storyChaptersBtn: 'Chapters',
        storyChaptersPanelTitle: 'Jump to chapter',
    },
    vi: {
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
    },
};

/**
 * Get a localized map selection UI string and replace placeholders.
 * @param {string} key - Key in MAP_SELECTION_UI_STRINGS
 * @param {string} [locale] - 'en' | 'vi'; defaults to DEFAULT_LOCALE
 * @param {Record<string, string|number>} [params] - e.g. { name: 'Forest', mapName: 'My Map' }
 * @returns {string}
 */
export function getMapSelectionUiString(key, locale = DEFAULT_LOCALE, params = {}) {
    const loc = locale === 'vi' ? 'vi' : 'en';
    const strings = MAP_SELECTION_UI_STRINGS[loc] || MAP_SELECTION_UI_STRINGS.en;
    let s = strings[key] || MAP_SELECTION_UI_STRINGS.en[key] || '';
    Object.keys(params).forEach(k => {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
    });
    return s;
}

/**
 * Get all display strings for a chapter quest in the given locale.
 * @param {import('./chapter-quests.js').ChapterQuest} quest - Chapter quest object (must have .id)
 * @param {string} [locale] - 'en' | 'vi'; defaults to DEFAULT_LOCALE
 * @returns {{ title: string, description: string, lesson: string, area: string, bossName: string }}
 */
export function getChapterQuestDisplay(quest, locale = DEFAULT_LOCALE) {
    const id = quest && quest.id;
    const loc = locale === 'vi' ? 'vi' : 'en';
    const byLocale = CHAPTER_QUEST_TEXTS[loc];
    const byId = byLocale && id ? byLocale[id] : null;
    const fallback = id && CHAPTER_QUEST_TEXTS.en ? CHAPTER_QUEST_TEXTS.en[id] : null;
    const row = byId || fallback || {};
    return {
        title: row.title ?? quest?.title ?? '',
        description: row.description ?? quest?.description ?? '',
        lesson: row.lesson ?? quest?.lesson ?? '',
        area: row.area ?? quest?.area ?? '',
        bossName: row.bossName ?? quest?.boss?.name ?? '',
    };
}

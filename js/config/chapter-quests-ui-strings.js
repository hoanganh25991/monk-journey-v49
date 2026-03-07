/**
 * Quest UI strings (reflection, map selection, quest messages). EN + VI.
 * Quest display text: default EN from chapter-quests.js; VI from chapter-quests-vi.js (fallback to EN).
 */

import { getChapterQuestById } from './chapter-quests.js';
import { getChapterQuestDisplay, ensureViChaptersLoaded } from './chapter-quests-vi.js';

export { getChapterQuestDisplay, ensureViChaptersLoaded };

const DEFAULT_LOCALE = 'en';

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


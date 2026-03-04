/**
 * Chapter quest & story strings by locale (EN / VI).
 * Consumers should use getChapterQuestText / getChapterQuestDisplay with game.questStoryLocale.
 */

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
    vi: {
        chapter_1_restless_village: {
            title: 'Làng Bất An',
            description: 'Một ngôi làng chìm trong sự giận dữ—tranh chấp đất đai, thù hận cũ. Một Con Thú Giận Dữ đã bám rễ và ăn sự tức giận của họ. Hãy xoa dịu xung đột và đối mặt con thú để làng tìm được bình yên.',
            lesson: 'Sự giận dữ đốt cháy chính kẻ mang nó.',
            area: 'Làng Bất An',
            bossName: 'Con Thú Giận Dữ',
        },
        chapter_2_forest_of_doubt: {
            title: 'Rừng Nghi Ngờ',
            description: 'Một khu rừng rậm, sương mù nơi lữ khách lạc lối và mất can đảm. Có gì đó thì thầm trong bóng tối. Hãy đối mặt Rắn Nghi Ngờ để rừng thoát khỏi nỗi sợ tê liệt.',
            lesson: 'Sợ hãi lớn lên trong im lặng.',
            area: 'Rừng Nghi Ngờ',
            bossName: 'Rắn Nghi Ngờ',
        },
        chapter_3_mountain_of_desire: {
            title: 'Núi Tham Vọng',
            description: 'Ngọn núi nơi những kẻ săn báu bị ám ảnh bởi vàng và quyền lực. Một Titan Vàng canh giữ đỉnh. Vượt qua cám dỗ và đối mặt Titan để hiểu rằng lòng biết ơn—không phải tích lũy—mới mang lại bình yên.',
            lesson: 'Lòng biết ơn chấm dứt cơn đói vô tận.',
            area: 'Núi Tham Vọng',
            bossName: 'Titan Vàng',
        },
        chapter_4_desert_of_loneliness: {
            title: 'Sa Mạc Cô Đơn',
            description: 'Sa mạc mênh mông nơi lữ khách cảm thấy cô lập—không mốc, không bạn đồng hành. Một Bóng Ma Tiếng Vọng khuếch đại nỗi cô đơn. Chịu đựng sự trống rỗng, tìm sự kết nối, rồi đối mặt Bóng Ma.',
            lesson: 'Bạn không bao giờ thực sự cô đơn.',
            area: 'Sa Mạc Cô Đơn',
            bossName: 'Bóng Ma Tiếng Vọng',
        },
        chapter_5_inner_temple: {
            title: 'Đền Nội Tâm',
            description: 'Thử thách cuối cùng. Ở đây bài kiểm tra không phải quái vật bên ngoài mà là chính bản thân. Một Bóng Ta phản chiếu kỹ năng và lựa chọn của bạn. Đối mặt sự phản chiếu này và vượt qua bản thân chưa rèn luyện để đạt Chế Độ Giác Ngộ.',
            lesson: 'Đối thủ lớn nhất của bạn là bản thân chưa rèn luyện.',
            area: 'Đền Nội Tâm',
            bossName: 'Bóng Ta',
        },
    },
};

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
    return (fallback && typeof fallback[key] === 'string') ? fallback[key] : '';
}

/** UI strings for reflection screen (buttons) by locale */
export const REFLECTION_UI_STRINGS = {
    en: { continueJourney: 'Continue Journey', enterPathOfMastery: 'Enter Path of Mastery' },
    vi: { continueJourney: 'Tiếp tục hành trình', enterPathOfMastery: 'Vào Đường Tu Tập' },
};

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

/**
 * Map name and description by locale (EN / VI).
 * Map-independent: one source for all maps; reuse in MapSelectionUI, chapter display, etc.
 * Keys are map ids (e.g. default, forest, whisper-woods).
 */

const DEFAULT_LOCALE = 'en';

/** @typedef {'name'|'description'} MapTextKey */

/** @type {Record<string, Record<string, { name: string, description: string }>>} */
export const MAP_TEXTS = {
    en: {
        'default': {
            name: 'Default World',
            description: 'The classic procedurally generated world. Zones are 10x larger for smoother transitions.',
        },
        'terrant': {
            name: 'Terrant',
            description: 'Central plains. Gentle terrain, villages and temples.',
        },
        'forest': {
            name: 'Forest',
            description: 'Dense woodland. Ancient trees, ruins, and fairy circles.',
        },
        'desert': {
            name: 'Desert',
            description: 'Sands and ruins. Oases, shrines, and forgotten statues.',
        },
        'mountains': {
            name: 'Mountains',
            description: 'Peaks and ice. Caves, crystals, and alpine flora.',
        },
        'swamp': {
            name: 'Swamp',
            description: 'Murky wetlands. Lily pads, glowing mushrooms, dark sanctums.',
        },
        'magical': {
            name: 'Magical',
            description: 'Enchanted realm. Portals, rune stones, and ancient artifacts.',
        },
        'mixed': {
            name: 'Mixed Realms',
            description: 'Multiple biomes in one world. Travel from Terrant to Forest, Desert, Mountains, and Swamp.',
        },
        'highland-vale': {
            name: 'Highland Vale',
            description: 'Windswept highlands. Stone circles and lone towers under the snow.',
        },
        'ember-wastes': {
            name: 'Ember Wastes',
            description: 'Scorched badlands. Ancient ruins and obsidian formations.',
        },
        'whisper-woods': {
            name: 'Whisper Woods',
            description: 'A misty forest where ancient trees guard forgotten paths.',
        },
        'crimson-bog': {
            name: 'Crimson Bog',
            description: 'Blood-red waters and twisted roots. Dark sanctums rise from the mire.',
        },
        'sky-prairie': {
            name: 'Sky Prairie',
            description: 'Open grasslands under a vast sky. Villages and temples dot the plains.',
        },
        'veil-garden': {
            name: 'Veil Garden',
            description: 'A garden between worlds. Glowing flowers and hidden portals.',
        },
        'frost-hollow': {
            name: 'Frost Hollow',
            description: 'A frozen basin surrounded by peaks. Ice caves and crystal outcrops.',
        },
        'sand-shrine': {
            name: 'Sand Shrine',
            description: 'Dunes and buried temples. Shrines and forgotten statues await.',
        },
        'thorn-marsh': {
            name: 'Thorn Marsh',
            description: 'Thorny wetlands and murky pools. Ruins and lily-covered paths.',
        },
        'eldritch-grove': {
            name: 'Eldritch Grove',
            description: 'Otherworldly grove. Rune stones and fairy circles under strange light.',
        },
    },
    vi: {
        'default': {
            name: 'Thế giới mặc định',
            description: 'Thế giới sinh ngẫu nhiên kinh điển. Các vùng rộng gấp 10 lần để chuyển cảnh mượt mà hơn.',
        },
        'terrant': {
            name: 'Terrant',
            description: 'Đồng bằng trung tâm. Địa hình êm dịu, làng mạc và đền thờ.',
        },
        'forest': {
            name: 'Rừng',
            description: 'Rừng rậm. Cây cổ thụ, tàn tích và vòng tròn tiên.',
        },
        'desert': {
            name: 'Sa mạc',
            description: 'Cát và tàn tích. Ốc đảo, đền thờ và tượng bị lãng quên.',
        },
        'mountains': {
            name: 'Núi',
            description: 'Đỉnh núi và băng. Hang động, pha lê và thảm thực vật vùng cao.',
        },
        'swamp': {
            name: 'Đầm lầy',
            description: 'Vùng đất ngập nước âm u. Sen, nấm phát sáng và thánh đường tối.',
        },
        'magical': {
            name: 'Ma thuật',
            description: 'Vương quốc phép thuật. Cổng, đá rune và cổ vật cổ xưa.',
        },
        'mixed': {
            name: 'Thế giới hỗn hợp',
            description: 'Nhiều vùng sinh thái trong một thế giới. Đi từ Terrant tới Rừng, Sa mạc, Núi và Đầm lầy.',
        },
        'highland-vale': {
            name: 'Thung lũng cao nguyên',
            description: 'Cao nguyên gió lộng. Vòng đá và tháp cô độc dưới tuyết.',
        },
        'ember-wastes': {
            name: 'Hoang mạc tro',
            description: 'Vùng đất cháy. Tàn tích cổ và thành tạo obsidian.',
        },
        'whisper-woods': {
            name: 'Rừng thì thầm',
            description: 'Khu rừng sương mù nơi cây cổ thụ canh giữ những lối đi bị lãng quên.',
        },
        'crimson-bog': {
            name: 'Đầm lầy đỏ',
            description: 'Nước đỏ máu và rễ xoắn. Thánh đường tối mọc lên từ vũng lầy.',
        },
        'sky-prairie': {
            name: 'Đồng cỏ bầu trời',
            description: 'Đồng cỏ rộng dưới bầu trời bao la. Làng và đền thờ rải rác trên đồng bằng.',
        },
        'veil-garden': {
            name: 'Vườn màn sương',
            description: 'Khu vườn giữa các thế giới. Hoa phát sáng và cổng ẩn.',
        },
        'frost-hollow': {
            name: 'Lòng chảo băng giá',
            description: 'Lòng chảo đóng băng giữa các đỉnh núi. Hang băng và mỏm pha lê.',
        },
        'sand-shrine': {
            name: 'Đền cát',
            description: 'Cồn cát và đền chôn vùi. Đền thờ và tượng bị lãng quên chờ đợi.',
        },
        'thorn-marsh': {
            name: 'Đầm gai',
            description: 'Vùng đất ngập nước đầy gai và vũng tối. Tàn tích và lối đi phủ sen.',
        },
        'eldritch-grove': {
            name: 'Rừng huyền bí',
            description: 'Khu rừng siêu nhiên. Đá rune và vòng tròn tiên dưới ánh sáng kỳ lạ.',
        },
    },
};

/**
 * Get a single localized string for a map.
 * @param {string} mapId - Map id (e.g. 'default', 'forest')
 * @param {string} [locale] - 'en' | 'vi'; defaults to DEFAULT_LOCALE
 * @param {MapTextKey} key - 'name' | 'description'
 * @returns {string} Localized string, or fallback to EN, or empty string
 */
export function getMapText(mapId, locale = DEFAULT_LOCALE, key) {
    if (!mapId || !key) return '';
    const loc = locale === 'vi' ? 'vi' : 'en';
    const byLocale = MAP_TEXTS[loc];
    const byId = byLocale && byLocale[mapId];
    if (byId && typeof byId[key] === 'string') return byId[key];
    const fallback = MAP_TEXTS.en && MAP_TEXTS.en[mapId];
    if (fallback && typeof fallback[key] === 'string') return fallback[key];
    return '';
}

/**
 * Get display name and description for a map in the given locale.
 * Use this when showing map info in UI; fallback to manifest entry if no locale entry.
 * @param {string} mapId - Map id
 * @param {string} [locale] - 'en' | 'vi'
 * @param {{ name?: string, description?: string }} [fallback] - Optional fallback from manifest
 * @returns {{ name: string, description: string }}
 */
export function getMapDisplay(mapId, locale = DEFAULT_LOCALE, fallback = {}) {
    const name = getMapText(mapId, locale, 'name') || fallback.name || '';
    const description = getMapText(mapId, locale, 'description') || fallback.description || '';
    return { name, description };
}

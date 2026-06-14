/**
 * Main quest act metadata — shown when the player begins a new act.
 */

/** @type {Record<number, { title: string, subtitle: string }>} */
export const MAIN_ACT_CHAPTERS = {
    2: {
        title: 'Act II — Bones and Bog',
        subtitle: 'Ruins whisper. The swamp hungers.'
    },
    3: {
        title: 'Act III — Desert Flame',
        subtitle: 'Ash demons rise from the burning wastes.'
    },
    4: {
        title: 'Act IV — Mire and Frost',
        subtitle: 'Ice titans stir beneath the hollow peaks.'
    },
    5: {
        title: 'Act V — Veil Break',
        subtitle: 'Seal the rift. Face the demon lord.'
    }
};

/** First main quest id that opens each act (act I starts at main_01 without a card). */
export const FIRST_QUEST_OF_ACT = {
    main_04: 2,
    main_07: 3,
    main_10: 4,
    main_13: 5
};

/** @param {string} questId @returns {number|undefined} */
export function getActForMainQuest(questId) {
    return FIRST_QUEST_OF_ACT[questId];
}

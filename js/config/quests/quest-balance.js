/**
 * Quest reward tuning — XP/gold vs level curve and objective effort.
 * Main arc: ~35–55% of exp-to-next (Acts I–III); soft tier scale Acts IV–V.
 * Zone: optional map content ~25–40% of main at same level band.
 * Side: board tasks ~20–35% of main; dailies ~one short session of combat XP.
 */

/** @param {number} level @returns {number} XP required to advance from `level` */
export function getExpToNextLevel(level) {
    let exp = 100;
    for (let lv = 1; lv < level; lv++) {
        const mult = Math.min(1.5 + (lv - 1) * 0.05, 3.0);
        exp = Math.floor(exp * mult);
    }
    return exp;
}

/** @param {number} xp @returns {number} */
export function goldForXp(xp, rate = 0.42) {
    return Math.round(xp * rate);
}

/**
 * Main storyline rewards (hand-tuned against exp curve + playtest targets).
 * @type {Record<string, { experience: number, gold: number }>}
 */
export const MAIN_QUEST_REWARDS = {
    main_01: { experience: 90, gold: 45 },
    main_02: { experience: 130, gold: 65 },
    main_03: { experience: 200, gold: 95 },
    main_04: { experience: 480, gold: 240 },
    main_05: { experience: 650, gold: 320 },
    main_06: { experience: 1050, gold: 525 },
    main_07: { experience: 1500, gold: 750 },
    main_08: { experience: 2800, gold: 1400 },
    main_09: { experience: 6500, gold: 3250 },
    main_10: { experience: 9500, gold: 4750 },
    main_11: { experience: 14000, gold: 7000 },
    main_12: { experience: 12000, gold: 6000 },
    main_13: { experience: 18500, gold: 9250 },
    main_14: { experience: 32000, gold: 16000 }
};

/**
 * @param {'kill'|'boss'|'interact'|'explore'|'survive'|'gather'} objectiveType
 * @param {number} minLevel
 * @param {number} [count=1]
 */
export function zoneQuestReward(objectiveType, minLevel, count = 1) {
    const lv = Math.max(1, minLevel);
    let xp;

    switch (objectiveType) {
        case 'boss':
            xp = Math.round(lv * 95 + 220);
            break;
        case 'kill':
            xp = Math.round(lv * 28 + count * 14 + (count >= 20 ? 80 : 0));
            break;
        case 'survive':
            xp = Math.round(lv * 38 + 100);
            break;
        case 'explore':
            xp = Math.round(lv * 42 + count * 35 + 40);
            break;
        case 'interact':
        case 'gather':
            xp = Math.round(lv * 35 + count * 28 + 30);
            break;
        default:
            xp = Math.round(lv * 40 + 60);
    }

    return { experience: xp, gold: goldForXp(xp, 0.38) };
}

/**
 * @param {'kill'|'boss'|'interact'|'explore'|'combo'|'gather'} objectiveType
 * @param {number} minLevel
 * @param {number} [count=1]
 */
export function sideQuestReward(objectiveType, minLevel, count = 1) {
    const lv = Math.max(1, minLevel);
    let xp;

    switch (objectiveType) {
        case 'boss':
            xp = Math.round(lv * 70 + 180);
            break;
        case 'kill':
            xp = Math.round(lv * 22 + count * 11);
            break;
        case 'explore':
            xp = Math.round(lv * 40 + count * 25);
            break;
        case 'combo':
            xp = Math.round(lv * 48 + 60);
            break;
        case 'gather':
            xp = Math.round(lv * 36 + count * 18);
            break;
        case 'interact':
            xp = Math.round(lv * 30 + count * 22);
            break;
        default:
            xp = Math.round(lv * 35 + 50);
    }

    return { experience: xp, gold: goldForXp(xp, 0.45) };
}

/** @param {number} minLevel @param {'easy'|'normal'|'hard'} difficulty */
export function dailyQuestReward(minLevel, difficulty = 'normal') {
    const lv = Math.max(1, minLevel);
    const tier = { easy: 0.85, normal: 1, hard: 1.35 }[difficulty] || 1;
    const xp = Math.round((85 + lv * 22) * tier);
    return { experience: xp, gold: goldForXp(xp, 0.48) };
}

/** Streak bonus gold on daily complete (called from DailyQuestState). */
export function getDailyStreakBonusGold(streak) {
    if (streak >= 7) return 200;
    if (streak >= 3) return 75;
    return 0;
}

/**
 * Death screen action buttons configuration.
 * Only one action: respawn (lose XP scaling with level).
 * Logic in DeathScreenUI.
 */

/** Base XP lost on respawn (scales with level). */
export const RESPAWN_EXP_LOSS_BASE = 200;

/**
 * XP lost when respawning after death. Scales with level (e.g. 200 at level 1, more at higher levels).
 * @param {number} level - Player level
 * @returns {number} XP to deduct on respawn
 */
export function getRespawnExpLoss(level) {
    const lvl = Math.max(1, Math.floor(level));
    return Math.floor(RESPAWN_EXP_LOSS_BASE + (lvl - 1) * 50);
}

/** Single action: respawn (button label is set dynamically in DeathScreenUI). */
export const DEATH_SCREEN_ACTIONS = [
    { id: 'respawn', label: 'Respawn', enabled: true },
];

/**
 * Death screen action buttons configuration.
 * Toggle `enabled` to show/hide each button. Logic for each action is in DeathScreenUI.
 *
 * Available actions:
 * - respawn         : Revive at death spot (75% HP/Mana, 3s invulnerability).
 * - respawn_buff    : Same as respawn + 6s invulnerability ("Spirit's blessing").
 * - revive_gold     : Pay gold to revive (full HP/Mana, 5s invulnerability). Disabled if not enough gold.
 * - quit            : Reload page (quit to title).
 */
export const DEATH_SCREEN_ACTIONS = [
    { id: 'respawn', label: 'Respawn', enabled: true },
    { id: 'respawn_buff', label: 'Respawn with buff', enabled: true },
    { id: 'revive_gold', label: 'Revive (50 Gold)', enabled: true },
    { id: 'quit', label: 'Quit Game', enabled: true },
];

/** Gold cost for "Revive (50 Gold)" action */
export const REVIVE_GOLD_COST = 50;

/** Extra invulnerability seconds for "Respawn with buff" (on top of default 3s from revive) */
export const RESPAWN_BUFF_INVULN_SECONDS = 6;

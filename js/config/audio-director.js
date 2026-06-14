/**
 * Audio Director configuration — music/ambient layers per session state.
 */

export const AUDIO_STATES = {
    EXPLORATION: 'exploration',
    COMBAT: 'combat',
    BOSS: 'boss'
};

/** Enemies within this radius count toward combat music. */
export const COMBAT_PROXIMITY_RADIUS = 45;

/** Minimum living enemies nearby to enter combat state. */
export const COMBAT_ENEMY_THRESHOLD = 3;

export const STATE_LAYERS = {
    [AUDIO_STATES.EXPLORATION]: {
        music: 'mainTheme',
        crossfadeSec: 2.0
    },
    [AUDIO_STATES.COMBAT]: {
        music: 'battleTheme',
        crossfadeSec: 1.5
    },
    [AUDIO_STATES.BOSS]: {
        music: 'bossTheme',
        crossfadeSec: 1.0
    }
};

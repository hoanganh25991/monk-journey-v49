import { COMBAT_EVENTS } from './CombatJuice.js';
import {
    AUDIO_STATES,
    COMBAT_ENEMY_THRESHOLD,
    COMBAT_PROXIMITY_RADIUS,
    STATE_LAYERS
} from './config/audio-director.js';

/**
 * Session audio state machine — exploration / combat / boss with crossfade.
 */
export class AudioDirector {
    constructor(game) {
        this.game = game;
        this.state = AUDIO_STATES.EXPLORATION;
        this.nearbyEnemyCount = 0;
        this.bossAlive = false;
        this._pendingState = null;
    }

    init() {
        if (!this.game?.events) return;
        this.game.events.addEventListener(COMBAT_EVENTS.BOSS_SPAWN, () => {
            this.bossAlive = true;
            this.setState(AUDIO_STATES.BOSS);
        });
    }

    /**
     * Called each frame from EnemyManager with live threat info.
     * @param {number} nearbyCount - Living enemies within COMBAT_PROXIMITY_RADIUS
     * @param {boolean} bossAlive
     */
    updateThreat(nearbyCount, bossAlive) {
        this.nearbyEnemyCount = nearbyCount;
        this.bossAlive = bossAlive;

        if (bossAlive) {
            this.setState(AUDIO_STATES.BOSS);
        } else if (nearbyCount >= COMBAT_ENEMY_THRESHOLD) {
            this.setState(AUDIO_STATES.COMBAT);
        } else {
            this.setState(AUDIO_STATES.EXPLORATION);
        }
    }

    /**
     * @param {string} nextState - AUDIO_STATES value
     */
    setState(nextState) {
        if (nextState === this.state) return;
        this.state = nextState;
        const layer = STATE_LAYERS[nextState];
        if (!layer) return;

        const audio = this.game?.audioManager;
        if (!audio) return;

        audio.playMusicWithCrossfade(layer.music, layer.crossfadeSec);
        audio.stopAmbient();
    }

    /** Zone ambient loop swap on map load (disabled — wind/noise loops clash with music). */
    applyZoneAmbient(_ambientConfig) {
        this.game?.audioManager?.stopAmbient();
    }

    getState() {
        return this.state;
    }
}

export { COMBAT_PROXIMITY_RADIUS, COMBAT_ENEMY_THRESHOLD, AUDIO_STATES };

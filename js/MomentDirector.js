import { COMBAT_EVENTS } from './CombatJuice.js';

/**
 * Lightweight moment sequencer — chains juice for memorable beats.
 */
export class MomentDirector {
    constructor(game) {
        this.game = game;
        this._titleTimer = null;
    }

    init() {
        if (!this.game?.events) return;
        this.game.events.addEventListener(COMBAT_EVENTS.ZONE_ENTRY, (d) => this.onZoneEntry(d));
        this.game.events.addEventListener(COMBAT_EVENTS.BOSS_SPAWN, (d) => this.onBossArrival(d));
        this.game.events.addEventListener(COMBAT_EVENTS.PLAYER_LEVEL_UP, (d) => this.onLevelUp(d));
    }

    onZoneEntry(data) {
        const name = data?.name || data?.id || 'Unknown Zone';
        this.showZoneTitle(name, data?.description);
        this.game?.audioDirector?.applyZoneAmbient(data?.ambient);
    }

    onBossArrival(data) {
        if (this.game?.hudManager?.showNotification) {
            this.game.hudManager.showNotification(`⚔️ ${data?.name || 'Boss'} has arrived!`, 4000);
        }
        const fog = this.game?.world?.fogManager;
        if (fog?.thickenBriefly) {
            fog.thickenBriefly(1.8, 2.5);
        }
    }

    onLevelUp(data) {
        const level = data?.level;
        if (level && this.game?.hudManager) {
            this.game.hudManager.showLevelUp(level);
        }
    }

    showZoneTitle(name, description) {
        let el = document.getElementById('zone-title-card');
        if (!el) {
            el = document.createElement('div');
            el.id = 'zone-title-card';
            el.className = 'zone-title-card';
            el.innerHTML = '<div class="zone-title-name"></div><div class="zone-title-desc"></div>';
            document.getElementById('game-container')?.appendChild(el);
        }

        const nameEl = el.querySelector('.zone-title-name');
        const descEl = el.querySelector('.zone-title-desc');
        if (nameEl) nameEl.textContent = name;
        if (descEl) descEl.textContent = description || '';

        el.classList.remove('zone-title-visible');
        void el.offsetWidth;
        el.classList.add('zone-title-visible');

        if (this._titleTimer) clearTimeout(this._titleTimer);
        this._titleTimer = setTimeout(() => {
            el.classList.remove('zone-title-visible');
        }, 2200);
    }

    /** Trigger zone entry moment after map load. */
    triggerZoneEntry(mapData, sensory) {
        this.game?.events?.dispatch(COMBAT_EVENTS.ZONE_ENTRY, {
            id: mapData?.id,
            name: mapData?.name,
            description: mapData?.description,
            ambient: sensory?.ambient
        });
    }
}

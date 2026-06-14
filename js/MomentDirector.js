import { COMBAT_EVENTS } from './CombatJuice.js';

/**
 * Lightweight moment sequencer — chains juice for memorable beats.
 */
export class MomentDirector {
    constructor(game) {
        this.game = game;
        this._titleTimer = null;
        this._questCompleteTimer = null;
    }

    init() {
        if (!this.game?.events) return;
        this.game.events.addEventListener(COMBAT_EVENTS.ZONE_ENTRY, (d) => this.onZoneEntry(d));
        this.game.events.addEventListener(COMBAT_EVENTS.BOSS_SPAWN, (d) => this.onBossArrival(d));
        this.game.events.addEventListener(COMBAT_EVENTS.PLAYER_LEVEL_UP, (d) => this.onLevelUp(d));
        this.game.events.addEventListener(COMBAT_EVENTS.SKILL_UNLOCK, (d) => this.onSkillUnlock(d));
        this.game.events.addEventListener(COMBAT_EVENTS.MULTIPLAYER_JOIN, (d) => this.onMultiplayerJoin(d));
        this.game.events.addEventListener(COMBAT_EVENTS.QUEST_ACCEPT, (d) => this.onQuestAccept(d));
        this.game.events.addEventListener(COMBAT_EVENTS.QUEST_COMPLETE, (d) => this.onQuestComplete(d));
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

    onSkillUnlock(data) {
        const label = data?.variantName && data.variantName !== 'base'
            ? `${data.variantName}`
            : (data?.skillName || 'Skill');
        if (this.game?.hudManager?.showNotification) {
            this.game.hudManager.showNotification(`✨ ${label} awakened`, 2800);
        }
        this.game?.audioManager?.playSound('levelUp', 0.55);
        this.flashSkillTree();
    }

    onMultiplayerJoin(data) {
        const msg = data?.role === 'host'
            ? 'A monk has joined your journey'
            : 'Connected — awaiting host';
        if (this.game?.hudManager?.showNotification) {
            this.game.hudManager.showNotification(msg, 3500);
        }
        this.game?.audioManager?.playSound('teleport', 0.7);
    }

    onQuestAccept(data) {
        const quest = data?.quest;
        this.game?.audioManager?.playSound('levelUp', 0.35);
        this.flashQuestLog();
        if (quest?.name && this.game?.hudManager?.showNotification) {
            this.game.hudManager.showNotification(`📜 ${quest.name}`, 1800);
        }
    }

    onQuestComplete(data) {
        const juice = this.game?.combatJuice;
        if (juice?.setMomentTimeScale) {
            juice.setMomentTimeScale(0.35);
            if (this._questCompleteTimer) clearTimeout(this._questCompleteTimer);
            this._questCompleteTimer = setTimeout(() => {
                juice.setMomentTimeScale(1);
            }, 900);
        }

        this.game?.effectsManager?.createLevelUpSpiritBurst?.();
    }

    flashQuestLog() {
        const panel = document.getElementById('quest-log');
        if (!panel) return;
        panel.classList.remove('quest-accept-flash');
        void panel.offsetWidth;
        panel.classList.add('quest-accept-flash');
        setTimeout(() => panel.classList.remove('quest-accept-flash'), 900);
    }

    flashSkillTree() {
        const panel = document.getElementById('skill-tree');
        if (!panel) return;
        panel.classList.remove('skill-unlock-flash');
        void panel.offsetWidth;
        panel.classList.add('skill-unlock-flash');
        setTimeout(() => panel.classList.remove('skill-unlock-flash'), 900);
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

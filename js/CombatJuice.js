/**
 * Standard combat event names — emit via game.combatJuice.emit() or game.events.dispatch().
 */
export const COMBAT_EVENTS = {
    ATTACK_START: 'attack.start',
    ATTACK_HIT: 'attack.hit',
    ATTACK_CRIT: 'attack.crit',
    SKILL_CAST: 'skill.cast',
    SKILL_TRAVEL: 'skill.travel',
    SKILL_IMPACT: 'skill.impact',
    SKILL_END: 'skill.end',
    SKILL_UNLOCK: 'skill.unlock',
    MULTIPLAYER_JOIN: 'multiplayer.join',
    ENEMY_HIT: 'enemy.hit',
    ENEMY_DEATH: 'enemy.death',
    BOSS_SPAWN: 'boss.spawn',
    BOSS_PHASE: 'boss.phase',
    PLAYER_HIT: 'player.hit',
    PLAYER_DEATH: 'player.death',
    PLAYER_LEVEL_UP: 'player.levelUp',
    ZONE_ENTRY: 'zone.entry',
    QUEST_ACCEPT: 'quest.accept',
    QUEST_COMPLETE: 'quest.complete',
    QUEST_PROGRESS: 'quest.progress',
    QUEST_CHAPTER: 'quest.chapter'
};

/**
 * Combat juice pipeline — listens to combat events and applies SFX, hit-stop, shake, flashes.
 */
export class CombatJuice {
    constructor(game) {
        this.game = game;
        this.hitStopFrames = 0;
        this.momentTimeScale = 1;
        this.shakeIntensity = 0;
        this.shakeDecay = 8;
        this._shakeOffset = { x: 0, y: 0, z: 0 };
        this._listenersBound = false;
        this._sfxLastPlayed = {};
        this._flashTimestamps = new Map();
        this._maxHitStopFrames = 4;
    }

    init() {
        if (this._listenersBound || !this.game?.events) return;
        this._listenersBound = true;
        const events = this.game.events;
        const bind = (name, handler) => events.addEventListener(name, handler);

        bind(COMBAT_EVENTS.ATTACK_HIT, (d) => this.onAttackHit(d));
        bind(COMBAT_EVENTS.ATTACK_CRIT, (d) => this.onAttackCrit(d));
        bind(COMBAT_EVENTS.ENEMY_HIT, (d) => this.onEnemyHit(d));
        bind(COMBAT_EVENTS.ENEMY_DEATH, (d) => this.onEnemyDeath(d));
        bind(COMBAT_EVENTS.SKILL_CAST, (d) => this.onSkillCast(d));
        bind(COMBAT_EVENTS.SKILL_TRAVEL, (d) => this.onSkillTravel(d));
        bind(COMBAT_EVENTS.SKILL_IMPACT, (d) => this.onSkillImpact(d));
        bind(COMBAT_EVENTS.SKILL_END, (d) => this.onSkillEnd(d));
        bind(COMBAT_EVENTS.PLAYER_HIT, () => this.onPlayerHit());
        bind(COMBAT_EVENTS.PLAYER_DEATH, () => this.onPlayerDeath());
        bind(COMBAT_EVENTS.PLAYER_LEVEL_UP, (d) => this.onLevelUp(d));
        bind(COMBAT_EVENTS.BOSS_SPAWN, (d) => this.onBossSpawn(d));
    }

    /** @param {string} event @param {Object} [data] */
    emit(event, data = {}) {
        this.game?.events?.dispatch(event, data);
    }

    getTimeScale() {
        if (this.hitStopFrames > 0) return 0;
        return this.momentTimeScale;
    }

    setMomentTimeScale(scale) {
        this.momentTimeScale = Math.max(0.05, Math.min(1, scale));
    }

    update(delta) {
        if (this.hitStopFrames > 0) {
            this.hitStopFrames--;
        }

        if (this.shakeIntensity > 0) {
            this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * delta);
            const s = this.shakeIntensity;
            this._shakeOffset.x = (Math.random() - 0.5) * s * 0.15;
            this._shakeOffset.y = (Math.random() - 0.5) * s * 0.1;
            this._shakeOffset.z = (Math.random() - 0.5) * s * 0.08;
        } else {
            this._shakeOffset.x = 0;
            this._shakeOffset.y = 0;
            this._shakeOffset.z = 0;
        }
    }

    /** Apply accumulated shake offset to camera (call after camera positioning). */
    applyCameraShake(camera) {
        if (!camera || this.shakeIntensity <= 0) return;
        camera.position.x += this._shakeOffset.x;
        camera.position.y += this._shakeOffset.y;
        camera.position.z += this._shakeOffset.z;
    }

    requestHitStop(frames) {
        if (this.hitStopFrames > 0) return;
        this.hitStopFrames = Math.min(frames, this._maxHitStopFrames);
    }

    requestShake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    _play(name, volume = 1) {
        if (!name || !this.game?.audioManager) return;
        const now = performance.now();
        const last = this._sfxLastPlayed[name] || 0;
        if (now - last < 70) return;
        this._sfxLastPlayed[name] = now;
        this.game.audioManager.playSound(name, volume);
    }

    /**
     * Scale impact juice for multi-target skill hits (single burst, louder/heavier at 10+).
     * @param {number} hitCount
     * @returns {{ volumeScale: number, hitStopFrames: number, shake: number }}
     */
    computeMassHitScale(hitCount) {
        const count = Math.max(1, hitCount || 1);
        let hitStopFrames = 2;
        let shake = 0;

        if (count >= 10) {
            hitStopFrames = 4;
            shake = 1.05;
        } else if (count >= 6) {
            hitStopFrames = 3;
            shake = 0.75;
        } else if (count >= 3) {
            hitStopFrames = 2;
            shake = 0.45;
        }

        return {
            volumeScale: Math.min(1 + Math.log2(count) * 0.18, 1.55),
            hitStopFrames,
            shake
        };
    }

    onAttackHit(data) {
        this._play('playerAttack', 0.85);
        this._play('enemyHit', 0.7);
        this.requestHitStop(2);
        if (data?.enemy) this.flashEnemy(data.enemy);
    }

    onAttackCrit(data) {
        this._play('playerAttack', 1);
        this._play('enemyHit', 0.9);
        this.requestHitStop(4);
        this.requestShake(1.2);
        if (data?.enemy) this.flashEnemy(data.enemy, 0xffcc44);
    }

    onEnemyHit(data) {
        if (data?.isCrit) {
            this.onAttackCrit(data);
            return;
        }
        this._play('enemyHit', 0.65);
        this.requestHitStop(2);
        if (data?.enemy) this.flashEnemy(data.enemy);
    }

    onEnemyDeath(data) {
        const sound = data?.isBoss ? 'bossDeath' : 'enemyDeath';
        this._play(sound, data?.isBoss ? 1 : 0.8);
    }

    onSkillCast(data) {
        if (data?.soundId) {
            this._play(data.soundId, data.volume ?? 1);
        }
    }

    onSkillTravel(data) {
        if (data?.soundId) {
            this._play(data.soundId, data.volume ?? 0.8);
        }
    }

    onSkillImpact(data) {
        const hitCount = data?.hitCount || 1;
        const mass = this.computeMassHitScale(hitCount);
        // Perf cheat: no impact/travel sounds on batched skill hits — cast sound only
        if (mass.shake > 0) {
            this.requestShake(mass.shake * 0.65);
        }
    }

    onSkillEnd(data) {
        if (data?.soundId) {
            this._play(data.soundId, data.volume ?? 0.65);
        }
    }

    onPlayerHit() {
        this._play('playerHit', 0.9);
        this.requestShake(0.4);
    }

    onPlayerDeath() {
        this._play('playerDeath', 1);
    }

    onLevelUp() {
        this._play('levelUp', 1);
        this.setMomentTimeScale(0.35);
        setTimeout(() => this.setMomentTimeScale(1), 600);
        this.game?.effectsManager?.createLevelUpSpiritBurst();
    }

    onBossSpawn() {
        this._play('bossSpawn', 0.95);
        this.requestShake(1.5);
        this.setMomentTimeScale(0.3);
        setTimeout(() => this.setMomentTimeScale(1), 300);
    }

    /** Brief white/gold emissive flash on enemy mesh. */
    flashEnemy(enemy, color = 0xffffff) {
        if (!enemy?.modelGroup) return;
        const enemyKey = enemy.id || enemy.uuid || enemy.name;
        const now = performance.now();
        const lastFlash = this._flashTimestamps.get(enemyKey) || 0;
        if (now - lastFlash < 180) return;
        this._flashTimestamps.set(enemyKey, now);
        if (this._flashTimestamps.size > 64) {
            this._flashTimestamps.clear();
        }
        enemy.modelGroup.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
                if (!mat.emissive) return;
                const orig = mat.emissive.getHex();
                mat.emissive.setHex(color);
                mat.emissiveIntensity = 0.6;
                setTimeout(() => {
                    mat.emissive.setHex(orig);
                    mat.emissiveIntensity = mat.emissiveIntensity > 0 ? 0.2 : 0;
                }, 80);
            });
        });
    }
}

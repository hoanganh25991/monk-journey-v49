import {
    getAllQuestTemplates,
    getQuestTemplateById,
    cloneQuestTemplate,
    getQuestMinLevel,
    getQuestPrerequisiteIds
} from './config/quests/index.js';
import { getActForMainQuest, MAIN_ACT_CHAPTERS } from './config/quests/act-chapters.js';
import { getMapMasteryCoachElement } from './config/map-mastery.js';
import { COMBAT_EVENTS } from './CombatJuice.js';
import { DailyQuestState, DAILY_SURVIVE_SEC } from './quest/DailyQuestState.js';

const SURVIVE_DURATION_SEC = 45;
const COMBO_WINDOW_SEC = 2.0;

export class QuestManager {
    constructor(game) {
        this.game = game;
        this.questTemplates = getAllQuestTemplates();
        this.quests = [];
        this.activeQuests = [];
        this.completedQuests = [];
        this.dailyState = new DailyQuestState();
        this._hitComboChain = 0;
        this._hitComboTimer = 0;

        this.initializeQuests();
        this.bindEvents();
    }

    bindEvents() {
        if (!this.game?.events || this._eventsBound) return;
        this._eventsBound = true;
        this.game.events.addEventListener(COMBAT_EVENTS.PLAYER_DEATH, () => this.onPlayerDeath());
        this.game.events.addEventListener(COMBAT_EVENTS.ENEMY_HIT, () => this.onEnemyHitCombo());
        this.game.events.addEventListener(COMBAT_EVENTS.ATTACK_CRIT, () => this.onEnemyHitCombo());
    }

    initializeQuests() {
        this.quests = this.questTemplates
            .filter(template => template.category !== 'daily')
            .map(template => cloneQuestTemplate(template));

        this.dailyState.loadFromStorage();
        this.dailyState.refreshTodayFlag();
    }

    getQuestById(questId) {
        return this.activeQuests.find(q => q.id === questId)
            || this.completedQuests.find(q => q.id === questId)
            || this.quests.find(q => q.id === questId)
            || getQuestTemplateById(questId);
    }

    resolveQuestId(quest) {
        if (typeof quest === 'string') return quest;
        return quest?.id || quest?.questId || null;
    }

    meetsPrerequisites(quest) {
        const prerequisiteIds = getQuestPrerequisiteIds(quest);
        return prerequisiteIds.every(id =>
            this.completedQuests.some(q => q.id === id)
        );
    }

    startQuest(quest) {
        const questId = this.resolveQuestId(quest);
        if (!questId) return false;

        const questToStart = this.quests.find(q => q.id === questId);
        if (!questToStart) return false;

        if (this.activeQuests.some(q => q.id === questToStart.id)) return false;
        if (!this.meetsPrerequisites(questToStart)) return false;

        const activeQuest = cloneQuestTemplate(
            getQuestTemplateById(questToStart.id) || questToStart
        );

        if (activeQuest.objective.type === 'survive') {
            activeQuest._surviveElapsed = 0;
            activeQuest._surviveFailed = false;
        }

        if (activeQuest.objective.type === 'zone_contracts') {
            activeQuest.objective.progress = this.countCompletedZoneContracts();
            if (activeQuest.objective.progress >= activeQuest.objective.count) {
                this.activeQuests.push(activeQuest);
                this.quests = this.quests.filter(q => q.id !== questToStart.id);
                this.completeQuest(activeQuest);
                return true;
            }
        }

        if (activeQuest.category === 'daily') {
            this.activeQuests.push(activeQuest);
            this.game.hudManager.updateQuestLog(this.activeQuests);
            this.game.hudManager.showNotification(`Daily challenge accepted: ${activeQuest.name}`);
            this.game.events?.dispatch(COMBAT_EVENTS.QUEST_ACCEPT, { quest: activeQuest });
            return true;
        }

        this.activeQuests.push(activeQuest);
        this.quests = this.quests.filter(q => q.id !== questToStart.id);
        this.game.hudManager.updateQuestLog(this.activeQuests);
        this.game.hudManager.showNotification(`Quest accepted: ${activeQuest.name}`);
        this.game.events?.dispatch(COMBAT_EVENTS.QUEST_ACCEPT, { quest: activeQuest });

        this.maybeShowActChapter(activeQuest.id);
        this.broadcastQuestStateIfHost();

        return true;
    }

    maybeShowActChapter(questId) {
        const actNum = getActForMainQuest(questId);
        if (!actNum) return;
        const chapter = MAIN_ACT_CHAPTERS[actNum];
        if (!chapter) return;
        this.game.events?.dispatch(COMBAT_EVENTS.QUEST_CHAPTER, {
            act: actNum,
            title: chapter.title,
            subtitle: chapter.subtitle
        });
    }

    countCompletedZoneContracts() {
        return this.completedQuests.filter(q => q.category === 'zone').length;
    }

    refreshZoneContractObjective() {
        this.activeQuests.forEach(quest => {
            if (quest.objective.type !== 'zone_contracts') return;
            const count = this.countCompletedZoneContracts();
            const prev = quest.objective.progress;
            quest.objective.progress = Math.min(count, quest.objective.count);
            if (prev !== quest.objective.progress) {
                this.game.hudManager.updateQuestLog(this.activeQuests);
            }
            if (quest.objective.progress >= quest.objective.count) {
                this.completeQuest(quest);
            }
        });
    }

    getQuestSyncPayload() {
        return {
            type: 'questSync',
            active: this.activeQuests
                .filter(q => q.category !== 'daily')
                .map(q => ({
                    id: q.id,
                    progress: q.objective.progress,
                    discovered: q.objective.discovered ? [...q.objective.discovered] : undefined,
                    surviveElapsed: q._surviveElapsed
                })),
            completedIds: this.completedQuests.map(q => q.id)
        };
    }

    applyQuestSyncPayload(data) {
        const mp = this.game?.multiplayerManager;
        if (!mp?.connection || mp.isHost) return;
        if (!Array.isArray(data?.active) || !Array.isArray(data?.completedIds)) return;

        const completedIds = new Set(data.completedIds);
        const dailies = this.activeQuests.filter(q => q.category === 'daily');

        this.completedQuests = data.completedIds
            .map(id => {
                const template = getQuestTemplateById(id);
                return template ? cloneQuestTemplate(template) : null;
            })
            .filter(Boolean);

        this.activeQuests = [...dailies];
        data.active.forEach(entry => {
            const template = getQuestTemplateById(entry.id);
            if (!template) return;
            const quest = cloneQuestTemplate(template);
            quest.objective.progress = entry.progress ?? 0;
            if (entry.discovered?.length) {
                quest.objective.discovered = [...entry.discovered];
            }
            if (entry.surviveElapsed != null) {
                quest._surviveElapsed = entry.surviveElapsed;
            }
            if (quest.objective.type === 'survive') {
                quest._surviveFailed = false;
            }
            this.activeQuests.push(quest);
        });

        this.rebuildAvailableQuestPool(completedIds);
        this.game.hudManager?.updateQuestLog(this.activeQuests);
    }

    rebuildAvailableQuestPool(completedIds = null) {
        const done = completedIds || new Set(this.completedQuests.map(q => q.id));
        this.quests = this.questTemplates
            .filter(template => template.category !== 'daily')
            .map(template => cloneQuestTemplate(template))
            .filter(q => !done.has(q.id) && !this.activeQuests.some(a => a.id === q.id));
    }

    broadcastQuestStateIfHost() {
        const mp = this.game?.multiplayerManager;
        if (!mp?.connection?.isHost) return;
        mp.connection.broadcast(this.getQuestSyncPayload());
    }

    matchesKillObjective(objective, enemy) {
        const matchesTarget = (target) => {
            if (target === 'any') return true;
            if (typeof target === 'string' && target.includes('|')) {
                return target.split('|').includes(enemy.type);
            }
            return target === enemy.type;
        };

        if (objective.type === 'kill_boss') {
            return enemy.isBoss && matchesTarget(objective.target);
        }
        if (objective.type === 'kill') {
            if (objective.target === 'boss') return enemy.isBoss;
            return matchesTarget(objective.target);
        }
        return false;
    }

    questAppliesOnCurrentMap(quest, mapId) {
        if (!quest?.mapId || !mapId) return true;
        return quest.mapId === mapId;
    }

    incrementObjectiveProgress(quest, label) {
        const prev = quest.objective.progress;
        const total = quest.objective.count;
        quest.objective.progress++;

        if (total > 1) {
            const prevRatio = prev / total;
            const nextRatio = quest.objective.progress / total;
            if (prevRatio < 0.5 && nextRatio >= 0.5) {
                this.game.events?.dispatch(COMBAT_EVENTS.QUEST_PROGRESS, { quest, milestone: 50 });
            } else if (prevRatio < 0.75 && nextRatio >= 0.75) {
                this.game.events?.dispatch(COMBAT_EVENTS.QUEST_PROGRESS, { quest, milestone: 75 });
            }
        }

        if (quest.objective.progress >= quest.objective.count) {
            this.completeQuest(quest);
            return;
        }

        this.game.hudManager.updateQuestLog(this.activeQuests);
        this.game.hudManager.showNotification(
            `Quest progress: ${quest.objective.progress}/${quest.objective.count} ${label}`
        );
        this.broadcastQuestStateIfHost();
    }

    updateEnemyKill(enemy) {
        const mapId = this.game?.world?.currentMap?.id || null;

        this.activeQuests.forEach(quest => {
            if (!this.matchesKillObjective(quest.objective, enemy)) return;
            if (!this.questAppliesOnCurrentMap(quest, mapId)) return;
            this.incrementObjectiveProgress(quest, 'enemies defeated');
        });
    }

    updateInteraction(objectType, context = {}) {
        const mapId = context.mapId || this.game?.world?.currentMap?.id || null;

        this.activeQuests.forEach(quest => {
            if (quest.objective.type === 'interact' && quest.objective.target === objectType) {
                if (!this.questAppliesOnCurrentMap(quest, mapId)) return;

                if (quest.objective.count > 1) {
                    const key = context.interactKey
                        || (context.x != null && context.z != null ? `${context.x},${context.z}` : null);
                    if (key) {
                        if (!quest.objective.discovered) quest.objective.discovered = [];
                        if (quest.objective.discovered.includes(key)) return;
                        quest.objective.discovered.push(key);
                    }
                }

                this.incrementObjectiveProgress(quest, `${objectType}s found`);
                return;
            }
            if (quest.objective.type === 'visit' && quest.objective.target === objectType) {
                this.incrementObjectiveProgress(quest, 'locations visited');
            }
        });
    }

    updateGather(itemId) {
        this.activeQuests.forEach(quest => {
            if (quest.objective.type !== 'gather' || quest.objective.target !== itemId) return;
            this.incrementObjectiveProgress(quest, 'items gathered');
        });
    }

    updateCombo(hitCount) {
        this.activeQuests.forEach(quest => {
            if (quest.objective.type !== 'combo') return;
            const required = parseInt(quest.objective.target, 10) || 10;
            if (hitCount >= required) {
                quest.objective.progress = quest.objective.count;
                this.completeQuest(quest);
            }
        });
    }

    onEnemyHitCombo() {
        this._hitComboTimer = COMBO_WINDOW_SEC;
        this._hitComboChain += 1;
        this.updateCombo(this._hitComboChain);
    }

    tickComboWindow(delta) {
        if (this._hitComboTimer <= 0) return;
        this._hitComboTimer -= delta;
        if (this._hitComboTimer <= 0) {
            this._hitComboChain = 0;
        }
    }

    updateExploration(zoneName) {
        this.activeQuests.forEach(quest => {
            if (quest.objective.type !== 'explore' || quest.objective.target !== 'zone') return;
            if (!quest.objective.discovered) quest.objective.discovered = [];
            if (quest.objective.discovered.includes(zoneName)) return;

            quest.objective.discovered.push(zoneName);
            this.incrementObjectiveProgress(quest, 'zones discovered');
        });
    }

    updateRegionExploration() {
        const map = this.game?.world?.currentMap;
        const player = this.game?.player;
        if (!map?.bounds || !player) return;

        const pos = player.getPosition();
        const cx = (map.bounds.minX + map.bounds.maxX) / 2;
        const cz = (map.bounds.minZ + map.bounds.maxZ) / 2;
        const region = `${pos.x >= cx ? 'E' : 'W'}${pos.z >= cz ? 'N' : 'S'}`;

        this.activeQuests.forEach(quest => {
            if (quest.objective.type !== 'explore' || quest.objective.target !== 'region') return;
            if (!this.questAppliesOnCurrentMap(quest, map.id)) return;
            if (!quest.objective.discovered) quest.objective.discovered = [];
            if (quest.objective.discovered.includes(region)) return;

            quest.objective.discovered.push(region);
            this.incrementObjectiveProgress(quest, 'regions explored');
        });
    }

    updateSurvival(delta) {
        const mapId = this.game?.world?.currentMap?.id;
        if (!mapId) return;

        this.activeQuests.forEach(quest => {
            if (quest.objective.type !== 'survive') return;
            const target = quest.objective.target;
            const onDaily = target === 'daily';
            const onMap = target === mapId;
            if (!onDaily && !onMap) return;
            if (quest._surviveFailed) return;

            quest._surviveElapsed = (quest._surviveElapsed || 0) + delta;
            const duration = onDaily ? DAILY_SURVIVE_SEC : SURVIVE_DURATION_SEC;
            if (quest._surviveElapsed >= duration) {
                this.incrementObjectiveProgress(quest, 'vigil complete');
            }
        });
    }

    onPlayerDeath() {
        let reset = false;
        this.activeQuests.forEach(quest => {
            if (quest.objective.type !== 'survive') return;
            quest._surviveFailed = true;
            quest._surviveElapsed = 0;
            reset = true;
        });
        this._hitComboChain = 0;
        this._hitComboTimer = 0;
        if (reset && this.game?.hudManager) {
            this.game.hudManager.showNotification('Survival contract failed — try again.', 3000);
        }
    }

    resetSurvivalForMap(mapId) {
        this.activeQuests.forEach(quest => {
            if (quest.objective.type !== 'survive') return;
            if (quest.objective.target !== mapId && quest.objective.target !== 'daily') return;
            quest._surviveFailed = false;
            quest._surviveElapsed = 0;
        });
    }

    hasActiveDailyQuest() {
        return this.activeQuests.some(q => q.category === 'daily');
    }

    canOfferDailyQuest() {
        this.dailyState.refreshTodayFlag();
        if (this.dailyState.completedToday) return false;
        if (this.hasActiveDailyQuest()) return false;
        return true;
    }

    offerDailyQuest() {
        if (!this.canOfferDailyQuest() || !this.game?.hudManager) return false;

        const template = this.dailyState.getTemplateForToday();
        const hint = template.objective?.hint ? `\n\n${template.objective.hint}` : '';
        const streakLine = this.dailyState.streak > 0
            ? `\n\n🔥 Streak: ${this.dailyState.streak} day(s)`
            : '';

        this.game.hudManager.showDialog(
            `Daily Shrine Challenge`,
            `${template.description}${hint}${streakLine}\n\nTap continue to accept.`,
            () => this.tryAutoStartDailyQuest()
        );
        return true;
    }

    /** Accept today's daily shrine challenge without a dialog (proximity auto-offer). */
    tryAutoStartDailyQuest() {
        if (!this.canOfferDailyQuest()) return false;

        const template = this.dailyState.getTemplateForToday();
        const daily = this.dailyState.createActiveDailyQuest(template);
        this.activeQuests.push(daily);
        this.game.hudManager?.updateQuestLog(this.activeQuests);
        this.game.hudManager?.showNotification(`Daily accepted: ${daily.name}`, 2800);
        this.game.events?.dispatch(COMBAT_EVENTS.QUEST_ACCEPT, { quest: daily });
        return true;
    }

    /** Start a quest immediately when `offer.type === 'auto'` (main path). */
    tryAutoStartQuest(quest) {
        const questId = this.resolveQuestId(quest);
        if (!questId) return false;

        const questToStart = this.quests.find(q => q.id === questId);
        if (!questToStart) return false;
        if (this.activeQuests.some(q => q.id === questId)) return false;
        if (!this.meetsPrerequisites(questToStart)) return false;

        const isAutoMain = questToStart.isMainQuest && questToStart.offer?.type === 'auto';
        if (!isAutoMain) return false;

        return this.startQuest(questToStart);
    }

    tryAutoStartZoneContract(questId) {
        if (!this.canOfferZoneContract(questId)) return false;
        const quest = this.quests.find(q => q.id === questId);
        if (!quest) return false;
        return this.startQuest(quest);
    }

    completeDailyQuest(quest) {
        this.dailyState.markCompleted(quest._dailyTemplateId || quest.id);
        const bonus = this.dailyState.getStreakBonusGold();
        if (bonus > 0) {
            this.game.player.addGold(bonus);
            this.game.hudManager.showNotification(`Streak bonus: +${bonus} gold (${this.dailyState.streak} days)`);
        }
        if (this.dailyState.streak >= 7) {
            this.game.hudManager.showNotification('✨ 7-day streak — devoted pilgrim aura!', 4000);
        }
    }

    getSideQuestsForBoard(structureType) {
        const playerLevel = this.game.player.getLevel();
        return this.quests.filter(quest => {
            if (quest.category !== 'side') return false;
            if (quest.offer?.type !== 'board') return false;
            if (quest.offer?.structure !== structureType) return false;
            if (playerLevel < getQuestMinLevel(quest)) return false;
            if (!this.meetsPrerequisites(quest)) return false;
            return true;
        });
    }

    offerQuestBoard(structureType, boardIndex = 0) {
        const available = this.getSideQuestsForBoard(structureType);
        if (!available.length) {
            this.game.hudManager?.showNotification('No tasks posted on this board right now.', 2500);
            return false;
        }

        const idx = boardIndex % available.length;
        const quest = available[idx];
        const hint = quest.objective?.hint ? `\n\n${quest.objective.hint}` : '';
        const more = available.length > 1
            ? `\n\n(${available.length} tasks on this board — interact again for another)`
            : '';

        this.game.hudManager.showDialog(
            `Quest Board: ${quest.name}`,
            `${quest.description}${hint}${more}\n\nTap continue to accept.`,
            () => this.startQuest(quest)
        );
        return true;
    }

    completeQuest(quest) {
        const isDaily = quest.category === 'daily';

        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
        if (!isDaily) {
            this.completedQuests.push(quest);
        }

        if (quest.category === 'zone') {
            this.refreshZoneContractObjective();
        }

        this.game.events?.dispatch(COMBAT_EVENTS.QUEST_COMPLETE, { quest });

        if (isDaily) {
            this.completeDailyQuest(quest);
        }

        this.awardQuestRewards(quest);

        if (this.game?.audioManager) {
            this.game.audioManager.playSound('questComplete');
        }

        this.game.hudManager.updateQuestLog(this.activeQuests);
        let completeBody = `You have completed the quest and received your rewards!`;
        if (quest.category === 'zone') {
            completeBody = `Contract sealed! Map mastery unlocked — your coach glows on this realm.`;
        } else if (isDaily) {
            completeBody = `Daily challenge complete! Streak: ${this.dailyState.streak} day(s). Return tomorrow for a new trial.`;
        }
        this.game.hudManager.showDialog(
            `Quest Completed: ${quest.name}`,
            completeBody
        );

        if (!isDaily) {
            this.checkForNextQuest(quest);
        }

        this.broadcastQuestStateIfHost();
    }

    checkForNextQuest(completedQuest) {
        if (!completedQuest.isMainQuest || !completedQuest.nextQuestId) return;

        const nextQuest = this.quests.find(q => q.id === completedQuest.nextQuestId);
        if (!nextQuest || !this.meetsPrerequisites(nextQuest)) return;

        if (this.game.player.getLevel() >= getQuestMinLevel(nextQuest)) {
            setTimeout(() => {
                if (nextQuest.offer?.type === 'auto' && this.tryAutoStartQuest(nextQuest)) {
                    return;
                }
                const hint = nextQuest.objective?.hint ? `\n\n${nextQuest.objective.hint}` : '';
                this.game.hudManager.showDialog(
                    `New Quest Available: ${nextQuest.name}`,
                    `${nextQuest.description}${hint}\n\nTap continue to accept.`,
                    () => this.startQuest(nextQuest)
                );
            }, 2000);
            return;
        }

        setTimeout(() => {
            this.game.hudManager.showNotification(
                `New quest "${nextQuest.name}" will be available at level ${getQuestMinLevel(nextQuest)}.`
            );
        }, 2000);
    }

    awardQuestRewards(quest) {
        if (quest.reward.experience) {
            this.game.player.addExperience(quest.reward.experience);
            this.game.hudManager.showNotification(`Gained ${quest.reward.experience} experience`);
        }

        if (quest.reward.gold) {
            this.game.player.addGold(quest.reward.gold);
            this.game.hudManager.showNotification(`Gained ${quest.reward.gold} gold`);
        }

        if (quest.reward.items) {
            quest.reward.items.forEach(item => {
                this.game.player.addToInventory(item);
                this.game.hudManager.showNotification(`Received ${item.name} x${item.amount}`);
            });
        }

        if (quest.category === 'zone' && quest.reward?.mapMastery && quest.mapId) {
            this.grantMapMastery(quest.mapId, quest.reward.coachTint);
        }
    }

    grantMapMastery(mapId, coachTint) {
        const player = this.game?.player;
        if (!player) return;

        if (!player.mapMasteries) player.mapMasteries = {};
        const tint = coachTint || getMapMasteryCoachElement(mapId);
        player.mapMasteries[mapId] = tint;

        this.game.hudManager?.showNotification(`Map mastered: ${mapId} — coach tint unlocked`, 3500);
        player.model?.coachVisuals?.refreshCoachDisplay?.();
        this.game.hudManager?.playerUI?.updateCoachBadge?.();
    }

    hasCompletedZoneContract(mapId) {
        return this.completedQuests.some(
            q => q.category === 'zone' && q.mapId === mapId
        );
    }

    canOfferZoneContract(questId) {
        const quest = this.getQuestById(questId);
        if (!quest || quest.category !== 'zone') return false;
        if (this.completedQuests.some(q => q.id === questId)) return false;
        if (this.activeQuests.some(q => q.id === questId)) return false;
        if (!this.quests.some(q => q.id === questId)) return false;
        if (this.game.player.getLevel() < getQuestMinLevel(quest)) return false;
        if (!this.meetsPrerequisites(quest)) return false;
        return true;
    }

    offerZoneContract(questId) {
        if (!this.canOfferZoneContract(questId)) return false;

        const quest = this.quests.find(q => q.id === questId);
        if (!quest || !this.game?.hudManager) return false;

        const hint = quest.objective?.hint ? `\n\n${quest.objective.hint}` : '';
        this.game.hudManager.showDialog(
            `Shrine Contract: ${quest.name}`,
            `${quest.description}${hint}\n\nTap continue to accept.`,
            () => this.startQuest(quest)
        );
        return true;
    }

    isZoneContractAvailableOnMap(mapId) {
        return this.quests.some(
            q => q.category === 'zone'
                && q.mapId === mapId
                && this.canOfferZoneContract(q.id)
        );
    }

    getActiveQuests() {
        return this.activeQuests;
    }

    getCompletedQuests() {
        return this.completedQuests;
    }

    getAvailableQuests() {
        const playerLevel = this.game.player.getLevel();

        return this.quests.filter(quest => {
            if (quest.category === 'zone' || quest.category === 'daily') return false;
            if (this.completedQuests.some(q => q.id === quest.id)) return false;
            if (this.activeQuests.some(q => q.id === quest.id)) return false;
            if (playerLevel < getQuestMinLevel(quest)) return false;
            if (!this.meetsPrerequisites(quest)) return false;
            return true;
        });
    }

    checkForAvailableQuests() {
        const availableQuests = this.getAvailableQuests();
        const mainQuests = availableQuests.filter(q => q.isMainQuest);

        if (mainQuests.length > 0) {
            const mainQuest = mainQuests[0];
            if (mainQuest.offer?.type === 'auto' && this.tryAutoStartQuest(mainQuest)) {
                return;
            }
            const hint = mainQuest.objective?.hint ? `\n\n${mainQuest.objective.hint}` : '';
            this.game.hudManager.showDialog(
                `New Main Quest Available: ${mainQuest.name}`,
                `${mainQuest.description}${hint}\n\nTap continue to accept.`,
                () => this.startQuest(mainQuest)
            );
            return;
        }

        const sideQuests = availableQuests.filter(q => q.category === 'side');
        if (sideQuests.length > 0) {
            const randomIndex = Math.floor(Math.random() * sideQuests.length);
            const sideQuest = sideQuests[randomIndex];
            const hint = sideQuest.objective?.hint ? `\n\n${sideQuest.objective.hint}` : '';
            this.game.hudManager.showDialog(
                `New Side Quest Available: ${sideQuest.name}`,
                `${sideQuest.description}${hint}\n\nTap continue to accept.`,
                () => this.startQuest(sideQuest)
            );
        }
    }
}

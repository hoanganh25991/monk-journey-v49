import {
    getAllQuestTemplates,
    getQuestTemplateById,
    cloneQuestTemplate,
    getQuestMinLevel,
    getQuestPrerequisiteIds
} from './config/quests/index.js';
import { getMapMasteryCoachElement } from './config/map-mastery.js';
import { COMBAT_EVENTS } from './CombatJuice.js';

const SURVIVE_DURATION_SEC = 45;

export class QuestManager {
    constructor(game) {
        this.game = game;
        this.questTemplates = getAllQuestTemplates();
        this.quests = [];
        this.activeQuests = [];
        this.completedQuests = [];

        this.initializeQuests();
        this.bindEvents();
    }

    bindEvents() {
        if (!this.game?.events || this._eventsBound) return;
        this._eventsBound = true;
        this.game.events.addEventListener(COMBAT_EVENTS.PLAYER_DEATH, () => this.onPlayerDeath());
    }

    initializeQuests() {
        this.quests = this.questTemplates.map(template => cloneQuestTemplate(template));
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

        this.activeQuests.push(activeQuest);
        this.quests = this.quests.filter(q => q.id !== questToStart.id);
        this.game.hudManager.updateQuestLog(this.activeQuests);
        this.game.hudManager.showNotification(`Quest accepted: ${activeQuest.name}`);
        this.game.events?.dispatch(COMBAT_EVENTS.QUEST_ACCEPT, { quest: activeQuest });

        return true;
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
        quest.objective.progress++;

        if (quest.objective.progress >= quest.objective.count) {
            this.completeQuest(quest);
            return;
        }

        this.game.hudManager.updateQuestLog(this.activeQuests);
        this.game.hudManager.showNotification(
            `Quest progress: ${quest.objective.progress}/${quest.objective.count} ${label}`
        );
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
            if (quest.objective.type !== 'interact' || quest.objective.target !== objectType) return;
            if (!this.questAppliesOnCurrentMap(quest, mapId)) return;
            this.incrementObjectiveProgress(quest, `${objectType}s found`);
        });
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
            if (quest.objective.target !== mapId) return;
            if (quest._surviveFailed) return;

            quest._surviveElapsed = (quest._surviveElapsed || 0) + delta;
            if (quest._surviveElapsed >= SURVIVE_DURATION_SEC) {
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
        if (reset && this.game?.hudManager) {
            this.game.hudManager.showNotification('Survival contract failed — try again.', 3000);
        }
    }

    resetSurvivalForMap(mapId) {
        this.activeQuests.forEach(quest => {
            if (quest.objective.type !== 'survive' || quest.objective.target !== mapId) return;
            quest._surviveFailed = false;
            quest._surviveElapsed = 0;
        });
    }

    completeQuest(quest) {
        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
        this.completedQuests.push(quest);

        this.game.events?.dispatch(COMBAT_EVENTS.QUEST_COMPLETE, { quest });

        this.awardQuestRewards(quest);

        if (this.game?.audioManager) {
            this.game.audioManager.playSound('questComplete');
        }

        this.game.hudManager.updateQuestLog(this.activeQuests);
        const completeBody = quest.category === 'zone'
            ? `Contract sealed! Map mastery unlocked — your coach glows on this realm.`
            : `You have completed the quest and received your rewards!`;
        this.game.hudManager.showDialog(
            `Quest Completed: ${quest.name}`,
            completeBody
        );

        this.checkForNextQuest(quest);
    }

    checkForNextQuest(completedQuest) {
        if (!completedQuest.isMainQuest || !completedQuest.nextQuestId) return;

        const nextQuest = this.quests.find(q => q.id === completedQuest.nextQuestId);
        if (!nextQuest || !this.meetsPrerequisites(nextQuest)) return;

        if (this.game.player.getLevel() >= getQuestMinLevel(nextQuest)) {
            setTimeout(() => {
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
            const hint = mainQuest.objective?.hint ? `\n\n${mainQuest.objective.hint}` : '';
            this.game.hudManager.showDialog(
                `New Main Quest Available: ${mainQuest.name}`,
                `${mainQuest.description}${hint}\n\nTap continue to accept.`,
                () => this.startQuest(mainQuest)
            );
            return;
        }

        const sideQuests = availableQuests.filter(q => !q.isMainQuest);
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

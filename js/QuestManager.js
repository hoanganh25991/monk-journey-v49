import {
    getAllQuestTemplates,
    getQuestTemplateById,
    cloneQuestTemplate,
    getQuestMinLevel,
    getQuestPrerequisiteIds
} from './config/quests/index.js';
import { COMBAT_EVENTS } from './CombatJuice.js';

export class QuestManager {
    constructor(game) {
        this.game = game;
        this.questTemplates = getAllQuestTemplates();
        this.quests = [];
        this.activeQuests = [];
        this.completedQuests = [];

        this.initializeQuests();
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
        this.activeQuests.forEach(quest => {
            if (!this.matchesKillObjective(quest.objective, enemy)) return;
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

    completeQuest(quest) {
        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
        this.completedQuests.push(quest);

        this.game.events?.dispatch(COMBAT_EVENTS.QUEST_COMPLETE, { quest });

        this.awardQuestRewards(quest);

        if (this.game?.audioManager) {
            this.game.audioManager.playSound('questComplete');
        }

        this.game.hudManager.updateQuestLog(this.activeQuests);
        this.game.hudManager.showDialog(
            `Quest Completed: ${quest.name}`,
            `You have completed the quest and received your rewards!`
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

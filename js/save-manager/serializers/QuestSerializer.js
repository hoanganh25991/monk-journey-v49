import { getQuestTemplateById, cloneQuestTemplate } from '../../config/quests/index.js';

/**
 * Handles serialization and deserialization of quest data
 */
export class QuestSerializer {
    /**
     * Serialize quest data for saving
     * @param {Object} questManager - The quest manager object
     * @returns {Object} Serialized quest data
     */
    static serialize(questManager) {
        if (!questManager) {
            console.warn('Quest manager is null or undefined');
            return {};
        }

        const activeQuestsData = questManager.activeQuests.map(quest => ({
            id: quest.id,
            category: quest.category || null,
            mapId: quest.mapId || null,
            _dailyTemplateId: quest._dailyTemplateId || null,
            objective: {
                progress: quest.objective.progress,
                discovered: quest.objective.discovered || [],
                hint: quest.objective.hint || null
            },
            _surviveElapsed: quest._surviveElapsed ?? 0,
            _surviveFailed: quest._surviveFailed ?? false
        }));

        const completedQuestIds = questManager.completedQuests.map(quest => quest.id);

        return {
            activeQuests: activeQuestsData,
            completedQuestIds,
            dailyState: questManager.dailyState?.toJSON?.() || null
        };
    }

    /**
     * Restore active quest progress from saved data onto a cloned template.
     * @param {Object} template - Quest template
     * @param {Object} savedQuest - Saved quest progress
     * @returns {Object}
     */
    static buildActiveQuestFromSave(template, savedQuest) {
        const questWithProgress = cloneQuestTemplate(template);
        const savedObjective = savedQuest.objective || {};

        questWithProgress.objective.progress = savedObjective.progress ?? 0;
        questWithProgress.objective.discovered = savedObjective.discovered ?? [];
        if (savedObjective.hint) {
            questWithProgress.objective.hint = savedObjective.hint;
        }

        if (savedQuest.category === 'daily') {
            questWithProgress.id = savedQuest.id;
            questWithProgress.category = 'daily';
            questWithProgress._dailyTemplateId = savedQuest._dailyTemplateId || template.id;
            questWithProgress._surviveElapsed = savedQuest._surviveElapsed ?? 0;
            questWithProgress._surviveFailed = savedQuest._surviveFailed ?? false;
        }

        return questWithProgress;
    }

    /**
     * Deserialize quest data from save
     * @param {Object} questManager - The quest manager object
     * @param {Object} questData - The saved quest data
     */
    static deserialize(questManager, questData) {
        if (!questManager || !questData) {
            console.error('Quest manager or quest data is null or undefined');
            return;
        }

        console.debug('Loading quest data:', Object.keys(questData));

        questManager.activeQuests = [];
        questManager.completedQuests = [];
        questManager.initializeQuests();

        if (questData.dailyState && questManager.dailyState) {
            questManager.dailyState.fromJSON(questData.dailyState);
            questManager.dailyState.persist();
        }

        if (questData.activeQuests && Array.isArray(questData.activeQuests)) {
            console.debug(`Loading ${questData.activeQuests.length} active quests`);

            questData.activeQuests.forEach(savedQuest => {
                try {
                    if (savedQuest.category === 'daily' || savedQuest.id?.startsWith('daily_')) {
                        const templateId = savedQuest._dailyTemplateId
                            || savedQuest.id?.replace(/^daily_\d{4}-\d{2}-\d{2}_/, '');
                        const template = getQuestTemplateById(templateId);
                        if (template) {
                            const daily = QuestSerializer.buildActiveQuestFromSave(template, savedQuest);
                            questManager.activeQuests.push(daily);
                        }
                        return;
                    }

                    const template = getQuestTemplateById(savedQuest.id)
                        || questManager.quests.find(q => q.id === savedQuest.id);

                    if (template) {
                        const questWithProgress = QuestSerializer.buildActiveQuestFromSave(
                            template,
                            savedQuest
                        );
                        questManager.activeQuests.push(questWithProgress);
                        questManager.quests = questManager.quests.filter(q => q.id !== savedQuest.id);
                    } else {
                        console.warn(`Original quest template not found for ID: ${savedQuest.id}`);
                    }
                } catch (questError) {
                    console.error('Error processing quest:', questError, savedQuest);
                }
            });
        }

        if (questData.completedQuestIds && Array.isArray(questData.completedQuestIds)) {
            console.debug(`Loading ${questData.completedQuestIds.length} completed quest IDs`);

            questData.completedQuestIds.forEach(questId => {
                if (questId.startsWith('daily_')) return;

                const template = getQuestTemplateById(questId)
                    || questManager.quests.find(q => q.id === questId);

                if (template) {
                    questManager.completedQuests.push(cloneQuestTemplate(template));
                    questManager.quests = questManager.quests.filter(q => q.id !== questId);
                } else {
                    console.warn(`Original quest template not found for completed quest ID: ${questId}`);
                    questManager.completedQuests.push({ id: questId });
                }
            });
        } else if (questData.completedQuests && Array.isArray(questData.completedQuests)) {
            console.debug(`Loading ${questData.completedQuests.length} completed quests (legacy format)`);

            questData.completedQuests.forEach(quest => {
                const template = getQuestTemplateById(quest.id)
                    || questManager.quests.find(q => q.id === quest.id);

                if (template) {
                    questManager.completedQuests.push(cloneQuestTemplate(template));
                    questManager.quests = questManager.quests.filter(q => q.id !== quest.id);
                } else {
                    questManager.completedQuests.push(quest);
                }
            });
        }

        if (questManager.quests && Array.isArray(questManager.quests)) {
            console.debug('Filtering available quests');
            questManager.quests = questManager.quests.filter(quest => {
                const isActive = questManager.activeQuests.some(q => q.id === quest.id);
                const isCompleted = questManager.completedQuests.some(q => q.id === quest.id);
                return !isActive && !isCompleted;
            });
        }

        console.debug('Quest data loaded successfully');
    }
}

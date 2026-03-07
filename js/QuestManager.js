import { CHAPTER_QUESTS, getChapterQuestById } from './config/chapter-quests.js';
import { getChapterQuestDisplay, getQuestUiString } from './config/chapter-quests-locales.js';
import { getNextStoryMapAfter } from './config/chapter-quest-maps.js';

export class QuestManager {
    constructor(game) {
        this.game = game;
        this.quests = [];
        this.activeQuests = [];
        this.completedQuests = [];
        /** @type {Set<string>} Completed chapter quest ids (GDD story) */
        this.completedChapterQuestIds = new Set();
        /** @type {Object.<string, number[]>} Chapter id -> reflection choice indices already received (for replay) */
        this.reflectionChoicesReceived = Object.create(null);
        /** @type {Set<string>} Declined chapter quest ids (persisted, so quest won't be auto-offered again) */
        this.declinedChapterQuestIds = new Set();

        // Initialize with some default quests
        this.initializeQuests();
    }

    /** @returns {boolean} */
    isChapterQuest(quest) {
        return quest && (quest.lesson != null && quest.boss != null);
    }

    /** Deep clone objectives with progress 0 for starting a chapter quest */
    cloneChapterQuestForStart(quest) {
        return {
            ...quest,
            title: quest.title || quest.name,
            name: quest.title || quest.name,
            objectives: (quest.objectives || []).map(o => ({ ...o, progress: 0 })),
        };
    }

    /** @returns {Object[]} Chapter quests available to start (linear next, branched, or replayable completed). */
    getAvailableChapterQuests() {
        const completed = this.completedChapterQuestIds;
        const availableIds = new Set();
        for (const q of CHAPTER_QUESTS) {
            if (completed.has(q.id)) {
                if (q.nextQuestId) availableIds.add(q.nextQuestId);
                if (q.nextQuestIds && Array.isArray(q.nextQuestIds)) q.nextQuestIds.forEach(id => availableIds.add(id));
                if (q.replayable) availableIds.add(q.id);
            }
        }
        const firstNotCompleted = CHAPTER_QUESTS.find(q => !completed.has(q.id));
        if (firstNotCompleted) availableIds.add(firstNotCompleted.id);
        return [...availableIds]
            .filter(id => !this.activeQuests.some(a => a.id === id))
            .map(id => getChapterQuestById(id))
            .filter(Boolean)
            .map(q => this.cloneChapterQuestForStart(q));
    }

    /** @returns {Object|null} Next chapter quest that should have a marker in the world (or null if none / already active) 
     * Note: This includes declined quests so the marker stays visible for manual acceptance.
     */
    getNextChapterQuestForMarker() {
        if (this.getActiveChapterQuest()) return null;
        const available = this.getAvailableChapterQuests();
        // Include declined quests for marker placement (player can still manually accept from marker)
        return available.length > 0 ? available[0] : null;
    }

    /** @returns {Object|null} Active chapter quest (story) or null if none. Used for boss spawn wiring. */
    getActiveChapterQuest() {
        const chapter = this.activeQuests.find(q => this.isChapterQuest(q));
        return chapter || null;
    }

    /**
     * Whether chapter quest objectives are complete (supports choice groups: A, B, or both).
     * If no objectives have .group, all must be complete. If some have .group, required (no group) must be done
     * and at least requireChoiceGroupsAtLeast groups must be fully complete.
     * @param {Object} quest - Active quest with objectives[]
     * @returns {boolean}
     */
    areChapterObjectivesComplete(quest) {
        const objectives = quest.objectives || [];
        if (objectives.length === 0) return true;
        const required = objectives.filter(o => !o.group);
        const byGroup = /** @type {Record<string, typeof objectives>} */ ({});
        for (const o of objectives) {
            if (o.group) {
                if (!byGroup[o.group]) byGroup[o.group] = [];
                byGroup[o.group].push(o);
            }
        }
        const requiredDone = required.every(o => (o.progress || 0) >= o.count);
        if (Object.keys(byGroup).length === 0) {
            return requiredDone && objectives.every(o => (o.progress || 0) >= o.count);
        }
        const needGroups = Math.max(1, quest.requireChoiceGroupsAtLeast ?? 1);
        let completeGroups = 0;
        for (const groupObjectives of Object.values(byGroup)) {
            if (groupObjectives.every(o => (o.progress || 0) >= o.count)) completeGroups++;
        }
        return requiredDone && completeGroups >= needGroups;
    }

    /** @returns {boolean} True if Chapter 5 is completed (Path of Mastery unlocked). GDD §12. */
    isPathOfMasteryUnlocked() {
        return this.completedChapterQuestIds.has('chapter_5_inner_temple');
    }
    
    initializeQuests() {
        // Main storyline quests
        const mainQuests = [
            {
                id: 'main_quest_1',
                name: 'The Beginning of the Journey',
                description: 'Defeat the enemies in the forest to prove your worth.',
                objective: {
                    type: 'kill',
                    target: 'any',
                    count: 5,
                    progress: 0
                },
                reward: {
                    experience: 100,
                    gold: 50,
                    items: [
                        { name: 'Health Potion', amount: 2 }
                    ]
                },
                isMainQuest: true,
                requiredLevel: 1,
                nextQuestId: 'main_quest_2'
            },
            {
                id: 'main_quest_2',
                name: 'The Skeleton Threat',
                description: 'Skeletons have been spotted in the ruins. Defeat them to secure the area.',
                objective: {
                    type: 'kill',
                    target: 'skeleton',
                    count: 8,
                    progress: 0
                },
                reward: {
                    experience: 200,
                    gold: 100,
                    items: [
                        { name: 'Monk Bracers', type: 'accessory', damage: 0, damageReduction: 0.05, amount: 1 }
                    ]
                },
                isMainQuest: true,
                requiredLevel: 2,
                nextQuestId: 'main_quest_3'
            },
            {
                id: 'main_quest_3',
                name: 'The Skeleton King',
                description: 'The Skeleton King has risen in the ancient ruins. Defeat him to restore peace.',
                objective: {
                    type: 'kill',
                    target: 'skeleton_king',
                    count: 1,
                    progress: 0
                },
                reward: {
                    experience: 500,
                    gold: 250,
                    items: [
                        { name: 'Monk Staff', type: 'weapon', damage: 15, damageReduction: 0, amount: 1 }
                    ]
                },
                isMainQuest: true,
                requiredLevel: 4,
                nextQuestId: 'main_quest_4'
            },
            {
                id: 'main_quest_4',
                name: 'The Swamp of Despair',
                description: 'Zombies have infested the swamp. Clear them out to make the area safe again.',
                objective: {
                    type: 'kill',
                    target: 'zombie',
                    count: 12,
                    progress: 0
                },
                reward: {
                    experience: 800,
                    gold: 350,
                    items: [
                        { name: 'Monk Robe', type: 'armor', damage: 0, damageReduction: 0.1, amount: 1 }
                    ]
                },
                isMainQuest: true,
                requiredLevel: 6,
                nextQuestId: 'main_quest_5'
            },
            {
                id: 'main_quest_5',
                name: 'The Demon Invasion',
                description: 'Demons have begun invading from the mountains. Defeat them to protect the realm.',
                objective: {
                    type: 'kill',
                    target: 'demon',
                    count: 15,
                    progress: 0
                },
                reward: {
                    experience: 1200,
                    gold: 500,
                    items: [
                        { name: 'Monk Sandals', type: 'boots', damage: 0, damageReduction: 0.05, amount: 1 }
                    ]
                },
                isMainQuest: true,
                requiredLevel: 8,
                nextQuestId: 'main_quest_6'
            },
            {
                id: 'main_quest_6',
                name: 'The Final Battle',
                description: 'The Demon Lord has appeared. Defeat him to save the world from destruction.',
                objective: {
                    type: 'kill',
                    target: 'demon_lord',
                    count: 1,
                    progress: 0
                },
                reward: {
                    experience: 2000,
                    gold: 1000,
                    items: [
                        { name: 'Legendary Monk Helmet', type: 'helmet', damage: 5, damageReduction: 0.15, amount: 1 }
                    ]
                },
                isMainQuest: true,
                requiredLevel: 10,
                nextQuestId: null
            }
        ];
        
        // Side quests
        const sideQuests = [
            {
                id: 'side_quest_1',
                name: 'Treasure Hunter',
                description: 'Find and open treasure chests scattered around the world.',
                objective: {
                    type: 'interact',
                    target: 'chest',
                    count: 3,
                    progress: 0
                },
                reward: {
                    experience: 50,
                    gold: 100
                },
                isMainQuest: false,
                requiredLevel: 1
            },
            {
                id: 'side_quest_2',
                name: 'Explorer',
                description: 'Discover all zones in the world.',
                objective: {
                    type: 'explore',
                    target: 'zone',
                    count: 4,
                    progress: 0,
                    discovered: []
                },
                reward: {
                    experience: 150,
                    gold: 75,
                    items: [
                        { name: 'Map Fragment', amount: 1 }
                    ]
                },
                isMainQuest: false,
                requiredLevel: 1
            },
            {
                id: 'side_quest_3',
                name: 'Skeleton Slayer',
                description: 'Defeat 20 skeletons to thin their numbers.',
                objective: {
                    type: 'kill',
                    target: 'skeleton',
                    count: 20,
                    progress: 0
                },
                reward: {
                    experience: 200,
                    gold: 150,
                    items: [
                        { name: 'Bone Dust', amount: 5 }
                    ]
                },
                isMainQuest: false,
                requiredLevel: 3
            },
            {
                id: 'side_quest_4',
                name: 'Zombie Hunter',
                description: 'Cleanse the swamp by defeating 25 zombies.',
                objective: {
                    type: 'kill',
                    target: 'zombie',
                    count: 25,
                    progress: 0
                },
                reward: {
                    experience: 300,
                    gold: 200,
                    items: [
                        { name: 'Putrid Essence', amount: 3 }
                    ]
                },
                isMainQuest: false,
                requiredLevel: 5
            },
            {
                id: 'side_quest_5',
                name: 'Demon Slayer',
                description: 'Defeat 30 demons to weaken their invasion force.',
                objective: {
                    type: 'kill',
                    target: 'demon',
                    count: 30,
                    progress: 0
                },
                reward: {
                    experience: 400,
                    gold: 300,
                    items: [
                        { name: 'Demon Heart', amount: 2 }
                    ]
                },
                isMainQuest: false,
                requiredLevel: 7
            },
            {
                id: 'side_quest_6',
                name: 'Master Treasure Hunter',
                description: 'Find and open 10 treasure chests throughout the world.',
                objective: {
                    type: 'interact',
                    target: 'chest',
                    count: 10,
                    progress: 0
                },
                reward: {
                    experience: 500,
                    gold: 400,
                    items: [
                        { name: 'Lucky Charm', type: 'accessory', damage: 2, damageReduction: 0.02, amount: 1 }
                    ]
                },
                isMainQuest: false,
                requiredLevel: 5
            },
            {
                id: 'side_quest_7',
                name: 'Rare Materials',
                description: 'Collect rare materials from defeated bosses.',
                objective: {
                    type: 'kill',
                    target: 'boss',
                    count: 3,
                    progress: 0
                },
                reward: {
                    experience: 600,
                    gold: 500,
                    items: [
                        { name: 'Enchanted Crystal', amount: 1 }
                    ]
                },
                isMainQuest: false,
                requiredLevel: 8
            }
        ];
        
        // Combine all quests
        this.quests = [...mainQuests, ...sideQuests];
    }
    
    startQuest(quest) {
        // Chapter quest (GDD story): match by id, add clone to active, do not remove from list
        if (this.isChapterQuest(quest)) {
            if (this.activeQuests.some(q => q.id === quest.id)) return false;
            const copy = this.cloneChapterQuestForStart(quest);
            this.activeQuests.push(copy);
            // Remove from declined list if it was previously declined
            if (quest.id && this.declinedChapterQuestIds.has(quest.id)) {
                this.declinedChapterQuestIds.delete(quest.id);
            }
            this.game.hudManager.updateQuestLog(this.activeQuests);
            // First-time hint (Phase 9.2): one-time tip after accepting a chapter quest
            if (this.game && !this.game._hasShownQuestHintThisSession) {
                this.game._hasShownQuestHintThisSession = true;
                const locale = this.game.questStoryLocale || 'en';
                this.game.hudManager.showNotification(getQuestUiString('journeyHint', locale));
            }
            this.persistQuestsAfterAccept();
            return true;
        }

        // Legacy: find in this.quests by name
        const questToStart = this.quests.find(q => q.name === quest.name);
        if (questToStart) {
            if (!this.activeQuests.some(q => q.id === questToStart.id)) {
                this.activeQuests.push(questToStart);
                this.quests = this.quests.filter(q => q.id !== questToStart.id);
                this.game.hudManager.updateQuestLog(this.activeQuests);
                this.persistQuestsAfterAccept();
                return true;
            }
        }
        return false;
    }

    /**
     * Trigger a background save so accepted quests persist across reload.
     * Called when a quest is successfully added to activeQuests.
     */
    persistQuestsAfterAccept() {
        if (this.game?.saveManager && typeof this.game.saveManager.saveGame === 'function') {
            this.game.saveManager.saveGame(false, true).catch(() => {});
        }
    }

    /**
     * Trigger a background save so declined quests persist across reload.
     * Called when a quest is declined.
     */
    persistQuestsAfterDecline() {
        if (this.game?.saveManager && typeof this.game.saveManager.saveGame === 'function') {
            this.game.saveManager.saveGame(false, true).catch(() => {});
        }
    }
    
    updateEnemyKill(enemy) {
        // Path of Mastery (Phase 6.2): record boss kill for mastery progression and first-clear cosmetic
        if (enemy.isBoss && this.game?.isInPathOfMastery && typeof this.game.recordPathOfMasteryBossKill === 'function') {
            this.game.recordPathOfMasteryBossKill(enemy.type);
        }
        this.activeQuests.forEach(quest => {
            // Chapter quests: multiple objectives (kill, defeat_boss)
            if (quest.objectives && Array.isArray(quest.objectives)) {
                let updated = false;
                // When enemy is a boss, prefer defeat_boss objective so the kill is counted as "Defeat boss" not "Kill enemies"
                const objectivesToCheck = enemy.isBoss
                    ? [...quest.objectives].sort((a, b) => (a.type === 'defeat_boss' ? -1 : b.type === 'defeat_boss' ? 1 : 0))
                    : quest.objectives;
                for (const obj of objectivesToCheck) {
                    const match = (obj.type === 'kill' || obj.type === 'defeat_boss') &&
                        (obj.target === 'any' || obj.target === enemy.type);
                    if (match) {
                        obj.progress = (obj.progress || 0) + 1;
                        updated = true;
                        const locale = this.game.questStoryLocale || 'en';
                        const typeKey = obj.type === 'defeat_boss' ? 'boss' : 'enemies';
                        const typeLabel = getQuestUiString(typeKey, locale);
                        this.game.hudManager.showNotification(
                            getQuestUiString('questProgressCount', locale, { current: obj.progress, count: obj.count, type: typeLabel })
                        );
                        break;
                    }
                }
                if (updated) {
                    const allComplete = this.areChapterObjectivesComplete(quest);
                    if (allComplete) this.completeQuest(quest);
                    else this.game.hudManager.updateQuestLog(this.activeQuests);
                }
                return;
            }

            // Legacy: single objective
            if (quest.objective && quest.objective.type === 'kill') {
                if (quest.objective.target === 'any' || quest.objective.target === enemy.type) {
                    quest.objective.progress++;
                    if (quest.objective.progress >= quest.objective.count) {
                        this.completeQuest(quest);
                    } else {
                        this.game.hudManager.updateQuestLog(this.activeQuests);
                        const locale = this.game.questStoryLocale || 'en';
                        this.game.hudManager.showNotification(getQuestUiString('questProgressEnemiesDefeated', locale, { current: quest.objective.progress, count: quest.objective.count }));
                    }
                }
            }
        });
    }
    
    updateInteraction(objectType) {
        this.activeQuests.forEach(quest => {
            if (quest.objectives && Array.isArray(quest.objectives)) {
                let updated = false;
                for (const obj of quest.objectives) {
                    if (obj.type === 'interact' && (obj.target === objectType || obj.target === 'any')) {
                        obj.progress = (obj.progress || 0) + 1;
                        updated = true;
                        const locale = this.game.questStoryLocale || 'en';
                        this.game.hudManager.showNotification(getQuestUiString('questProgressFound', locale, { current: obj.progress, count: obj.count, objectType: obj.target || objectType }));
                        break;
                    }
                }
                if (updated && this.areChapterObjectivesComplete(quest)) this.completeQuest(quest);
                else if (updated) this.game.hudManager.updateQuestLog(this.activeQuests);
                return;
            }
            if (quest.objective && quest.objective.type === 'interact' && quest.objective.target === objectType) {
                quest.objective.progress++;
                if (quest.objective.progress >= quest.objective.count) {
                    this.completeQuest(quest);
                } else {
                    this.game.hudManager.updateQuestLog(this.activeQuests);
                    const locale = this.game.questStoryLocale || 'en';
                    this.game.hudManager.showNotification(getQuestUiString('questProgressFound', locale, { current: quest.objective.progress, count: quest.objective.count, objectType }));
                }
            }
        });
    }
    
    updateExploration(zoneName) {
        // Update exploration objectives for active quests
        this.activeQuests.forEach(quest => {
            if (quest.objective.type === 'explore' && quest.objective.target === 'zone') {
                // Check if this zone has already been discovered for this quest
                if (!quest.objective.discovered.includes(zoneName)) {
                    quest.objective.discovered.push(zoneName);
                    quest.objective.progress++;
                    
                    // Check if objective is complete
                    if (quest.objective.progress >= quest.objective.count) {
                        this.completeQuest(quest);
                    } else {
                        // Update UI
                        this.game.hudManager.updateQuestLog(this.activeQuests);
                        const locale = this.game.questStoryLocale || 'en';
                        this.game.hudManager.showNotification(getQuestUiString('zoneDiscovered', locale, { zoneName }));
                    }
                }
            }
        });
    }
    
    completeQuest(quest) {
        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
        this.completedQuests.push(quest);

        if (quest.id && !this.completedChapterQuestIds.has(quest.id)) {
            this.completedChapterQuestIds.add(quest.id);
        }

        const doAfterReflection = () => {
            this.awardQuestRewards(quest);
            if (this.game && this.game.audioManager) {
                this.game.audioManager.playSound('questComplete');
            }
            this.game.hudManager.updateQuestLog(this.activeQuests);
            const title = quest.title || quest.name;
            const locale = this.game.questStoryLocale || 'en';
            this.game.hudManager.showNotification(getQuestUiString('questCompletedTitle', locale, { title }));
            this.showRewardsIn3D(quest);
            this.checkForNextQuest(quest);
        };

        // GDD §11: post-boss reflection (life lesson + Continue Journey); §12 Path of Mastery after Ch5
        if (this.isChapterQuest(quest) && quest.lesson) {
            const locale = this.game.questStoryLocale || 'en';
            const display = getChapterQuestDisplay(quest, locale);
            const isChapter5 = quest.id === 'chapter_5_inner_temple';
            const chMatch = quest.id && quest.id.match(/chapter_(\d)_/);
            const chapterNum = chMatch ? chMatch[1] : '';
            const chapterTitle = (chapterNum && display.area) ? `Chapter ${chapterNum} — ${display.area}` : (display.area || '');
            // Reflection question ("What did you notice?") disabled: go straight to lesson + Continue
            const options = {
                chapterTitle: chapterTitle || undefined,
                reflectionQuestion: false,
                ...(isChapter5 ? {
                    isChapter5: true,
                    onEnterPathOfMastery: () => {
                        doAfterReflection();
                        if (this.game.enterPathOfMastery) this.game.enterPathOfMastery();
                    }
                } : {})
            };
            this.game.hudManager.showReflectionScreen(display.lesson, doAfterReflection, options);
        } else {
            doAfterReflection();
        }
    }

    /**
     * Award the item for a reflection choice (tied to quest.reflectionRewards[choiceIndex] template ID).
     * @param {Object} quest - Chapter quest with reflectionRewards
     * @param {number} choiceIndex - 0, 1, or 2
     */
    awardReflectionChoiceReward(quest, choiceIndex) {
        const templateId = quest.reflectionRewards && quest.reflectionRewards[choiceIndex];
        if (!templateId || !this.game.player || !this.game.itemGenerator) return;
        const item = this.game.itemGenerator.generateItemFromTemplateId(templateId);
        if (!item) return;
        const locale = this.game.questStoryLocale || 'en';
        const equipResult = this.game.player.addToInventory(item);
        if (equipResult === 'equipped') {
            this.game.hudManager.showNotification(getQuestUiString('equipped', locale, { itemName: item.name }), 'equip', { item });
        } else {
            this.game.hudManager.showNotification(getQuestUiString('received', locale, { itemName: item.name, amount: item.amount || 1 }));
        }
    }
    
    checkForNextQuest(completedQuest) {
        // Chapter story: instruct player to go to the next map for the next quest (marker is on that map)
        const nextIds = completedQuest.nextQuestIds && completedQuest.nextQuestIds.length
            ? completedQuest.nextQuestIds
            : (completedQuest.nextQuestId ? [completedQuest.nextQuestId] : []);
        if (nextIds.length > 0) {
            const nextChapter = getChapterQuestById(nextIds[0]);
            if (nextChapter) {
                const locale = this.game.questStoryLocale || 'en';
                const nextDisplay = getChapterQuestDisplay(nextChapter, locale);
                const nextMap = getNextStoryMapAfter(completedQuest.id, CHAPTER_QUESTS);
                setTimeout(() => {
                    if (this.game.hudManager) {
                        const label = nextMap?.mapName ?? nextDisplay.area ?? getQuestUiString('nextMapFallback', locale);
                        const msg = nextIds.length > 1
                            ? getQuestUiString('travelToGetNextQuest', locale, { label }) + ' ' + (getQuestUiString('otherPathsAvailable', locale) || 'Other paths await in the Story panel.')
                            : getQuestUiString('travelToGetNextQuest', locale, { label });
                        this.game.hudManager.showNotification(msg);
                    }
                }, 2000);
                return;
            }
        }
        // Legacy: main quest chain
        if (completedQuest.isMainQuest && completedQuest.nextQuestId) {
            const nextQuest = this.quests.find(q => q.id === completedQuest.nextQuestId);
            if (nextQuest) {
                    const locale = this.game.questStoryLocale || 'en';
                    if (this.game.player.getLevel() >= (nextQuest.requiredLevel || 1)) {
                        setTimeout(() => {
                            this.game.hudManager.showDialog(
                                getQuestUiString('newQuestAvailable', locale, { name: nextQuest.name }),
                                `${nextQuest.description}\n\n${getQuestUiString('acceptQuestPrompt', locale)}`,
                                () => this.startQuest(nextQuest)
                            );
                        }, 2000);
                    } else {
                        setTimeout(() => {
                            this.game.hudManager.showNotification(
                                getQuestUiString('newQuestAtLevel', locale, { name: nextQuest.name, level: nextQuest.requiredLevel })
                            );
                        }, 2000);
                    }
            }
        }
    }
    
    /**
     * Show quest rewards as floating 3D text above the player (no popup).
     * @param {Object} quest - Completed quest with rewards
     */
    showRewardsIn3D(quest) {
        if (!this.game?.player?.getPosition || !this.game?.effectsManager) return;
        const pos = this.game.player.getPosition().clone();
        const rewards = quest.rewards || quest.reward;
        let yOffset = 0;
        const step = 1.2;

        const addRewardText = (text, rewardType) => {
            const p = { x: pos.x, y: pos.y + yOffset, z: pos.z };
            yOffset += step;
            this.game.effectsManager.createRewardTextSprite(text, p, rewardType);
        };

        if (rewards) {
            const xp = rewards.xp ?? rewards.experience;
            if (xp) addRewardText(`+${xp} EXP`, 'xp');
            const skillPoints = rewards.skillPoints;
            if (skillPoints) {
                addRewardText(`+${skillPoints} Skill Point${skillPoints !== 1 ? 's' : ''}`, 'xp');
            }
        }
        if (quest.reward) {
            if (quest.reward.gold) {
                addRewardText(`+${quest.reward.gold} Gold`, 'gold');
            }
            if (quest.reward.items) {
                for (const item of quest.reward.items) {
                    const amount = item.amount || 1;
                    addRewardText(`+ ${item.name}${amount > 1 ? ' x' + amount : ''}`, 'item');
                }
            }
        }
    }

    awardQuestRewards(quest) {
        const locale = this.game.questStoryLocale || 'en';
        // GDD rewards (chapter quests): rewards.xp, rewards.skillPoints
        const rewards = quest.rewards || quest.reward;
        if (rewards) {
            const xp = rewards.xp ?? rewards.experience;
            if (xp) {
                this.game.player.addExperience(xp);
                this.game.hudManager.showNotification(getQuestUiString('gainedExperience', locale, { xp }));
            }
            const skillPoints = rewards.skillPoints;
            if (skillPoints && this.game.hudManager.components.skillTreeUI) {
                const ui = this.game.hudManager.components.skillTreeUI;
                if (typeof ui.addSkillPoints === 'function') {
                    ui.addSkillPoints(skillPoints);
                } else {
                    ui.skillPoints = (ui.skillPoints || 0) + skillPoints;
                    if (ui.elements?.skillPointsValue) ui.elements.skillPointsValue.textContent = ui.skillPoints;
                }
                this.game.hudManager.showNotification(getQuestUiString('gainedSkillPoints', locale, { count: skillPoints }));
            }
        }

        // Legacy: reward.gold and reward.items
        if (quest.reward) {
            if (quest.reward.gold) {
                this.game.player.addGold(quest.reward.gold);
                this.game.hudManager.showNotification(getQuestUiString('gainedGold', locale, { gold: quest.reward.gold }));
            }
            if (quest.reward.items) {
                quest.reward.items.forEach(item => {
                    const equipResult = this.game.player.addToInventory(item);
                    if (equipResult === 'equipped') {
                        this.game.hudManager.showNotification(getQuestUiString('equipped', locale, { itemName: item.name }), 'equip', { item });
                    } else {
                        this.game.hudManager.showNotification(getQuestUiString('received', locale, { itemName: item.name, amount: item.amount }));
                    }
                });
            }
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
        const legacy = this.quests.filter(quest => {
            const isCompleted = this.completedQuests.some(q => q.id === quest.id);
            if (isCompleted) return false;
            const isActive = this.activeQuests.some(q => q.id === quest.id);
            if (isActive) return false;
            return playerLevel >= (quest.requiredLevel || 1);
        });
        const chapter = this.getAvailableChapterQuests().filter(
            q => !this.activeQuests.some(a => a.id === q.id)
        );
        return [...chapter, ...legacy];
    }
    
    checkForAvailableQuests() {
        const locale = this.game.questStoryLocale || 'en';
        const remindLater = () => {
            setTimeout(() => {
                if (this.game.hudManager && !this.getActiveChapterQuest()) {
                    this.game.hudManager.showNotification(getQuestUiString('storyQuestAvailable', locale));
                }
            }, 8000);
        };
        const availableQuests = this.getAvailableQuests();
        const chapterQuests = availableQuests.filter(q => this.isChapterQuest(q) && !this.declinedChapterQuestIds.has(q.id));
        if (chapterQuests.length > 0) {
            const q = chapterQuests[0];
            const locale = this.game.questStoryLocale || 'en';
            const display = getChapterQuestDisplay(q, locale);
            this.game.hudManager.showDialog(
                getQuestUiString('newQuestTitle', locale, { title: display.title || q.title || q.name }),
                `${display.description || q.description}\n\n${getQuestUiString('acceptQuestPrompt', locale)}`,
                () => this.startQuest(q),
                () => {
                    // Mark as declined and persist
                    this.declinedChapterQuestIds.add(q.id);
                    this.persistQuestsAfterDecline();
                    remindLater();
                }
            );
            return;
        }
        const mainQuests = availableQuests.filter(q => q.isMainQuest);
        if (mainQuests.length > 0) {
            const mainQuest = mainQuests[0];
            this.game.hudManager.showDialog(
                getQuestUiString('newMainQuestAvailable', locale, { name: mainQuest.name }),
                `${mainQuest.description}\n\n${getQuestUiString('acceptQuestPrompt', locale)}`,
                () => this.startQuest(mainQuest),
                () => {} // Legacy quests don't track decline (not persisted)
            );
            return;
        }
        const sideQuests = availableQuests.filter(q => !q.isMainQuest);
        if (sideQuests.length > 0) {
            const sideQuest = sideQuests[Math.floor(Math.random() * sideQuests.length)];
            this.game.hudManager.showDialog(
                getQuestUiString('newSideQuestAvailable', locale, { name: sideQuest.name }),
                `${sideQuest.description}\n\n${getQuestUiString('acceptQuestPrompt', locale)}`,
                () => this.startQuest(sideQuest),
                () => {} // Legacy quests don't track decline (not persisted)
            );
        }
    }
}
import { CHAPTER_QUESTS, getChapterQuestById } from './config/chapter-quests.js';

export class QuestManager {
    constructor(game) {
        this.game = game;
        this.quests = [];
        this.activeQuests = [];
        this.completedQuests = [];
        /** @type {Set<string>} Completed chapter quest ids (GDD story) */
        this.completedChapterQuestIds = new Set();

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

    /** @returns {Object[]} Chapter quests available to start (first or next after completed) */
    getAvailableChapterQuests() {
        const completed = this.completedChapterQuestIds;
        const all = CHAPTER_QUESTS;
        const nextId = all.find(q => !completed.has(q.id))?.id;
        if (!nextId) return [];
        const next = getChapterQuestById(nextId);
        return next ? [this.cloneChapterQuestForStart(next)] : [];
    }

    /** @returns {Object|null} Active chapter quest (story) or null if none. Used for boss spawn wiring. */
    getActiveChapterQuest() {
        const chapter = this.activeQuests.find(q => this.isChapterQuest(q));
        return chapter || null;
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
            this.game.hudManager.updateQuestLog(this.activeQuests);
            return true;
        }

        // Legacy: find in this.quests by name
        const questToStart = this.quests.find(q => q.name === quest.name);
        if (questToStart) {
            if (!this.activeQuests.some(q => q.id === questToStart.id)) {
                this.activeQuests.push(questToStart);
                this.quests = this.quests.filter(q => q.id !== questToStart.id);
                this.game.hudManager.updateQuestLog(this.activeQuests);
                return true;
            }
        }
        return false;
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
                for (const obj of quest.objectives) {
                    const match = (obj.type === 'kill' || obj.type === 'defeat_boss') &&
                        (obj.target === 'any' || obj.target === enemy.type);
                    if (match) {
                        obj.progress = (obj.progress || 0) + 1;
                        updated = true;
                        this.game.hudManager.showNotification(
                            `Quest: ${obj.progress}/${obj.count} ${obj.type === 'defeat_boss' ? 'boss' : 'enemies'}`
                        );
                        break;
                    }
                }
                if (updated) {
                    const allComplete = quest.objectives.every(o => (o.progress || 0) >= o.count);
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
                        this.game.hudManager.showNotification(`Quest progress: ${quest.objective.progress}/${quest.objective.count} enemies defeated`);
                    }
                }
            }
        });
    }
    
    updateInteraction(objectType) {
        // Update interaction objectives for active quests
        this.activeQuests.forEach(quest => {
            if (quest.objective.type === 'interact' && quest.objective.target === objectType) {
                quest.objective.progress++;
                
                // Check if objective is complete
                if (quest.objective.progress >= quest.objective.count) {
                    this.completeQuest(quest);
                } else {
                    // Update UI
                    this.game.hudManager.updateQuestLog(this.activeQuests);
                    this.game.hudManager.showNotification(`Quest progress: ${quest.objective.progress}/${quest.objective.count} ${objectType}s found`);
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
                        this.game.hudManager.showNotification(`Zone discovered: ${zoneName}`);
                    }
                }
            }
        });
    }
    
    completeQuest(quest) {
        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
        this.completedQuests.push(quest);

        if (quest.id) this.completedChapterQuestIds.add(quest.id);

        const doAfterReflection = () => {
            this.awardQuestRewards(quest);
            if (this.game && this.game.audioManager) {
                this.game.audioManager.playSound('questComplete');
            }
            this.game.hudManager.updateQuestLog(this.activeQuests);
            const title = quest.title || quest.name;
            this.game.hudManager.showDialog(
                `Quest Completed: ${title}`,
                `You have completed the quest and received your rewards!`
            );
            this.checkForNextQuest(quest);
        };

        // GDD §11: post-boss reflection (life lesson + Continue Journey); §12 Path of Mastery after Ch5
        if (this.isChapterQuest(quest) && quest.lesson) {
            const isChapter5 = quest.id === 'chapter_5_inner_temple';
            const options = isChapter5 ? {
                isChapter5: true,
                onEnterPathOfMastery: () => {
                    doAfterReflection();
                    if (this.game.enterPathOfMastery) this.game.enterPathOfMastery();
                }
            } : {};
            this.game.hudManager.showReflectionScreen(quest.lesson, doAfterReflection, options);
        } else {
            doAfterReflection();
        }
    }
    
    checkForNextQuest(completedQuest) {
        // Chapter story: offer next chapter quest
        if (completedQuest.nextQuestId) {
            const nextChapter = getChapterQuestById(completedQuest.nextQuestId);
            if (nextChapter) {
                setTimeout(() => {
                    this.game.hudManager.showDialog(
                        `New Quest: ${nextChapter.title}`,
                        `${nextChapter.description}\n\nWould you like to accept this quest?`,
                        () => this.startQuest(nextChapter)
                    );
                }, 2000);
                return;
            }
        }
        // Legacy: main quest chain
        if (completedQuest.isMainQuest && completedQuest.nextQuestId) {
            const nextQuest = this.quests.find(q => q.id === completedQuest.nextQuestId);
            if (nextQuest) {
                if (this.game.player.getLevel() >= (nextQuest.requiredLevel || 1)) {
                    setTimeout(() => {
                        this.game.hudManager.showDialog(
                            `New Quest Available: ${nextQuest.name}`,
                            `${nextQuest.description}\n\nWould you like to accept this quest?`,
                            () => this.startQuest(nextQuest)
                        );
                    }, 2000);
                } else {
                    setTimeout(() => {
                        this.game.hudManager.showNotification(
                            `New quest "${nextQuest.name}" will be available at level ${nextQuest.requiredLevel}.`
                        );
                    }, 2000);
                }
            }
        }
    }
    
    awardQuestRewards(quest) {
        // GDD rewards (chapter quests): rewards.xp, rewards.skillPoints
        const rewards = quest.rewards || quest.reward;
        if (rewards) {
            const xp = rewards.xp ?? rewards.experience;
            if (xp) {
                this.game.player.addExperience(xp);
                this.game.hudManager.showNotification(`Gained ${xp} experience`);
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
                this.game.hudManager.showNotification(`Gained ${skillPoints} skill point(s)`);
            }
        }

        // Legacy: reward.gold and reward.items
        if (quest.reward) {
            if (quest.reward.gold) {
                this.game.player.addGold(quest.reward.gold);
                this.game.hudManager.showNotification(`Gained ${quest.reward.gold} gold`);
            }
            if (quest.reward.items) {
                quest.reward.items.forEach(item => {
                    const equipResult = this.game.player.addToInventory(item);
                    if (equipResult === 'equipped') {
                        this.game.hudManager.showNotification(`Equipped ${item.name}`, 'equip', { item });
                    } else {
                        this.game.hudManager.showNotification(`Received ${item.name} x${item.amount}`);
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
        const availableQuests = this.getAvailableQuests();
        const chapterQuests = availableQuests.filter(q => this.isChapterQuest(q));
        if (chapterQuests.length > 0) {
            const q = chapterQuests[0];
            this.game.hudManager.showDialog(
                `New Quest: ${q.title || q.name}`,
                `${q.description}\n\nWould you like to accept this quest?`,
                () => this.startQuest(q)
            );
            return;
        }
        const mainQuests = availableQuests.filter(q => q.isMainQuest);
        if (mainQuests.length > 0) {
            const mainQuest = mainQuests[0];
            this.game.hudManager.showDialog(
                `New Main Quest Available: ${mainQuest.name}`,
                `${mainQuest.description}\n\nWould you like to accept this quest?`,
                () => this.startQuest(mainQuest)
            );
            return;
        }
        const sideQuests = availableQuests.filter(q => !q.isMainQuest);
        if (sideQuests.length > 0) {
            const sideQuest = sideQuests[Math.floor(Math.random() * sideQuests.length)];
            this.game.hudManager.showDialog(
                `New Side Quest Available: ${sideQuest.name}`,
                `${sideQuest.description}\n\nWould you like to accept this quest?`,
                () => this.startQuest(sideQuest)
            );
        }
    }
}
/**
 * Handles the results of interactions with interactive objects
 */
import { isZoneContractQuest } from './config/quests/index.js';

export class InteractionResultHandler {
    constructor(game) {
        this.game = game;
    }
    
    /**
     * Process an interaction result
     * @param {Object} result - The interaction result
     * @param {Object} interactiveObject - The interactive object that was interacted with
     * @returns {boolean} - Whether the interaction was handled successfully
     */
    handleInteractionResult(result, interactiveObject) {
        if (!result) {
            // No interaction result, possibly already interacted with
            if (this.game && this.game.hudManager) {
                this.game.hudManager.showNotification("Nothing happens.");
            }
            return false;
        }
        
        // Handle different interaction types
        switch (result.type) {
            case 'quest':
                return this.handleQuestInteraction(result);
                
            case 'treasure':
            case 'item':
                return this.handleItemInteraction(result);
                
            case 'boss_spawn':
                return this.handleBossSpawnInteraction(result, interactiveObject);

            case 'shrine':
                return this.handleShrineInteraction(result);

            case 'quest_board':
                return this.handleQuestBoardInteraction(result, interactiveObject);

            case 'gather':
                return this.handleGatherInteraction(result, interactiveObject);
                
            default:
                console.warn(`Unknown interaction type: ${result.type}`);
                return false;
        }
    }
    
    /**
     * Handle quest interaction
     * @param {Object} result - The interaction result
     * @returns {boolean} - Whether the interaction was handled successfully
     */
    handleQuestInteraction(result) {
        if (!this.game?.questManager || !result.quest) return false;

        const quest = result.quest;
        this.game.hudManager.showDialog(
            `New Quest: ${quest.name}`,
            quest.description || 'Accept this quest to begin.',
            () => this.game.questManager.startQuest(quest)
        );

        return true;
    }
    
    /**
     * Handle item interaction
     * @param {Object} result - The interaction result
     * @returns {boolean} - Whether the interaction was handled successfully
     */
    handleItemInteraction(result) {
        if (this.game && this.game.player) {
            this.game.player.addToInventory(result.item);

            if (result.type === 'treasure' && this.game.questManager) {
                this.game.questManager.updateInteraction('chest', {
                    mapId: this.game.world?.currentMap?.id || null
                });
            }

            if (this.game.hudManager) {
                this.game.hudManager.showNotification(
                    `Found ${result.item.name} x${result.item.amount || 1}`
                );
            }

            return true;
        }

        return false;
    }
    
    /**
     * Handle boss spawn interaction
     * @param {Object} result - The interaction result
     * @param {Object} interactiveObject - The interactive object that was interacted with
     * @returns {boolean} - Whether the interaction was handled successfully
     */
    handleBossSpawnInteraction(result, interactiveObject) {
        // Show notification
        if (this.game && this.game.hudManager) {
            this.game.hudManager.showNotification(result.message, 5);
        }
        
        // Spawn the boss if enemy manager exists (async - fire and forget)
        if (this.game && this.game.enemyManager && interactiveObject && interactiveObject.position) {
            void this.game.enemyManager.spawnBoss(
                result.bossType,
                interactiveObject.position
            );
            
            return true;
        }
        
        return false;
    }

    /**
     * Handle shrine interaction (main path cleanse + zone contracts).
     * @param {Object} result
     * @returns {boolean}
     */
    handleShrineInteraction(result) {
        const mapId = this.game.world?.currentMap?.id || null;
        const questManager = this.game?.questManager;

        if (questManager) {
            const pos = result.position || interactiveObject?.position;
            questManager.updateInteraction('shrine', {
                mapId,
                x: pos?.x,
                z: pos?.z,
                interactKey: pos?.x != null && pos?.z != null
                    ? `${Math.round(pos.x)},${Math.round(pos.z)}`
                    : result.questId || undefined
            });
        }

        const contractId = result.zoneContractId
            || (result.questId && isZoneContractQuest(result.questId) ? result.questId : null);

        if (contractId && questManager?.canOfferZoneContract(contractId)) {
            return questManager.offerZoneContract(contractId);
        }

        if (questManager?.canOfferDailyQuest?.()) {
            return questManager.offerDailyQuest();
        }

        if (this.game?.hudManager) {
            const activeZone = questManager?.activeQuests?.find(
                q => q.category === 'zone' && q.mapId === mapId
            );
            if (activeZone) {
                this.game.hudManager.showNotification(
                    `${activeZone.name}: ${activeZone.objective.progress}/${activeZone.objective.count}`,
                    2200
                );
            } else {
                this.game.hudManager.showNotification(
                    result.message || 'The shrine accepts your offering.',
                    2500
                );
            }
        }

        return true;
    }

    handleQuestBoardInteraction(result, interactiveObject) {
        const questManager = this.game?.questManager;
        if (!questManager) return false;

        const structureType = result.structureType || interactiveObject?.structureType || 'village';
        const boardIndex = interactiveObject?._boardIndex || 0;
        const offered = questManager.offerQuestBoard(structureType, boardIndex);
        if (offered && interactiveObject) {
            interactiveObject._boardIndex = boardIndex + 1;
        }
        return offered;
    }

    handleGatherInteraction(result, interactiveObject) {
        if (interactiveObject?._gathered) {
            this.game?.hudManager?.showNotification('Nothing left to gather here.', 1800);
            return true;
        }

        if (this.game?.questManager && result.itemId) {
            this.game.questManager.updateGather(result.itemId);
        }

        if (interactiveObject) {
            interactiveObject._gathered = true;
            if (interactiveObject.mesh) {
                interactiveObject.mesh.visible = false;
            }
        }

        if (this.game?.hudManager) {
            this.game.hudManager.showNotification(result.message || 'Gathered.', 2000);
        }
        return true;
    }
}
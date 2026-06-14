/**
 * Handles the results of interactions with interactive objects
 */
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
     * Handle shrine interaction (main path cleanse + future zone contracts).
     * @param {Object} result
     * @returns {boolean}
     */
    handleShrineInteraction(result) {
        if (this.game?.questManager) {
            this.game.questManager.updateInteraction('shrine', {
                mapId: this.game.world?.currentMap?.id || null
            });
        }

        if (this.game?.hudManager) {
            this.game.hudManager.showNotification(result.message || 'The shrine accepts your offering.', 2500);
        }

        return true;
    }
}
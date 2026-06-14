import { UIComponent } from '../UIComponent.js';

/**
 * Quest Log UI component
 * Displays active quests and objectives
 */
export class QuestLogUI extends UIComponent {
    /**
     * Create a new QuestLogUI component
     * @param {Object} game - Reference to the game instance
     */
    constructor(game) {
        super('quest-log', game);
        this.questList = null;
    }
    
    /**
     * Initialize the component
     * @returns {boolean} - True if initialization was successful
     */
    init() {
        // Store references to elements we need to update
        this.questList = document.getElementById('quest-list');
        
        return true;
    }
    
    /**
     * Update the quest log with active quests
     * @param {Array} activeQuests - Array of active quests
     */
    updateQuestLog(activeQuests) {
        // Clear quest list
        this.questList.innerHTML = '';
        
        if (activeQuests.length === 0) {
            const noQuests = document.createElement('div');
            noQuests.className = 'no-quests';
            const questManager = this.game?.questManager;
            const isFreshStart = questManager
                && questManager.activeQuests.length === 0
                && questManager.completedQuests.length === 0;
            const hasZoneOffer = (this.game?.world?.getAvailableZoneContractShrines?.() || []).length > 0;
            noQuests.textContent = isFreshStart
                ? 'Visit the shrine ahead'
                : hasZoneOffer
                    ? 'A shrine contract awaits nearby'
                    : 'No active quests';
            this.questList.appendChild(noQuests);
        } else {
            // Add active quests
            activeQuests.forEach(quest => {
                const hintHtml = quest.objective?.hint
                    ? `<div class="quest-hint">${quest.objective.hint}</div>`
                    : '';
                const nameClass = quest.isMainQuest
                    ? 'main-quest'
                    : (quest.category === 'zone' ? 'zone-quest' : '');
                const questHTML = `
                    <div class="quest-item">
                        <div class="quest-name ${nameClass}">${quest.name}</div>
                        <div class="quest-objective">${this.formatObjective(quest.objective)}</div>
                        ${hintHtml}
                    </div>
                `;

                this.questList.innerHTML += questHTML;
            });
        }
    }
    
    /**
     * Format quest objective based on type
     * @param {Object} objective - Quest objective
     * @returns {string} - Formatted objective text
     */
    formatObjective(objective) {
        switch (objective.type) {
            case 'kill':
                return `Kill ${objective.progress}/${objective.count} enemies`;
            case 'kill_boss':
                return `Defeat boss ${objective.progress}/${objective.count}`;
            case 'interact':
                return `Find ${objective.progress}/${objective.count} ${objective.target}s`;
            case 'explore':
                if (objective.target === 'region') {
                    return `Explore ${objective.progress}/${objective.count} regions`;
                }
                return `Discover ${objective.progress}/${objective.count} zones`;
            case 'survive':
                return `Survive ${objective.progress}/${objective.count} vigil`;
            default:
                return objective.description || 'Complete the objective';
        }
    }
}
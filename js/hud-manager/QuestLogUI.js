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
            // No active quests
            const noQuests = document.createElement('div');
            noQuests.className = 'no-quests';
            noQuests.textContent = 'No active quests';
            this.questList.appendChild(noQuests);
        } else {
            activeQuests.forEach(quest => {
                const name = quest.title || quest.name;
                const isMain = quest.isMainQuest || (quest.lesson != null);
                let objectiveText;
                if (quest.objectives && Array.isArray(quest.objectives)) {
                    objectiveText = quest.objectives.map(o => this.formatObjective(o)).join(' · ');
                } else if (quest.objective) {
                    objectiveText = this.formatObjective(quest.objective);
                } else {
                    objectiveText = 'Complete the objective';
                }
                const areaOrDesc = (quest.area || quest.description) ? `<div class="quest-area-desc">${quest.area ? `<span class="quest-area">${quest.area}</span>` : ''}${quest.area && quest.description ? ' · ' : ''}${quest.description ? `<span class="quest-desc">${quest.description}</span>` : ''}</div>` : '';
                const questHTML = `
                    <div class="quest-item">
                        <div class="quest-name ${isMain ? 'main-quest' : ''}">${name}</div>
                        ${areaOrDesc}
                        <div class="quest-objective">${objectiveText}</div>
                    </div>
                `;
                this.questList.innerHTML += questHTML;
            });
        }
    }

    /**
     * Format quest objective based on type
     * @param {Object} objective - Quest objective (may have type, target, progress, count)
     * @returns {string} - Formatted objective text
     */
    formatObjective(objective) {
        if (!objective) return '';
        const p = objective.progress ?? 0;
        const c = objective.count ?? 1;
        switch (objective.type) {
            case 'kill':
                return `Kill ${p}/${c} enemies`;
            case 'defeat_boss':
                return `Defeat boss ${p}/${c}`;
            case 'interact':
                return `Find ${p}/${c} ${objective.target || 'target'}s`;
            case 'explore':
                return `Discover ${p}/${c} zones`;
            default:
                return objective.description || `${p}/${c}`;
        }
    }
}
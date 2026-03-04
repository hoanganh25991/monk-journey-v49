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
     * Short summary for quest (1–2 lines). First sentence or first maxLen chars.
     * @param {string} text - Full description
     * @param {number} maxLen - Max length for summary (default 72)
     * @returns {string} - Summary, may be truncated with ellipsis
     */
    getQuestSummary(text, maxLen = 72) {
        if (!text || typeof text !== 'string') return '';
        const trimmed = text.trim();
        const firstSentence = trimmed.match(/^[^.!?]+[.!?]?/);
        const sentence = firstSentence ? firstSentence[0].trim() : trimmed;
        if (sentence.length <= maxLen) return sentence;
        return sentence.slice(0, maxLen).trim().replace(/\s+\S*$/, '') + '…';
    }

    /**
     * Update the quest log with active quests
     * @param {Array} activeQuests - Array of active quests
     */
    updateQuestLog(activeQuests) {
        this.activeQuests = activeQuests || [];
        // Clear quest list
        this.questList.innerHTML = '';

        // One-time click and key delegation for expand/collapse
        if (!this._questListClickBound) {
            this._questListClickBound = true;
            const toggleQuest = (item) => {
                if (!item) return;
                const idx = parseInt(item.dataset.questIndex, 10);
                if (Number.isNaN(idx) || idx < 0 || idx >= (this.activeQuests?.length || 0)) return;
                const expanded = item.classList.toggle('quest-item--expanded');
                item.setAttribute('aria-expanded', expanded);
            };
            this.questList.addEventListener('click', (e) => {
                const item = e.target.closest('.quest-item');
                toggleQuest(item);
            });
            this.questList.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const item = e.target.closest('.quest-item');
                if (!item) return;
                e.preventDefault();
                toggleQuest(item);
            });
        }

        if (activeQuests.length === 0) {
            const noQuests = document.createElement('div');
            noQuests.className = 'no-quests';
            noQuests.textContent = 'No active quests';
            this.questList.appendChild(noQuests);
        } else {
            activeQuests.forEach((quest, index) => {
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
                const fullDesc = (quest.description || '').trim();
                const summary = this.getQuestSummary(fullDesc);
                const hasFullDesc = fullDesc.length > 0 && fullDesc.length > (summary.length + 2);
                const summaryLine = quest.area
                    ? (summary ? `${quest.area} — ${summary}` : quest.area)
                    : summary;
                const questHTML = `
                    <div class="quest-item" data-quest-index="${index}" role="button" tabindex="0" aria-expanded="false" aria-label="${this.escapeHtml(name)}. Tap to expand full description.">
                        <div class="quest-name ${isMain ? 'main-quest' : ''}">${this.escapeHtml(name)}</div>
                        <div class="quest-summary-wrap">
                            ${summaryLine ? `<div class="quest-summary">${this.escapeHtml(summaryLine)}</div>` : ''}
                            ${hasFullDesc ? `<div class="quest-desc-full" aria-hidden="true">${this.escapeHtml(fullDesc)}</div>` : ''}
                            ${hasFullDesc ? '<div class="quest-tap-hint">Tap for full details</div>' : ''}
                        </div>
                        <div class="quest-objective">${this.escapeHtml(objectiveText)}</div>
                    </div>
                `;
                this.questList.innerHTML += questHTML;
            });
        }
    }

    /**
     * Escape HTML to avoid injection
     * @param {string} str - Raw string
     * @returns {string} - Safe for use in innerHTML
     */
    escapeHtml(str) {
        if (str == null) return '';
        const s = String(str);
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
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
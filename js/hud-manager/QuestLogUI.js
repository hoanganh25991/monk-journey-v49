import { UIComponent } from '../UIComponent.js';
import { getChapterQuestById, chapterQuestHasChoiceGroups } from '../config/chapter-quests.js';
import { getChapterQuestDisplay, getQuestUiString } from '../config/chapter-quests-ui-strings.js';
import { getMapIdForChapterQuest } from '../config/chapter-quest-maps.js';
import { ENEMY_TYPES, BOSS_TYPES } from '../config/game-balance.js';

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

    /** Max quests shown before "Review more". */
    static get MAX_VISIBLE_QUESTS() { return 3; }

    /**
     * When there are no active quests, return a short hint so the player knows what to do.
     * @returns {string} Hint text or empty string if no next quest
     */
    getWhatToDoHint() {
        if (!this.game?.questManager) return '';
        const next = this.game.questManager.getNextChapterQuestForMarker();
        if (!next) return '';
        const locale = (this.game && this.game.questStoryLocale) ? this.game.questStoryLocale : 'en';
        const nextDisplay = getChapterQuestDisplay(next, locale);
        const currentMapId = this.game.world?.currentMap?.id;
        const nextMapId = getMapIdForChapterQuest(next.id);
        if (nextMapId === currentMapId) {
            return getQuestUiString('findQuestMarkerHint', locale);
        }
        const label = nextDisplay.area || (typeof nextMapId === 'string' ? nextMapId.charAt(0).toUpperCase() + nextMapId.slice(1) : 'the next map');
        return '→ ' + getQuestUiString('travelToGetNextQuest', locale, { label });
    }

    /**
     * Update the quest log with active quests.
     * Shows at most 3 quests; each quest is 2 lines (title + objectives). No list UI, no click-to-expand.
     * If more than 3 quests, a "Review more" control reveals the rest.
     * @param {Array} activeQuests - Array of active quests
     */
    updateQuestLog(activeQuests) {
        this.activeQuests = activeQuests || [];
        this.questList.innerHTML = '';

        // Always use current game locale so language matches Settings (VI/EN) even after async load
        const locale = (this.game && this.game.questStoryLocale) ? this.game.questStoryLocale : 'en';
        const titleEl = this.element?.querySelector('.quest-title');
        if (titleEl) titleEl.textContent = getQuestUiString('activeQuestsTitle', locale);

        if (activeQuests.length === 0) {
            const noQuests = document.createElement('div');
            noQuests.className = 'no-quests';
            noQuests.textContent = getQuestUiString('noActiveQuests', locale);
            this.questList.appendChild(noQuests);
            const hint = this.getWhatToDoHint();
            if (hint) {
                const hintEl = document.createElement('div');
                hintEl.className = 'quest-log-hint';
                hintEl.textContent = hint;
                this.questList.appendChild(hintEl);
            }
            return;
        }

        const maxVisible = QuestLogUI.MAX_VISIBLE_QUESTS;
        const hasMore = activeQuests.length > maxVisible;
        const visibleQuests = hasMore ? activeQuests.slice(0, maxVisible) : activeQuests;

        visibleQuests.forEach((quest) => {
            this.questList.appendChild(this.buildQuestBlock(quest, locale));
        });

        if (hasMore) {
            const reviewMore = document.createElement('button');
            reviewMore.type = 'button';
            reviewMore.className = 'quest-review-more';
            reviewMore.textContent = getQuestUiString('reviewMore', locale, { count: activeQuests.length - maxVisible });
            reviewMore.setAttribute('aria-label', getQuestUiString('reviewMore', locale, { count: activeQuests.length - maxVisible }));
            reviewMore.addEventListener('click', () => this.toggleReviewMore(reviewMore));
            this.questList.appendChild(reviewMore);

            this._reviewMoreContainer = document.createElement('div');
            this._reviewMoreContainer.className = 'quest-review-more-list';
            this._reviewMoreContainer.hidden = true;
            activeQuests.slice(maxVisible).forEach((quest) => {
                this._reviewMoreContainer.appendChild(this.buildQuestBlock(quest, locale));
            });
            this.questList.appendChild(this._reviewMoreContainer);
        }
    }

    /**
     * Build a single quest block: 2 lines only (title + objectives). Click opens detail popup.
     * @param {Object} quest - Quest data
     * @param {string} locale - Locale for chapter display
     * @returns {HTMLElement}
     */
    buildQuestBlock(quest, locale) {
        const chapterTemplate = quest.id ? getChapterQuestById(quest.id) : null;
        const display = chapterTemplate ? getChapterQuestDisplay(quest, locale) : null;
        const name = display ? display.title : (quest.title || quest.name);
        const isMain = quest.isMainQuest || (quest.lesson != null);
        const hasChoice = chapterTemplate ? chapterQuestHasChoiceGroups(chapterTemplate) : false;
        let objectiveText;
        if (quest.objectives && Array.isArray(quest.objectives)) {
            objectiveText = quest.objectives.map(o => this.formatObjective(o)).join(' · ');
        } else if (quest.objective) {
            objectiveText = this.formatObjective(quest.objective);
        } else {
            objectiveText = 'Complete the objective';
        }
        const choiceCallout = hasChoice ? getQuestUiString('choiceCallout', locale) : '';
        const block = document.createElement('div');
        block.className = 'quest-block quest-block-clickable' + (hasChoice ? ' quest-has-choice' : '');
        block.setAttribute('role', 'button');
        block.setAttribute('tabindex', '0');
        block.setAttribute('aria-label', `View details: ${name}`);
        block.innerHTML = `
            <div class="quest-block-head">
                <div class="quest-name ${isMain ? 'main-quest' : ''}">${this.escapeHtml(name)}</div>
                ${hasChoice ? `<span class="quest-choice-callout" aria-label="${this.escapeHtml(choiceCallout)}">${this.escapeHtml(choiceCallout)}</span>` : ''}
            </div>
            <div class="quest-objective">${this.escapeHtml(objectiveText)}</div>
        `;
        const onOpenDetail = () => this.showQuestDetail(quest, locale);
        block.addEventListener('click', (e) => {
            e.stopPropagation();
            onOpenDetail();
        });
        block.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenDetail();
            }
        });
        return block;
    }

    /**
     * Show a full-screen detail popup for a quest (story, objectives, lesson).
     * Rendered above the HUD with high z-index so it is always visible.
     * Always uses current game.questStoryLocale so the language matches Settings.
     * @param {Object} quest - Quest data
     * @param {string} [locale] - Locale fallback when game not available
     */
    showQuestDetail(quest, locale) {
        const effectiveLocale = (this.game && this.game.questStoryLocale) ? this.game.questStoryLocale : (locale || 'en');
        const chapterTemplate = quest.id ? getChapterQuestById(quest.id) : null;
        const display = chapterTemplate ? getChapterQuestDisplay(quest, effectiveLocale) : null;
        const name = display ? display.title : (quest.title || quest.name);
        const area = display ? display.area : (quest.area || '');
        const description = display ? display.description : (quest.description || '');
        const lesson = display ? display.lesson : (quest.lesson || '');
        const hasChoice = chapterTemplate ? chapterQuestHasChoiceGroups(chapterTemplate) : false;
        const choiceHintHtml = hasChoice
            ? `<p class="quest-detail-choice-hint">${this.escapeHtml(getQuestUiString('choiceInQuestHint', effectiveLocale))}</p>`
            : '';
        let objectiveHtml = '';
        if (quest.objectives && Array.isArray(quest.objectives)) {
            objectiveHtml = quest.objectives.map(o => `<li>${this.escapeHtml(this.formatObjective(o))}</li>`).join('');
        } else if (quest.objective) {
            objectiveHtml = `<li>${this.escapeHtml(this.formatObjective(quest.objective))}</li>`;
        }
        if (objectiveHtml) objectiveHtml = `<ul class="quest-detail-objectives">${objectiveHtml}</ul>`;

        const overlay = document.createElement('div');
        overlay.className = 'quest-detail-overlay';
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Quest details');
        overlay.innerHTML = `
            <div class="quest-detail-backdrop" data-close></div>
            <div class="quest-detail-panel">
                <div class="quest-detail-header">
                    <h2 class="quest-detail-title">${this.escapeHtml(name)}</h2>
                    ${area ? `<div class="quest-detail-area">${this.escapeHtml(area)}</div>` : ''}
                    <button type="button" class="quest-detail-close" aria-label="${this.escapeHtml(getQuestUiString('close', effectiveLocale))}">×</button>
                </div>
                <div class="quest-detail-body">
                    ${description ? `<p class="quest-detail-description">${this.escapeHtml(description)}</p>` : ''}
                    ${choiceHintHtml}
                    ${objectiveHtml}
                    ${lesson ? `<p class="quest-detail-lesson"><strong>${this.escapeHtml(getQuestUiString('lessonLabel', effectiveLocale))}:</strong> ${this.escapeHtml(lesson)}</p>` : ''}
                </div>
            </div>
        `;

        const close = () => {
            overlay.remove();
            if (this.game && typeof this.game.resume === 'function') {
                this.game.resume(false);
            }
        };

        overlay.querySelector('[data-close]').addEventListener('click', close);
        overlay.querySelector('.quest-detail-close').addEventListener('click', close);
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
            }
        });

        document.body.appendChild(overlay);
        if (this.game && typeof this.game.pause === 'function') {
            this.game.pause(false);
        }
        overlay.querySelector('.quest-detail-close').focus();
    }

    /**
     * Toggle visibility of the "review more" quests.
     * @param {HTMLButtonElement} button - The "Review more" button
     */
    toggleReviewMore(button) {
        const container = this._reviewMoreContainer;
        if (!container) return;
        container.hidden = !container.hidden;
        const n = (this.activeQuests || []).length - QuestLogUI.MAX_VISIBLE_QUESTS;
        const locale = (this.game && this.game.questStoryLocale) ? this.game.questStoryLocale : 'en';
        button.textContent = container.hidden ? getQuestUiString('reviewMore', locale, { count: n }) : getQuestUiString('showLess', locale);
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
     * Get display name for an enemy type id (e.g. 'skeleton' → 'Skeleton').
     * @param {string} enemyTypeId
     * @returns {string}
     */
    getEnemyDisplayName(enemyTypeId) {
        if (!enemyTypeId) return '';
        const all = [...(ENEMY_TYPES || []), ...(BOSS_TYPES || [])];
        const entry = all.find((e) => e && e.type === enemyTypeId);
        return entry?.name ?? enemyTypeId.replace(/_/g, ' ');
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
        let text = '';
        switch (objective.type) {
            case 'kill': {
                const target = objective.target;
                let label = (target && target !== 'any') ? this.getEnemyDisplayName(target) : 'enemies';
                if (c > 1 && label !== 'enemies' && !label.endsWith('s')) label += 's';
                text = `Kill ${p}/${c} ${label}`;
                break;
            }
            case 'defeat_boss':
                text = `Defeat boss ${p}/${c}`;
                break;
            case 'interact':
                text = `Find ${p}/${c} ${objective.target || 'target'}s`;
                break;
            case 'explore':
                text = `Discover ${p}/${c} zones`;
                break;
            default:
                text = objective.description || `${p}/${c}`;
        }
        if (objective.label && objective.type !== 'defeat_boss') {
            text = `${objective.label}: ${text}`;
        }
        return text;
    }
}
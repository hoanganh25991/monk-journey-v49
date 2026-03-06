import { UIComponent } from '../UIComponent.js';
import { getReflectionUiString } from '../config/chapter-quests-locales.js';

/**
 * Reflection UI — post-boss life lesson (GDD §11).
 * Screen fade, show quote, "Continue Journey" button.
 */
export class ReflectionUI extends UIComponent {
    constructor(game) {
        super('reflection-screen', game);
        this.isReflectionOpen = false;
        this.onContinueCallback = null;
    }

    init() {
        const template = `
            <div id="reflection-screen-content">
                <div id="reflection-question-view" class="reflection-view" style="display: none;">
                    <p class="reflection-question-prompt" id="reflection-question-prompt"></p>
                    <div class="reflection-question-options" id="reflection-question-options"></div>
                </div>
                <div id="reflection-lesson-view" class="reflection-view">
                    <p class="reflection-chapter-title" id="reflection-chapter-title"></p>
                    <p class="reflection-quote" id="reflection-quote"></p>
                    <div class="reflection-actions">
                        <button class="menu-button reflection-continue" id="reflection-continue-btn">Continue Journey</button>
                        <button class="menu-button reflection-pom" id="reflection-pom-btn" style="display: none;">Enter Path of Mastery</button>
                    </div>
                </div>
            </div>
        `;
        this.render(template);

        const continueBtn = document.getElementById('reflection-continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.handleContinue());
        }
        const pomBtn = document.getElementById('reflection-pom-btn');
        if (pomBtn) {
            pomBtn.addEventListener('click', () => this.handleEnterPathOfMastery());
        }

        this.onEnterPathOfMasteryCallback = null;
        this.onReflectionChoiceCallback = null;
        this._pendingLesson = null;
        this._pendingOptions = null;
        this.hide();
        return true;
    }

    /**
     * Show reflection screen with life lesson quote.
     * R-Q5: If options.reflectionQuestion is true, show "What did you notice?" first; on option click, show lesson.
     * @param {string} lesson - Quote to display (e.g. "Anger burns the one who carries it.")
     * @param {function} onContinue - Called when user clicks "Continue Journey"
     * @param {Object} [options] - Optional: { isChapter5, onEnterPathOfMastery, chapterTitle, reflectionQuestion: boolean, onReflectionChoice: function(choiceIndex) }
     */
    showReflection(lesson, onContinue, options = {}) {
        if (this.isReflectionOpen) return;

        const locale = (this.game && this.game.questStoryLocale) ? this.game.questStoryLocale : 'en';
        this.onContinueCallback = onContinue;
        this.onEnterPathOfMasteryCallback = options.onEnterPathOfMastery || null;
        this.onReflectionChoiceCallback = options.onReflectionChoice || null;
        this._pendingLesson = lesson;
        this._pendingOptions = options;

        const questionView = document.getElementById('reflection-question-view');
        const lessonView = document.getElementById('reflection-lesson-view');

        if (options.reflectionQuestion && questionView && lessonView) {
            questionView.style.display = '';
            lessonView.style.display = 'none';
            const promptEl = document.getElementById('reflection-question-prompt');
            if (promptEl) promptEl.textContent = getReflectionUiString('reflectionQuestionPrompt', locale);
            const optionsContainer = document.getElementById('reflection-question-options');
            if (optionsContainer) {
                const optionKeys = ['reflectionOption1', 'reflectionOption2', 'reflectionOption3'];
                optionsContainer.innerHTML = optionKeys
                    .map((key, i) => {
                        const label = getReflectionUiString(key, locale);
                        return `<button type="button" class="menu-button reflection-question-option" data-choice="${i}">${this.escapeHtml(label)}</button>`;
                    })
                    .join('');
                optionsContainer.querySelectorAll('.reflection-question-option').forEach(btn => {
                    btn.addEventListener('click', (e) => this.handleReflectionChoice(parseInt(e.currentTarget.dataset.choice, 10)));
                });
            }
        } else {
            questionView && (questionView.style.display = 'none');
            lessonView && (lessonView.style.display = '');
            this.showLessonContent(lesson, options, locale);
        }

        this.show();
        this.isReflectionOpen = true;

        if (this.game && !this.game.multiplayerManager?.connection?.isConnected) {
            this.game.pause(false);
        }
    }

    /** Show the lesson view (chapter title, quote, buttons). */
    showLessonContent(lesson, options, locale) {
        const chapterTitleEl = document.getElementById('reflection-chapter-title');
        if (chapterTitleEl) {
            if (options.chapterTitle) {
                chapterTitleEl.textContent = options.chapterTitle;
                chapterTitleEl.style.display = '';
            } else {
                chapterTitleEl.style.display = 'none';
            }
        }
        const quoteEl = document.getElementById('reflection-quote');
        if (quoteEl) quoteEl.textContent = lesson;
        const continueBtn = document.getElementById('reflection-continue-btn');
        if (continueBtn) continueBtn.textContent = getReflectionUiString('continueJourney', locale);
        const pomBtn = document.getElementById('reflection-pom-btn');
        if (pomBtn) {
            pomBtn.textContent = getReflectionUiString('enterPathOfMastery', locale);
            pomBtn.style.display = options.isChapter5 ? 'block' : 'none';
        }
    }

    escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    /** R-Q5: User picked a "What did you notice?" option; show lesson and optionally persist choice. */
    handleReflectionChoice(choiceIndex) {
        const questionView = document.getElementById('reflection-question-view');
        const lessonView = document.getElementById('reflection-lesson-view');
        if (questionView) questionView.style.display = 'none';
        if (lessonView) lessonView.style.display = '';
        if (this.onReflectionChoiceCallback) this.onReflectionChoiceCallback(choiceIndex);
        const locale = (this.game && this.game.questStoryLocale) ? this.game.questStoryLocale : 'en';
        this.showLessonContent(this._pendingLesson, this._pendingOptions || {}, locale);
    }

    handleEnterPathOfMastery() {
        if (!this.isReflectionOpen) return;
        const cb = this.onEnterPathOfMasteryCallback;
        this.onContinueCallback = null;
        this.onEnterPathOfMasteryCallback = null;
        this.hide();
        this.isReflectionOpen = false;
        if (this.game) this.game.resume(false);
        if (cb) cb();
    }

    handleContinue() {
        if (!this.isReflectionOpen) return;

        const cb = this.onContinueCallback;
        this.onContinueCallback = null;
        this.hide();
        this.isReflectionOpen = false;

        if (this.game) this.game.resume(false);
        if (cb) cb();
    }

    hideReflection() {
        this.handleContinue();
    }
}

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
                <p class="reflection-chapter-title" id="reflection-chapter-title"></p>
                <p class="reflection-quote" id="reflection-quote"></p>
                <div class="reflection-actions">
                    <button class="menu-button reflection-continue" id="reflection-continue-btn">Continue Journey</button>
                    <button class="menu-button reflection-pom" id="reflection-pom-btn" style="display: none;">Enter Path of Mastery</button>
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
        this.hide();
        return true;
    }

    /**
     * Show reflection screen with life lesson quote.
     * @param {string} lesson - Quote to display (e.g. "Anger burns the one who carries it.")
     * @param {function} onContinue - Called when user clicks "Continue Journey"
     * @param {Object} [options] - Optional: { isChapter5: boolean, onEnterPathOfMastery: function, chapterTitle: string } (e.g. "Chapter 1 — The Restless Village")
     */
    showReflection(lesson, onContinue, options = {}) {
        if (this.isReflectionOpen) return;

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

        const locale = (this.game && this.game.questStoryLocale) ? this.game.questStoryLocale : 'en';
        const continueBtn = document.getElementById('reflection-continue-btn');
        if (continueBtn) continueBtn.textContent = getReflectionUiString('continueJourney', locale);
        const pomBtn = document.getElementById('reflection-pom-btn');
        if (pomBtn) {
            pomBtn.textContent = getReflectionUiString('enterPathOfMastery', locale);
            pomBtn.style.display = options.isChapter5 ? 'block' : 'none';
        }

        this.onContinueCallback = onContinue;
        this.onEnterPathOfMasteryCallback = options.onEnterPathOfMastery || null;
        this.show();
        this.isReflectionOpen = true;

        if (this.game && !this.game.multiplayerManager?.connection?.isConnected) {
            this.game.pause(false);
        }
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

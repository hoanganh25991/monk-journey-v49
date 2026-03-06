/**
 * Story Book UI — full-screen chapter reader opened from the Map selector.
 * Shows one chapter at a time with optional image, title, description, and lesson.
 * Navigate with Previous / Next like a book.
 */

import { CHAPTER_QUESTS } from '../config/chapter-quests.js';
import { getChapterQuestDisplay } from '../config/chapter-quests-locales.js';
import { getMapSelectionUiString } from '../config/chapter-quests-locales.js';
import { CHAPTER_STORY_IMAGES } from '../config/chapter-story-images.js';

export class StoryBookUI {
    /**
     * @param {import('../game/Game.js').Game} game - Game instance (for locale)
     */
    constructor(game) {
        this.game = game;
        this.overlay = null;
        this.currentIndex = 0;
        this.onClose = null; // callback when book is closed (e.g. show map again)
    }

    /** @returns {'en'|'vi'} */
    getLocale() {
        return (this.game && this.game.questStoryLocale === 'vi') ? 'vi' : 'en';
    }

    init() {
        this.overlay = document.getElementById('story-book-overlay');
        const closeBtn = document.getElementById('story-book-close-btn');
        const prevBtn = document.getElementById('story-book-prev-btn');
        const nextBtn = document.getElementById('story-book-next-btn');
        const openBtn = document.getElementById('openStoryBookBtn');

        if (!this.overlay) return false;

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevChapter());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextChapter());
        }

        this.overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
            if (e.key === 'ArrowLeft') this.prevChapter();
            if (e.key === 'ArrowRight') this.nextChapter();
        });

        return true;
    }

    show() {
        if (!this.overlay) return;
        this.currentIndex = 0;
        this.updateLabels();
        this.renderChapter();
        this.overlay.style.display = 'flex';
        this.overlay.style.visibility = 'visible';
        this.overlay.setAttribute('aria-hidden', 'false');
        document.getElementById('story-book-close-btn')?.focus();
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.style.display = 'none';
        this.overlay.style.visibility = 'hidden';
        this.overlay.setAttribute('aria-hidden', 'true');
        if (typeof this.onClose === 'function') this.onClose();
    }

    updateLabels() {
        const locale = this.getLocale();
        const titleEl = document.getElementById('story-book-title');
        if (titleEl) titleEl.textContent = getMapSelectionUiString('storyBookTitle', locale);
        const closeBtn = document.getElementById('story-book-close-btn');
        if (closeBtn) closeBtn.title = getMapSelectionUiString('storyCloseBook', locale);
        const prevBtn = document.getElementById('story-book-prev-btn');
        if (prevBtn) {
            prevBtn.textContent = getMapSelectionUiString('storyPrevChapter', locale);
            prevBtn.title = getMapSelectionUiString('storyPrevChapter', locale);
        }
        const nextBtn = document.getElementById('story-book-next-btn');
        if (nextBtn) {
            nextBtn.textContent = getMapSelectionUiString('storyNextChapter', locale);
            nextBtn.title = getMapSelectionUiString('storyNextChapter', locale);
        }
    }

    renderChapter() {
        const locale = this.getLocale();
        const total = CHAPTER_QUESTS.length;
        const quest = CHAPTER_QUESTS[this.currentIndex];
        const display = quest ? getChapterQuestDisplay(quest, locale) : { title: '', description: '', lesson: '', area: '' };

        const labelEl = document.getElementById('story-book-chapter-label');
        if (labelEl) labelEl.textContent = getMapSelectionUiString('storyChapterLabel', locale, { n: this.currentIndex + 1 });

        const titleEl = document.getElementById('story-book-chapter-title');
        if (titleEl) titleEl.textContent = display.title || quest?.title || '';

        const descEl = document.getElementById('story-book-chapter-description');
        if (descEl) descEl.textContent = display.description || quest?.description || '';

        const lessonEl = document.getElementById('story-book-lesson');
        if (lessonEl) lessonEl.textContent = display.lesson ? `"${display.lesson}"` : '';

        const indicatorEl = document.getElementById('story-book-page-indicator');
        if (indicatorEl) indicatorEl.textContent = `${this.currentIndex + 1} / ${total}`;

        const prevBtn = document.getElementById('story-book-prev-btn');
        if (prevBtn) prevBtn.disabled = this.currentIndex <= 0;

        const nextBtn = document.getElementById('story-book-next-btn');
        if (nextBtn) nextBtn.disabled = this.currentIndex >= total - 1;

        // Image: use CHAPTER_STORY_IMAGES or placeholder
        const imgEl = document.getElementById('story-book-chapter-img');
        const placeholderEl = document.getElementById('story-book-image-placeholder');
        const imgUrl = quest && CHAPTER_STORY_IMAGES[quest.id];

        if (imgEl && placeholderEl) {
            if (imgUrl) {
                imgEl.src = imgUrl;
                imgEl.alt = display.title || quest?.title || '';
                imgEl.style.display = 'block';
                imgEl.onerror = () => {
                    imgEl.style.display = 'none';
                    this.showImagePlaceholder(placeholderEl, this.currentIndex + 1);
                };
                placeholderEl.style.display = 'none';
            } else {
                imgEl.style.display = 'none';
                imgEl.removeAttribute('src');
                this.showImagePlaceholder(placeholderEl, this.currentIndex + 1);
            }
        }
    }

    /**
     * @param {HTMLElement} el - placeholder div
     * @param {number} chapterNum - 1-based chapter number
     */
    showImagePlaceholder(el, chapterNum) {
        if (!el) return;
        el.style.display = 'flex';
        el.textContent = `Chapter ${chapterNum}`;
        el.dataset.chapter = String(chapterNum);
    }

    prevChapter() {
        if (this.currentIndex <= 0) return;
        this.currentIndex -= 1;
        this.renderChapter();
    }

    nextChapter() {
        if (this.currentIndex >= CHAPTER_QUESTS.length - 1) return;
        this.currentIndex += 1;
        this.renderChapter();
    }

    isVisible() {
        return this.overlay && this.overlay.style.display === 'flex';
    }
}

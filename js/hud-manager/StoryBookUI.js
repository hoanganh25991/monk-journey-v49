/**
 * Story Book UI — full-screen chapter reader opened from the Map selector.
 * Shows one chapter at a time with optional image, title, description, and lesson.
 * Navigate with Previous / Next like a book.
 */

import { CHAPTER_QUESTS } from '../config/chapter-quests.js';
import { getChapterQuestDisplay, getMapSelectionUiString } from '../config/chapter-quests-vi.js';
import { CHAPTER_STORY_IMAGES } from '../config/chapter-story-images.js';
import { STORAGE_KEYS } from '../config/storage-keys.js';
import { WANG_LIN_STORY_EN_LONG } from '../config/wang-lin-story-en-long.js';
import { WANG_LIN_STORY_VI_LONG } from '../config/wang-lin-story-vi-long.js';

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
        const saveBtn = document.getElementById('story-book-save-btn');
        const prevBtn = document.getElementById('story-book-prev-btn');
        const nextBtn = document.getElementById('story-book-next-btn');

        if (!this.overlay) return false;

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAndClose());
        }
        const chaptersBtn = document.getElementById('story-book-chapters-btn');
        const chaptersPanel = document.getElementById('story-book-chapters-panel');
        if (chaptersBtn && chaptersPanel) {
            chaptersBtn.addEventListener('click', () => this.toggleChaptersPanel());
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevChapter());
            prevBtn.addEventListener('touchend', (e) => { e.preventDefault(); if (!prevBtn.disabled) this.prevChapter(); }, { passive: false });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextChapter());
            nextBtn.addEventListener('touchend', (e) => { e.preventDefault(); if (!nextBtn.disabled) this.nextChapter(); }, { passive: false });
        }

        this.overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.saveAndClose();
            if (e.key === 'ArrowLeft') this.prevChapter();
            if (e.key === 'ArrowRight') this.nextChapter();
        });

        return true;
    }

    show() {
        if (!this.overlay) return;
        this.currentIndex = this.getLastChapterIndex();
        this.updateLabels();
        this.renderChaptersList();
        this.closeChaptersPanel();
        this.renderChapter();
        this.scrollContentToTop();
        this.overlay.style.display = 'flex';
        this.overlay.style.visibility = 'visible';
        this.overlay.setAttribute('aria-hidden', 'false');
        document.getElementById('story-book-save-btn')?.focus();
    }

    /**
     * Save current chapter as last read to storage, then close the book.
     */
    saveAndClose() {
        this.saveLastChapterIndex(this.currentIndex);
        this.hide();
    }

    /** @returns {number} Last saved chapter index (0-based), clamped to valid range. */
    getLastChapterIndex() {
        if (typeof localStorage === 'undefined') return 0;
        const raw = localStorage.getItem(STORAGE_KEYS.STORY_BOOK_LAST_CHAPTER);
        if (raw === null || raw === '') return 0;
        const n = parseInt(raw, 10);
        if (Number.isNaN(n) || n < 0) return 0;
        return Math.min(n, CHAPTER_QUESTS.length - 1);
    }

    /** @param {number} index - 0-based chapter index to store. */
    saveLastChapterIndex(index) {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEYS.STORY_BOOK_LAST_CHAPTER, String(index));
        } catch (e) {
            console.warn('Could not save story book last chapter:', e);
        }
    }

    hide() {
        if (!this.overlay) return;
        const overlay = this.overlay;
        // Move focus to body before aria-hidden so the focused element is not hidden from assistive tech
        if (overlay.contains(document.activeElement)) {
            const body = document.body;
            if (!body.hasAttribute('tabindex')) {
                body.setAttribute('tabindex', '-1');
            }
            body.focus();
        }
        overlay.style.display = 'none';
        overlay.style.visibility = 'hidden';
        // Defer aria-hidden until after focus move is processed (avoids "blocked aria-hidden" a11y warning)
        requestAnimationFrame(() => {
            overlay.setAttribute('aria-hidden', 'true');
        });
        if (typeof this.onClose === 'function') this.onClose();
    }

    updateLabels() {
        const locale = this.getLocale();
        const titleEl = document.getElementById('story-book-title');
        if (titleEl) titleEl.textContent = getMapSelectionUiString('storyBookTitle', locale);
        const saveBtn = document.getElementById('story-book-save-btn');
        if (saveBtn) {
            saveBtn.textContent = getMapSelectionUiString('storySaveBookEmoji', locale);
            saveBtn.title = getMapSelectionUiString('storySaveBook', locale);
            saveBtn.setAttribute('aria-label', getMapSelectionUiString('storySaveBook', locale));
        }
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
        const chaptersBtn = document.getElementById('story-book-chapters-btn');
        if (chaptersBtn) {
            const chaptersLabel = getMapSelectionUiString('storyChaptersBtn', locale);
            chaptersBtn.textContent = '📖';
            chaptersBtn.title = chaptersLabel;
            chaptersBtn.setAttribute('aria-label', chaptersLabel);
        }
        const chaptersPanelTitle = document.getElementById('story-book-chapters-panel-title');
        if (chaptersPanelTitle) {
            chaptersPanelTitle.textContent = getMapSelectionUiString('storyChaptersPanelTitle', locale);
        }
    }

    /** Toggle the chapters (table of contents) panel. */
    toggleChaptersPanel() {
        const panel = document.getElementById('story-book-chapters-panel');
        const btn = document.getElementById('story-book-chapters-btn');
        if (!panel || !btn) return;
        const isOpen = panel.getAttribute('aria-hidden') !== 'true';
        if (isOpen) {
            this.closeChaptersPanel();
        } else {
            this.openChaptersPanel();
        }
    }

    openChaptersPanel() {
        const panel = document.getElementById('story-book-chapters-panel');
        const btn = document.getElementById('story-book-chapters-btn');
        if (panel && btn) {
            this.renderChaptersList(); // refresh so current chapter is highlighted
            panel.style.display = 'block';
            panel.setAttribute('aria-hidden', 'false');
            btn.setAttribute('aria-expanded', 'true');
        }
    }

    closeChaptersPanel() {
        const panel = document.getElementById('story-book-chapters-panel');
        const btn = document.getElementById('story-book-chapters-btn');
        if (panel && btn) {
            panel.style.display = 'none';
            panel.setAttribute('aria-hidden', 'true');
            btn.setAttribute('aria-expanded', 'false');
        }
    }

    /** Build the chapter list (table of contents) with titles; used for jump-to-chapter. */
    renderChaptersList() {
        const listEl = document.getElementById('story-book-chapters-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        const locale = this.getLocale();
        CHAPTER_QUESTS.forEach((quest, index) => {
            const display = getChapterQuestDisplay(quest, locale);
            const title = display.title || display.area || quest?.title || quest?.area || `Chapter ${index + 1}`;
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'story-book-chapter-item' + (index === this.currentIndex ? ' story-book-chapter-item-current' : '');
            item.setAttribute('role', 'listitem');
            item.textContent = `${index + 1}. ${title}`;
            item.addEventListener('click', () => {
                this.currentIndex = index;
                this.renderChapter();
                this.scrollContentToTop();
                this.closeChaptersPanel();
                this.renderChaptersList(); // refresh current highlight
            });
            listEl.appendChild(item);
        });
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

        // Story book body: long content only; fallback = "No long story for this chapter"
        const storyBlock = document.getElementById('story-book-story-block');
        const storyLabelEl = document.getElementById('story-book-story-label');
        const storyEl = document.getElementById('story-book-chapter-story');
        if (storyBlock && storyLabelEl && storyEl) {
            const longEn = WANG_LIN_STORY_EN_LONG && WANG_LIN_STORY_EN_LONG[this.currentIndex];
            const longVi = WANG_LIN_STORY_VI_LONG && WANG_LIN_STORY_VI_LONG[this.currentIndex];
            const storyText = (locale === 'en' ? longEn : longVi) || getMapSelectionUiString('storyNoLongStory', locale);
            storyBlock.style.display = 'block';
            storyLabelEl.textContent = getMapSelectionUiString('storyVuongLamLabel', locale);
            storyEl.textContent = storyText;
        }

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
        this.scrollContentToTop();
    }

    nextChapter() {
        if (this.currentIndex >= CHAPTER_QUESTS.length - 1) return;
        this.currentIndex += 1;
        this.renderChapter();
        this.scrollContentToTop();
    }

    /** Scroll the story book content area back to top (e.g. after changing chapter). */
    scrollContentToTop() {
        const content = this.overlay?.querySelector('.story-book-content');
        if (content) content.scrollTop = 0;
    }

    isVisible() {
        return this.overlay && this.overlay.style.display === 'flex';
    }
}

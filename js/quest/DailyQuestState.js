/**
 * Daily shrine challenge state — 24h reset + streak tracking.
 */

import { STORAGE_KEYS } from '../config/storage-keys.js';
import { getDailyTemplateForDay } from '../config/quests/daily-pool.js';
import { cloneQuestTemplate } from '../config/quests/index.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAILY_SURVIVE_SEC = 30;

/** @returns {string} YYYY-MM-DD local date key */
export function getTodayDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** @param {string} dateKey @returns {number} */
export function dateKeyToDayIndex(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const t = new Date(y, m - 1, d).getTime();
    return Math.floor(t / MS_PER_DAY);
}

/** @param {string} prevKey @param {string} todayKey @returns {boolean} */
export function isConsecutiveDay(prevKey, todayKey) {
    if (!prevKey) return false;
    return dateKeyToDayIndex(todayKey) - dateKeyToDayIndex(prevKey) === 1;
}

export class DailyQuestState {
    constructor() {
        this.lastCompletedDay = null;
        this.streak = 0;
        this.completedToday = false;
        this.lastTemplateId = null;
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.DAILY_QUEST_STATE);
            if (!raw) return;
            const data = JSON.parse(raw);
            this.lastCompletedDay = data.lastCompletedDay || null;
            this.streak = data.streak || 0;
            this.lastTemplateId = data.lastTemplateId || null;
            this.completedToday = this.lastCompletedDay === getTodayDateKey();
        } catch (e) {
            console.debug('DailyQuestState: could not load', e);
        }
    }

    persist() {
        try {
            localStorage.setItem(STORAGE_KEYS.DAILY_QUEST_STATE, JSON.stringify({
                lastCompletedDay: this.lastCompletedDay,
                streak: this.streak,
                lastTemplateId: this.lastTemplateId
            }));
        } catch (e) {
            console.debug('DailyQuestState: could not save', e);
        }
    }

    /** @returns {import('./config/quests/index.js').QuestDefinition} */
    getTemplateForToday() {
        const dayIndex = dateKeyToDayIndex(getTodayDateKey());
        return getDailyTemplateForDay(dayIndex);
    }

    markCompleted(templateId) {
        const today = getTodayDateKey();
        if (this.lastCompletedDay === today) {
            this.completedToday = true;
            return;
        }
        if (isConsecutiveDay(this.lastCompletedDay, today)) {
            this.streak += 1;
        } else {
            this.streak = 1;
        }
        this.lastCompletedDay = today;
        this.lastTemplateId = templateId;
        this.completedToday = true;
        this.persist();
    }

    refreshTodayFlag() {
        this.completedToday = this.lastCompletedDay === getTodayDateKey();
    }

    /** @param {import('./config/quests/index.js').QuestDefinition} template */
    createActiveDailyQuest(template) {
        const quest = cloneQuestTemplate(template);
        quest.id = `daily_${getTodayDateKey()}_${template.id}`;
        quest.category = 'daily';
        quest._dailyTemplateId = template.id;
        if (quest.objective.type === 'survive') {
            quest.objective.target = 'daily';
            quest._surviveElapsed = 0;
            quest._surviveFailed = false;
        }
        if (quest.objective.type === 'explore') {
            quest.objective.discovered = [];
        }
        return quest;
    }

    getStreakBonusGold() {
        if (this.streak >= 7) return 150;
        if (this.streak >= 3) return 50;
        return 0;
    }

    toJSON() {
        return {
            lastCompletedDay: this.lastCompletedDay,
            streak: this.streak,
            lastTemplateId: this.lastTemplateId
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.lastCompletedDay = data.lastCompletedDay || null;
        this.streak = data.streak || 0;
        this.lastTemplateId = data.lastTemplateId || null;
        this.refreshTodayFlag();
    }
}

export { DAILY_SURVIVE_SEC };

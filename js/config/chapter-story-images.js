/**
 * Optional image URL per chapter for the Story book reader (Wang Lin story).
 * Keys are chapter quest ids (e.g. 'chapter_1_restless_village').
 * Each chapter maps to one line in wang-lin-story-vi-long.js; images can be generated via MCP openrouter-image.
 * If the asset is missing, the book shows a placeholder (gradient + chapter number).
 *
 * @type {Record<string, string>}
 */
import { CHAPTER_QUESTS } from './chapter-quests.js';

export const CHAPTER_STORY_IMAGES = Object.fromEntries(
    CHAPTER_QUESTS.map((q, i) => [q.id, `assets/story/chapter-${i + 1}.png`])
);

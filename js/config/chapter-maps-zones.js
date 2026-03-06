/**
 * Map ids and their zone keys for chapter quests. Shared by chapter-quests (to build objectives from map enemies)
 * and chapter-quest-maps (to resolve map/zone for UI and next-map instructions). No dependency on chapter-quests.
 */
import { ZONE_ENEMIES } from './game-balance.js';

/** Order of map ids for chapter round-robin (chapter 1 → [0], chapter 2 → [1], …). */
export const MAP_IDS_ROUND_ROBIN = [
  'default', 'terrant', 'forest', 'desert', 'mountains', 'swamp', 'magical', 'mixed',
  'highland-vale', 'ember-wastes', 'whisper-woods', 'crimson-bog', 'sky-prairie', 'veil-garden',
  'frost-hollow', 'sand-shrine', 'thorn-marsh', 'eldritch-grove',
];

/** Map id → ZONE_ENEMIES key. Determines which enemy types spawn on that map. */
export const MAP_ID_TO_ZONE_KEY = {
  'default': 'forest',
  'terrant': 'forest',
  'forest': 'forest',
  'whisper-woods': 'forest',
  'desert': 'ruins',
  'ember-wastes': 'ruins',
  'sand-shrine': 'ruins',
  'mountains': 'mountains',
  'highland-vale': 'mountains',
  'frost-hollow': 'mountains',
  'swamp': 'swamp',
  'crimson-bog': 'swamp',
  'thorn-marsh': 'swamp',
  'magical': 'dark_sanctum',
  'veil-garden': 'dark_sanctum',
  'eldritch-grove': 'dark_sanctum',
  'mixed': 'forest',
  'sky-prairie': 'forest',
};

/**
 * Get enemy types that can spawn on a map (by map id).
 * @param {string} mapId
 * @returns {string[]}
 */
export function getEnemyTypesForMapId(mapId) {
  const zoneKey = MAP_ID_TO_ZONE_KEY[mapId] ?? 'forest';
  const types = ZONE_ENEMIES[zoneKey];
  return Array.isArray(types) ? [...types] : [];
}

/**
 * Get enemy types for a chapter by its 0-based index in the chapter list.
 * @param {number} chapterIndex - 0-based (chapter 1 → 0, chapter 2 → 1, …)
 * @returns {string[]}
 */
export function getEnemyTypesForChapterIndex(chapterIndex) {
  const mapId = MAP_IDS_ROUND_ROBIN[chapterIndex % MAP_IDS_ROUND_ROBIN.length];
  return getEnemyTypesForMapId(mapId);
}

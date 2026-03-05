# Implementation Plan: 100 Chapters (Buddha Life Lessons) + Map Support

## Goal

- Extend the story from **5 chapters** to **up to 100 chapters**, each with a **Buddha-inspired life lesson** and a short story about helping others and gaining wisdom along the journey.
- Keep **maps** aligned with chapters: each chapter is played on a specific map; the Map Selection UI shows the **chapter area name** (second line) for maps that host chapter quests.
- If there are not enough maps or maps don’t fit the chapter theme, support **smaller map size** (faster load) and **chapter metadata on maps** (e.g. “Chapters 1, 7, 13…”).

---

## 1. Data: Chapter Quests (up to 100)

### 1.1 Source of truth: `js/config/chapter-quests.js`

- Each chapter is a **ChapterQuest**: `id`, `title`, `description`, `lesson`, `area`, `position`, `objectives`, `boss`, `rewards`, `nextQuestId`.
- **Lessons** are kid/teen-friendly life lessons (Buddhist-inspired): anger, fear, gratitude, connection, self-mastery, compassion, patience, letting go, mindfulness, etc.
- **Bosses** reuse existing types: `skeleton_king`, `demon_lord`, `golden_titan`, `echo_phantom`, `shadow_self`, `swamp_horror`, `frost_titan`, `necromancer_lord` (cycle by theme).
- **Position**: used for quest marker on the map; can be derived from chapter index when using a single large map, or per-map spawn when each chapter has its own map.
- **Chapters 1–5**: keep existing entries.
- **Chapters 6–100**: add new entries with unique `id` (e.g. `chapter_6_...`), unique `title` / `description` / `lesson` / `area`, and `nextQuestId` chain; last chapter has `nextQuestId: null` (unlocks Path of Mastery or next arc).

### 1.2 Locales: `js/config/chapter-quests-locales.js`

- **EN**: full strings for all 100 chapters (`title`, `description`, `lesson`, `area`, `bossName`) in `CHAPTER_QUEST_TEXTS.en`.
- **VI**: same structure in `CHAPTER_QUEST_TEXTS.vi`; can be filled incrementally (fallback to EN when missing).
- **MapSelectionUI** and all quest/reflection UIs use `getChapterQuestDisplay(quest, game.questStoryLocale)` so the **second line** under the map name is the localized **area** for that map’s chapter(s).

---

## 2. How Maps Support Chapters

### 2.1 Mapping chapters to maps: `js/config/chapter-quest-maps.js`

- **CHAPTER_QUEST_MAPS** is an array of `{ mapId, chapterQuestId }` in **story order**.
- One **mapId** can appear **multiple times** (one entry per chapter on that map). Example: `default` for chapters 1, 7, 13, …; `forest` for 2, 8, 14, ….
- **MapSelectionUI** (`js/hud-manager/MapSelectionUI.js`):
  - `getChapterAreaForMap(mapId)` returns the **first** chapter area for that map (from `CHAPTER_QUESTS` via `CHAPTER_QUEST_MAPS`). So the **second line** under the map name shows that area (e.g. “Forest of Doubt” for `forest`).
  - If a map hosts **multiple chapters**, the UI can be extended later to show “Chapters: 1, 7, 13” or the first chapter area only; current behavior is “one area per map” for the subtitle.
- **Quest flow**: when the player completes a chapter, “Travel to [Map Name] to get your next quest” uses `getNextStoryMapAfter()` so the next chapter’s map and area name are correct.

### 2.2 Map count vs 100 chapters

- **Current maps** (from `scripts/generate-maps.js` + `maps/index.json`): **default**, **terrant**, **forest**, **desert**, **mountains**, **swamp**, **magical**, **mixed**, plus **10 extra** (highland-vale, ember-wastes, whisper-woods, crimson-bog, sky-prairie, veil-garden, frost-hollow, sand-shrine, thorn-marsh, eldritch-grove) → **18 maps**.
- **Strategy**: assign chapters **round-robin** (or by theme) so each map hosts several chapters (e.g. 100 ÷ 18 ≈ 5–6 chapters per map). No need for 100 distinct maps.

### 2.3 When maps are not enough or don’t fit

- **Option A – Reuse and theme**: Keep 18 maps; assign chapters by theme (e.g. “anger” chapters on default/village-style, “fear” in forest, “greed” in mountains). Multiple chapters per map; quest marker position can vary by chapter (from `position` in each ChapterQuest).
- **Option B – Reduce map size**: In **`scripts/generate-maps.js`**, reduce `DEFAULT_MAP_SIZE` or per-map size (e.g. 600×600 for chapter-only maps) so load time and object count are lower. Regenerate with `node scripts/generate-maps.js`.
- **Option C – Chapter on top of map**: In **`scripts/generate-maps.js`** and **`maps/index.json`** (manifest), add an optional **`chapters`** array to each map entry (e.g. `"chapters": [1, 7, 13]`). The Map Selection UI can show “Chapters 1, 7, 13” or the first chapter’s area name. This does **not** require one map per chapter; it only adds metadata for display/filtering.

---

## 3. Changes to `scripts/generate-maps.js`

### 3.1 Optional smaller size for chapter maps

- **Default world** size is configurable: set env **`CHAPTER_MAP_SIZE`** (e.g. `CHAPTER_MAP_SIZE=600 node scripts/generate-maps.js`) to generate a smaller default map (fewer structures/environment, faster load). If unset, `DEFAULT_MAP_SIZE` (1200×1200) is used.
- Single-zone and extra maps keep their current size (800×800); only the default map is affected by `CHAPTER_MAP_SIZE`.

### 3.2 Optional chapter metadata in manifest

- When writing **`maps/index.json`**, if **`scripts/map-chapters.json`** exists, `generate-maps.js` merges a **`chapters`** array (e.g. `[1, 19, 37]`) into each manifest entry by `mapId`. Format: array of `{ mapId, chapters: [number] }` or an object `{ "default": [1, 19, 37], ... }`. The Map Selection UI can then show “Chapters: 1, 19, 37” as a second line or tooltip. To generate this file from game data, run a one-off script that imports `CHAPTER_QUEST_MAPS` and groups by `mapId`.

---

## 4. MapSelectionUI: second line = chapter area

- **Current behavior**: `getChapterAreaForMap(mapId)` finds the **first** `chapterQuestId` for that `mapId` in `CHAPTER_QUEST_MAPS`, then returns `quest.area` from `CHAPTER_QUESTS`. The second line under the map name is this **area** (localized via `getChapterQuestDisplay` if the UI uses it; currently the list uses `quest?.area`).
- **With 100 chapters**: same logic; area comes from `chapter-quests.js` (and locales). If a map has multiple chapters, the first chapter’s area is shown. Optional: show “Ch. 1, 7, 13” from manifest `chapters` if present.

---

## 5. File checklist

| Step | File | Action |
|------|------|--------|
| 1 | `implementation-plan-100-chapters-maps.md` | This plan (done) |
| 2 | `js/config/chapter-quests.js` | Add chapters 6–100 (Buddha life lessons, chain nextQuestId) |
| 3 | `js/config/chapter-quests-locales.js` | Add EN (and VI as needed) for chapters 6–100 |
| 4 | `js/config/chapter-quest-maps.js` | Assign each of 100 chapters to a map (round-robin or by theme) |
| 5 | `js/hud-manager/MapSelectionUI.js` | No change if area comes from CHAPTER_QUESTS; optional: show manifest `chapters` |
| 6 | `scripts/generate-maps.js` | Optional: smaller CHAPTER_MAP_SIZE; optional: write `chapters` into manifest from config |

---

## 6. Summary

- **Chapters**: 100 story chapters in `chapter-quests.js` with Buddha life lessons; locales in `chapter-quests-locales.js`.
- **Maps**: 18 maps host multiple chapters each; `chapter-quest-maps.js` maps each chapter to a mapId; MapSelectionUI shows the chapter **area** (second line) from `CHAPTER_QUESTS` for that map.
- **If not enough or wrong map feel**: use smaller map size in `generate-maps.js` and/or add **chapter metadata** (`chapters: [1,7,13]`) to the map manifest for display and filtering.

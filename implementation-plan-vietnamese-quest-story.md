# Implementation Plan: Vietnamese for Quest & Story + Language Toggle (Settings > Game)

## Goal

- Add **Vietnamese** translations for quest and story content (chapter titles, descriptions, lessons, area names, boss names).
- Add a **language toggle** in **Settings > Game**: flag-style control **EN / VI**, default **EN**.
- Persist the choice and use it everywhere quest/story text is shown.

---

## 1. Data: Quest & Story Strings (EN + VI)

### 1.1 Locale-aware chapter quest data

**Option A (recommended):** Keep `chapter-quests.js` as the single source of truth but add a parallel structure for Vietnamese.

- Add a new file **`js/config/chapter-quests-locales.js`** that exports:
  - `CHAPTER_QUEST_TEXTS = { en: { ... }, vi: { ... } }`
  - Each locale key holds objects by quest `id` with: `title`, `description`, `lesson`, `area`, `bossName` (and optionally `chapterTitle` for "Chapter N — Area").
- Keep **`chapter-quests.js`** as-is for structure (id, objectives, boss.enemyType, rewards, nextQuestId). It can keep EN as the default field values for backward compatibility, but **consumers should always resolve text via the locale module** (see below).

**Option B:** Add `titleVi`, `descriptionVi`, etc., next to each quest in `chapter-quests.js`. Simpler but clutters the file; Option A scales better if you add more locales later.

### 1.2 Helper: get localized quest/story text

- In **`chapter-quests-locales.js`** (or a small **`js/config/quest-locale.js`**), expose:
  - `getChapterQuestText(questId, locale, key)` → returns string for `title` | `description` | `lesson` | `area` | `bossName`.
  - `getChapterQuestDisplay(quest, locale)` → returns `{ title, description, lesson, area, bossName }` for a given chapter quest object and locale (fallback to `en` if `vi` missing).
- Default `locale` when not provided: `'en'`.

### 1.3 Vietnamese copy

- Add full VI translations for all 5 chapters in `chapter-quests-locales.js` (or equivalent):
  - Chapter 1: The Restless Village / Rage Beast, etc.
  - Chapter 2: Forest of Doubt / Doubt Serpent
  - Chapter 3: Mountain of Desire / Golden Titan
  - Chapter 4: Desert of Loneliness / Echo Phantom
  - Chapter 5: Inner Temple / Shadow Self
- Include life lessons (e.g. "Anger burns the one who carries it." → Vietnamese equivalent).

---

## 2. Settings: Language Toggle in Settings > Game

### 2.1 Storage and game state

- **`js/config/storage-keys.js`**: add  
  `QUEST_STORY_LOCALE: 'monk_journey_quest_story_locale'`  
  (or `LOCALE` if you prefer a single future locale key for the whole game).
- **`Game.js`**: add `this.questStoryLocale = 'en'` (or `this.locale`). In **`loadInitialSettings()`**, load from storage:  
  `questStoryLocale = await storageService.loadData(STORAGE_KEYS.QUEST_STORY_LOCALE)`  
  and set `this.questStoryLocale = questStoryLocale === 'vi' ? 'vi' : 'en'` (default EN).
- **`SettingsSerializer`**: in `serialize(game)`, add `questStoryLocale: game.questStoryLocale || 'en'`. In `deserialize(game, settings)`, set `game.questStoryLocale = settings.questStoryLocale === 'vi' ? 'vi' : 'en'` so save/load preserves language.

### 2.2 UI: Game tab — flag toggle EN / VI

- **`index.html`** (inside the Game Settings tab, e.g. after Performance Profile or after Difficulty):
  - Add a **setting item** "Quest & Story Language" (or "Language"):
    - Label: e.g. "Quest & Story Language"
    - Control: **two flag-style buttons** (EN / VI), or a segmented control showing "🇬🇧 EN" and "🇻🇳 VI" (or similar). One is selected at a time; default selection = EN.
  - Give the container and buttons stable IDs, e.g. `quest-locale-container`, `quest-locale-en`, `quest-locale-vi`.

- **`GameplayTab.js`**:
  - In `init()` (or a dedicated `initializeQuestLocaleSettings()`), read current value from `this.loadSettingSync(STORAGE_KEYS.QUEST_STORY_LOCALE, 'en')` and set the active state of EN/VI buttons.
  - On EN click: save `'en'`, update `game.questStoryLocale = 'en'`, refresh any in-game quest/story UI if the menu is open while playing.
  - On VI click: save `'vi'`, update `game.questStoryLocale = 'vi'`, same refresh.
  - In `saveSettings()`, persist `game.questStoryLocale` (and optionally write to storage again for consistency with `loadInitialSettings`).
  - In `handleStorageUpdate()`, if key is `QUEST_STORY_LOCALE`, update the toggle state and `game.questStoryLocale`.

### 2.3 Default

- Default is **EN**: storage has no value or invalid value → use `'en'`.

---

## 3. Use locale everywhere quest/story text is shown

### 3.1 QuestManager

- When building the **chapter title** for the reflection screen (e.g. `Chapter ${chapterNum} — ${quest.area}`), use `getChapterQuestDisplay(quest, this.game.questStoryLocale)` and use the returned `area` (and optionally a preformatted `chapterTitle` if you add it in locales).
- When calling **`showReflectionScreen(quest.lesson, ...)`**, pass the localized lesson: e.g. `getChapterQuestText(quest.id, this.game.questStoryLocale, 'lesson')` or from `getChapterQuestDisplay(..., 'lesson')`.
- When showing **next quest dialog** (`New Quest: ${nextChapter.title}` / description), use localized `title` and `description` from `getChapterQuestDisplay(nextChapter, this.game.questStoryLocale)`.

### 3.2 QuestLogUI

- When rendering active quests, for each quest that is a chapter quest (e.g. has `quest.id` in chapter-quests), get display strings from `getChapterQuestDisplay(quest, this.game.questStoryLocale)`. Use those for `name`/`title`, `area`, `description` in the template. For non-chapter quests, keep current behavior (quest.title / quest.name, etc.).
- Optionally localize the static strings "No active quests", "Complete the objective", "Kill X/Y enemies", "Defeat boss X/Y" via a small UI-strings map (en/vi) keyed by `game.questStoryLocale`; can be done in a follow-up.

### 3.3 ReflectionUI

- The **lesson** and **chapter title** are passed in from QuestManager; once QuestManager uses the locale helper, no change needed in ReflectionUI for those.
- Optional: localize button labels "Continue Journey" and "Enter Path of Mastery" with a simple strings map by `game.questStoryLocale` so the reflection screen is fully localized.

### 3.4 GameMenu (completed chapters list)

- Where it builds the list of completed chapters (e.g. `area` and `lesson`), use the same locale: `getChapterQuestDisplay(q, this.game.questStoryLocale)` so the summary shows in the selected language.

### 3.5 Other places

- Any other UI that shows `quest.title`, `quest.description`, `quest.lesson`, `quest.area`, or `quest.boss.name` for chapter quests should go through the locale helper with `game.questStoryLocale`.

---

## 4. File checklist

| Step | File | Action |
|------|------|--------|
| 1 | `js/config/storage-keys.js` | Add `QUEST_STORY_LOCALE`. |
| 2 | `js/config/chapter-quests-locales.js` (new) | Add EN/VI objects and `getChapterQuestText` / `getChapterQuestDisplay`. |
| 3 | `js/game/Game.js` | Add `questStoryLocale`, load in `loadInitialSettings()`. |
| 4 | `js/save-manager/serializers/SettingsSerializer.js` | Serialize/deserialize `questStoryLocale`. |
| 5 | `index.html` | Add "Quest & Story Language" row with EN/VI flag toggle in Game tab. |
| 6 | `js/menu-system/settings-menu/GameplayTab.js` | Wire toggle, load/save locale, update `game.questStoryLocale`. |
| 7 | `js/QuestManager.js` | Use locale helper for reflection lesson/title and next-quest dialog. |
| 8 | `js/hud-manager/QuestLogUI.js` | Use locale helper for chapter quest title/area/description. |
| 9 | (Optional) `js/hud-manager/ReflectionUI.js` | Localize "Continue Journey" / "Enter Path of Mastery". |
| 10 | (Optional) `js/menu-system/GameMenu.js` | Use locale for completed chapters list. |

---

## 5. Summary

- **Data:** New `chapter-quests-locales.js` with EN/VI strings and helpers `getChapterQuestText` / `getChapterQuestDisplay`.
- **Settings:** New key `QUEST_STORY_LOCALE`; Game and SettingsSerializer persist `questStoryLocale`; default EN.
- **UI:** Settings > Game → "Quest & Story Language" with **EN / VI** flag toggle.
- **Usage:** QuestManager, QuestLogUI (and optionally ReflectionUI, GameMenu) resolve all quest/story text through the locale helper using `game.questStoryLocale`.

This keeps the toggle in one place (Settings > Game), uses a single default (EN), and makes it straightforward to add more languages later by extending the locales file and the toggle (e.g. dropdown or more flags).

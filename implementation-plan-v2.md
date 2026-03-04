# Monk Journey — Implementation Plan v2

This document evaluates the **4 recent commits** against **IMPLEMENTATION_PLAN.md** and the GDD themes in **quest.md**, then adds concrete steps for what is still missing: **help content for quests**, **how to interact with quests**, **story visibility**, and **life-lesson framing** (monk, journey to happiness, peace).

---

## 1. Assessment: 4 Recent Commits vs Plan

### What the 4 recent commits delivered

| Commit   | Scope |
|----------|--------|
| **a7c6e6e** | GDD item slots (Weapon, Robe, Prayer Beads, Talisman, Relic), inventory/serializer updates. |
| **aec40a9** | Design docs: `quest.md`, chapter docs, systems (quest, progression, reflection, skill tree, items, music, combat). |
| **790faca** | Major implementation: chapter quests, reflection UI, QuestManager chapter flow, skill tree graph, XP/attributes, Native Monk model, camera sensitivity, inventory/items UX, audio layers, PoM + Shadow Self, save serialization for quests/settings. |
| **4dba9f9** | Polish: item popup, inventory tooltips, monk model selection, sounds/music mood, IMPLEMENTATION_PLAN edits. |

**Verdict:** The implementation is **largely aligned** with IMPLEMENTATION_PLAN.md (Phases 1–7 mostly done). Gaps are not in “did we build the systems” but in **player-facing clarity**: help, onboarding, story framing, and “journey to peace” messaging.

---

## 2. Gap Analysis: Your Questions

### 2.1 “Is there help content for quest?”

**Current state:**

- **No dedicated Help/Guide** in the app. No “How to play”, “What are quests?”, or “How do I start the story?”.
- **Quest flow exists in code:** Chapter quests are in `chapter-quests.js`; `QuestManager.checkForAvailableQuests()` can show a dialog with title + description + “Would you like to accept?”. But:
  - **`checkForAvailableQuests()` is never called** on game start (new or load). So the **first chapter quest is never offered** automatically.
  - **Dialog does not support “Accept”:** `HUDManager.showDialog(title, text)` and `DialogUI.showDialog(title, text)` only take two arguments. QuestManager passes a third argument (callback to `startQuest`), but it is **ignored**; clicking the dialog only closes it and does not start the quest.
- **Quest log** shows “Active Quests” and objectives (e.g. “Kill 0/3 enemies”, “Defeat boss 0/1”) but there is no in-UI explanation of *how* you get quests (interact with objects, or in the future: auto-offer on start).

**Conclusion:** There is **no real help content for quests**, and the existing “offer quest” path is **broken** (no trigger on start, no Accept action).

---

### 2.2 “How can I interact with quest?”

**Current state:**

- **World interactions:** `InteractionResultHandler` supports `result.type === 'quest'` and `result.type === 'boss_spawn'`. So **level data** can place interactive objects that grant a quest or trigger a boss spawn; when the player interacts, `startQuest(result.quest)` or boss spawn runs.
- **No automatic story offer:** There is no “talk to NPC” or “quest board” in the current flow. The only way to get the **chapter story quest** in code is via `checkForAvailableQuests()` (which is never called), or by interacting with a world object that returns a quest result.
- **Accept flow broken:** As above, the dialog that says “Would you like to accept this quest?” does not have an Accept button or callback; the third argument to `showDialog` is dropped.

**Conclusion:** You *can* interact with quests **only** through world objects (if levels define them). There is **no in-game explanation** of this, and **no automatic offer** of the first chapter quest when starting or loading a game.

---

### 2.3 “What is the story throughout the game?”

**Current state:**

- **Story is in data and design:** `chapter-quests.js` defines the 5-chapter arc (Restless Village → Forest of Doubt → Mountain of Desire → Desert of Loneliness → Inner Temple) with descriptions and life lessons. Design docs describe the narrative.
- **In-game visibility is weak:**
  - The **quest log** shows active quest title + objectives but not the full **description** (narrative) or **area** in a dedicated story panel.
  - There is **no “Story” or “Journal”** screen that summarizes “You are a monk on a journey to restore harmony; you’ve completed Ch1 (Anger), Ch2 (Fear)…”.
  - **Reflection screen** shows the life lesson quote and “Continue Journey” (and “Enter Path of Mastery” after Ch5), but there is no short recap like “Chapter 1 — The Restless Village” so the arc is not explicitly stated after each chapter.

**Conclusion:** The **story exists in content** but is **not clearly surfaced** as a continuous “story throughout the game” in the UI (no story recap, no journal, limited narrative in quest log).

---

### 2.4 “What lesson of life / monk / journey to happiness / peace?”

**Current state:**

- **Reflection screen** shows the **life lesson quote** (e.g. “Anger burns the one who carries it.”) and “Continue Journey”, which matches the GDD.
- **Chapter quest descriptions** in config are kid/teen-friendly and theme anger, fear, gratitude, connection, self-mastery.
- **Missing:**
  - **No overarching framing** in the app (e.g. a short “Monk Journey” blurb on first launch or in a Help screen: “A peaceful monk travels the world restoring harmony; each chapter teaches a lesson.”).
  - **readme.md** and store text focus on “action RPG”, “martial arts”, “conquer” rather than “journey to happiness/peace” and “life lessons”.
  - No **menu or intro text** that states the emotional goals (calm, growth, reflection, meaningful progression) or “journey to peace”.

**Conclusion:** **Per-chapter lessons** are implemented; the **overall “monk journey to happiness/peace”** is not clearly stated in the game or in public-facing copy.

---

## 3. Implementation Plan v2 — New and Updated Steps

Use this in addition to **IMPLEMENTATION_PLAN.md**. Order below is recommended; dependencies are noted.

---

### Phase 8 — Quest offer and dialog (fix + trigger)

| Step | Action | Priority |
|------|--------|----------|
| **8.1** | **Dialog Accept callback:** Extend `DialogUI.showDialog(title, text, onAccept)` and `HUDManager.showDialog(title, text, onAccept)`. When `onAccept` is provided, show an “Accept” (or “Continue”) button that calls `onAccept()` then closes the dialog; otherwise keep current “Click to continue” behavior. Update all QuestManager `showDialog(..., () => this.startQuest(...))` so the callback is passed and used. | P0 |
| **8.2** | **Offer first chapter quest on game start:** After the game is revealed and unpaused (e.g. in the same place where `this.hudManager.showAllUI()` and `this.resume()` run in `Game.js`), call `this.questManager.checkForAvailableQuests()` once. On **new game** this offers Chapter 1; on **load** it offers the next chapter if none is active. Ensure this runs only once per start (e.g. a “hasOfferedQuestThisSession” or “after first reveal” flag). | P0 |
| **8.3** | **(Optional) Decline/remind:** If the player closes the dialog without accepting, consider a short reminder later (e.g. “A story quest is available. Look for the quest log on the left.”) or leave as-is. | P2 |

---

### Phase 9 — Help and onboarding

| Step | Action | Priority |
|------|--------|----------|
| **9.1** | **Help / How to play:** Add a “Help” or “How to play” entry (e.g. in the main menu or Settings). Content: controls (WASD, skills, camera), **how to get quests** (“Accept the story quest when offered at the start, or find interactive objects in the world”), **what the quest log is** (left panel, shows current objectives), **boss and reflection** (“Defeat the chapter boss, then read the lesson and tap Continue Journey”). | P0 |
| **9.2** | **First-time hint (optional):** On first play, after the first quest is offered (or when no quest is active), show a one-time tooltip or line: “Your journey: complete objectives in the quest log, then face the chapter boss.” | P1 |

---

### Phase 10 — Story visibility and “journey” framing

| Step | Action | Priority |
|------|--------|----------|
| **10.1** | **Quest log shows description:** In QuestLogUI, when the active quest is a chapter quest, show not only title and objectives but a short **description** (narrative) or **area** (e.g. “The Restless Village”) so the story is visible without opening another screen. | P0 |
| **10.2** | **Reflection screen chapter title:** When showing the reflection screen, display the **chapter title** (e.g. “Chapter 1 — The Restless Village”) above or below the life lesson quote so the arc is explicit. | P1 |
| **10.3** | **Story / Journal (optional):** Add a “Story” or “Journal” panel (menu or HUD) that lists completed chapters and their lessons, and the next chapter if any. Text: e.g. “You are a monk restoring harmony. Completed: The Restless Village (Anger), Forest of Doubt (Fear)… Next: Mountain of Desire.” | P1 |
| **10.4** | **Overarching message:** Add a short “Monk Journey” message in one or more of: first launch (one-time), Help screen, or main menu. Example: “A peaceful monk travels a fragmented world, facing inner struggles—anger, fear, greed, loneliness—to restore harmony and find peace.” Align with quest.md §1 (Core Philosophy). | P1 |

---

### Phase 11 — Life lessons and “journey to peace” in copy

| Step | Action | Priority |
|------|--------|----------|
| **11.1** | **In-game tone:** Keep and, where needed, expand chapter quest descriptions and reflection quotes so they clearly tie to **growth, harmony, and peace** (already partially done in chapter-quests.js; ensure any new UI text matches). | P1 |
| **11.2** | **readme / store (optional):** Optionally add a line in readme and store description: e.g. “Each chapter ends with a moment of reflection and a life lesson—a journey not only of strength but of peace and understanding.” This supports “lesson of life” and “journey to happiness/peace” for players and store visitors. | P2 |

---

## 4. File Checklist (Plan v2)

| Action | File(s) |
|--------|--------|
| Dialog Accept callback | `js/hud-manager/DialogUI.js`, `js/hud-manager/HUDManager.js`, `index.html` (dialog markup if you add Accept button) |
| Offer quest on start | `js/game/Game.js` (after reveal/unpause), optionally `js/save-manager/SaveManager.js` (load path) |
| Help content | New or existing menu: e.g. `index.html` (Help section), `js/menu-system/` or `js/hud-manager/` (Help panel), optional `docs/help.md` or in-code strings |
| Quest log description / area | `js/hud-manager/QuestLogUI.js`, `css/` for quest log |
| Reflection chapter title | `js/hud-manager/ReflectionUI.js`, `css/reflection-screen.css` |
| Story / Journal | New component or panel, e.g. `js/hud-manager/StoryPanelUI.js` + HTML/CSS |
| Overarching message | Wherever first launch or Help text lives; optionally main menu HTML |

---

## 5. Summary

- **Implementation of the 4 recent commits** is **good enough** for the systems in IMPLEMENTATION_PLAN.md (chapter quests, reflection, progression, skill tree, items, music, PoM, Shadow Self, polish).
- It is **not yet enough** for:
  - **Help content for quest:** Add Phase 9 (Help / How to play) and fix Phase 8 (dialog + offer on start).
  - **How to interact with quest:** Fix Phase 8 (Accept button + call `checkForAvailableQuests()` on start); document in Help (Phase 9).
  - **Story throughout the game:** Add Phase 10 (quest log description, reflection chapter title, optional Story/Journal and overarching message).
  - **Life lessons and “monk, journey to happiness, peace”:** Phase 10.4 and Phase 11 (in-game framing + optional readme/store line).

**implementation-plan-v2.md** gives concrete steps (Phases 8–11) to close these gaps without changing the existing architecture.

---

## 6. Implementation status (Phases 8–11)

| Phase | Step | Status | Notes |
|-------|------|--------|--------|
| **8** | 8.1 Dialog Accept callback | ✅ Done | `DialogUI` / `HUDManager` support `onAccept`; quest dialog shows Accept button and starts quest on click. |
| **8** | 8.2 Offer quest on game start | ✅ Done | `checkForAvailableQuests()` called after reveal (both reveal animation path and warmup path in `Game.js`); `_hasOfferedQuestThisSession` ensures once per start. |
| **8** | 8.3 Decline/remind | ⏭ Optional P2 | Not implemented; leave as-is per plan. |
| **9** | 9.1 Help / How to play | ✅ Done | Main menu **Help** opens modal with intro, Controls, Quests, Quest log, After each chapter (`index.html` #help-modal). |
| **9** | 9.2 First-time hint | ✅ Done | One-time notification when player accepts first chapter quest: "Your journey: complete the objectives in the quest log, then face the chapter boss." (`QuestManager.startQuest` + `Game._hasShownQuestHintThisSession`). |
| **10** | 10.1 Quest log description/area | ✅ Done | `QuestLogUI` shows `quest.area` and `quest.description` for each active quest (`quest-area-desc`). |
| **10** | 10.2 Reflection chapter title | ✅ Done | `ReflectionUI` shows `options.chapterTitle` (e.g. "Chapter 1 — The Restless Village"); `QuestManager.completeQuest` passes it. |
| **10** | 10.3 Story / Journal | ✅ Done | Main menu **Story** opens "Your Journey" modal with completed chapters + lessons and next chapter (`GameMenu.showStoryModal`). |
| **10** | 10.4 Overarching message | ✅ Done | Help modal intro: "A peaceful monk travels a fragmented world, facing inner struggles—anger, fear, greed, loneliness—to restore harmony and find peace." |
| **11** | 11.1 In-game tone | ✅ Done | Chapter quests and reflection quotes in `chapter-quests.js` and UI align with growth, harmony, peace. |
| **11** | 11.2 readme / store | ✅ Done | README Overview already includes: "Each chapter ends with a moment of reflection and a life lesson—a journey not only of strength but of peace and understanding." |

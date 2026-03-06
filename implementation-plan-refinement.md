# Monk Journey — Refinement Plan: Polish to Match Expectations

This document does a **deep check** against the existing implementation plans and provides a **refinement plan** so the game: **tells the story**, **teaches the lesson**, and feels **relaxing to play**. The **quest** is the main vehicle: curiosity on the question, curiosity on the choice, then the lesson—**not** a fixed linear path. Sound should support **frequency-based relaxation** (curved, healthy, calming) using **public online** assets where possible.

---

## 1. Deep Check vs Existing Plans

### 1.1 implementation-plan.md (Phases 1–7)

| Area | Plan expectation | Current state | Refinement needed |
|------|------------------|---------------|-------------------|
| **Story quests** | 5 (then 100) chapters, narrative, lesson, boss | ✅ Data + flow in place | **Polish:** Story *feels* like a journey; quest flow should support **open choices** (see §3). |
| **Reflection** | Fade, life lesson, "Continue Journey" | ✅ ReflectionUI, chapter title | **Polish:** Optional short **question** before lesson ("What did you notice?") to create curiosity. |
| **Progression / attributes** | GDD formula, 5 attributes, allocation | ✅ Done | Optional: one-line hint linking level-up to "growth on the path." |
| **Skill tree** | Graph, Body/Mind/Harmony, Enlightenment after Ch5 | ✅ Done | 7.8 skill tree UX still optional. |
| **Quest object** | objectives[], lesson, area, boss, rewards | ✅ Chapter quests use it | **Refinement done:** Optional `group` and `requireChoiceGroupsAtLeast` support "at least N of M" objectives; `nextQuestIds` supports branching. UI for choice callouts (R-Q3) deferred. |
| **Music** | Exploration / combat / boss, 1.5s crossfade | ✅ Layers exist | **Refinement done:** Dedicated **relaxation/frequency** track (432 Hz) and exploration → relaxationTheme; see §2. |
| **Help / onboarding** | (v2) | ✅ Phase 8–9 done | Keep; ensure Help mentions "choices in the journey" when we add them. |

**Verdict:** Systems are implemented; refinement is about **quest openness**, **story/lesson curiosity**, and **relaxation sound**.

---

### 1.2 implementation-plan-v2.md (Phases 8–11)

| Step | Expectation | Status | Refinement |
|------|-------------|--------|------------|
| 8.1–8.3 | Dialog Accept, offer on start, decline/remind | ✅ Done | — |
| 9.1–9.2 | Help, first-time hint | ✅ Done | **Still to add:** One line in Help modal (e.g. under Quests or Quest log): "Sometimes the path offers more than one way; your choices still lead to the lesson." |
| 10.1–10.4 | Quest log description, reflection chapter title, Story/Journal, overarching message | ✅ Done | **Polish:** Journal could show **choices made** (when we add them) and a one-line "What you learned." |
| 11.1–11.2 | In-game tone, readme "journey of peace" | ✅ Done | — |

**Verdict:** v2 complete. Refinement = small copy tweaks when we add **open quest flow** and **frequency sound**.

---

### 1.3 implementation-plan-vietnamese-quest-story.md

| Area | Expectation | Status | Refinement |
|------|-------------|--------|------------|
| Locales EN/VI | chapter-quests-locales.js, getChapterQuestDisplay | ✅ Done | When adding **quest choices** (A/B), add localized choice labels and outcome lines. |
| Settings EN/VI | GameplayTab, persistence | ✅ Done | — |
| Usage everywhere | QuestManager, QuestLogUI, ReflectionUI, GameMenu | ✅ Done | — |

**Verdict:** No structural gap. Refinement = extend locales for **choice text** (and any new reflection prompts).

---

### 1.4 implementation-plan-100-chapters-maps.md

| Area | Expectation | Status | Refinement |
|------|-------------|--------|------------|
| 100 chapters | chapter-quests.js, Buddha life lessons, nextQuestId chain | ✅ Done | **Refinement done:** `nextQuestIds` (array) is supported; `getAvailableChapterQuests()` returns multiple when story has branched. Remaining: locale strings for choice labels when using choice-based next. |
| Maps | chapter-quest-maps.js, MapSelectionUI area line | ✅ Done | If a chapter can be reached from multiple paths, map subtitle still shows area; no change needed. |
| generate-maps, map-chapters | Optional size, chapters in manifest | ✅ Done | — |

**Verdict:** Data supports 100 chapters. Quest graph (multiple nextQuestIds) is implemented; refinement = locale strings for choice labels when chapters use choice-based next.

---

### 1.5 implementation-plan-sound.md

| Area | Expectation | Status | Refinement |
|------|-------------|--------|------------|
| Missing sound ids | questComplete, lightning, explosion | ✅ Done | — |
| Manifest + download script | sound-manifest.json, download-sounds.js | ✅ Done | **Addressed in §2:** relaxation_theme.mp3 in manifest + EXPECTED_FILES; optional: add note to implementation-plan-sound.md. |
| Real SFX in assets/audio | Via manifest URLs | Depends on manifest fill | — |

**Verdict:** SFX path is clear. **Missing:** A dedicated **frequency / relaxation** music track (curve, health, relax) and integration — see §2. *Optional:* Update implementation-plan-sound.md to mention the relaxation track and `relaxation_theme.mp3` in the manifest so future readers see the full picture.

---

## 2. Sound: Frequency / Relaxation Layer (Curve, Health, Relax)

**Goal:** Add music that feels **curved**, **healthy**, and **relaxing**—so the game supports "relax to play" and "enjoy the sound during playing." Use **public / free** sources where possible.

### 2.1 What “frequency” means here

- **Tuning:** 432 Hz (and optionally 528 Hz) as a base for calm, meditation-style tone.
- **Curve:** Gentle volume and pitch curves (no harsh attacks), smooth crossfades.
- **Health / relax:** Calm, instrumental or pure-tone; no aggressive beats; optional very subtle binaural or alpha/theta for focus.

### 2.2 Public online sources (CC0 / free / royalty-free)

| Source | What to use | Notes |
|--------|-------------|--------|
| **432-hz.org** | Pure 432 Hz tones (sine, harmonics, or binaural), 5–60 min, MP3/WAV/FLAC | Free download, no registration; good for **fallback** or **base layer**. |
| **Pixabay Sound** | Search "432 Hz", "meditation", "calm ambient" | CC0; add chosen URLs to a **music** manifest (see below). |
| **Freesound** | Filter CC0, search "432", "meditation", "peaceful" | API or manual download; add to manifest. |
| **Mixkit** | Free sound effects / ambient | Free for use; check license per track. |

**Suggestion:** One **relaxation loop** (e.g. `relaxation_theme.mp3` or `frequency_432.mp3`) as the **default exploration** track or an **optional overlay** the player can enable in Settings ("Play relaxation frequency").

### 2.3 Implementation steps (refinement)

| Step | Action | Priority | Status |
|------|--------|----------|--------|
| **R-S1** | Add **relaxation / frequency** entry to `js/config/sounds.js`: e.g. `relaxationTheme` with `file: 'relaxation_theme.mp3'` (or `frequency_432.mp3`), volume 0.08–0.12, `simulated` with **432 Hz** base (sine, long duration, low vibrato/tremolo, gentle curve). | P0 | ✅ Done |
| **R-S2** | In `MUSIC_LAYERS`, either: (A) make **exploration** use `relaxationTheme` when available and fallback to `mainTheme`, or (B) add a fourth layer `relaxation` and let Settings toggle "Use relaxation frequency in exploration." Prefer (A) for simplicity so exploration = calm by default. | P0 | ✅ Done (exploration → relaxationTheme) |
| **R-S3** | Add a **music manifest** (e.g. `scripts/music-manifest.json`) or extend `sound-manifest.json` with music URLs: one relaxation track from 432-hz.org or Pixabay (direct MP3 link). Document in README: "For relaxation music, add the URL to the manifest and run the download script." | P1 | ✅ Done (relaxation_theme.mp3 in sound-manifest.json + EXPECTED_FILES) |
| **R-S4** | Ensure crossfade and simulated fallback use **gentle curves** (no clicks); keep existing 1.5s crossfade. Optional: when using simulated 432 Hz, add a very slow LFO (e.g. 0.1 Hz) for a subtle "breathing" curve. | P2 | Deferred |

### 2.4 File checklist (sound refinement)

| Action | File(s) |
|--------|--------|
| Add relaxation track config | `js/config/sounds.js` (MUSIC.relaxationTheme, 432 Hz simulated) |
| Wire exploration to relaxation | `js/config/sounds.js` (MUSIC_LAYERS.exploration or fallback chain), `js/AudioManager.js` (choose track by context) |
| Music manifest + script | Extended `scripts/sound-manifest.json` with `relaxation_theme.mp3`; `scripts/download-sounds.js` includes it in EXPECTED_FILES. (No separate music-manifest.) |
| Optional: Settings toggle | `index.html` (Game tab), `GameplayTab.js` ("Use relaxation frequency" checkbox); `AudioManager` uses relaxation track only when enabled |

---

## 3. Quest: Open Flow (A, B, Both, or Something Else — Then Story Continues)

**Goal:** The quest should **not** feel like fixed progress. It should feel like: **open question** (e.g. A, B, or both, or do something else), then **things of the quest continue**. Player stays **curious** about the lesson and the choice.

### 3.1 Current vs desired

- **Before refinement:** Strictly linear. `getAvailableChapterQuests()` returned the single next chapter by order; objectives were a fixed list (e.g. kill 3, then defeat boss). One path only.
- **After refinement (implemented):** `getAvailableChapterQuests()` returns one or multiple next chapters when `nextQuestIds` is used; objectives support optional `group` and `requireChoiceGroupsAtLeast` so "at least N of M" paths can advance the chapter. Branching and choice-group completion are in place; UI callouts for choices (R-Q3) and reflection question (R-Q5) is implemented.
- **Desired (full vision):** 
  - **Choice in the journey:** Some steps offer **options** (e.g. "Help the farmer" vs "Calm the crowd" vs "Do both" or "Walk away and return later"). Completing **any** of these (or a subset) allows the story to continue.
  - **Optional objectives:** Not all objectives required in a fixed order; some are **alternatives** (A or B) or **optional** (do A, B, or both; quest advances when at least one path is done, or when a "synthesis" condition is met).
  - **Curiosity:** Questions and choices are presented so the player **wonders** about the lesson and the consequence, then sees the reflection and the lesson.

### 3.2 Data model (refinement)

- **Chapter quest:** Keep `objectives[]` but allow:
  - **Optional groups:** e.g. `objectiveGroups: [{ id: 'help_farmer', labelKey: '...', objectives: [...] }, { id: 'calm_crowd', ... }]` with rule: "complete at least one group" or "complete all to get extra reward."
  - Or simpler: **alternative objectives** — e.g. `objectives: [{ type: 'kill', target: 'any', count: 3 }, { type: 'optional_choice', choices: ['A', 'B'], requireAtLeast: 1 }]` so the player can do A, B, or both; when at least one is done, the boss unlocks.
- **Next quest:** Today `nextQuestId` is a single string. For open flow, allow:
  - **Single next (unchanged):** `nextQuestId: 'chapter_2_...'`
  - **Multiple possible next (same story arc):** `nextQuestIds: ['chapter_2a_...', 'chapter_2b_...']` and the **choice** during the chapter (or at reflection) picks which one is offered next; or both are "available" and the player picks from the map/journal.
  - **Choice at reflection:** After boss, show "What stayed with you?" with 2–3 short options (A, B, both); same lesson, but next chapter or dialogue varies by choice (optional).

### 3.3 Implementation steps (refinement)

| Step | Action | Priority | Status |
|------|--------|----------|--------|
| **R-Q1** | **Schema:** In `chapter-quests.js`, add optional `objectiveGroups` or an `alternativeRule` on objectives (e.g. "complete any 1 of these" or "complete at least 2"). Keep backward compatibility: if absent, current behavior (all objectives required). | P0 | ✅ Done (optional `group`, `requireChoiceGroupsAtLeast`) |
| **R-Q2** | **QuestManager:** When evaluating chapter completion, support "at least one group" or "at least N of M" objectives so the player can do A, B, or both and still progress. | P0 | ✅ Done (`areChapterObjectivesComplete()`, `updateInteraction`) |
| **R-Q3** | **UI — choice in quest:** When a chapter has choices (A/B/both), show them in the quest log and in the quest-accept dialog (e.g. "You can help in more than one way: …"). Optional: small "Choice" callout in QuestLogUI for such quests. | P1 | ✅ Done |
| **R-Q4** | **Next-quest branching:** Allow `nextQuestId` (single) or `nextQuestIds` (array). If array, after reflection either (a) offer one "recommended" and one "alternate" in the Story panel, or (b) unlock both and let the player pick which map/quest to do next. `getAvailableChapterQuests()` then returns multiple entries when the story has branched. | P1 | ✅ Done (`nextQuestIds`, getAvailableChapterQuests, notification) |
| **R-Q5** | **Reflection curiosity:** Optionally add a **short question** before the lesson (e.g. "What did you notice in the village?" with 2–3 one-line options). Selecting one doesn’t change the lesson but makes the moment feel like a reflection, not a wall of text. Reuse DialogUI with buttons; store choice in save for Journal if desired. | P2 | ✅ Done |
| **R-Q6** | **Locales:** In `chapter-quests-locales.js`, add strings for choice labels (A, B, both) and any "What did you notice?" options (EN + VI). | P1 | ✅ Done (`otherPathsAvailable` EN/VI) |

### 3.4 File checklist (quest refinement)

| Action | File(s) |
|--------|--------|
| Schema: groups / alternative rule | `js/config/chapter-quests.js` |
| Completion logic | `js/QuestManager.js` (e.g. allObjectivesComplete → support groups / requireAtLeast) |
| Next-quest branching | `js/config/chapter-quests.js` (nextQuestIds), `js/QuestManager.js` (getAvailableChapterQuests, checkForNextQuest) |
| Quest log / dialog choice display | `js/hud-manager/QuestLogUI.js`, `js/hud-manager/DialogUI.js` (or HUDManager) |
| Reflection question (R-Q5) | `js/hud-manager/ReflectionUI.js`, `js/QuestManager.js` (completeQuest flow), `chapter-quests-locales.js` |
| Locales for choices | `js/config/chapter-quests-locales.js` |
| Help: "choices in the journey" line | `index.html` (#help-modal-content) |

---

## 4. Remaining / Not Yet Done (quick reference)

| Item | Where | Priority |
|------|--------|----------|
| Help modal: one line about "path offers more than one way; your choices still lead to the lesson" | `index.html` (#help-modal-content, under Quests or Quest log) | P1 ✅ Done |
| R-Q3: UI — choice in quest (show A/B/both in quest log and accept dialog) | QuestLogUI, Game.js (accept dialog) | P1 ✅ Done |
| R-Q5: Reflection — short question before lesson ("What did you notice?") | ReflectionUI, QuestManager, chapter-quests-locales | P2 ✅ Done |
| R-S4: Gentle LFO for simulated 432 Hz "breathing" curve | AudioManager / sounds.js | P2, Deferred |
| Optional: Settings toggle "Use relaxation frequency in exploration" | GameplayTab, AudioManager | P2 |

---

## 5. Polish: Story, Lesson, Relax — Summary Checklist

Use this to keep the game aligned with "game helps tell story, tell lesson, relax to play."

| Theme | Refinement idea | Where |
|-------|-----------------|--------|
| **Tell story** | Quest log and Story panel show **description + area**; reflection shows **chapter title**. Add **choice summary** in Journal when R-Q3–Q6 are done. | QuestLogUI, ReflectionUI, GameMenu (Story modal) |
| **Tell lesson** | Reflection remains the main moment; optional **question before lesson** (R-Q5) to create curiosity. Lesson text stays kid/teen-friendly and Buddha-inspired. | ReflectionUI, chapter-quests-locales |
| **Relax to play** | **Frequency / relaxation** track as exploration default or toggle (R-S1–S4). Keep combat/boss layers subtle; crossfade smooth. | sounds.js, AudioManager |
| **Curious on question** | Present **choices** (A, B, both) in quest text and in UI (R-Q1–Q3). Optional "What did you notice?" at reflection (R-Q5). | chapter-quests, QuestLogUI, ReflectionUI |
| **Curious on choice** | Support **multiple next chapters** (R-Q4) so the path feels open, not fixed. | chapter-quests, QuestManager |
| **Get the lesson** | Reflection screen and Journal both show the lesson; no change to core flow. | Already done; optional Journal line "What you learned" per chapter. |
| **Enjoy sound** | Exploration = relaxation/frequency by default; SFX not harsh; music manifest with public URLs (R-S1–S4). | sounds.js, AudioManager, scripts |

---

## 6. Recommended Order

*Most refinement steps (R-S1–S3, R-Q1–Q2, R-Q4, R-Q6) are done. Order below is for reference and for remaining work.*

1. **Quick win:** Add the Help modal line about "path offers more than one way" (see §4). ✅ Done
2. **Sound (R-S1–S2):** ✅ Done — relaxation track and exploration wiring.
3. **Quest schema (R-Q1–Q2):** ✅ Done — objective groups and completion logic.
4. **Next-quest branching (R-Q4, R-Q6):** ✅ Done — nextQuestIds and otherPathsAvailable locales.
5. **Music manifest (R-S3):** ✅ Done — relaxation_theme.mp3 in sound-manifest.json.
6. **Reflection question (R-Q5):** ✅ Done — "What did you notice?" with 3 options (EN/VI) before the lesson; `onReflectionChoice` callback for optional save/Journal.
7. **Still deferred / optional:** R-S4 LFO, Settings toggle for relaxation.

---

## 7. Summary

- **Deep check:** Implementation plans 1–7, v2, Vietnamese, 100 chapters, and sound are largely **implemented**; gaps are **polish** and two **new directions**: (1) **frequency/relaxation sound**, (2) **open quest flow** (A, B, both, or something else, then story continues).
- **Sound:** Add a **432 Hz–style relaxation** layer (curved, gentle), use **public sources** (432-hz.org, Pixabay, etc.), and make exploration default to it (or a Settings toggle).
- **Quest:** Move from **fixed linear** to **open flow**: optional/alternative objectives (done), multiple possible next chapters (done), and optional reflection question (deferred) so the player is **curious** about the lesson and the choice, then **gets the lesson** and **enjoys the sound** while playing.
- **Remaining:** Help modal line (§4), R-Q3 (choice callout in UI), and R-Q5 (reflection question) done. Deferred: R-S4 (LFO), optional Settings toggle.

This refinement plan completes the expectations from the existing plans and focuses the next work on **story**, **lesson**, **relaxation**, and **quest curiosity**.

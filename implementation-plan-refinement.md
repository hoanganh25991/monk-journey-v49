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
| **Quest object** | objectives[], lesson, area, boss, rewards | ✅ Chapter quests use it | **Gap:** Objectives are **linear** (kill then boss). No **branching** or **optional objectives** (A, B, or both). |
| **Music** | Exploration / combat / boss, 1.5s crossfade | ✅ Layers exist | **Gap:** No dedicated **frequency / relaxation** track (432 Hz, gentle curve, "health and relax") — see §2. |
| **Help / onboarding** | (v2) | ✅ Phase 8–9 done | Keep; ensure Help mentions "choices in the journey" when we add them. |

**Verdict:** Systems are implemented; refinement is about **quest openness**, **story/lesson curiosity**, and **relaxation sound**.

---

### 1.2 implementation-plan-v2.md (Phases 8–11)

| Step | Expectation | Status | Refinement |
|------|-------------|--------|------------|
| 8.1–8.3 | Dialog Accept, offer on start, decline/remind | ✅ Done | — |
| 9.1–9.2 | Help, first-time hint | ✅ Done | Add one line: "Sometimes the path offers more than one way; your choices still lead to the lesson." |
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
| 100 chapters | chapter-quests.js, Buddha life lessons, nextQuestId chain | ✅ Done | **Refinement:** When moving to **open flow**, some chapters may have **multiple nextQuestIds** (e.g. nextQuestId: ['chapter_X', 'chapter_Y']) or **choice-based** next. |
| Maps | chapter-quest-maps.js, MapSelectionUI area line | ✅ Done | If a chapter can be reached from multiple paths, map subtitle still shows area; no change needed. |
| generate-maps, map-chapters | Optional size, chapters in manifest | ✅ Done | — |

**Verdict:** Data supports 100 chapters. Refinement = **quest graph** (choices → multiple possible next chapters) and locale strings for choices.

---

### 1.5 implementation-plan-sound.md

| Area | Expectation | Status | Refinement |
|------|-------------|--------|------------|
| Missing sound ids | questComplete, lightning, explosion | ✅ Done | — |
| Manifest + download script | sound-manifest.json, download-sounds.js | ✅ Done | **Gap:** No **relaxation / frequency** track. Plan below adds a **frequency layer** and public sources. |
| Real SFX in assets/audio | Via manifest URLs | Depends on manifest fill | — |

**Verdict:** SFX path is clear. **Missing:** A dedicated **frequency / relaxation** music track (curve, health, relax) and integration — see §2.

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

| Step | Action | Priority |
|------|--------|----------|
| **R-S1** | Add **relaxation / frequency** entry to `js/config/sounds.js`: e.g. `relaxationTheme` with `file: 'relaxation_theme.mp3'` (or `frequency_432.mp3`), volume 0.08–0.12, `simulated` with **432 Hz** base (sine, long duration, low vibrato/tremolo, gentle curve). | P0 |
| **R-S2** | In `MUSIC_LAYERS`, either: (A) make **exploration** use `relaxationTheme` when available and fallback to `mainTheme`, or (B) add a fourth layer `relaxation` and let Settings toggle "Use relaxation frequency in exploration." Prefer (A) for simplicity so exploration = calm by default. | P0 |
| **R-S3** | Add a **music manifest** (e.g. `scripts/music-manifest.json`) or extend `sound-manifest.json` with music URLs: one relaxation track from 432-hz.org or Pixabay (direct MP3 link). Document in README: "For relaxation music, add the URL to the manifest and run the download script." | P1 |
| **R-S4** | Ensure crossfade and simulated fallback use **gentle curves** (no clicks); keep existing 1.5s crossfade. Optional: when using simulated 432 Hz, add a very slow LFO (e.g. 0.1 Hz) for a subtle "breathing" curve. | P2 |

### 2.4 File checklist (sound refinement)

| Action | File(s) |
|--------|--------|
| Add relaxation track config | `js/config/sounds.js` (MUSIC.relaxationTheme, 432 Hz simulated) |
| Wire exploration to relaxation | `js/config/sounds.js` (MUSIC_LAYERS.exploration or fallback chain), `js/AudioManager.js` (choose track by context) |
| Music manifest + script | `scripts/music-manifest.json` or extend `scripts/sound-manifest.json`; `scripts/download-sounds.js` (or separate download-music.js) |
| Optional: Settings toggle | `index.html` (Game tab), `GameplayTab.js` ("Use relaxation frequency" checkbox); `AudioManager` uses relaxation track only when enabled |

---

## 3. Quest: Open Flow (A, B, Both, or Something Else — Then Story Continues)

**Goal:** The quest should **not** feel like fixed progress. It should feel like: **open question** (e.g. A, B, or both, or do something else), then **things of the quest continue**. Player stays **curious** about the lesson and the choice.

### 3.1 Current vs desired

- **Current:** Strictly linear. `getAvailableChapterQuests()` returns the single next chapter by order; objectives are a fixed list (e.g. kill 3, then defeat boss). One path only.
- **Desired:** 
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

| Step | Action | Priority |
|------|--------|----------|
| **R-Q1** | **Schema:** In `chapter-quests.js`, add optional `objectiveGroups` or an `alternativeRule` on objectives (e.g. "complete any 1 of these" or "complete at least 2"). Keep backward compatibility: if absent, current behavior (all objectives required). | P0 |
| **R-Q2** | **QuestManager:** When evaluating chapter completion, support "at least one group" or "at least N of M" objectives so the player can do A, B, or both and still progress. | P0 |
| **R-Q3** | **UI — choice in quest:** When a chapter has choices (A/B/both), show them in the quest log and in the quest-accept dialog (e.g. "You can help in more than one way: …"). Optional: small "Choice" callout in QuestLogUI for such quests. | P1 |
| **R-Q4** | **Next-quest branching:** Allow `nextQuestId` (single) or `nextQuestIds` (array). If array, after reflection either (a) offer one "recommended" and one "alternate" in the Story panel, or (b) unlock both and let the player pick which map/quest to do next. `getAvailableChapterQuests()` then returns multiple entries when the story has branched. | P1 |
| **R-Q5** | **Reflection curiosity:** Optionally add a **short question** before the lesson (e.g. "What did you notice in the village?" with 2–3 one-line options). Selecting one doesn’t change the lesson but makes the moment feel like a reflection, not a wall of text. Reuse DialogUI with buttons; store choice in save for Journal if desired. | P2 |
| **R-Q6** | **Locales:** In `chapter-quests-locales.js`, add strings for choice labels (A, B, both) and any "What did you notice?" options (EN + VI). | P1 |

### 3.4 File checklist (quest refinement)

| Action | File(s) |
|--------|--------|
| Schema: groups / alternative rule | `js/config/chapter-quests.js` |
| Completion logic | `js/QuestManager.js` (e.g. allObjectivesComplete → support groups / requireAtLeast) |
| Next-quest branching | `js/config/chapter-quests.js` (nextQuestIds), `js/QuestManager.js` (getAvailableChapterQuests, checkForNextQuest) |
| Quest log / dialog choice display | `js/hud-manager/QuestLogUI.js`, `js/hud-manager/DialogUI.js` (or HUDManager) |
| Reflection question (optional) | `js/hud-manager/ReflectionUI.js`, `js/QuestManager.js` (completeQuest flow) |
| Locales for choices | `js/config/chapter-quests-locales.js` |

---

## 4. Polish: Story, Lesson, Relax — Summary Checklist

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

## 5. Recommended Order

1. **Sound (R-S1–S2):** Add relaxation/frequency track and wire exploration so the game feels calmer by default.
2. **Quest schema (R-Q1–Q2):** Add objective groups or alternative rules and completion logic so at least one "path" (A, B, or both) can advance the chapter.
3. **Quest UI (R-Q3):** Show choices in quest log and dialog.
4. **Next-quest branching (R-Q4, R-Q6):** Multiple nextQuestIds and locales.
5. **Music manifest (R-S3) and optional reflection question (R-Q5)** as polish.

---

## 6. Summary

- **Deep check:** Implementation plans 1–7, v2, Vietnamese, 100 chapters, and sound are largely **implemented**; gaps are **polish** and two **new directions**: (1) **frequency/relaxation sound**, (2) **open quest flow** (A, B, both, or something else, then story continues).
- **Sound:** Add a **432 Hz–style relaxation** layer (curved, gentle), use **public sources** (432-hz.org, Pixabay, etc.), and make exploration default to it (or a Settings toggle).
- **Quest:** Move from **fixed linear** to **open flow**: optional/alternative objectives, multiple possible next chapters, and optional reflection question so the player is **curious** about the lesson and the choice, then **gets the lesson** and **enjoys the sound** while playing.

This refinement plan completes the expectations from the existing plans and focuses the next work on **story**, **lesson**, **relaxation**, and **quest curiosity**.

# Implementation Plan: 100 Chapters — Quest Story & Vương Lâm Detail

## Goal

- **Only some chapters have detail story** (like Chapter 1): rich narrative that matches the chapter lesson and tells about **Vương Lâm** (Tiên Nghịch / Renegade Immortal). The rest keep short or medium story.
- **Match with chapter lesson**: Every chapter’s story (short and long) is tied to the life lesson in `chapter-quests.js` / `chapter-quests-locales.js`.
- **Plan for 100 chapters**: Extend Vietnamese (and optionally English) so all 100 chapters have consistent quest/story experience, with a clear definition of which chapters get “detail” treatment.

---

## 1. Current state (reference: Chapter 1)

### 1.1 Chapter 1 as the “very good” reference

**Quest (EN + VI):**

- **chapter-quests.js**: Full structure (id, title, description, lesson, area, objectives, boss, rewards, reflectionRewards, nextQuestId).
- **chapter-quests-locales.js**: Full EN and VI for `chapter_1_restless_village`: title (“The Restless Village” / “Làng Bất An”), description, lesson (“Anger burns the one who carries it.” / “Sự giận dữ đốt cháy chính kẻ mang nó.”), area, bossName (“Rage Beast” / “Con Thú Giận Dữ”).

**Story (Vương Lâm):**

- **Short** (`vuong-lam-story.js`): One object per chapter `{ en, vi }`. Ch1: youth, village torn by rage, path of cultivation, “carry resolve, not wrath” — ties to lesson.
- **Long VI** (`vuong-lam-story-vi-long.js`): ~1000 characters for Ch1 — village by Hàm Sơn, disputes, Hằng Nhạc phái, lesson at end. Rich, scene-setting, clearly about Vương Lâm.

**Design:** `design/chapters/chapter-1-restless-village.md` — narrative intro, emotional theme (anger), objectives, boss (Rage Beast), reflection quote. Aligns with lesson and story.

So for “detail story” we mean: **full EN+VI quest strings** + **long narrative (VI, and optionally EN) in Vương Lâm’s voice** that matches the chapter lesson and feels like a real episode (place, conflict, choice, lesson).

### 1.2 What exists for chapters 1–100

| Layer | Ch 1–5 | Ch 6–100 |
|-------|--------|----------|
| **Quest structure** (chapter-quests.js) | Full (objectives, choice groups, reflectionRewards) | Generated from `CHAPTERS_6_100_CONTENT` (lesson, title, area, description); objectives built from map enemies |
| **Quest locale** (chapter-quests-locales.js) | Full EN + VI (title, description, lesson, area, bossName) | **VI missing** — fallback to EN from quest data, so VI players see English for quest UI |
| **Short story** (vuong-lam-story.js) | EN + VI, ~2 sentences each | EN + VI for all 100 (one `{ en, vi }` per chapter) |
| **Long story VI** (vuong-lam-story-vi-long.js) | Ch 1–10: long (~1000 chars), narrative | Ch 11–100: present but shorter / more thematic (one paragraph, lesson at end) |
| **Long story EN** | Not implemented | Not implemented (StoryBookUI uses short EN when no long EN) |

So:

- **Chapters 1–5**: Full “detail” — full quest + full locale EN/VI + short story EN/VI + long VI story. Chapter 1 is the quality bar.
- **Chapters 6–100**: Quest text in EN only in locales (VI falls back to EN). Long VI exists for all 100 but only 1–10 are “long narrative”; 11–100 are shorter thematic paragraphs. No long EN.

---

## 2. Definition: “detail story” vs “thematic story”

- **Detail story (like Chapter 1):**
  - **Quest:** Full EN + VI in `chapter-quests-locales.js` (title, description, lesson, area, bossName).
  - **Vương Lâm:** Long narrative (~600–1000+ chars) in at least one language (VI and/or EN): scene, conflict, choice, lesson. Tied to chapter lesson. Feels like one episode of Tiên Nghịch.

- **Thematic story:**
  - **Quest:** Can be EN-only in data with VI from a generated or batch-translated locale (see below).
  - **Vương Lâm:** Short (vuong-lam-story.js) or medium (current ch 11–100 long VI): one paragraph, lesson stated clearly. Still about Vương Lâm and still matches lesson.

**Proposal:** Treat as “detail” chapters:

- **1–5** (already done).
- **Milestone chapters:** e.g. **10, 25, 50, 100** — optional; get full VI locale + long VI (and optionally long EN) at Chapter 1 quality if you want standout episodes.

All other chapters (6–9, 11–24, 26–49, 51–99) keep **thematic** story: short EN/VI + existing medium VI, and get **VI quest strings** so the quest log and reflection are in Vietnamese when locale is VI.

---

## 3. Plan for 100 chapters

### 3.1 Phase A: Vietnamese quest strings for chapters 6–100 (required for parity)

**Goal:** When `game.questStoryLocale === 'vi'`, every chapter’s quest title, description, lesson, area, and boss name show in Vietnamese in QuestLogUI, reflection, and any other UI that uses `getChapterQuestDisplay(quest, locale)`.

**Options:**

- **A1. Add VI entries to chapter-quests-locales.js**  
  For each chapter 6–100, add a `vi` entry keyed by quest id (e.g. `chapter_6_valley_of_patience`) with `title`, `description`, `lesson`, `area`, `bossName`. Source: translate from `CHAPTERS_6_100_CONTENT` (or from existing long VI story themes). Large but one-time; no code change.

- **A2. Generate VI from a separate content array**  
  Add `CHAPTERS_6_100_CONTENT_VI` (or similar) in a new file or in chapter-quests-locales.js, same shape as the EN content, and in `getChapterQuestText` / `getChapterQuestDisplay` resolve VI for chapters 6–100 from that array by chapter index. Reduces duplication of structure.

- **A3. Use machine translation or community**  
  Translate `CHAPTERS_6_100_CONTENT` (and boss names from BOSS_CYCLE) to Vietnamese once, then plug into A1 or A2. Review for tone and terms (e.g. “Guardian of Strife” → appropriate VI).

**Recommendation:** A1 or A2 depending on whether you prefer one big locale object (A1) or a separate EN/VI content table (A2). A2 scales slightly better if you add more locales later.

**Files:**

- `js/config/chapter-quests-locales.js`: extend `CHAPTER_QUEST_TEXTS.vi` for chapter_6_* … chapter_100_* (or add a VI content array and resolve in helpers).
- No change to chapter-quests.js or StoryBookUI for this phase.

**Acceptance:** For each chapter 6–100, set locale to VI, open that chapter’s quest (e.g. in Story book or quest log); title, description, lesson, area, boss name must be in Vietnamese.

---

### 3.2 Phase B: “Detail” chapters — long narrative at Chapter 1 quality

**Goal:** A small set of chapters (e.g. 1–5 already, plus 10, 25, 50, 100) have long Vương Lâm narrative at the same quality as Chapter 1: scene, conflict, lesson, ~600–1000+ characters.

**Current:** Ch 1–10 already have long VI in `vuong-lam-story-vi-long.js`; ch 1–5 are the richest. Ch 11–100 are shorter thematic paragraphs.

**Tasks:**

1. **Audit ch 6–10 long VI**  
   Compare to Ch 1: if they already read like “detail” (place, conflict, Vương Lâm’s choice, lesson), mark as done. If not, expand once to Ch 1 standard.

2. **Milestone chapters 25, 50, 100**  
   - In `vuong-lam-story-vi-long.js`, replace or add long VI for indices 24, 49, 99 so each is ~600–1000+ chars, scene-setting, and lesson-driven (same style as Ch 1).
   - Optional: add `VUONG_LAM_STORY_EN_LONG` (or reuse a single array with `{ en, vi }`) and long EN for ch 1, 5, 10, 25, 50, 100 so EN readers get the same “detail” experience. StoryBookUI already supports long EN when `VUONG_LAM_STORY_EN_LONG[index]` exists.

3. **Optional: design docs**  
   Add or update `design/chapters/chapter-10-*.md`, `chapter-25-*.md`, `chapter-50-*.md`, `chapter-100-*.md` with a short narrative intro and theme (like chapter-1-restless-village.md) so future content stays aligned.

**Files:**

- `js/config/vuong-lam-story-vi-long.js`: expand/replace entries for chosen “detail” chapters.
- Optional: `js/config/vuong-lam-story-en-long.js` (or similar) and wiring in StoryBookUI for long EN.
- Optional: `design/chapters/` markdown files for milestone chapters.

---

### 3.3 Phase C: Consistency and maintenance

- **Lesson alignment:** When adding or editing a chapter’s story (short or long), always tie the closing line to the chapter’s `lesson` in chapter-quests.js / locales so the reflection quote and the story feel like one message.
- **Naming:** Keep area/title in sync between chapter-quests.js (and CHAPTERS_6_100_CONTENT), chapter-quests-locales.js, and any design docs so “Chapter N — [Area]” and the story’s setting are consistent.
- **Boss names:** For 6–100, boss names come from BOSS_CYCLE and quest.boss.name. If you add VI for quest strings (Phase A), include a localized boss name (e.g. “Guardian of Strife” → Vietnamese equivalent) in the VI locale entry.

---

## 4. File checklist

| Step | File / area | Action | Status |
|------|-------------|--------|--------|
| A1 | chapter-quests-locales.js | Add VI entries for chapter_6_* … chapter_100_* (title, description, lesson, area, bossName) — or add VI content array and resolve in getChapterQuestText / getChapterQuestDisplay | Pending |
| B1 | vuong-lam-story-vi-long.js | Audit ch 6–10; expand to Ch 1 quality if needed | Pending |
| B2 | vuong-lam-story-vi-long.js | Ensure ch 25, 50, 100 have long narrative at Ch 1 quality | Pending |
| B3 | vuong-lam-story-en-long.js (optional) | Add long EN for ch 1, 5, 10, 25, 50, 100; StoryBookUI already uses it when present | Optional |
| B4 | design/chapters/ | Add or update chapter-10, -25, -50, -100 narrative docs | Optional |

---

## 5. Summary

- **Chapter 1** is the reference: full EN+VI quest strings, short EN+VI story, long VI Vương Lâm narrative (~1000 chars), lesson and story aligned.
- **Only some chapters have detail story:** 1–5 already do; optionally 10, 25, 50, 100 get the same long-narrative treatment. The rest keep short + medium thematic story.
- **All 100 chapters** should have Vietnamese quest text (Phase A) so the quest log and reflection are fully localized when locale is VI.
- **Vương Lâm** remains the narrative voice in the Story book; every chapter’s story (short or long) matches the chapter lesson and tells a moment from his journey (Tiên Nghịch).
- **Plan 07** (Vietnamese quest/story + language toggle) is done for ch 1–5; this plan extends that to 100 chapters and defines “detail” vs “thematic” story for future content.

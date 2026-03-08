# Implementation Plan: 100 Chapters — Title & Story Detail (Like 1–5)

## Goal

For **each chapter 1–100**, give the same treatment as chapters 1–5:

1. **Title** — Localized chapter title (and area) in EN + VI, shown in quest log, reflection, and Story book.
2. **Story detail** — The Vương Lâm narrative (Tale of Vương Lâm / Tiên Nghịch) shown in the Story book: short EN/VI when no long form, long VI (or long EN when added) when available.

**Source:** Use the **existing Vương Lâm story** in the codebase to derive or align locale strings. No new story content is required for “story detail” — it already exists in `vuong-lam-story.js` (short EN+VI for all 100) and `vuong-lam-story-vi-long.js` (long VI for all 100). The work is to ensure **every chapter has a full locale entry** (title, description, lesson, area, bossName) in both EN and VI, so the title and quest text match the story and the UI is consistent.

---

## 1. Reference: What chapters 1–5 have (per chapter)

For each of chapters 1–5:

| Field | Where it appears | Source (ch 1–5) |
|-------|-------------------|-----------------|
| **title** | Story book, quest log, reflection, “Chapter N — [Area]” | `CHAPTER_QUEST_TEXTS.en` / `.vi` by quest id |
| **description** | Story book (below title), quest log | Same |
| **lesson** | Reflection screen, Story book | Same |
| **area** | Map selector, chapter label | Same |
| **bossName** | Quest text, boss intro | Same |
| **Story detail** | Story book block “Tale of Vương Lâm” | Short: `VUONG_LAM_STORY[i].en` / `.vi`; Long VI: `VUONG_LAM_STORY_VI_LONG[i]` |

Chapters 1–5 already have all of the above in `chapter-quests-locales.js` for both EN and VI. Chapters 6–100 have EN only in the quest data (`chapter-quests.js` / `CHAPTERS_6_100_CONTENT`); VI is missing, so the game falls back to EN when locale is VI. Story detail for 6–100 is already present (short EN+VI in `vuong-lam-story.js`, long VI in `vuong-lam-story-vi-long.js`).

---

## 2. Per-chapter target (same as 1–5)

For **each chapter N (1–100)**:

1. **Title & quest strings**
   - **EN:** Either in `CHAPTER_QUEST_TEXTS.en[questId]` or fallback from `chapter-quests.js` / `CHAPTERS_6_100_CONTENT`. Ch 1–5 already in locales; ch 6–100 currently from quest data.
   - **VI:** In `CHAPTER_QUEST_TEXTS.vi[questId]` with: `title`, `description`, `lesson`, `area`, `bossName`. Ch 1–5 done; ch 6–100 to be added.

2. **Story detail**
   - **EN:** Short from `VUONG_LAM_STORY[i].en`; if `VUONG_LAM_STORY_EN_LONG[i]` exists, use that in Story book.
   - **VI:** If `VUONG_LAM_STORY_VI_LONG[i]` exists, use it; else `VUONG_LAM_STORY[i].vi`. Already wired in StoryBookUI.

So the only missing piece for “like 1–5” is: **for chapters 6–100, add VI locale entries** (title, description, lesson, area, bossName). Use the existing Vương Lâm story to derive or align those strings (see below).

---

## 3. Using existing Vương Lâm story for locale content

Existing assets:

- **chapter-quests.js**  
  - Ch 1–5: full `title`, `description`, `lesson`, `area`, `boss.name`.  
  - Ch 6–100: `CHAPTERS_6_100_CONTENT` has `lesson`, `title`, `area`, `description` (EN). Boss name from `BOSS_CYCLE`.

- **vuong-lam-story.js**  
  - `VUONG_LAM_STORY[i]` = `{ en, vi }` for i = 0..99. Short paragraph per chapter, matches lesson.

- **vuong-lam-story-vi-long.js**  
  - `VUONG_LAM_STORY_VI_LONG[i]` = long VI string for i = 0..99. Thematic narrative, lesson at end.

**How to fill VI for chapters 6–100:**

- **title / area:** Translate from `CHAPTERS_6_100_CONTENT[i - 6].title` and `.area` (e.g. “Valley of Patience” → “Thung Lũng Kiên Nhẫn”), or derive a concise Vietnamese title from the existing VI story (e.g. first phrase or setting from `VUONG_LAM_STORY[i].vi` or `VUONG_LAM_STORY_VI_LONG[i]`).
- **description:** One or two sentences summarizing the chapter. Can be adapted from the existing VI short story (`VUONG_LAM_STORY[i].vi`) or from a condensed version of the long VI story, so it aligns with the Vương Lâm narrative.
- **lesson:** Translate the EN lesson from `CHAPTERS_6_100_CONTENT` (or reuse the lesson phrase that already appears in `VUONG_LAM_STORY[i].vi` / `VUONG_LAM_STORY_VI_LONG[i]` so reflection and story match).
- **bossName:** Translate the boss name from `BOSS_CYCLE` (e.g. “Guardian of Strife” → “Kẻ Canh Giữ Xung Đột” or a suitable Vietnamese name).

This way each chapter’s **title** and **story detail** (and description/lesson/area/boss) stay aligned with the existing Vương Lâm story.

---

## 4. Implementation: focus on each chapter

### 4.1 Approach

- **Chapters 1–5:** No change; already have title + story detail (full EN+VI locale, short + long VI story).
- **Chapters 6–100:** Add one locale entry per chapter in `chapter-quests-locales.js` (VI), using existing Vương Lâm story and EN content as above.

Two ways to add VI for 6–100:

**Option A — Per-chapter object in `CHAPTER_QUEST_TEXTS.vi`**  
For each quest id `chapter_6_valley_of_patience` … `chapter_100_final_gate`, add an object `{ title, description, lesson, area, bossName }` with Vietnamese strings. Source: translate from `CHAPTERS_6_100_CONTENT` + boss names, and align with existing VI story text.

**Option B — Array `CHAPTERS_6_100_CONTENT_VI`**  
Add an array of 95 objects (ch 6–100) with the same shape as `CHAPTERS_6_100_CONTENT`: `lesson`, `title`, `area`, `description`, and a `bossName` per chapter (from a small VI boss-name map keyed by boss type or index). In `getChapterQuestText` / `getChapterQuestDisplay`, for chapters 6–100 and locale `vi`, resolve from this array by chapter index. Reduces duplication of quest ids in the locale file.

Recommendation: **Option A** if you prefer explicit per-chapter listing (easier to edit one chapter); **Option B** if you prefer a single table and smaller helper changes.

### 4.2 Per-chapter checklist (chapters 6–100)

For **each chapter N from 6 to 100**:

| Step | What to do | Source |
|------|------------|--------|
| 1 | Get quest id | `chapter_${N}_${slug(area)}` from chapter-quests.js (e.g. `chapter_6_valley_of_patience`). |
| 2 | EN (if not in locales) | Ch 6–100 already use fallback from quest data; optional: add EN to locales for consistency with 1–5. |
| 3 | VI **title** | Translate `CHAPTERS_6_100_CONTENT[N-6].title` or derive from `VUONG_LAM_STORY[N-1].vi` / long VI. |
| 4 | VI **area** | Same as title (usually same as title in EN). |
| 5 | VI **description** | Translate EN description or summarize from existing VI story (short or long) so it matches story detail. |
| 6 | VI **lesson** | Translate `CHAPTERS_6_100_CONTENT[N-6].lesson` or use lesson phrase from existing VI story. |
| 7 | VI **bossName** | Translate boss name for this chapter (from BOSS_CYCLE by index). |
| 8 | Story detail | No code change: already from `VUONG_LAM_STORY` and `VUONG_LAM_STORY_VI_LONG` in StoryBookUI. |

After all steps, chapter N has **title** and **story detail** like 1–5: title/area/description/lesson/bossName in VI (and EN if added), and the Story book shows the existing Vương Lâm story for that chapter.

### 4.3 Boss name mapping (VI) for chapters 6–100

Boss names repeat by cycle. Suggested VI mapping (review for tone):

| EN (BOSS_CYCLE name) | VI (example) |
|----------------------|--------------|
| Guardian of Strife | Kẻ Canh Giữ Xung Đột |
| Shadow of Doubt | Bóng Nghi Ngờ |
| Avatar of Greed | Hình Tượng Tham Lam |
| Spirit of Loneliness | Linh Hồn Cô Đơn |
| Mirror of the Self | Gương Bản Thể |
| Bog of Regret | Bãi Lầy Hối Tiếc |
| Frozen Heart | Trái Tim Băng Giá |
| Lord of Illusion | Chúa Ảo Ảnh |

Use the same VI name for every chapter that uses that boss type.

---

## 5. File checklist

| Step | File | Action | Status |
|------|------|--------|--------|
| 1 | chapter-quests-locales.js | Add `CHAPTER_QUEST_TEXTS.vi[questId]` for each chapter 6–100 with title, description, lesson, area, bossName (using existing Vương Lâm story to align). | Done |
| 2 | (Optional) chapter-quests-locales.js | Add EN locale entries for ch 6–100 so EN also comes from locales like 1–5. | Optional |
| 3 | StoryBookUI / story data | No change: story detail already uses VUONG_LAM_STORY and VUONG_LAM_STORY_VI_LONG. | Done |

---

## 6. Summary

- **Per chapter:** Every chapter 1–100 should have the same shape as 1–5: **title** (and area, description, lesson, bossName) in locales, and **story detail** (Vương Lâm narrative) in the Story book.
- **Use existing Vương Lâm story:** Short and long VI (and short EN) already exist for all 100 chapters. Use them to derive or align VI title, description, and lesson so the quest UI and the Story book tell the same story.
- **Work item:** Add Vietnamese locale entries for chapters 6–100 in `chapter-quests-locales.js` (and optionally EN for 6–100). No new story content required; StoryBookUI already shows the existing story detail for every chapter.

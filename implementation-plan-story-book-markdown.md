# Implementation plan: Story book — long content & Markdown

## Goals

1. **Long Vietnamese content** — Each chapter’s Vương Lâm (Tiên Nghịch) story is ~1000 characters in Vietnamese for a “significant” read; English stays short.
2. **Markdown in story text** — Support **bold**, *italic*, line breaks, and optional headings in story content so long passages can be formatted and easier to read.

---

## 1. Long content (Vietnamese) — implemented

- **Source:** `js/config/vuong-lam-story-vi-long.js` exports `VUONG_LAM_STORY_VI_LONG`: array of 100 strings (index = chapter index 0–99), ~600–1000+ characters per chapter.
- **Fallback:** If long content is missing for a chapter, use short `vi` from `VUONG_LAM_STORY` in `vuong-lam-story.js`.
- **Usage:** In `StoryBookUI.renderChapter()`, when `locale === 'vi'`, use `VUONG_LAM_STORY_VI_LONG[index]` when defined, else `VUONG_LAM_STORY[index].vi`. English always uses short `VUONG_LAM_STORY[index].en`.
- **UI:** Story block has `max-height: 40vh` and `overflow-y: auto` so long text scrolls within the book.

---

## 2. Markdown implementation plan

### 2.1 Scope

- **Where:** Only the story paragraph in the story book (the Vương Lâm block). Quest title, description, and lesson quote remain plain text.
- **Allowed:** Paragraphs, line breaks, **bold**, *italic*, optional `####` subheadings. No raw HTML, no `[]()` links or images in the first phase.
- **Security:** All user/author content rendered as HTML must be sanitized to avoid XSS.

### 2.2 Options

| Option | Pros | Cons |
|--------|------|------|
| **A. Small Markdown lib** (e.g. [marked](https://github.com/markedjs/marked) or [markdown-it](https://github.com/markdown-it/markdown-it)) | Full CommonMark, well tested | Extra dependency, bundle size |
| **B. Custom minimal parser** | No dependency, only what we need (bold, italic, paragraphs, headings) | Maintain ourselves, easy to miss edge cases |
| **C. Markdown lib + DOMPurify** | Safe HTML output, standard Markdown | Two dependencies (or marked + marked’s sanitizer) |

**Recommendation:** **C** — Use a small Markdown library (e.g. `marked` with `marked.parse()` or `markdown-it`) and run the output through a sanitizer (e.g. DOMPurify) with an allowlist of tags (`p`, `br`, `strong`, `em`, `h4`, `h3`, etc.) and no `script`/`onerror`/etc. Alternatively, use a Markdown lib that outputs a safe subset by default and restrict allowed tags in the sanitizer.

### 2.3 Steps (when implementing)

1. **Add dependency**  
   - Either: `marked` (or `markdown-it`) + `dompurify` (or a minimal allowlist-based sanitizer).  
   - Or: a single lib that does “safe markdown to HTML” (if available and acceptable for the project).

2. **Sanitizer config**  
   - Allow only: `p`, `br`, `strong`, `b`, `em`, `i`, `h3`, `h4`, and optionally `span` with no attributes (or a fixed class).  
   - Block: `script`, `iframe`, `object`, `on*` attributes, `href`/`src` if we don’t want links/images in phase 1.

3. **StoryBookUI changes**  
   - For the story block element that shows Vương Lâm text:  
     - If markdown is **enabled:** get raw string → Markdown → HTML → sanitize → set `storyEl.innerHTML`.  
     - If markdown is **disabled** or content is plain: set `storyEl.textContent` (current behavior).  
   - Use one element for story content (e.g. `#story-book-chapter-story`). When rendering HTML, use `innerHTML`; when rendering plain text, use `textContent`.

4. **CSS**  
   - Add styles for markdown output inside the story block:  
     - `.story-book-chapter-story p`, `.story-book-chapter-story strong`, `.story-book-chapter-story em`,  
     - `.story-book-chapter-story h3` / `h4` (smaller than page title), spacing between paragraphs.

5. **Content format**  
   - Long Vietnamese (and future long English) can be stored as Markdown in the source (e.g. in `vuong-lam-story-vi-long.js` as template strings with `\n\n` for paragraphs and `**`/`*` for emphasis).  
   - If a chapter’s string contains no markdown, rendering as plain text is fine.

6. **Feature flag (optional)**  
   - e.g. `storyBookUseMarkdown: true` in config or game settings so we can turn markdown on/off until stable.

### 2.4 File checklist

- [ ] Choose and add Markdown + sanitizer (or single “safe markdown” lib).
- [ ] Add `js/utils/sanitize-story-html.js` (or similar) that exports `sanitizeStoryHtml(html)` with allowlist.
- [ ] In `StoryBookUI.renderChapter()`, branch: if markdown enabled and content exists → parse → sanitize → `innerHTML`; else `textContent`.
- [ ] Add CSS in `css/story-book.css` for `.story-book-chapter-story` markdown elements.
- [ ] (Optional) Add a simple test or manual check with a chapter that uses `**bold**`, `*italic*`, and `\n\n` paragraphs.

### 2.5 Markdown examples for content authors

```markdown
Vương Lâm bước vào làng. **Sự giận dữ** của dân làng không làm chàng sợ.

Chàng nhớ lời sư phụ: *"Cơn giận đốt cháy chính kẻ mang nó."*

Sau cùng, chỉ có sự bình tâm mới xoa dịu được xung đột.
```

Renders as two paragraphs, with bold and italic phrases, and no unsafe HTML.

---

## 3. Summary

- **Long Vietnamese:** Separate array `VUONG_LAM_STORY_VI_LONG` in `vuong-lam-story-vi-long.js`, ~1000 characters per chapter; StoryBookUI uses it for `vi` when available.
- **English:** Keeps using short `VUONG_LAM_STORY[].en`.
- **Markdown:** Implement when ready: Markdown lib → sanitized HTML → `innerHTML` in story block; allowlist only safe tags; add CSS for paragraphs and emphasis.

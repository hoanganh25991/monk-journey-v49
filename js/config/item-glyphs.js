/**
 * Maps item subTypes/types to Temple Ink CSS glyph classes.
 */
const SUBTYPE_GLYPHS = {
    fist: 'item-glyph-fist',
    staff: 'item-glyph-staff',
    dagger: 'item-glyph-dagger',
    robe: 'item-glyph-robe',
    helmet: 'item-glyph-helmet',
    boots: 'item-glyph-boots',
    gloves: 'item-glyph-gloves',
    ring: 'item-glyph-ring',
    amulet: 'item-glyph-amulet',
    talisman: 'item-glyph-talisman',
    shoulder: 'item-glyph-shoulder',
    belt: 'item-glyph-belt',
    potion: 'item-glyph-potion',
    scroll: 'item-glyph-scroll',
    crystal: 'item-glyph-crystal',
    food: 'item-glyph-food',
    armor: 'item-glyph-armor',
    accessory: 'item-glyph-accessory',
    consumable: 'item-glyph-consumable'
};

/**
 * @param {{ subType?: string, type?: string }} item
 * @returns {string|null}
 */
export function getItemGlyphClass(item) {
    if (!item) return null;
    return SUBTYPE_GLYPHS[item.subType] || SUBTYPE_GLYPHS[item.type] || null;
}

/**
 * Apply glyph class to an icon element; falls back to emoji text.
 * @param {HTMLElement} el
 * @param {{ subType?: string, type?: string, icon?: string }} item
 */
export function applyItemIcon(el, item) {
    const glyphClass = getItemGlyphClass(item);
    if (glyphClass) {
        el.className = `item-icon ${glyphClass}`;
        el.textContent = '';
        el.setAttribute('aria-hidden', 'true');
        return;
    }
    el.className = 'item-icon';
    el.textContent = item?.icon || '📦';
}

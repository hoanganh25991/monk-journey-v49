# Skill tree system

**Root GDD:** [quest.md](../../quest.md#4-skill-tree-system)

---

## Structure

The skill tree is a **graph** (nodes and edges), not a linear list. Nodes can have multiple prerequisites and branches.

---

## Skill node schema

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "icon": "string",
  "maxLevel": "number",
  "currentLevel": "number",
  "costPerLevel": "number",
  "requiredNodes": ["string"],
  "variants": ["string"]
}
```

- **requiredNodes:** IDs of nodes that must be unlocked (and optionally levelled) before this node is available.
- **variants:** Optional; different versions of the skill (e.g. damage vs. speed vs. stun).

---

## Skill categories

### Body path

- Quick Strike
- Flowing Combo
- Wind Dash
- Palm Burst
- Ground Stomp

**Variants (examples):** Increased damage, increased speed, stun chance, life steal.

### Mind path

- Inner Focus
- Energy Wave
- Meditation Field
- Spirit Shield
- Calm Pulse

**Variants (examples):** Reduce cooldown, bigger radius, heal allies, increase duration.

### Harmony path

- Balance Aura
- Reflect Harm
- Slow Time
- Serenity Field
- **Enlightenment Mode** (unlocked after [Chapter 5](../chapters/chapter-5-inner-temple.md))

**Variants (examples):** Increase aura size, extend duration, add healing, add slow effect.

---

## UI requirements

- **Zoomable** canvas
- **Draggable** camera
- **Circular** nodes connected by **lines**
- **Locked** nodes: greyed out
- **Unlockable** nodes: glow or highlight
- **Tooltip** content:
  - Description
  - Current level
  - Next level bonus
  - Requirements (required nodes)
  - Cost (skill points per level)

---

## Links

- [Chapter 5 — Inner Temple](../chapters/chapter-5-inner-temple.md#enlightenment-mode) — Enlightenment Mode unlock
- [Progression](progression.md) — skill points per level up
- [Items](items.md) — skillBoost and legendary skill modifications

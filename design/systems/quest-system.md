# Quest system

**Root GDD:** [quest.md](../../quest.md#5-quest-system-structure)

---

## Quest object

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "lesson": "string",
  "area": "string",
  "objectives": ["Objective"],
  "boss": "BossConfig (optional)",
  "rewards": {
    "xp": "number",
    "skillPoints": "number (optional)",
    "item": "string (optional)"
  }
}
```

- **lesson:** Life lesson quote (e.g. for [Reflection](reflection-and-endgame.md)).
- **area:** Ties to world/level (e.g. Restless Village, Forest of Doubt).
- **boss:** Present for main-story quests; see chapter docs for boss design.

---

## Objective types

| Type | Description |
|------|-------------|
| Kill X enemies | Defeat a set number of specific or generic enemies |
| Defeat boss | Win the chapter boss encounter |
| Meditate at location | Reach and use a meditation point |
| Protect NPC | Keep an NPC alive for a duration or wave |
| Survive waves | Survive N waves of enemies |
| Collect fragments | Gather a set number of collectibles |

Every **main quest** must include (from root GDD):

1. Narrative intro  
2. Emotional theme  
3. Gameplay objective(s)  
4. Boss fight (if main quest)  
5. Reflection message  
6. Life lesson quote  
7. Rewards  

---

## Flow (core loop)

From [quest.md §2](../../quest.md#2-core-game-loop):

Explore Area → Accept Quest → Learn Story Context → Complete Objective → Boss Encounter → Reflection Screen → Gain XP + Skill Point → Unlock New Area

---

## Chapter quests

Each chapter has one main quest; detail is in the chapter docs:

- [Chapter 1](../chapters/chapter-1-restless-village.md) — Restless Village
- [Chapter 2](../chapters/chapter-2-forest-of-doubt.md) — Forest of Doubt
- [Chapter 3](../chapters/chapter-3-mountain-of-desire.md) — Mountain of Desire
- [Chapter 4](../chapters/chapter-4-desert-of-loneliness.md) — Desert of Loneliness
- [Chapter 5](../chapters/chapter-5-inner-temple.md) — Inner Temple

---

## Links

- [Progression](progression.md) — XP and skill point rewards
- [Reflection & end game](reflection-and-endgame.md) — post-boss flow

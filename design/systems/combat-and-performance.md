# Combat & performance

**Root GDD:** [quest.md](../../quest.md#9-performance-requirements) · [§10 Fast responsive combat](../../quest.md#10-fast-responsive-combat)

---

## Performance requirements

- **60 FPS** target.
- **Async loading** for assets (textures, models, audio); never block main thread.
- **Fallbacks:** Fallback textures/models/audio when primary asset fails.
- **Lazy-load bosses** (load boss assets when approaching or when quest starts).
- **Offline-first;** no waiting on network.

---

## Fast responsive combat

| Rule | Target / note |
|------|----------------|
| Skill cast time | **&lt; 150 ms** from input to effect start |
| Animation cancel | Allowed at **60%** of animation (no full lock-in) |
| Input buffer | **100 ms** (brief window to queue next input) |
| Hit detection | **Immediate** (no artificial delay) |
| Artificial delay | **None** (no fake “weight” via lag) |

Combat should feel immediate and readable so [Reflection](reflection-and-endgame.md) and story pacing stay calm without frustration.

---

## Implementation notes

- Run asset loading in workers or async; show loading screen until critical path is ready.
- Use object pooling for projectiles and VFX where applicable.
- Profile on low-end devices; consider quality tiers or a performance profile if needed.

---

## Links

- [Skill tree](skill-tree.md) — skills that must feel responsive
- [Reflection & end game](reflection-and-endgame.md) — pacing after combat

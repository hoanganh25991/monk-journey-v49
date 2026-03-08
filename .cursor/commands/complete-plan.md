# Complete plan (work until done)

Work through a detailed plan until completion. Do not stop to ask for permission between steps unless something is destructive or ambiguous.

## Your behavior

1. **If the user provided a plan**: Use it. If they only gave a goal, first create a short numbered plan (steps) and then execute it.
2. **Execute steps in order**: Do each step fully before moving to the next. Use the todo list to track progress. Do not pause after each step to ask "should I continue?"—continue until the plan is done or you hit a hard blocker.
3. **When finished**: End your final message with exactly **PLAN_COMPLETE** so the user knows the run is done.
4. **If you must stop early** (e.g. hitting a limit): End with **PLAN_PAUSED** and list the remaining steps so the user can run this command again with "Continue from: [remaining steps]".

## User message

The user will provide either:
- A goal (e.g. "Add settings screen with dark mode toggle") — then you create the plan and execute it, or
- A concrete plan or todo list — then you execute it step by step.

Proceed until every step is done or you cannot continue without user input. Prefer doing over asking.

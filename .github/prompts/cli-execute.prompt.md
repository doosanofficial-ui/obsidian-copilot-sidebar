---
name: cli-execute
description: Implement assigned CLI-lane tasks and run required gates.
argument-hint: "Task IDs and acceptance criteria"
agent: agent
---
Follow:
- [AGENTS](../../AGENTS.md)
- [Copilot instructions](../copilot-instructions.md)

Execution policy:
1. Implement only assigned CLI tasks.
2. Run required gates in order.
3. Summarize changed files and verification logs.
4. Finish with commit and push unless explicitly excluded.

Required gate chain:
- `npm run check`
- `npm run build`
- `npm run smoke:prepare`
- `npm run smoke:run`
- `npm run smoke:assert`
- `npm run verify:e2e`
- `npm run verify:tracked`

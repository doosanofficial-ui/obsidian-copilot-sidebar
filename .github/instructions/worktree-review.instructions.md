---
name: Worktree And PR Governance
description: Enforce feature branch + worktree + PR review flow for all implementation tasks
applyTo: "**"
---
# Worktree and review rules

- Do not implement directly on `main`; create a task branch first.
- Use git worktrees for parallel lane execution when multiple tasks are active.
- Keep lane ownership: Subagent read-only, CLI implementation, Cloud validation.
- Open a pull request for every implementation branch and attach verification evidence.
- Merge only after review and successful `Validation` workflow.
- For single-collaborator repositories where self-approval is blocked, use `npm run branch:protect:main` solo mode (required approvals `0`) before merge.

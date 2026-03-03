---
name: assign-lanes
description: Assign atomic tasks across Subagent, CLI, and Cloud lanes.
argument-hint: "Target milestone and scope"
agent: Plan
---
Use these references first:
- [AGENTS](../../AGENTS.md)
- [Copilot instructions](../copilot-instructions.md)
- [Workflow guide](../../docs/agent-workflow.md)
- [Atomic task plan](../../docs/atomic-task-plan.md)
- [Requirements](../../docs/requirements.md)

Task:
1. Break the requested scope into independent atomic tasks.
2. Assign each task to exactly one lane: `Subagent`, `CLI`, or `Cloud`.
3. Add one validation command per task.
4. List only true judgment points under `Interview Questions`.
5. Return in this format:

## Lane Assignment
| ID | Lane | Objective | Validation |
|---|---|---|---|

## Interview Questions
- question 1
- question 2

## Execution Order
1. ...
2. ...
3. ...

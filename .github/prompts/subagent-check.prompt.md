---
name: subagent-check
description: Run read-only exploration and return risk checklist for assigned atomic tasks.
argument-hint: "Task IDs or scope"
agent: ask
---
Read-only mode.

References:
- [Workflow guide](../../docs/agent-workflow.md)
- [Atomic task plan](../../docs/atomic-task-plan.md)

Output format:
## Findings
- file/symbol centered findings

## Risks
- risk + impact + file path

## Validation Checklist
- [ ] item with command

Do not edit files.

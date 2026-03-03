---
name: cloud-validate
description: Trigger and verify Cloud lane validation workflow.
argument-hint: "Branch or commit SHA"
agent: ask
---
Goal:
- Ensure cloud validation ran and report status from GitHub Actions.

Checklist:
1. Trigger `Validation` workflow (`workflow_dispatch` or push).
2. Confirm these jobs:
   - `subagent-contract`
   - `copilot-cli-fast-gate`
   - `cloud-agent-runtime-e2e`
3. Collect:
   - Step Summary from cloud runtime job
   - `cloud-agent-progress` artifact availability
4. Return:

## Cloud Result
- workflow run URL
- per-job status

## Regression Signals
- failing step
- probable cause
- local reproduction command

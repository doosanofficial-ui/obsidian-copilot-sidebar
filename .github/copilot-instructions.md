# Copilot Instructions

## Core Operating Rule

작업은 항상 독립 검증 가능한 원자 태스크 단위로 분해한다.

## Role Lanes

- Subagent lane: 코드 탐색/리스크 점검/검증 체크리스트
- Copilot CLI lane: 실제 코드 변경/로컬 게이트 실행/커밋
- Cloud Agent lane: CI 기반 재현 검증 및 회귀 탐지

## Required Verification Flow

아래 순서를 통과하지 못하면 커밋하지 않는다.

1. `npm run check`
2. `npm run build`
3. `npm run smoke:prepare`
4. `npm run smoke:run`
5. `npm run smoke:assert`
6. `npm run verify:e2e`

## Documentation Sync

- 기능 스코프 변경 시 `docs/requirements.md` 업데이트
- 워크플로우 변경 시 `docs/atomic-task-plan.md`, `docs/agent-workflow.md`, `AGENTS.md` 동기화

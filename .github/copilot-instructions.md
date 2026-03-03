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

## Completion Rule

- 구현/수정 작업의 기본 완료 조건은 "검증 게이트 통과 + 커밋 + 원격 푸시"다.
- 사용자가 명시적으로 커밋/푸시 제외를 요청한 경우에만 예외를 둔다.
- 푸시 대상 브랜치와 커밋 범위는 작업 시작 시 합의한 스코프를 유지한다.

## Documentation Sync

- 기능 스코프 변경 시 `docs/requirements.md` 업데이트
- 워크플로우 변경 시 `docs/atomic-task-plan.md`, `docs/agent-workflow.md`, `AGENTS.md` 동기화

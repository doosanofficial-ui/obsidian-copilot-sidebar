# Copilot Instructions

## Core Operating Rule

작업은 항상 독립 검증 가능한 원자 태스크 단위로 분해한다.

## Role Lanes

- Subagent lane: 코드 탐색/리스크 점검/검증 체크리스트
- Copilot CLI lane: 실제 코드 변경/로컬 게이트 실행/커밋
- Cloud Agent lane: CI 기반 재현 검증 및 회귀 탐지

## Task Allocation Protocol

- 작업 시작 시 `/assign-lanes` 프롬프트로 원자 태스크를 3개 레인(Subagent/CLI/Cloud)에 분배한다.
- Subagent는 읽기 전용 탐색 결과(리스크/체크리스트)만 산출하고 코드 수정은 하지 않는다.
- CLI는 할당된 구현 태스크만 수행하고 필수 게이트를 통과시킨다.
- Cloud는 `Validation` 워크플로우 실행 및 결과 검증(요약/아티팩트)으로 종료한다.

## Branch And Worktree Protocol

- 구현 작업은 `main` 직접 수정 대신 기능 브랜치에서 수행한다.
- 병렬 태스크는 `git worktree`로 레인별 작업 디렉터리를 분리한다.
- 기본 준비 명령: `npm run lane:worktree:setup`.

## GitHub Review Protocol

- 구현 브랜치는 PR을 열고 리뷰 승인 후 머지한다.
- 단일 협업자 저장소에서 self-approval이 불가능하면 `npm run branch:protect:main`의 solo mode(승인 0) 예외를 적용한다.
- 리뷰 진행 상태는 `npm run review:status`로 확인한다.
- `main` 보호 설정은 `npm run branch:protect:main`으로 적용/유지한다.

## Interview Gate

- 제품/정책/스코프 선택이 필요한 지점만 인터뷰 질문으로 사용자에게 확인한다.
- 구현 세부/기술적 자동화 가능한 항목은 질문 없이 에이전트가 계속 진행한다.

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

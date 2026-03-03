# AGENTS

## Objective

작업은 반드시 독립 검증 가능한 원자 태스크 단위로 분할하고, 역할별 책임을 분리해 병렬 실행한다.

## Ownership

- Subagent: 코드 탐색/검증 체크리스트 작성
- GitHub Copilot CLI: 코드 구현/로컬 실행/커밋
- Cloud Agent: CI 기반 독립 재현 검증

## Required Gates Before Commit

1. `npm run check`
2. `npm run build`
3. `npm run smoke:prepare`
4. `npm run smoke:run`
5. `npm run smoke:assert`
6. `npm run verify:e2e`

## Progress Tracking

- 로컬 시각 추적 실행: `npm run verify:tracked`
- 로컬 실시간 모니터: `npm run progress:watch`
- 로컬 산출물: `.tmp/agent-progress.json`, `.tmp/agent-progress.md`, `.tmp/agent-progress-logs/*.log`
- Cloud 산출물: `Validation` 워크플로우의 Step Summary + `cloud-agent-progress` 아티팩트

## Task Assignment

- 레인 할당: Chat에서 `/assign-lanes <스코프>` 실행
- Subagent 점검: `/subagent-check <태스크 ID>` 실행
- CLI 실행: `/cli-execute <태스크 ID>` 실행
- Cloud 검증: `/cloud-validate <브랜치 또는 SHA>` + `npm run cloud:dispatch`/`npm run cloud:status`

## Branch And Review Model

- 기본 브랜치 전략: `main`은 머지 전용, 구현은 `feat/*` 또는 `chore/*` 브랜치에서 진행
- 병렬 레인 실행: `npm run lane:worktree:setup`으로 worktree 3개(Subagent/CLI/Cloud) 준비
- PR 기반 리뷰: 모든 구현 브랜치는 PR 생성 후 리뷰 승인 + Validation 성공 시 머지
- 단일 협업자 저장소는 self-approval 제약이 있으므로 `npm run branch:protect:main` solo mode(승인 0) 적용 후 머지
- 리뷰 상태 확인: `npm run review:status`

## Process Rules

- 각 태스크는 단일 목적, 단일 검증 명령을 가져야 한다.
- 실패한 게이트부터 복구하고 전체 체인을 다시 통과한다.
- 스펙 변경 시 `docs/requirements.md`와 `docs/atomic-task-plan.md`를 함께 갱신한다.
- 사용자가 별도 예외를 요청하지 않으면 작업 완료 시 반드시 커밋/푸시까지 수행한다.

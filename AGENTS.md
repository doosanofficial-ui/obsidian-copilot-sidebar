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

## Process Rules

- 각 태스크는 단일 목적, 단일 검증 명령을 가져야 한다.
- 실패한 게이트부터 복구하고 전체 체인을 다시 통과한다.
- 스펙 변경 시 `docs/requirements.md`와 `docs/atomic-task-plan.md`를 함께 갱신한다.

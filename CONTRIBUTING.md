# Contributing

## 브랜치 전략

- `main`: 배포 가능한 안정 브랜치
- 기능 개발은 `feature/*` 브랜치에서 진행

## 커밋 규칙

- 가능한 작은 단위로 커밋
- 권장 형식: `type(scope): summary`
- 예시: `feat(sidebar): add session switcher`

## PR 규칙

- 변경 목적과 테스트 방법을 PR 본문에 포함
- UI 변경 시 캡처 또는 짧은 동영상 첨부
- 스펙 변경은 `docs/requirements.md` 동기화
- 작업 분해/역할 할당은 `docs/atomic-task-plan.md`, `docs/agent-workflow.md` 기준으로 수행

## 검증 게이트

커밋 전 아래 명령을 순서대로 통과해야 합니다.

```bash
npm run check
npm run build
npm run smoke:prepare
npm run smoke:run
npm run smoke:assert
npm run verify:e2e
```

## 로컬 개발

```bash
npm install
npm run dev
```

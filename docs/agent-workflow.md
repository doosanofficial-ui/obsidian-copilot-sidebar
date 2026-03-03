# Agent Workflow Guide

이 문서는 동일 작업을 Subagent, GitHub Copilot CLI, Cloud Agent에 분리 할당해 속도와 정확도를 동시에 확보하기 위한 실행 지침이다.

## 1. 역할 분리

### Subagent (분석/검증 단위)

- 코드 탐색, 함수/흐름 점검, 누락 경로 탐지
- 산출물: "검증 체크리스트 + 리스크 목록"
- 금지: 임의 스코프 확장, 대규모 리팩터

### GitHub Copilot CLI (로컬 구현 단위)

- 실제 코드 수정, 스크립트 작성, 로컬 검증 실행
- 산출물: 변경 파일 + 실행 로그 + 진행률 리포트 + 커밋
- 책임: 충돌 해결, 게이트 통과 증빙

### Cloud Agent (원격 재현 단위)

- 깨끗한 환경에서 재현 검증
- 산출물: CI 상태(필수 게이트), Step Summary, 아티팩트 로그
- 책임: 플랫폼 차이로 인한 회귀 탐지

## 2. 입출력 계약

### 입력 규약

- 모든 태스크는 `ID`, `목표`, `완료 조건`, `검증 명령`을 포함
- 각 에이전트는 자신에게 할당된 태스크 외 변경 금지

### 출력 규약

- Subagent: "파일/심볼/리스크" 중심 요약
- Copilot CLI: "수정 파일 + 실행 명령 + 결과 + 커밋 SHA + 푸시 결과"
- Cloud Agent: "워크플로우 잡명 + 실패 지점 + 재현 명령"

## 3. 실행 순서

1. Copilot CLI가 기준 브랜치/의존성을 준비
2. Subagent가 코드 경로 검증 및 체크리스트 전달
3. Copilot CLI가 스크립트/워크플로우 구현
4. Cloud Agent가 CI로 독립 재검증
5. Copilot CLI가 최종 E2E 게이트 통과 후 커밋
6. Copilot CLI가 원격 브랜치로 푸시하고 동기화 상태를 확인

기본 원칙: 사용자가 명시적으로 제외를 지시하지 않으면 구현 작업은 커밋/푸시 완료까지 포함한다.

## 4. 표준 명령

```bash
npm run check
npm run build
npm run smoke:prepare
npm run smoke:run
npm run smoke:assert
npm run verify:e2e
npm run verify:tracked
npm run progress:watch
npm run cloud:dispatch
npm run cloud:status
npm run lane:worktree:setup
npm run lane:worktree:status
npm run review:status
npm run branch:protect:main
npm run branch:protect:status
```

## 5. VS Code 연동 설정

VS Code 공식 문서의 Custom Instructions/Prompt Files 가이드를 따라 아래 경로를 활성화한다.

- 항상 적용 지침: `.github/copilot-instructions.md`, `AGENTS.md`
- 프롬프트 파일 경로: `.github/prompts/*.prompt.md`
- 워크스페이스 설정: `.vscode/settings.json`

권장 사용 순서:

1. `/assign-lanes`로 레인 분배
2. `/subagent-check`로 리스크 체크리스트 확보
3. `npm run lane:worktree:setup`으로 레인별 worktree 준비
4. `/cli-execute`로 구현/게이트/커밋/푸시
5. `/cloud-validate`와 `npm run cloud:dispatch`로 원격 검증
6. PR 생성 후 `npm run review:status`로 리뷰/체크 상태 확인

## 6. Git Branch/Review 고정 규칙

- 구현은 `main` 직접 커밋 대신 기능 브랜치에서 수행한다.
- 리뷰는 PR 단위로 진행하며 `CODEOWNERS` 기반 리뷰를 기본값으로 한다.
- 단일 협업자 저장소는 self-approval이 불가능하므로 `npm run branch:protect:main`의 solo mode(승인 0)를 사용한다.
- `main` 브랜치 보호 설정을 적용하고 유지한다.
- 권장 명령:

```bash
npm run branch:protect:main
npm run branch:protect:status
```

## 7. 진행률 추적 산출물

- 로컬 추적 상태: `.tmp/agent-progress.json`
- 로컬 추적 요약: `.tmp/agent-progress.md`
- 단계별 로그: `.tmp/agent-progress-logs/*.log`
- Cloud 추적 아티팩트: `cloud-agent-progress`

## 8. 실패 처리 규칙

- 타입 실패: 코드 수정 후 `npm run check`부터 재시작
- 빌드 실패: `npm run build` 단독 복구 후 체인 재실행
- 스모크 실패: `.tmp/smoke-run.json` 원인 확인 후 `smoke:run` 재실행
- CI 실패: Cloud 로그 기준으로 로컬 동일 명령 재현 후 수정

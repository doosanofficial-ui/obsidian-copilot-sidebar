# Agent Workflow Guide

이 문서는 동일 작업을 Subagent, GitHub Copilot CLI, Cloud Agent에 분리 할당해 속도와 정확도를 동시에 확보하기 위한 실행 지침이다.

## 1. 역할 분리

### Subagent (분석/검증 단위)

- 코드 탐색, 함수/흐름 점검, 누락 경로 탐지
- 산출물: "검증 체크리스트 + 리스크 목록"
- 금지: 임의 스코프 확장, 대규모 리팩터

### GitHub Copilot CLI (로컬 구현 단위)

- 실제 코드 수정, 스크립트 작성, 로컬 검증 실행
- 산출물: 변경 파일 + 실행 로그 + 커밋
- 책임: 충돌 해결, 게이트 통과 증빙

### Cloud Agent (원격 재현 단위)

- 깨끗한 환경에서 재현 검증
- 산출물: CI 상태(필수 게이트), 실패 로그
- 책임: 플랫폼 차이로 인한 회귀 탐지

## 2. 입출력 계약

### 입력 규약

- 모든 태스크는 `ID`, `목표`, `완료 조건`, `검증 명령`을 포함
- 각 에이전트는 자신에게 할당된 태스크 외 변경 금지

### 출력 규약

- Subagent: "파일/심볼/리스크" 중심 요약
- Copilot CLI: "수정 파일 + 실행 명령 + 결과"
- Cloud Agent: "워크플로우 잡명 + 실패 지점 + 재현 명령"

## 3. 실행 순서

1. Copilot CLI가 기준 브랜치/의존성을 준비
2. Subagent가 코드 경로 검증 및 체크리스트 전달
3. Copilot CLI가 스크립트/워크플로우 구현
4. Cloud Agent가 CI로 독립 재검증
5. Copilot CLI가 최종 E2E 게이트 통과 후 커밋

## 4. 표준 명령

```bash
npm run check
npm run build
npm run smoke:prepare
npm run smoke:run
npm run smoke:assert
npm run verify:e2e
```

## 5. 실패 처리 규칙

- 타입 실패: 코드 수정 후 `npm run check`부터 재시작
- 빌드 실패: `npm run build` 단독 복구 후 체인 재실행
- 스모크 실패: `.tmp/smoke-run.json` 원인 확인 후 `smoke:run` 재실행
- CI 실패: Cloud 로그 기준으로 로컬 동일 명령 재현 후 수정

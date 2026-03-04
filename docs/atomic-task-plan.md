# Atomic Task Plan (Iteration 1)

목표: 독립적으로 검증 가능한 최소 단위 태스크를 기준으로, 병렬 실행 후 단일 커밋 게이트를 통과한다.

## 1) 원자 태스크 목록

| ID | 목표 | 담당 | 독립 검증 기준 |
|---|---|---|---|
| T01 | 작업 브랜치 생성 | Copilot CLI | `git checkout -b iter/atomic-e2e-v1` |
| T02 | 의존성 설치 | Copilot CLI | `npm ci` |
| T03 | 베이스라인 타입/빌드 확인 | Copilot CLI | `npm run check && npm run build` |
| T04 | 원자 태스크/역할 계약 문서화 | Copilot CLI | `docs/agent-workflow.md` 생성 |
| T05 | 사이드바 뷰 타입 상수 검증 | Subagent | `src/main.ts`에 `copilot-sidebar-view` 존재 |
| T06 | 명령 등록 경로 검증 | Subagent | `src/main.ts`에 `open-copilot-sidebar` 존재 |
| T07 | 뷰 활성화 경로 검증 | Subagent | `activateView`에서 `setViewState` 호출 확인 |
| T08 | 언로드 정리 경로 검증 | Subagent | `onunload`에서 `detachLeavesOfType` 호출 |
| T09 | 스모크 준비 스크립트 작성 | Copilot CLI | `npm run smoke:prepare` 성공 |
| T10 | 런타임 스모크 실행 스크립트 작성 | Copilot CLI | `npm run smoke:run` 성공 |
| T11 | 스모크 결과 단정 스크립트 작성 | Copilot CLI | `npm run smoke:assert` 성공 |
| T12 | 패키지 스크립트 연결 | Copilot CLI | `package.json`에 `smoke:*`, `verify:e2e` 존재 |
| T13 | CI 워크플로우 추가 | Cloud Agent | `.github/workflows/validation.yml` 존재 |
| T14 | Cloud 런타임 게이트 실행 | Cloud Agent | CI에서 `verify:tracked` 성공 + 진행률 아티팩트 업로드 |
| T15 | 병렬 결과 통합/충돌 확인 | Copilot CLI | `git grep -n '<<<<<<<\|=======\|>>>>>>>'` 무출력 |
| T16 | 로컬 최종 게이트 재실행 | Copilot CLI | `npm run verify:e2e` 성공 |
| T17 | 변경 범위 검증 | Copilot CLI | `git diff --name-only`가 합의 범위 내 |
| T18 | 커밋/푸시 | Copilot CLI | 원격 `main` 반영 |
| T19 | 로컬 진행률 추적 러너 추가 | Copilot CLI | `npm run verify:tracked`가 `.tmp/agent-progress.json` 생성 |
| T20 | 로컬 실시간 모니터 추가 | Copilot CLI | `npm run progress:watch` 실행 시 상태 갱신 표시 |

## 2) 의존성 그래프

- `T01 -> T02 -> T03 -> T04`
- `T04 -> T05 -> T06 -> T07 -> T08`
- `T04 -> T09 -> T10 -> T11 -> T12`
- `T04 -> T13 -> T14`
- `T08, T12, T14 -> T15 -> T16 -> T17 -> T18`
- `T12 -> T19 -> T20`

## 3) 병렬 실행 레인

- Lane A (Subagent): `T05-T08`
- Lane B (Copilot CLI): `T09-T12`
- Lane C (Cloud Agent): `T13-T14`

## 4) 커밋 전 최소 게이트

1. `npm run check`
2. `npm run build`
3. `npm run smoke:prepare && npm run smoke:run && npm run smoke:assert`
4. `npm run verify:e2e`
5. `npm run verify:tracked` 결과와 `.tmp/agent-progress.md` 확인
6. 충돌 마커 없음 + 변경 범위 검증 완료

## 5) 완료 규칙

- 사용자 예외 지시가 없으면 구현 태스크의 완료 조건에 `커밋 + 원격 푸시`를 포함한다.

## 6) Iteration 2 (M2) 레인 할당 템플릿

| ID | 목표 | 담당 | 독립 검증 기준 |
|---|---|---|---|
| M2-S01 | SDK/인증 경로 리스크 점검 | Subagent | `/subagent-check M2-S01` 결과에 리스크/우회안 포함 |
| M2-C01 | 사이드바 채팅 뷰 확장 | Copilot CLI | `npm run check && npm run build` |
| M2-C02 | 세션 생성/전환/삭제 구현 | Copilot CLI | `npm run smoke:run && npm run smoke:assert` |
| M2-C03 | 스트리밍 응답 렌더 모의 구현 | Copilot CLI | `npm run verify:e2e` |
| M2-CL01 | 클라우드 검증 실행 | Cloud Agent | `npm run cloud:dispatch` 후 `npm run cloud:status`에서 최신 run 확인 |

## 7) 인터뷰 필요 게이트

- SDK 우선 경로 선택(SdkAdapter vs CliBridgeAdapter)
- 인증 플로우 선택(Device Flow vs OAuth)
- 스트리밍 UX 레벨(토큰 단위/문단 단위)

## 8) Iteration 3 (Governance) 고정 태스크

| ID | 목표 | 담당 | 독립 검증 기준 |
|---|---|---|---|
| G01 | worktree 병렬 실행 준비 | Copilot CLI | `npm run lane:worktree:setup` |
| G02 | worktree 상태 점검 | Copilot CLI | `npm run lane:worktree:status` |
| G03 | PR 리뷰 템플릿/오너 지정 | Copilot CLI | `.github/pull_request_template.md`, `.github/CODEOWNERS` 존재 |
| G04 | main 브랜치 보호 적용 | Cloud Agent | `npm run branch:protect:main` 성공 |
| G05 | 보호 설정 상태 검증 | Cloud Agent | `npm run branch:protect:status` 성공 |
| G06 | PR 기반 리뷰 확인 | Cloud Agent | `npm run review:status`에서 PR/체크 상태 확인 |
| G07 | 단일 협업자 solo mode 검증 | Cloud Agent | `npm run branch:protect:status`에서 `reviewPolicyMode=solo` 확인 |

## 9) Iteration 4 (M3) 템플릿

| ID | 목표 | 담당 | 독립 검증 기준 |
|---|---|---|---|
| M3-C01 | 명시적 추가 컨텍스트 노트 병합 | Copilot CLI | `npm run check && npm run build` |
| M3-C02 | 변경 제안 diff 프리뷰 UI 추가 | Copilot CLI | `npm run smoke:run && npm run smoke:assert` |
| M3-C03 | pending discard 및 마지막 적용 undo 구현 | Copilot CLI | `npm run verify:e2e` |
| M3-CL01 | M3 변경의 Cloud 검증 실행 | Cloud Agent | `npm run cloud:dispatch` 후 `npm run cloud:status`에서 최신 run 확인 |

## 10) Iteration 5 (M1 Auth Probe) 템플릿

| ID | 목표 | 담당 | 독립 검증 기준 |
|---|---|---|---|
| M1-C01 | gh 기반 로그인 상태 probe 구현 | Copilot CLI | `npm run check && npm run build` |
| M1-C02 | entitlement/no-entitlement 상태 매핑 | Copilot CLI | `npm run smoke:run && npm run smoke:assert` |
| M1-C03 | 수동 재검증 명령/버튼 연계 | Copilot CLI | `npm run verify:e2e` |
| M1-CL01 | M1 변경의 Cloud 검증 실행 | Cloud Agent | `npm run cloud:dispatch` 후 `npm run cloud:status`에서 최신 run 확인 |

## 11) Iteration 6 (M4 Settings + Recovery) 템플릿

| ID | 목표 | 담당 | 독립 검증 기준 |
|---|---|---|---|
| M4-C01 | 사이드바 설정 패널(모델/컨텍스트 정책/쓰기 정책) 구현 | Copilot CLI | `npm run check && npm run build` |
| M4-C02 | 쓰기 적용 정책(confirm/auto) 반영 | Copilot CLI | `npm run smoke:run && npm run smoke:assert` |
| M4-C03 | 실패 프롬프트 저장/재시도 명령 및 UI 연계 | Copilot CLI | `npm run verify:e2e` |
| M4-CL01 | M4 변경의 Cloud 검증 실행 | Cloud Agent | `npm run cloud:dispatch` 후 `npm run cloud:status`에서 최신 run 확인 |

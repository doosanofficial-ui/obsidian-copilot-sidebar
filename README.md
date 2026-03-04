# Obsidian Copilot Sidebar

GitHub Copilot SDK 기반으로 Obsidian 사이드바에 Copilot CLI 수준의 작업 경험을 제공하는 플러그인 프로젝트 초안입니다.

## 목표

- Obsidian 내부에서 사이드바 채팅 UX 제공
- GitHub Copilot 계정 연동 기반 인증/사용
- Copilot CLI 핵심 흐름(질문, 컨텍스트 주입, 파일 변경 제안/적용)과 기능 동등성 확보

## 현재 상태

- 리포지토리/문서/기본 플러그인 스캐폴드 생성 완료
- M2 기본 UX 반영: 사이드바 채팅 뷰, 세션 생성/전환/삭제, 모의 스트리밍 응답
- 명령 팔레트 연동 확장: `Open`, `Ask about current note`, `Apply pending changes`, `Start new chat session`, `Undo last applied change`, `Refresh auth status`, `Open sidebar settings panel`, `Retry last failed prompt`, `Copy diagnostics summary`, `Capture beta feedback note`
- 로컬 세션/상태 저장 및 pending change 적용 기본 흐름 구현
- M3 컨텍스트/변경 흐름 확장: 명시적 추가 컨텍스트 노트 병합, 변경 전 diff 프리뷰, discard/undo 적용
- M1 인증 실연동 경로(Desktop): `gh auth status`/`gh copilot status` 기반 로그인/권한 상태 probe + 수동 재검증
- M4 설정/복구 흐름: 사이드바 내 설정 패널(모델/컨텍스트 정책/쓰기 정책/디버그/재시도) + 실패 프롬프트 재시도
- M5 안정화 1차: 스트리밍 렌더 배치 최적화, 진단 메트릭(지연/토큰/렌더 횟수/오류 카테고리), 진단 요약 복사 명령
- M5 안정화 2차: 베타 피드백 노트 자동 생성(`Copilot Sidebar Feedback/*`) 및 최근 대화/진단 자동 첨부
- 상세 요구사항: `docs/requirements.md`
- 아키텍처 초안: `docs/architecture.md`
- 구현 마일스톤: `docs/milestones.md`
- 원자 태스크 계획: `docs/atomic-task-plan.md`
- 에이전트 워크플로우: `docs/agent-workflow.md`

## 빠른 시작

```bash
npm install
npm run dev
```

Obsidian Vault의 플러그인 디렉터리에 이 프로젝트를 위치시키고(또는 빌드 결과를 복사), 커뮤니티 플러그인 개발 모드에서 로드합니다.

## 문서

- 요구사항 스펙: [docs/requirements.md](docs/requirements.md)
- 아키텍처: [docs/architecture.md](docs/architecture.md)
- 마일스톤: [docs/milestones.md](docs/milestones.md)
- 원자 태스크 계획: [docs/atomic-task-plan.md](docs/atomic-task-plan.md)
- 에이전트 워크플로우: [docs/agent-workflow.md](docs/agent-workflow.md)
- 기여 가이드: [CONTRIBUTING.md](CONTRIBUTING.md)

## 기본 명령어

- `npm run dev`: 개발 모드 번들(watch)
- `npm run build`: 프로덕션 번들
- `npm run check`: 타입 체크
- `npm run verify:e2e`: 타입/빌드/런타임 스모크 E2E 검증
- `npm run verify:tracked`: 단계별 진행률/로그 파일을 남기며 검증 실행
- `npm run progress:watch`: `.tmp/agent-progress.json`을 실시간 모니터링
- `npm run cloud:dispatch`: GitHub Actions `Validation` 워크플로우 실행(gh 필요)
- `npm run cloud:status`: 최근 `Validation` 실행 상태 확인(gh 필요)
- `npm run lane:worktree:setup`: 레인별 worktree(Subagent/CLI/Cloud) 자동 생성
- `npm run lane:worktree:status`: worktree/브랜치 상태 조회
- `npm run review:status`: PR 리뷰/체크 상태 조회
- `npm run branch:protect:main`: main 브랜치 보호 설정 적용
- `npm run branch:protect:status`: main 보호 설정 상태 조회

## 3레인 태스크 할당 (Subagent/CLI/Cloud)

VS Code 공식 문서의 Custom Instructions + Prompt Files 패턴을 사용합니다.

- 워크스페이스 설정: `.vscode/settings.json`
- 항상 적용 지침: `.github/copilot-instructions.md`, `AGENTS.md`
- 슬래시 프롬프트: `.github/prompts/*.prompt.md`

실행 순서:

1. Chat에서 `/assign-lanes <스코프>` 실행
2. Subagent 레인: `/subagent-check <태스크 ID>` 실행
3. `npm run lane:worktree:setup` 실행
4. CLI 레인: `/cli-execute <태스크 ID>` 실행
5. Cloud 레인: `/cloud-validate <브랜치/SHA>` + `npm run cloud:dispatch` + `npm run cloud:status`
6. PR 생성 후 `npm run review:status`로 리뷰/체크 확인

인터뷰 규칙:

- 제품/정책/스코프 선택 지점만 질문
- 나머지 구현/검증은 에이전트가 연속 수행

## 권장 Git 운영 고정안

- `main`은 머지 전용 브랜치로 유지
- 구현은 `feat/*`, `chore/*` 브랜치에서 진행
- 병렬 작업은 worktree 분리로 충돌 최소화
- PR 리뷰 승인 + Validation 성공 후 머지
- 협업자 1명 저장소는 `npm run branch:protect:main` 실행 시 solo mode(승인 0) 보호 규칙 적용

## 진행 상황 추적

### 로컬 CLI 추적

1. 터미널 A에서 `npm run verify:tracked` 실행
2. 터미널 B에서 `npm run progress:watch` 실행

생성되는 파일:

- 상태 JSON: `.tmp/agent-progress.json`
- 상태 Markdown: `.tmp/agent-progress.md`
- 단계별 로그: `.tmp/agent-progress-logs/*.log`

### Cloud( GitHub Actions ) 추적

- `Validation` 워크플로우의 `cloud-agent-runtime-e2e` 잡에서 진행 요약을 `Step Summary`로 게시
- 동일 잡에서 `cloud-agent-progress` 아티팩트로 상태/로그 파일 업로드

## 라이선스

[MIT](LICENSE)

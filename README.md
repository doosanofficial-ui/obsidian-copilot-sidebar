# Obsidian Copilot Sidebar

GitHub Copilot SDK 기반으로 Obsidian 사이드바에 Copilot CLI 수준의 작업 경험을 제공하는 플러그인 프로젝트 초안입니다.

## 목표

- Obsidian 내부에서 사이드바 채팅 UX 제공
- GitHub Copilot 계정 연동 기반 인증/사용
- Copilot CLI 핵심 흐름(질문, 컨텍스트 주입, 파일 변경 제안/적용)과 기능 동등성 확보

## 현재 상태

- 리포지토리/문서/기본 플러그인 스캐폴드 생성 완료
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

## 3레인 태스크 할당 (Subagent/CLI/Cloud)

VS Code 공식 문서의 Custom Instructions + Prompt Files 패턴을 사용합니다.

- 워크스페이스 설정: `.vscode/settings.json`
- 항상 적용 지침: `.github/copilot-instructions.md`, `AGENTS.md`
- 슬래시 프롬프트: `.github/prompts/*.prompt.md`

실행 순서:

1. Chat에서 `/assign-lanes <스코프>` 실행
2. Subagent 레인: `/subagent-check <태스크 ID>` 실행
3. CLI 레인: `/cli-execute <태스크 ID>` 실행
4. Cloud 레인: `/cloud-validate <브랜치/SHA>` + `npm run cloud:dispatch` + `npm run cloud:status`

인터뷰 규칙:

- 제품/정책/스코프 선택 지점만 질문
- 나머지 구현/검증은 에이전트가 연속 수행

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

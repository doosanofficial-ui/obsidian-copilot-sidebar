# Milestones

## M1: 기술 검증 ✅ (완료)

- GitHub Copilot SDK 인증/스트리밍 POC
- 계정 연동 및 entitlement 체크
- `gh auth status` / `gh copilot status` 기반 상태 probe 구현
- SDK 사용 가능 여부 `go/no-go` 판단 → CliBridgeAdapter 경로 선택

## M2: 기본 UX ✅ (완료)

- 사이드바 채팅 뷰
- 스트리밍 응답 렌더링 (배치 최적화 포함)
- 세션 생성/전환/삭제 (최대 20개)

## M3: 컨텍스트/변경 적용 ✅ (완료)

- 활성 노트/선택 텍스트 컨텍스트 주입
- 명시적 추가 컨텍스트 노트 병합
- 변경 제안 diff 프리뷰 (최대 120줄)
- 적용/취소/되돌리기

## M4: CLI 기능 동등성 강화 ✅ (완료)

- 핵심 명령 플로우 매핑 (10개 명령 팔레트 연동)
- 설정 화면(모델/권한 정책/컨텍스트 정책/디버그)
- 오류 복구 플로우 (실패 프롬프트 저장/재시도)

## M5: 안정화/베타 ✅ (완료)

- 스트리밍 배치 렌더 최적화 및 메시지 상한 (200개)
- 진단 메트릭 수집 및 복사 명령
- 베타 피드백 노트 자동 생성 (`Copilot Sidebar Feedback/*`)
- CI 기반 검증 게이트 전 단계 통과

## M6: 프로덕션 릴리스 ✅ (완료)

- 버전 1.0.0 확정 (`manifest.json`, `package.json`, `versions.json`)
- CHANGELOG.md 작성
- 문서/README 완료 상태 반영
- GitHub 릴리스 태그 v1.0.0

## M7: Live Copilot Bridge ✅ (완료)

- 목업 응답 경로 제거, `gh copilot -p` 기반 실응답 경로 적용
- `CopilotEngineAdapter` + `GhCopilotCliAdapter` 구현
- 최신 `gh copilot` 브리지 모드(`gh copilot -- --version`) 인증 probe 호환
- 진단 요약에 마지막 엔진 식별자(`lastEngineId`) 포함

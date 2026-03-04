# Requirements Specification

## 1. 배경

사용자는 Obsidian 내에서 GitHub Copilot CLI와 유사한 작업 경험을 원한다. 플러그인은 사이드바 UI를 통해 질의/응답, 컨텍스트 활용, 제안된 변경 적용을 지원해야 한다.

## 2. 제품 목표

- GitHub Copilot 계정 연동 기반 사용
- Obsidian 네이티브 UX에 맞는 사이드바 인터페이스 제공
- Copilot CLI의 핵심 가치(빠른 질의응답, 코드/문서 편집 제안, 실행 가능한 워크플로우) 유지

## 3. 비목표 (Out of Scope)

- 모바일 Obsidian 완전 지원(1차 릴리스 제외)
- 모든 외부 CLI 도구의 무제한 실행
- Obsidian 외부 IDE 기능 전면 복제

## 4. 사용자 유형

- 기술 문서를 작성하는 개인/팀
- Vault 내 노트 정리/변환 자동화를 원하는 사용자
- Obsidian에서 AI 보조 편집을 일관되게 사용하려는 사용자

## 5. 기능 요구사항

### FR-001 사이드바 채팅 인터페이스

- 우측(또는 설정 가능한) 사이드바 뷰로 채팅 제공
- 스트리밍 응답 렌더링 지원
- 멀티 세션(최소 최근 세션 목록) 지원

### FR-002 GitHub Copilot 계정 연동

- GitHub 로그인(디바이스 플로우 또는 SDK 권장 플로우)
- Copilot entitlement 확인
- 로그인 상태 표시: `로그인됨`, `권한 없음`, `토큰 만료`, `오프라인`
- Desktop 환경에서 `gh auth status`/`gh copilot status` 기반 상태 probe를 지원한다.
- 최신 `gh copilot`(CLI 브리지 모드) 환경에서는 `gh copilot -- --version` 기반 가용성 probe를 지원한다.
- 사용자가 사이드바/명령 팔레트에서 인증 상태를 수동 재검증할 수 있어야 한다.

### FR-003 컨텍스트 주입

- 현재 활성 노트 본문 포함
- 선택 텍스트 우선 포함
- 명시적 노트 선택 후 추가 컨텍스트 병합

### FR-004 변경 제안 및 적용

- 응답에서 파일 생성/수정 제안 구조화
- 적용 전 diff 프리뷰 제공
- 적용/취소/되돌리기 동작 제공

### FR-005 명령 팔레트 연계

- `Open Copilot Sidebar`
- `Ask about current note`
- `Apply pending changes`
- `Start new chat session`
- `Undo last applied change`
- `Refresh auth status`
- `Open sidebar settings panel`
- `Retry last failed prompt`
- `Copy diagnostics summary`
- `Capture beta feedback note`

### FR-006 세션/설정 저장

- 로컬에 세션 메타데이터 저장
- 설정(모델, 권한 정책, 컨텍스트 정책) 저장
- 민감정보는 OS 키체인 또는 안전 저장소 사용

### FR-007 오류 처리

- 네트워크/인증/권한 오류를 사용자 친화 메시지로 표기
- 재시도, 재인증 경로 제공
- 인증 실패 상태에서 실패 프롬프트를 저장하고 재시도 명령으로 복구할 수 있어야 한다.
- 사용자가 진단/최근 대화 맥락을 포함한 베타 피드백 노트를 생성할 수 있어야 한다.

## 6. 비기능 요구사항

### NFR-001 성능

- 채팅 입력 후 첫 토큰 표시까지 목표 2초 이내(정상 네트워크 환경)

### NFR-002 안정성

- 플러그인 런타임 오류 발생 시 Obsidian 전체 동작에 영향 없어야 함

### NFR-003 보안

- 토큰 평문 저장 금지
- 외부 실행은 사용자 승인 게이트를 거쳐야 함

### NFR-004 가시성

- 디버그 로그 레벨 제어
- 사용자에게 실패 원인 카테고리 표시
- 사용자가 진단 요약(성능/오류 상태)을 복사해 공유할 수 있어야 한다.

## 7. 수용 기준 (Acceptance Criteria)

- AC-001: 사용자 로그인 후 사이드바에서 질문/응답이 정상 동작한다.
- AC-002: 현재 노트 컨텍스트를 포함한 답변 생성이 가능하다.
- AC-003: 변경 제안을 diff로 확인하고 선택 적용할 수 있다.
- AC-004: 로그인 만료 시 재인증 플로우가 노출된다.
- AC-005: 플러그인 재시작 후 최근 세션/설정이 복원된다.

## 8. 오픈 이슈

- GitHub Copilot SDK의 외부 앱 통합 정책/범위 최종 확인
- CLI 완전 동등성의 기능 경계 정의
- 텔레메트리/로그 수집 정책(옵트인) 확정

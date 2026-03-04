# Architecture Draft

## 1. 구성요소

- `SidebarView`: 채팅 UI, 세션 목록, 상태 표시
- `CopilotEngineAdapter`: 엔진 교체 가능한 추상화 계층
- `GhCopilotCliAdapter`: `gh copilot -p` 기반 실응답 브리지 (현재 기본)
- `ContextProvider`: 현재 노트/선택 텍스트/참조 노트 수집
- `ChangeManager`: 제안 변경 diff 생성, 적용/되돌리기
- `SettingsStore`: 사용자 설정 및 세션 메타데이터 저장
- `AuthService`: GitHub 인증 및 entitlement 확인

## 2. 어댑터 전략

동일한 인터페이스를 정의하고 구현체를 교체 가능하게 유지한다.

- `GhCopilotCliAdapter` (현재): GitHub CLI가 다운로드/실행하는 Copilot CLI를 브리지로 사용
- `SdkAdapter` (후속): SDK 정책/배포 모델이 확정되면 동일 인터페이스로 교체

## 3. 요청 처리 흐름

1. 사용자 입력 + 컨텍스트 선택
2. `ContextProvider`가 프롬프트 컨텍스트 구성
3. `CopilotEngineAdapter` 구현체(`GhCopilotCliAdapter`)로 `gh copilot -p` 요청 전송
4. 스트리밍 응답을 `SidebarView`에 반영
5. 변경 제안 존재 시 `ChangeManager`가 diff 프리뷰 생성
6. 사용자 승인 후 파일 반영

## 4. 보안 원칙

- 인증 토큰은 키체인 사용
- 파일 쓰기/외부 실행은 승인 게이트 강제
- 로그에는 토큰/민감 문자열 마스킹

## 5. 테스트 전략

- 단위 테스트: 컨텍스트 조합, 응답 파싱, 변경 적용 로직
- 통합 테스트: 인증 상태 전이, 사이드바 세션 복원
- 수동 테스트: Obsidian 환경에서 UX 시나리오 검증

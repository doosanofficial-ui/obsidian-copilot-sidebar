# Subagent Check — M7 Live Copilot Bridge

## Scope

- `src/main.ts` 목업 응답 경로 제거 여부
- `gh copilot` 실연동 경로 안정성
- 인증 상태 전이 및 진단 노출 점검

## Checklist

- [x] `sendUserMessage`가 `composeMockResponse` 대신 라이브 어댑터 호출 경로를 사용한다.
- [x] 실연동 실패 시 오류 카테고리(`auth`, `entitlement`, `network`, `unknown`)가 진단에 기록된다.
- [x] 최신 `gh copilot` 브리지 모드에서 `status` 서브커맨드에 의존하지 않는다.
- [x] 진단 요약에 마지막 실행 엔진 식별자(`lastEngineId`)가 포함된다.

## Risk Notes

- `gh copilot` 출력 포맷은 버전별로 footer/메타 라인이 달라질 수 있어 후처리 로직 유지보수가 필요하다.
- 로컬 환경에서 `gh auth status`는 통과했지만 Copilot entitlement가 없는 경우 첫 라이브 요청 시점에만 실패가 드러난다.
- Cloud CI는 실제 Copilot 호출을 수행하지 않으므로, 라이브 경로는 로컬 Obsidian 수동 검증이 필수다.

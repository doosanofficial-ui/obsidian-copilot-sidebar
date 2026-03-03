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
- 기여 가이드: [CONTRIBUTING.md](CONTRIBUTING.md)

## 기본 명령어

- `npm run dev`: 개발 모드 번들(watch)
- `npm run build`: 프로덕션 번들
- `npm run check`: 타입 체크

## 라이선스

[MIT](LICENSE)

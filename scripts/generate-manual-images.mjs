#!/usr/bin/env node
/**
 * Generate SVG mockup images for the Copilot Sidebar user manual.
 * Each image is an annotated wireframe of the actual plugin UI.
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUT = join(import.meta.dirname, "..", "docs", "user-manual", "images");
mkdirSync(OUT, { recursive: true });

function write(name, svg) {
  writeFileSync(join(OUT, name), svg.trim() + "\n");
  console.log(`  ✓ ${name}`);
}

/* ── colour tokens ─────────────────────────────────────────── */
const bg       = "#1e1e2e";
const bgAlt    = "#282838";
const bgSec    = "#313143";
const border   = "#44445a";
const accent   = "#7aa2f7";
const accentBg = "rgba(122,162,247,0.14)";
const green    = "rgba(100,200,100,0.25)";
const orange   = "rgba(255,180,80,0.25)";
const muted    = "#888899";
const text     = "#c0caf5";
const white    = "#e0e0f0";
const red      = "#f7768e";
const anno     = "#ff6b6b"; // annotation colour

/* ── reusable SVG helpers ──────────────────────────────────── */
function rect(x, y, w, h, fill = bgAlt, stroke = border, rx = 8) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
}
function txt(x, y, content, size = 12, fill = text, anchor = "start", weight = "normal") {
  return `<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${content}</text>`;
}
function btn(x, y, w, h, label, fill = bgSec) {
  return `${rect(x, y, w, h, fill, border, 6)}${txt(x + w / 2, y + h / 2 + 4, label, 11, text, "middle")}`;
}
function badge(x, y, label, bgColor) {
  const w = label.length * 6 + 16;
  return `<rect x="${x}" y="${y}" width="${w}" height="${20}" rx="10" fill="${bgColor}" stroke="none"/>` +
         txt(x + w / 2, y + 14, label, 10, text, "middle", "600");
}
function arrow(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${anno}" stroke-width="2" marker-end="url(#arrowhead)"/>`;
}
function circle(cx, cy, r = 14) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${anno}" stroke-width="2.5" stroke-dasharray="4,3"/>`;
}
function annoText(x, y, content, size = 12) {
  return txt(x, y, content, size, anno, "start", "700");
}
function defs() {
  return `<defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="${anno}"/>
    </marker>
  </defs>`;
}
function svgOpen(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${defs()}
  <rect width="${w}" height="${h}" fill="${bg}" rx="12"/>`;
}
const svgClose = "</svg>";
function stepCircle(x, y, num) {
  return `<circle cx="${x}" cy="${y}" r="14" fill="${anno}"/>` +
         txt(x, y + 5, String(num), 13, white, "middle", "700");
}

/* ════════════════════════════════════════════════════════════
   01 — Plugin Enable
   ════════════════════════════════════════════════════════════ */
write("01-plugin-enable.svg", `${svgOpen(720, 400)}
  <!-- Obsidian Settings window mock -->
  ${rect(20, 15, 680, 50, bgSec, border, 10)}
  ${txt(360, 47, "⚙ Settings", 16, white, "middle", "700")}

  <!-- Left nav -->
  ${rect(20, 80, 180, 300, bgAlt, border, 10)}
  ${txt(40, 115, "커뮤니티 플러그인", 12, muted)}
  ${rect(30, 125, 160, 30, accentBg, accent, 6)}
  ${txt(50, 145, "Community plugins", 11, accent)}

  <!-- Right content -->
  ${rect(215, 80, 485, 300, bgAlt, border, 10)}
  ${txt(235, 115, "커뮤니티 플러그인", 14, white, "start", "700")}
  ${txt(235, 140, "먼저 커뮤니티 플러그인을 활성화하세요", 11, muted)}

  <!-- toggle row: restricted mode off -->
  ${rect(235, 155, 445, 36, bgSec, border, 6)}
  ${txt(250, 178, "Restricted mode", 12, text)}
  <!-- toggle: off -->
  ${rect(610, 162, 44, 22, accent, "none", 11)}
  <circle cx="641" cy="173" r="8" fill="${white}"/>

  <!-- search -->
  ${rect(235, 205, 445, 30, bgSec, border, 6)}
  ${txt(255, 225, "🔍 Copilot Sidebar", 11, text)}

  <!-- plugin row -->
  ${rect(235, 248, 445, 60, bgSec, border, 6)}
  ${txt(255, 272, "Copilot Sidebar", 13, white, "start", "600")}
  ${txt(255, 292, "GitHub Copilot chat experience in Obsidian sidebar", 10, muted)}
  <!-- enable toggle -->
  ${rect(610, 262, 44, 22, border, "none", 11)}
  <circle cx="623" cy="273" r="8" fill="${muted}"/>

  <!-- Annotations -->
  ${stepCircle(30, 137, 1)}
  ${annoText(55, 30, "① Settings → Community plugins 이동")}
  ${stepCircle(632, 173, 2)}
  ${arrow(646, 173, 665, 200)}
  ${annoText(500, 140, "② Restricted mode OFF")}
  ${stepCircle(632, 273, 3)}
  ${circle(632, 273, 18)}
  ${annoText(440, 330, "③ Copilot Sidebar 토글 ON")}
  ${arrow(550, 325, 614, 285)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   02 — Open Sidebar
   ════════════════════════════════════════════════════════════ */
write("02-open-sidebar.svg", `${svgOpen(720, 380)}
  <!-- Obsidian main window mock -->
  ${rect(20, 15, 680, 50, bgSec, border, 10)}
  ${txt(360, 47, "Obsidian", 16, white, "middle", "700")}

  <!-- Command palette mock -->
  ${rect(140, 90, 440, 270, bgAlt, accent, 12)}
  ${rect(160, 110, 400, 34, bgSec, border, 8)}
  ${txt(180, 132, "> Open Copilot Sidebar", 13, text)}
  
  <!-- search results -->
  ${rect(160, 155, 400, 38, accentBg, accent, 6)}
  ${txt(180, 179, "Copilot Sidebar: Open Copilot Sidebar", 12, white, "start", "600")}
  
  ${rect(160, 198, 400, 34, bgSec, border, 6)}
  ${txt(180, 220, "Copilot Sidebar: Ask about current note", 11, text)}
  
  ${rect(160, 237, 400, 34, bgSec, border, 6)}
  ${txt(180, 259, "Copilot Sidebar: Start new chat session", 11, text)}
  
  ${rect(160, 276, 400, 34, bgSec, border, 6)}
  ${txt(180, 298, "Copilot Sidebar: Apply pending changes", 11, text)}

  <!-- Annotations -->
  ${stepCircle(100, 127, 1)}
  ${arrow(114, 127, 155, 127)}
  ${annoText(30, 80, "① Cmd+P 로")}
  ${annoText(30, 96, "명령어 팔레트 열기")}
  
  ${stepCircle(100, 174, 2)}
  ${arrow(114, 174, 155, 174)}
  ${annoText(160, 345, '② "Copilot" 검색 후 "Open Copilot Sidebar" 클릭', 12)}
  ${circle(360, 174, 210)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   03 — Interface Overview
   ════════════════════════════════════════════════════════════ */
write("03-interface-overview.svg", `${svgOpen(800, 620)}
  <!-- Header -->
  ${rect(20, 15, 760, 40, bgSec, border, 8)}
  ${txt(35, 41, "Copilot Sidebar", 14, white, "start", "700")}
  ${badge(620, 23, "Auth: logged-in", green)}

  <!-- Control buttons bar (3 x 3 grid) -->
  ${rect(20, 65, 760, 80, bgAlt, border, 8)}
  ${btn(30, 75, 140, 28, "New Session")}
  ${btn(178, 75, 140, 28, "Ask Current Note")}
  ${btn(326, 75, 140, 28, "Apply Pending")}
  ${btn(30, 108, 140, 28, "Add Active Context")}
  ${btn(178, 108, 140, 28, "Refresh Auth")}
  ${btn(326, 108, 140, 28, "Retry Failed")}
  ${btn(474, 75, 140, 28, "Copy Diagnostics")}
  ${btn(474, 108, 140, 28, "Capture Feedback")}

  <!-- Left pane -->
  ${rect(20, 155, 250, 445, bgAlt, border, 8)}
  ${txt(35, 180, "SESSIONS", 10, muted, "start", "700")}
  ${rect(30, 188, 230, 32, accentBg, accent, 6)}
  ${txt(42, 208, "Session 1 (active)", 11, accent)}
  ${rect(30, 225, 230, 32, bgSec, border, 6)}
  ${txt(42, 245, "Session 2", 11, text)}

  ${txt(35, 280, "SETTINGS", 10, muted, "start", "700")}
  ${rect(30, 288, 230, 100, bgSec, border, 6)}
  ${txt(42, 308, "Model: gpt-5.3-codex", 10, text)}
  ${txt(42, 325, "Context: Selection First", 10, text)}
  ${txt(42, 342, "Write: Confirm Before Apply", 10, text)}
  ${txt(42, 359, "Debug: off", 10, text)}
  ${txt(42, 376, "Retry: on", 10, text)}

  ${txt(35, 410, "CONTEXT NOTES", 10, muted, "start", "700")}
  ${rect(30, 418, 230, 28, bgSec, border, 6)}
  ${txt(42, 437, "notes/example.md", 10, text)}
  ${btn(210, 421, 42, 22, "✕", bgSec)}

  ${txt(35, 470, "PENDING CHANGES", 10, muted, "start", "700")}
  ${rect(30, 478, 230, 55, bgSec, border, 6)}
  ${txt(42, 498, "Create: new-file.md", 11, white, "start", "600")}
  ${btn(35, 510, 60, 20, "Preview")}
  ${btn(100, 510, 52, 20, "Apply")}
  ${btn(157, 510, 60, 20, "Discard")}

  <!-- Right pane (chat) -->
  ${rect(280, 155, 500, 445, bgAlt, border, 8)}
  ${txt(300, 180, "MESSAGES", 10, muted, "start", "700")}

  <!-- user message -->
  ${rect(290, 190, 480, 55, accentBg, border, 8)}
  ${txt(302, 210, "USER", 9, muted, "start", "600")}
  ${txt(302, 228, "이 노트의 주요 내용을 요약해줘", 12, text)}

  <!-- assistant message -->
  ${rect(290, 255, 480, 70, bgSec, border, 8)}
  ${txt(302, 275, "ASSISTANT", 9, muted, "start", "600")}
  ${txt(302, 293, "이 노트는 프로젝트 요구사항을 정리한 문서입니다.", 12, text)}
  ${txt(302, 310, "주요 내용은 다음과 같습니다...", 12, text)}

  <!-- Preview panel -->
  ${rect(290, 340, 480, 130, bgSec, border, 8)}
  ${txt(302, 362, "CHANGE PREVIEW", 10, muted, "start", "700")}
  ${txt(302, 382, "Create: new-file.md", 12, white, "start", "600")}
  ${rect(300, 392, 460, 40, bg, border, 6)}
  ${txt(312, 412, "+ # New File", 10, green)}
  ${txt(312, 424, "+ This is the new content...", 10, green)}
  ${btn(300, 438, 110, 22, "Apply Previewed")}
  ${btn(415, 438, 110, 22, "Discard Previewed")}
  ${btn(530, 438, 100, 22, "Undo Last")}

  <!-- Composer -->
  ${rect(290, 480, 390, 50, bgSec, border, 8)}
  ${txt(305, 510, "Ask Copilot about this vault...", 11, muted)}
  ${btn(690, 490, 70, 30, "Send", accent)}

  <!-- Annotations with labels -->
  ${annoText(630, 30, "① 헤더 + 인증 뱃지", 11)}
  ${arrow(628, 26, 610, 30)}
  ${annoText(630, 95, "② 컨트롤 버튼 바", 11)}
  ${arrow(628, 91, 475, 91)}
  ${annoText(35, 560, "③ 좌측 패널", 11)}
  ${annoText(35, 575, "(세션/설정/컨텍스트/변경)", 10)}
  ${annoText(540, 560, "④ 우측 채팅 패널", 11)}
  ${annoText(540, 575, "(메시지/프리뷰/입력)", 10)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   04 — Auth Status Badge
   ════════════════════════════════════════════════════════════ */
write("04-auth-status.svg", `${svgOpen(600, 300)}
  ${txt(30, 35, "인증 상태 뱃지 유형", 15, white, "start", "700")}

  <!-- logged-in -->
  ${rect(30, 55, 540, 45, bgAlt, border, 8)}
  ${badge(45, 65, "Auth: logged-in", green)}
  ${txt(210, 82, "✅ 정상 인증 — 모든 기능 사용 가능", 12, text)}

  <!-- no-entitlement -->
  ${rect(30, 110, 540, 45, bgAlt, border, 8)}
  ${badge(45, 120, "Auth: no-entitlement", orange)}
  ${txt(240, 137, "⚠ Copilot 구독 없음 — GitHub에서 구독 필요", 12, text)}

  <!-- token-expired -->
  ${rect(30, 165, 540, 45, bgAlt, border, 8)}
  ${badge(45, 175, "Auth: token-expired", orange)}
  ${txt(235, 192, "⚠ 토큰 만료 — Refresh Auth 버튼 클릭", 12, text)}

  <!-- offline -->
  ${rect(30, 220, 540, 45, bgAlt, border, 8)}
  ${badge(45, 230, "Auth: offline", orange)}
  ${txt(185, 247, "⚠ 오프라인 — 네트워크 연결 확인", 12, text)}

  ${circle(140, 86, 90)}
  ${annoText(30, 290, "💡 뱃지 색상: 초록 = 정상, 주황 = 주의 필요", 12)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   05 — Control Buttons Detail
   ════════════════════════════════════════════════════════════ */
write("05-control-buttons.svg", `${svgOpen(760, 440)}
  ${txt(30, 35, "컨트롤 버튼 바 (8개 기능 버튼)", 15, white, "start", "700")}

  <!-- Buttons grid -->
  ${rect(20, 55, 360, 100, bgAlt, border, 8)}
  ${btn(30, 65, 105, 32, "New Session")}
  ${btn(143, 65, 115, 32, "Ask Current Note")}
  ${btn(266, 65, 105, 32, "Apply Pending")}
  ${btn(30, 105, 115, 32, "Add Active Context")}
  ${btn(153, 105, 100, 32, "Refresh Auth")}
  ${btn(261, 105, 105, 32, "Retry Failed")}

  ${rect(20, 160, 360, 55, bgAlt, border, 8)}
  ${btn(30, 170, 115, 32, "Copy Diagnostics")}
  ${btn(153, 170, 120, 32, "Capture Feedback")}

  <!-- Description cards -->
  ${rect(400, 55, 340, 375, bgAlt, border, 8)}
  ${txt(415, 80, "버튼별 기능 설명", 13, white, "start", "700")}
  
  ${txt(415, 105, "🔵 New Session", 11, accent, "start", "600")}
  ${txt(415, 120, "새 채팅 세션 시작 (최대 20개)", 10, muted)}
  
  ${txt(415, 145, "🔵 Ask Current Note", 11, accent, "start", "600")}
  ${txt(415, 160, "현재 열린 노트를 컨텍스트로 질문", 10, muted)}
  
  ${txt(415, 185, "🔵 Apply Pending", 11, accent, "start", "600")}
  ${txt(415, 200, "대기 중인 변경사항 적용", 10, muted)}
  
  ${txt(415, 225, "🔵 Add Active Context", 11, accent, "start", "600")}
  ${txt(415, 240, "현재 노트를 추가 컨텍스트에 등록", 10, muted)}
  
  ${txt(415, 265, "🔵 Refresh Auth", 11, accent, "start", "600")}
  ${txt(415, 280, "GitHub 인증 상태 새로고침", 10, muted)}
  
  ${txt(415, 305, "🔵 Retry Failed", 11, accent, "start", "600")}
  ${txt(415, 320, "마지막 실패한 프롬프트 재시도", 10, muted)}
  
  ${txt(415, 345, "🔵 Copy Diagnostics", 11, accent, "start", "600")}
  ${txt(415, 360, "진단 요약을 클립보드에 복사", 10, muted)}
  
  ${txt(415, 385, "🔵 Capture Feedback", 11, accent, "start", "600")}
  ${txt(415, 400, "베타 피드백 노트 생성", 10, muted)}

  <!-- Arrows connecting buttons to descriptions -->
  ${arrow(371, 81, 398, 81)}
  ${arrow(371, 121, 398, 121)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   06 — Chat Compose & Send
   ════════════════════════════════════════════════════════════ */
write("06-chat-compose.svg", `${svgOpen(660, 420)}
  ${txt(30, 35, "채팅 메시지 입력 및 전송", 15, white, "start", "700")}

  <!-- Chat area -->
  ${rect(20, 55, 620, 200, bgAlt, border, 8)}
  ${txt(35, 80, "MESSAGES", 10, muted, "start", "700")}
  
  ${rect(30, 90, 600, 45, accentBg, border, 8)}
  ${txt(42, 110, "USER", 9, muted, "start", "600")}
  ${txt(42, 125, "이 노트의 핵심 포인트를 정리해줘", 12, text)}
  
  ${rect(30, 143, 600, 55, bgSec, border, 8)}
  ${txt(42, 163, "ASSISTANT", 9, muted, "start", "600")}
  ${txt(42, 181, "핵심 포인트를 아래와 같이 정리했습니다...", 12, text)}

  <!-- Composer -->
  ${rect(20, 265, 620, 80, bgAlt, border, 8)}
  ${rect(30, 275, 510, 60, bgSec, border, 8)}
  ${txt(45, 305, "Ask Copilot about this vault...", 11, muted)}
  ${btn(550, 285, 80, 44, "Send", accent)}

  <!-- Step annotations -->
  ${stepCircle(30, 310, 1)}
  ${annoText(70, 360, "① 텍스트 영역에 질문 입력")}
  ${stepCircle(590, 330, 2)}
  ${annoText(450, 368, "② Send 버튼 클릭")}
  ${annoText(450, 385, "   또는 Enter 키", 11)}

  <!-- Streaming indicator note -->
  ${rect(20, 395, 620, 20, "none", "none")}
  ${txt(30, 410, "💡 응답 중에는 입력란과 Send 버튼이 비활성화됩니다 (스트리밍 표시: ...)", 11, muted)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   07 — Session Management
   ════════════════════════════════════════════════════════════ */
write("07-session-management.svg", `${svgOpen(600, 420)}
  ${txt(30, 35, "세션 관리", 15, white, "start", "700")}

  <!-- Session panel -->
  ${rect(20, 55, 280, 220, bgAlt, border, 8)}
  ${txt(35, 80, "SESSIONS", 10, muted, "start", "700")}

  <!-- Active session -->
  ${rect(30, 90, 260, 38, accentBg, accent, 6)}
  ${btn(40, 96, 170, 26, "Session 1", accentBg)}
  ${btn(218, 96, 60, 26, "Delete")}

  <!-- Session 2 -->
  ${rect(30, 135, 260, 38, bgSec, border, 6)}
  ${btn(40, 141, 170, 26, "Session 2")}
  ${btn(218, 141, 60, 26, "Delete")}

  <!-- Session 3 -->
  ${rect(30, 180, 260, 38, bgSec, border, 6)}
  ${btn(40, 186, 170, 26, "Session 3")}
  ${btn(218, 186, 60, 26, "Delete")}

  <!-- New Session button -->
  ${btn(30, 230, 120, 30, "New Session", accent)}

  <!-- Annotations on right side -->
  ${rect(320, 55, 260, 355, bgAlt, border, 8)}
  ${txt(335, 80, "세션 관리 방법", 13, white, "start", "700")}

  ${stepCircle(335, 110, 1)}
  ${txt(360, 115, "새 세션 만들기", 12, accent, "start", "600")}
  ${txt(340, 135, "\"New Session\" 버튼 클릭", 10, muted)}
  ${txt(340, 150, "최대 20개 세션 관리 가능", 10, muted)}

  ${stepCircle(335, 180, 2)}
  ${txt(360, 185, "세션 전환", 12, accent, "start", "600")}
  ${txt(340, 205, "세션 이름 버튼을 클릭하면", 10, muted)}
  ${txt(340, 220, "해당 세션으로 전환됩니다", 10, muted)}
  ${txt(340, 235, "활성 세션은 파란 테두리 표시", 10, muted)}

  ${stepCircle(335, 260, 3)}
  ${txt(360, 265, "세션 삭제", 12, accent, "start", "600")}
  ${txt(340, 285, "\"Delete\" 버튼으로 세션 삭제", 10, muted)}
  ${txt(340, 300, "⚠ 최소 1개 세션은 유지해야 함", 10, muted)}
  ${txt(340, 315, "(마지막 세션의 Delete는", 10, muted)}
  ${txt(340, 330, " 비활성화 됩니다)", 10, muted)}

  ${arrow(152, 238, 330, 120)}
  ${circle(109, 109, 145)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   08 — Context Notes
   ════════════════════════════════════════════════════════════ */
write("08-context-notes.svg", `${svgOpen(650, 340)}
  ${txt(30, 35, "컨텍스트 노트 관리", 15, white, "start", "700")}

  <!-- Context notes panel -->
  ${rect(20, 55, 300, 270, bgAlt, border, 8)}
  ${txt(35, 80, "CONTEXT NOTES", 10, muted, "start", "700")}

  ${rect(30, 90, 280, 30, bgSec, border, 6)}
  ${txt(42, 110, "projects/architecture.md", 10, text)}
  ${btn(270, 93, 30, 24, "✕", bgSec)}

  ${rect(30, 128, 280, 30, bgSec, border, 6)}
  ${txt(42, 148, "notes/requirements.md", 10, text)}
  ${btn(270, 131, 30, 24, "✕", bgSec)}

  ${txt(35, 185, "추가 방법:", 11, muted)}
  ${btn(30, 195, 155, 30, "Add Active Context", accent)}

  ${rect(30, 240, 280, 50, "none", border, 6)}
  ${txt(42, 265, "현재 에디터에 열린 노트가", 10, muted)}
  ${txt(42, 280, "자동으로 추가됩니다", 10, muted)}

  <!-- Annotations on right -->
  ${rect(340, 55, 290, 270, bgAlt, border, 8)}
  ${txt(355, 80, "작동 방식", 13, white, "start", "700")}

  ${stepCircle(355, 115, 1)}
  ${txt(380, 120, "노트 열기", 12, accent, "start", "600")}
  ${txt(360, 142, "Obsidian에서 원하는 노트를", 10, muted)}
  ${txt(360, 157, "에디터에서 엽니다", 10, muted)}

  ${stepCircle(355, 185, 2)}
  ${txt(380, 190, "컨텍스트 추가", 12, accent, "start", "600")}
  ${txt(360, 212, "\"Add Active Context\" 버튼 클릭", 10, muted)}
  ${txt(360, 227, "노트가 컨텍스트 목록에 추가됨", 10, muted)}

  ${stepCircle(355, 255, 3)}
  ${txt(380, 260, "컨텍스트 제거", 12, accent, "start", "600")}
  ${txt(360, 282, "각 노트 옆 ✕ 버튼으로 제거", 10, muted)}
  ${txt(360, 297, "질문 시 등록된 노트가", 10, muted)}
  ${txt(360, 312, "AI 컨텍스트로 포함됩니다", 10, muted)}

  ${arrow(187, 210, 350, 195)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   09 — Pending Changes Workflow
   ════════════════════════════════════════════════════════════ */
write("09-pending-changes.svg", `${svgOpen(760, 520)}
  ${txt(30, 35, "변경사항 관리 (Preview → Apply / Discard / Undo)", 15, white, "start", "700")}

  <!-- Left: Pending list -->
  ${rect(20, 55, 300, 200, bgAlt, border, 8)}
  ${txt(35, 80, "PENDING CHANGES", 10, muted, "start", "700")}

  ${rect(30, 90, 280, 70, accentBg, accent, 6)}
  ${txt(42, 112, "Create: meeting-notes.md", 12, white, "start", "600")}
  ${txt(42, 130, "path: docs/meeting-notes.md", 10, muted)}
  ${btn(35, 137, 60, 20, "Preview")}
  ${btn(100, 137, 52, 20, "Apply")}
  ${btn(157, 137, 60, 20, "Discard")}

  ${rect(30, 168, 280, 70, bgSec, border, 6)}
  ${txt(42, 190, "Modify: index.md", 12, white, "start", "600")}
  ${txt(42, 208, "path: index.md", 10, muted)}
  ${btn(35, 215, 60, 20, "Preview")}
  ${btn(100, 215, 52, 20, "Apply")}
  ${btn(157, 215, 60, 20, "Discard")}

  <!-- Right: Preview panel -->
  ${rect(340, 55, 400, 200, bgAlt, border, 8)}
  ${txt(355, 80, "CHANGE PREVIEW", 10, muted, "start", "700")}
  ${txt(355, 100, "Create: meeting-notes.md", 12, white, "start", "600")}
  ${txt(355, 118, "docs/meeting-notes.md", 10, muted)}

  ${rect(350, 125, 380, 60, bg, border, 6)}
  ${txt(362, 143, "+ # Meeting Notes", 10, "rgba(100,200,100,0.9)")}
  ${txt(362, 158, "+ ## 2024-01-15", 10, "rgba(100,200,100,0.9)")}
  ${txt(362, 173, "+ - 논의 사항: 프로젝트 일정 확인", 10, "rgba(100,200,100,0.9)")}

  ${btn(350, 195, 110, 24, "Apply Previewed")}
  ${btn(465, 195, 110, 24, "Discard Previewed")}
  ${btn(580, 195, 100, 24, "Undo Last")}

  <!-- Workflow diagram at bottom -->
  ${rect(20, 275, 720, 230, bgAlt, border, 8)}
  ${txt(35, 300, "변경사항 처리 흐름", 13, white, "start", "700")}

  <!-- Flow: Step 1 -->
  ${stepCircle(80, 340, 1)}
  ${rect(50, 360, 130, 50, bgSec, accent, 6)}
  ${txt(115, 385, "AI 응답에서", 10, text, "middle")}
  ${txt(115, 400, "변경 제안 수신", 10, text, "middle")}

  <!-- Arrow -->
  ${arrow(185, 385, 220, 385)}

  <!-- Flow: Step 2 -->
  ${stepCircle(280, 340, 2)}
  ${rect(230, 360, 130, 50, bgSec, accent, 6)}
  ${txt(295, 385, "Preview 클릭", 10, text, "middle")}
  ${txt(295, 400, "diff 미리보기", 10, text, "middle")}

  <!-- Arrow -->
  ${arrow(365, 385, 400, 385)}

  <!-- Flow: Step 3 - branch -->
  ${stepCircle(470, 340, 3)}
  
  ${rect(410, 360, 130, 35, "rgba(100,200,100,0.15)", "rgba(100,200,100,0.5)", 6)}
  ${txt(475, 383, "Apply ✓", 11, text, "middle", "600")}

  ${rect(410, 405, 130, 35, "rgba(255,100,100,0.15)", "rgba(255,100,100,0.5)", 6)}
  ${txt(475, 428, "Discard ✗", 11, text, "middle", "600")}

  <!-- Arrow to step 4 -->
  ${arrow(545, 377, 580, 377)}

  <!-- Flow: Step 4 -->
  ${stepCircle(650, 340, 4)}
  ${rect(590, 360, 130, 50, bgSec, accent, 6)}
  ${txt(655, 383, "적용 완료", 10, text, "middle")}
  ${txt(655, 398, "Undo로 되돌리기", 10, text, "middle")}
  ${txt(655, 413, "가능", 10, text, "middle")}

  ${txt(35, 480, "💡 Write Policy가 \"Auto Apply\"이면 Preview 없이 자동 적용됩니다", 11, muted)}
  ${txt(35, 500, "💡 적용 전 파일이 변경되었으면 충돌 방지를 위해 적용이 차단됩니다", 11, muted)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   10 — Settings Panel
   ════════════════════════════════════════════════════════════ */
write("10-settings-panel.svg", `${svgOpen(660, 440)}
  ${txt(30, 35, "설정 패널", 15, white, "start", "700")}

  ${rect(20, 55, 620, 370, bgAlt, border, 8)}
  ${txt(35, 80, "SETTINGS", 10, muted, "start", "700")}

  <!-- Model -->
  ${rect(30, 90, 600, 40, bgSec, border, 6)}
  ${txt(45, 115, "Model", 11, muted)}
  ${rect(200, 97, 200, 26, bg, border, 6)}
  ${txt(215, 115, "gpt-5.3-codex        ▼", 11, text)}
  ${annoText(420, 115, "← AI 모델 선택", 11)}

  <!-- Context Policy -->
  ${rect(30, 140, 600, 40, bgSec, border, 6)}
  ${txt(45, 165, "Context Policy", 11, muted)}
  ${rect(200, 147, 200, 26, bg, border, 6)}
  ${txt(215, 165, "Selection First      ▼", 11, text)}
  ${annoText(420, 165, "← 컨텍스트 전략", 11)}

  <!-- Write Policy -->
  ${rect(30, 190, 600, 40, bgSec, border, 6)}
  ${txt(45, 215, "Write Policy", 11, muted)}
  ${rect(200, 197, 200, 26, bg, border, 6)}
  ${txt(215, 215, "Confirm Before Apply ▼", 11, text)}
  ${annoText(420, 215, "← 변경 적용 방식", 11)}

  <!-- Debug Logging -->
  ${rect(30, 240, 600, 40, bgSec, border, 6)}
  ${txt(45, 265, "Debug Logging", 11, muted)}
  ${rect(200, 252, 20, 20, bg, border, 4)}
  ${annoText(420, 265, "← 디버그 로그 ON/OFF", 11)}

  <!-- Retry Failed -->
  ${rect(30, 290, 600, 40, bgSec, border, 6)}
  ${txt(45, 315, "Retry Failed Prompt", 11, muted)}
  ${rect(200, 302, 20, 20, bg, border, 4)}
  ${txt(210, 316, "✓", 12, accent, "middle")}
  ${annoText(420, 315, "← 실패 프롬프트 자동 재시도", 11)}

  <!-- Diagnostics Box -->
  ${rect(30, 340, 600, 70, bgSec, border, 6)}
  ${txt(45, 360, "Diagnostics", 11, muted)}
  ${rect(30, 365, 600, 40, bg, border, 6)}
  ${txt(45, 380, "firstTokenLatency: 245ms | responseDuration: 1230ms", 9, muted)}
  ${txt(45, 393, "tokenCount: 156 | streamRenders: 3 | lastError: none", 9, muted)}
  ${annoText(420, 365, "← 실시간 진단 정보", 11)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   11 — Ask Current Note Flow
   ════════════════════════════════════════════════════════════ */
write("11-ask-current-note.svg", `${svgOpen(700, 380)}
  ${txt(30, 35, "현재 노트에 대해 질문하기", 15, white, "start", "700")}

  <!-- Obsidian editor mock (left) -->
  ${rect(20, 55, 320, 300, bgAlt, border, 8)}
  ${txt(35, 80, "📝 my-project-plan.md", 12, accent)}
  ${rect(30, 90, 300, 250, bg, border, 6)}
  ${txt(42, 115, "# 프로젝트 계획", 12, text)}
  ${txt(42, 140, "## 목표", 11, text)}
  ${txt(42, 160, "- MVP 개발 완료", 11, text)}
  ${txt(42, 180, "- 사용자 테스트 진행", 11, text)}
  ${txt(42, 200, "## 일정", 11, text)}
  ${txt(42, 220, "- 1주차: 설계", 11, text)}
  ${txt(42, 240, "- 2주차: 구현", 11, text)}

  <!-- Arrow -->
  ${stepCircle(360, 110, 1)}
  ${txt(350, 145, "노트를 연 상태에서", 10, anno, "middle")}

  ${arrow(370, 150, 440, 150)}

  <!-- Sidebar (right) -->
  ${rect(380, 55, 300, 300, bgAlt, border, 8)}
  ${txt(395, 80, "Copilot Sidebar", 12, white, "start", "700")}
  
  ${btn(395, 90, 120, 28, "Ask Current Note", accent)}
  ${stepCircle(530, 104, 2)}
  ${circle(455, 104, 68)}

  ${rect(395, 130, 270, 70, accentBg, border, 8)}
  ${txt(407, 150, "USER", 9, muted, "start", "600")}
  ${txt(407, 168, "[Context: my-project-plan.md]", 10, accent)}
  ${txt(407, 185, "이 노트에 대해 분석해주세요", 11, text)}

  ${rect(395, 210, 270, 70, bgSec, border, 8)}
  ${txt(407, 230, "ASSISTANT", 9, muted, "start", "600")}
  ${txt(407, 248, "이 문서는 프로젝트 계획서로", 10, text)}
  ${txt(407, 263, "MVP 개발 목표와 2주간의", 10, text)}
  ${txt(407, 278, "일정이 포함되어 있습니다.", 10, text)}

  ${annoText(30, 370, "💡 선택 영역이 있으면 Selection First 정책에 따라 선택 텍스트가 우선 포함됩니다", 11)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   12 — Feedback & Diagnostics
   ════════════════════════════════════════════════════════════ */
write("12-feedback-diagnostics.svg", `${svgOpen(700, 400)}
  ${txt(30, 35, "진단 정보 복사 & 피드백 캡처", 15, white, "start", "700")}

  <!-- Copy Diagnostics flow -->
  ${rect(20, 60, 320, 150, bgAlt, border, 8)}
  ${txt(35, 85, "진단 정보 복사", 13, accent, "start", "700")}
  
  ${stepCircle(40, 115, 1)}
  ${txt(65, 120, "\"Copy Diagnostics\" 버튼 클릭", 11, text)}
  
  ${stepCircle(40, 150, 2)}
  ${txt(65, 155, "클립보드에 진단 요약 복사됨", 11, text)}
  
  ${txt(35, 185, "📋 복사된 내용:", 10, muted)}
  ${txt(35, 200, "firstTokenLatency/duration/tokens/errors", 9, muted)}

  <!-- Capture Feedback flow -->
  ${rect(360, 60, 320, 150, bgAlt, border, 8)}
  ${txt(375, 85, "베타 피드백 캡처", 13, accent, "start", "700")}
  
  ${stepCircle(380, 115, 1)}
  ${txt(405, 120, "\"Capture Feedback\" 버튼 클릭", 11, text)}
  
  ${stepCircle(380, 150, 2)}
  ${txt(405, 155, "피드백 노트가 자동 생성됨", 11, text)}
  
  ${txt(375, 185, "📁 저장 위치:", 10, muted)}
  ${txt(375, 200, "Copilot Sidebar Feedback/feedback-*.md", 9, muted)}

  <!-- Generated note preview -->
  ${rect(20, 225, 660, 160, bgAlt, border, 8)}
  ${txt(35, 250, "생성된 피드백 노트 예시", 13, white, "start", "700")}
  ${rect(30, 260, 640, 110, bg, border, 6)}
  ${txt(42, 280, "# Copilot Sidebar Beta Feedback", 11, text)}
  ${txt(42, 298, "## Diagnostics Snapshot", 10, muted)}
  ${txt(42, 313, "- firstTokenLatency: 245ms", 10, muted)}
  ${txt(42, 328, "- responseDuration: 1230ms", 10, muted)}
  ${txt(42, 343, "## Recent Chat Excerpts", 10, muted)}
  ${txt(42, 358, "- USER: 이 노트의 주요 내용을 요약해줘...", 10, muted)}
${svgClose}`);

/* ════════════════════════════════════════════════════════════
   13 — Full Workflow Summary
   ════════════════════════════════════════════════════════════ */
write("13-workflow-summary.svg", `${svgOpen(760, 340)}
  ${txt(30, 35, "전체 사용 흐름 요약", 15, white, "start", "700")}

  <!-- Flow boxes -->
  ${stepCircle(60, 80, 1)}
  ${rect(30, 95, 100, 55, bgSec, accent, 6)}
  ${txt(80, 118, "플러그인", 10, text, "middle")}
  ${txt(80, 133, "활성화", 10, text, "middle")}
  ${arrow(135, 122, 165, 122)}

  ${stepCircle(205, 80, 2)}
  ${rect(175, 95, 100, 55, bgSec, accent, 6)}
  ${txt(225, 118, "사이드바", 10, text, "middle")}
  ${txt(225, 133, "열기", 10, text, "middle")}
  ${arrow(280, 122, 310, 122)}

  ${stepCircle(350, 80, 3)}
  ${rect(320, 95, 100, 55, bgSec, accent, 6)}
  ${txt(370, 118, "인증 확인", 10, text, "middle")}
  ${txt(370, 133, "(자동)", 10, text, "middle")}
  ${arrow(425, 122, 455, 122)}

  ${stepCircle(500, 80, 4)}
  ${rect(465, 95, 120, 55, bgSec, accent, 6)}
  ${txt(525, 118, "질문 입력 /", 10, text, "middle")}
  ${txt(525, 133, "노트 질문", 10, text, "middle")}
  ${arrow(590, 122, 620, 122)}

  ${stepCircle(660, 80, 5)}
  ${rect(625, 95, 115, 55, bgSec, accent, 6)}
  ${txt(682, 118, "AI 응답 수신", 10, text, "middle")}
  ${txt(682, 133, "(스트리밍)", 10, text, "middle")}

  <!-- Second row -->
  ${arrow(682, 155, 682, 185)}

  ${stepCircle(660, 195, 6)}
  ${rect(625, 210, 115, 55, bgSec, accent, 6)}
  ${txt(682, 233, "변경사항", 10, text, "middle")}
  ${txt(682, 248, "확인/프리뷰", 10, text, "middle")}
  ${arrow(620, 237, 590, 237)}

  ${stepCircle(520, 195, 7)}
  ${rect(465, 210, 120, 55, bgSec, accent, 6)}
  ${txt(525, 233, "적용/취소", 10, text, "middle")}
  ${txt(525, 248, "결정", 10, text, "middle")}
  ${arrow(460, 237, 430, 237)}

  ${stepCircle(370, 195, 8)}
  ${rect(320, 210, 100, 55, bgSec, accent, 6)}
  ${txt(370, 233, "추가 질문", 10, text, "middle")}
  ${txt(370, 248, "또는 완료", 10, text, "middle")}

  <!-- Loop arrow back -->
  <path d="M 320 237 L 270 237 Q 250 237 250 217 L 250 170 Q 250 155 270 155 L 465 155" 
        fill="none" stroke="${muted}" stroke-width="1.5" stroke-dasharray="5,4" marker-end="url(#arrowhead)"/>
  ${txt(260, 190, "반복", 10, muted)}

  ${txt(30, 310, "💡 세션 관리, 컨텍스트 추가, 설정 변경은 워크플로우 중 언제든 사용 가능합니다", 11, muted)}
  ${txt(30, 330, "💡 각 단계의 상세 내용은 위의 개별 섹션을 참고하세요", 11, muted)}
${svgClose}`);

console.log("\n✅ All manual images generated!");

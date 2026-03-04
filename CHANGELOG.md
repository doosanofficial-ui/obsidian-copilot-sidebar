# Changelog

All notable changes to **Obsidian Copilot Sidebar** are documented in this file.

## [1.0.0] — 2026-03-04

### 🎉 First Stable Release

All planned milestones (M1–M5) have been completed and verified end-to-end.

### Added

#### M5B — Beta Feedback Loop
- Command `capture-beta-feedback-note`: generates a Markdown feedback report under `Copilot Sidebar Feedback/feedback-<timestamp>.md` with recent chat excerpts and a full diagnostics snapshot.
- Last generated feedback note path persisted as `lastFeedbackNotePath` and surfaced in the Settings panel.
- Beta feedback button exposed in the sidebar Settings panel.

#### M5 — Stabilization & Diagnostics
- Streaming render batch optimisation: token batching (`STREAM_RENDER_BATCH_TOKENS`) + interval throttle (`STREAM_RENDER_INTERVAL_MS`) to reduce UI churn.
- Per-session message history capped at 200 messages to prevent unbounded memory growth.
- Diagnostics tracking: `firstTokenLatencyMs`, `responseDurationMs`, `responseTokenCount`, `streamRenderCount`, `lastErrorCategory`, `lastErrorMessage`, `diagnosticsUpdatedAt` — all persisted in settings.
- Command `copy-diagnostics-summary`: copies a formatted diagnostics snapshot to clipboard.
- Diagnostics block rendered in the Settings panel.

#### M4 — Settings & Recovery Flow
- Inline Settings panel inside the sidebar (toggle via header button / `open-sidebar-settings-panel` command).
- Configurable fields: `model`, `contextPolicy` (`selection-first` | `note-only`), `changeApplyPolicy` (`confirm-write` | `auto-apply`), `debugLogging`.
- Failed prompt storage: when a prompt errors out the text is saved as `lastFailedPrompt`.
- Command `retry-last-failed-prompt`: re-submits the last failed prompt without retyping.
- Retry toggle control exposed in the Settings panel.

#### M1 — Auth Status Probe
- `gh auth status -h github.com` + `gh copilot status` runtime probe mapping outputs to `logged-in` / `no-entitlement` / `token-expired` / `offline`.
- Command `refresh-auth-status`: manually re-runs the probe and updates the auth badge.
- Auth badge in sidebar header reflects live state with human-readable detail line.

#### M3 — Context Merge & Change Preview
- Explicit additional-context panel: users can attach extra notes to inject alongside the active note.
- Diff preview panel: proposed file changes are displayed as a before/after diff (up to 120 lines).
- `discard-pending-change` action removes a single pending change.
- Command `undo-last-applied-change`: reverts the most recently applied file change.

#### M2 — Core Sidebar UX
- Sidebar view (`copilot-sidebar-view`) with chat message list and composer.
- Session management: create, switch, and delete sessions (up to 20 persisted sessions).
- Mock streaming responses with configurable delay and batch rendering.
- Commands: `open-copilot-sidebar`, `ask-about-current-note`, `apply-pending-changes`, `start-new-chat-session`.

#### Governance & Tooling
- Three-lane execution model (Subagent / CLI / Cloud) with git worktrees.
- `npm run verify:tracked` — step-by-step verification with `.tmp/agent-progress.json` output.
- `npm run progress:watch` — live progress monitor.
- `npm run cloud:dispatch` / `npm run cloud:status` — GitHub Actions `Validation` workflow integration.
- `npm run branch:protect:main` — main branch protection (linear history, conversation resolution, solo mode for single-collaborator repos).
- PR template, CODEOWNERS, and full CI workflow (`.github/workflows/validation.yml`).

### Changed
- `manifest.json` version bumped to `1.0.0`.
- `versions.json` updated to record `1.0.0` minimum Obsidian version `1.5.0`.

---

## [0.1.0] — 2026-03-04 *(initial scaffold)*

- Repository bootstrap: requirements spec, architecture draft, milestone plan, atomic task plan, agent workflow docs.
- Plugin scaffold: `src/main.ts`, `esbuild.config.mjs`, `tsconfig.json`, `styles.css`.
- Smoke-test infrastructure: `scripts/smoke-prepare.mjs`, `scripts/smoke-run.mjs`, `scripts/smoke-assert.mjs`.
- CI: `.github/workflows/validation.yml`.

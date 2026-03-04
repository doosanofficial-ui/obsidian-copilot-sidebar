import { ItemView, MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";

const VIEW_TYPE_COPILOT_SIDEBAR = "copilot-sidebar-view";
const MAX_SESSIONS = 20;
const MAX_PENDING_CHANGES = 10;
const MAX_ADDITIONAL_CONTEXT = 8;
const MAX_MESSAGES_PER_SESSION = 200;
const STREAM_DELAY_MS = 30;
const STREAM_RENDER_INTERVAL_MS = 90;
const STREAM_RENDER_BATCH_TOKENS = 6;
const PREVIEW_MAX_LINES = 120;
const BETA_FEEDBACK_FOLDER = "Copilot Sidebar Feedback";

type AuthState = "logged-in" | "no-entitlement" | "token-expired" | "offline";
type ContextPolicy = "selection-first" | "note-only";
type ChangeApplyPolicy = "confirm-write" | "auto-apply";
type ErrorCategory = "none" | "auth" | "network" | "entitlement" | "filesystem" | "validation" | "unknown";
type MessageRole = "user" | "assistant" | "system";

const RECOMMENDED_MODELS = ["gpt-5.3-codex", "gpt-4.1", "gpt-4o-mini"] as const;

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  streaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

interface PendingChange {
  id: string;
  notePath: string;
  before: string;
  after: string;
  summary: string;
  createdAt: number;
}

interface CommandExecResult {
  status: number;
  stdout: string;
  stderr: string;
  error: string | null;
}

interface AuthProbeResult {
  state: AuthState;
  detail: string;
  checkedAt: number;
}

interface AppliedChangeRecord {
  id: string;
  notePath: string;
  before: string;
  after: string;
  summary: string;
  appliedAt: number;
}

interface AdditionalContextNote {
  path: string;
  content: string;
}

interface ChatDiagnostics {
  lastFirstTokenLatencyMs: number;
  lastResponseDurationMs: number;
  lastResponseTokenCount: number;
  lastStreamRenderCount: number;
  lastErrorCategory: ErrorCategory;
  lastErrorMessage: string;
  updatedAt: number;
}

interface CopilotSidebarSettings {
  sessions: ChatSession[];
  activeSessionId: string;
  pendingChanges: PendingChange[];
  additionalContextPaths: string[];
  lastAppliedChange: AppliedChangeRecord | null;
  authState: AuthState;
  authDetail: string;
  authCheckedAt: number;
  model: string;
  contextPolicy: ContextPolicy;
  changeApplyPolicy: ChangeApplyPolicy;
  retryFailedPrompt: boolean;
  lastFailedPrompt: string;
  lastFeedbackNotePath: string;
  diagnostics: ChatDiagnostics;
  debugLogging: boolean;
}

interface PromptContext {
  notePath: string | null;
  noteContent: string;
  selection: string;
  additionalNotes: AdditionalContextNote[];
}

interface SidebarSnapshot {
  sessions: ChatSession[];
  activeSessionId: string;
  pendingChanges: PendingChange[];
  selectedPendingChangeId: string | null;
  additionalContextPaths: string[];
  lastAppliedChange: AppliedChangeRecord | null;
  authState: AuthState;
  authDetail: string;
  authCheckedAt: number;
  model: string;
  contextPolicy: ContextPolicy;
  changeApplyPolicy: ChangeApplyPolicy;
  retryFailedPrompt: boolean;
  lastFailedPrompt: string;
  lastFeedbackNotePath: string;
  diagnostics: ChatDiagnostics;
  debugLogging: boolean;
  isStreaming: boolean;
}

interface ViewElements {
  title: HTMLElement;
  authBadge: HTMLElement;
  authMeta: HTMLElement;
  sessionList: HTMLElement;
  settingsPanel: HTMLElement;
  contextList: HTMLElement;
  pendingList: HTMLElement;
  messages: HTMLElement;
  previewPanel: HTMLElement;
  composerInput: HTMLTextAreaElement;
  composerButton: HTMLButtonElement;
}

const AUTH_ORDER: AuthState[] = ["logged-in", "no-entitlement", "token-expired", "offline"];

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSession(title = "New chat session"): ChatSession {
  const now = Date.now();
  return {
    id: createId("session"),
    title,
    createdAt: now,
    updatedAt: now,
    messages: []
  };
}

function defaultSettings(): CopilotSidebarSettings {
  const session = createSession();
  return {
    sessions: [session],
    activeSessionId: session.id,
    pendingChanges: [],
    additionalContextPaths: [],
    lastAppliedChange: null,
    authState: "logged-in",
    authDetail: "Auth not checked yet.",
    authCheckedAt: Date.now(),
    model: "gpt-5.3-codex",
    contextPolicy: "selection-first",
    changeApplyPolicy: "confirm-write",
    retryFailedPrompt: true,
    lastFailedPrompt: "",
    lastFeedbackNotePath: "",
    diagnostics: defaultDiagnostics(),
    debugLogging: false
  };
}

function defaultDiagnostics(): ChatDiagnostics {
  return {
    lastFirstTokenLatencyMs: 0,
    lastResponseDurationMs: 0,
    lastResponseTokenCount: 0,
    lastStreamRenderCount: 0,
    lastErrorCategory: "none",
    lastErrorMessage: "",
    updatedAt: Date.now()
  };
}

function isAuthState(value: unknown): value is AuthState {
  return value === "logged-in" || value === "no-entitlement" || value === "token-expired" || value === "offline";
}

function isContextPolicy(value: unknown): value is ContextPolicy {
  return value === "selection-first" || value === "note-only";
}

function isChangeApplyPolicy(value: unknown): value is ChangeApplyPolicy {
  return value === "confirm-write" || value === "auto-apply";
}

function isErrorCategory(value: unknown): value is ErrorCategory {
  return value === "none"
    || value === "auth"
    || value === "network"
    || value === "entitlement"
    || value === "filesystem"
    || value === "validation"
    || value === "unknown";
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === "user" || value === "assistant" || value === "system";
}

function normalizeAppliedChange(raw: unknown): AppliedChangeRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Partial<AppliedChangeRecord>;
  if (!source.id || !source.notePath) {
    return null;
  }

  return {
    id: String(source.id),
    notePath: String(source.notePath),
    before: typeof source.before === "string" ? source.before : "",
    after: typeof source.after === "string" ? source.after : "",
    summary: typeof source.summary === "string" ? source.summary : "Applied suggestion",
    appliedAt: typeof source.appliedAt === "number" ? source.appliedAt : Date.now()
  };
}

function buildPreviewDiff(before: string, after: string): string {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const out = ["--- before", "+++ after"];

  const maxLines = Math.max(beforeLines.length, afterLines.length);
  let changedLines = 0;

  for (let i = 0; i < maxLines; i += 1) {
    const left = beforeLines[i];
    const right = afterLines[i];
    if (left === right) {
      continue;
    }

    if (typeof left === "string") {
      out.push(`- ${left}`);
      changedLines += 1;
      if (changedLines >= PREVIEW_MAX_LINES) {
        break;
      }
    }

    if (typeof right === "string") {
      out.push(`+ ${right}`);
      changedLines += 1;
      if (changedLines >= PREVIEW_MAX_LINES) {
        break;
      }
    }
  }

  if (changedLines === 0) {
    out.push("No textual delta detected.");
  }

  if (changedLines >= PREVIEW_MAX_LINES) {
    out.push(`... preview truncated to ${PREVIEW_MAX_LINES} changed lines`);
  }

  return out.join("\n");
}

function formatDurationMs(ms: number): string {
  if (ms <= 0) {
    return "n/a";
  }
  return `${Math.round(ms)}ms`;
}

function compactOutput(stdout: string, stderr: string): string {
  const joined = `${stdout}\n${stderr}`.replace(/\s+/g, " ").trim();
  return joined.length > 0 ? joined : "(no output)";
}

function containsAny(source: string, patterns: string[]): boolean {
  const lowered = source.toLowerCase();
  return patterns.some((pattern) => lowered.includes(pattern));
}

function categoryFromAuthState(state: AuthState): ErrorCategory {
  if (state === "token-expired") {
    return "auth";
  }
  if (state === "offline") {
    return "network";
  }
  if (state === "no-entitlement") {
    return "entitlement";
  }
  return "none";
}

function normalizeDiagnostics(raw: unknown): ChatDiagnostics {
  const fallback = defaultDiagnostics();
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as Partial<ChatDiagnostics>;
  return {
    lastFirstTokenLatencyMs: typeof source.lastFirstTokenLatencyMs === "number"
      ? source.lastFirstTokenLatencyMs
      : fallback.lastFirstTokenLatencyMs,
    lastResponseDurationMs: typeof source.lastResponseDurationMs === "number"
      ? source.lastResponseDurationMs
      : fallback.lastResponseDurationMs,
    lastResponseTokenCount: typeof source.lastResponseTokenCount === "number"
      ? source.lastResponseTokenCount
      : fallback.lastResponseTokenCount,
    lastStreamRenderCount: typeof source.lastStreamRenderCount === "number"
      ? source.lastStreamRenderCount
      : fallback.lastStreamRenderCount,
    lastErrorCategory: isErrorCategory(source.lastErrorCategory)
      ? source.lastErrorCategory
      : fallback.lastErrorCategory,
    lastErrorMessage: typeof source.lastErrorMessage === "string"
      ? source.lastErrorMessage
      : fallback.lastErrorMessage,
    updatedAt: typeof source.updatedAt === "number"
      ? source.updatedAt
      : fallback.updatedAt
  };
}

function normalizeSettings(raw: unknown): CopilotSidebarSettings {
  const fallback = defaultSettings();
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as Partial<CopilotSidebarSettings>;
  const sessions = Array.isArray(source.sessions) ? source.sessions
    .filter((session): session is ChatSession => Boolean(session && typeof session === "object" && session.id))
    .slice(0, MAX_SESSIONS)
    .map((session) => ({
      id: String(session.id),
      title: typeof session.title === "string" && session.title.trim().length > 0 ? session.title : "New chat session",
      createdAt: typeof session.createdAt === "number" ? session.createdAt : Date.now(),
      updatedAt: typeof session.updatedAt === "number" ? session.updatedAt : Date.now(),
      messages: Array.isArray(session.messages)
        ? session.messages
          .filter((message): message is ChatMessage => Boolean(message && typeof message === "object" && message.id))
          .slice(-MAX_MESSAGES_PER_SESSION)
          .map((message) => {
            const role: MessageRole = isMessageRole(message.role) ? message.role : "user";
            return {
              id: String(message.id),
              role,
              content: typeof message.content === "string" ? message.content : "",
              createdAt: typeof message.createdAt === "number" ? message.createdAt : Date.now(),
              streaming: Boolean(message.streaming)
            };
          })
        : []
    }))
    : [];

  const normalizedSessions = sessions.length > 0 ? sessions : [createSession()];
  const activeSessionId = normalizedSessions.some((session) => session.id === source.activeSessionId)
    ? String(source.activeSessionId)
    : normalizedSessions[0].id;

  const pendingChanges = Array.isArray(source.pendingChanges)
    ? source.pendingChanges
      .filter((change): change is PendingChange => Boolean(change && typeof change === "object" && change.id && change.notePath))
      .slice(0, MAX_PENDING_CHANGES)
      .map((change) => ({
        id: String(change.id),
        notePath: String(change.notePath),
        before: typeof change.before === "string" ? change.before : "",
        after: typeof change.after === "string" ? change.after : "",
        summary: typeof change.summary === "string" ? change.summary : "Generated suggestion",
        createdAt: typeof change.createdAt === "number" ? change.createdAt : Date.now()
      }))
    : [];

  const additionalContextPaths = Array.isArray(source.additionalContextPaths)
    ? Array.from(new Set(source.additionalContextPaths
      .filter((notePath): notePath is string => typeof notePath === "string")
      .map((notePath) => notePath.trim())
      .filter((notePath) => notePath.length > 0)))
      .slice(0, MAX_ADDITIONAL_CONTEXT)
    : [];

  const lastAppliedChange = normalizeAppliedChange(source.lastAppliedChange);
  const diagnostics = normalizeDiagnostics(source.diagnostics);

  return {
    sessions: normalizedSessions,
    activeSessionId,
    pendingChanges,
    additionalContextPaths,
    lastAppliedChange,
    authState: isAuthState(source.authState) ? source.authState : fallback.authState,
    authDetail: typeof source.authDetail === "string" && source.authDetail.trim().length > 0
      ? source.authDetail
      : fallback.authDetail,
    authCheckedAt: typeof source.authCheckedAt === "number" ? source.authCheckedAt : fallback.authCheckedAt,
    model: typeof source.model === "string" && source.model.trim().length > 0 ? source.model : fallback.model,
    contextPolicy: isContextPolicy(source.contextPolicy) ? source.contextPolicy : fallback.contextPolicy,
    changeApplyPolicy: isChangeApplyPolicy(source.changeApplyPolicy)
      ? source.changeApplyPolicy
      : fallback.changeApplyPolicy,
    retryFailedPrompt: typeof source.retryFailedPrompt === "boolean"
      ? source.retryFailedPrompt
      : fallback.retryFailedPrompt,
    lastFailedPrompt: typeof source.lastFailedPrompt === "string"
      ? source.lastFailedPrompt
      : fallback.lastFailedPrompt,
    lastFeedbackNotePath: typeof source.lastFeedbackNotePath === "string"
      ? source.lastFeedbackNotePath
      : fallback.lastFeedbackNotePath,
    diagnostics,
    debugLogging: Boolean(source.debugLogging)
  };
}

class CopilotSidebarView extends ItemView {
  private elements: ViewElements | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: CopilotSidebarPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_COPILOT_SIDEBAR;
  }

  getDisplayText(): string {
    return "Copilot Sidebar";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    const root = container.createDiv({ cls: "copilot-sidebar-root" });
    const header = root.createDiv({ cls: "copilot-sidebar-header" });
    const title = header.createDiv({ text: "Copilot Sidebar", cls: "copilot-sidebar-title" });
    const authMeta = header.createDiv({ cls: "copilot-auth-meta" });
    const authBadge = authMeta.createDiv({ cls: "copilot-auth-badge" });
    const authDetail = authMeta.createDiv({ cls: "copilot-auth-detail" });

    const controlRow = root.createDiv({ cls: "copilot-sidebar-controls" });
    const newSessionButton = controlRow.createEl("button", {
      text: "New Session",
      cls: "copilot-button"
    }) as HTMLButtonElement;
    const askNoteButton = controlRow.createEl("button", {
      text: "Ask Current Note",
      cls: "copilot-button"
    }) as HTMLButtonElement;
    const applyButton = controlRow.createEl("button", {
      text: "Apply Pending",
      cls: "copilot-button"
    }) as HTMLButtonElement;
    const addContextButton = controlRow.createEl("button", {
      text: "Add Active Context",
      cls: "copilot-button"
    }) as HTMLButtonElement;
    const refreshAuthButton = controlRow.createEl("button", {
      text: "Refresh Auth",
      cls: "copilot-button"
    }) as HTMLButtonElement;
    const retryFailedButton = controlRow.createEl("button", {
      text: "Retry Failed",
      cls: "copilot-button"
    }) as HTMLButtonElement;
    const copyDiagnosticsButton = controlRow.createEl("button", {
      text: "Copy Diagnostics",
      cls: "copilot-button"
    }) as HTMLButtonElement;
    const captureFeedbackButton = controlRow.createEl("button", {
      text: "Capture Feedback",
      cls: "copilot-button"
    }) as HTMLButtonElement;

    const layout = root.createDiv({ cls: "copilot-sidebar-layout" });
    const leftPane = layout.createDiv({ cls: "copilot-sidebar-pane copilot-sidebar-pane-sessions" });
    leftPane.createDiv({ text: "Sessions", cls: "copilot-pane-title" });
    const sessionList = leftPane.createDiv({ cls: "copilot-session-list" });
    leftPane.createDiv({ text: "Settings", cls: "copilot-pane-title" });
    const settingsPanel = leftPane.createDiv({ cls: "copilot-settings-panel" });
    leftPane.createDiv({ text: "Context Notes", cls: "copilot-pane-title" });
    const contextList = leftPane.createDiv({ cls: "copilot-context-list" });
    leftPane.createDiv({ text: "Pending Changes", cls: "copilot-pane-title" });
    const pendingList = leftPane.createDiv({ cls: "copilot-pending-list" });

    const rightPane = layout.createDiv({ cls: "copilot-sidebar-pane copilot-sidebar-pane-chat" });
    const messages = rightPane.createDiv({ cls: "copilot-message-list" });
    const previewPanel = rightPane.createDiv({ cls: "copilot-preview-panel" });

    const composer = rightPane.createDiv({ cls: "copilot-composer" });
    const composerInput = composer.createEl("textarea", {
      cls: "copilot-composer-input"
    }) as HTMLTextAreaElement;
    composerInput.placeholder = "Ask Copilot about this vault...";

    const composerButton = composer.createEl("button", {
      text: "Send",
      cls: "copilot-button copilot-send-button"
    }) as HTMLButtonElement;

    newSessionButton.addEventListener("click", () => {
      void this.plugin.startNewSession();
    });

    askNoteButton.addEventListener("click", () => {
      void this.plugin.askAboutCurrentNote();
    });

    applyButton.addEventListener("click", () => {
      void this.plugin.applyNextPendingChange();
    });

    addContextButton.addEventListener("click", () => {
      void this.plugin.addActiveNoteToContext();
    });

    refreshAuthButton.addEventListener("click", () => {
      void this.plugin.refreshAuthStatus("manual");
    });

    retryFailedButton.addEventListener("click", () => {
      void this.plugin.retryLastFailedPrompt();
    });

    copyDiagnosticsButton.addEventListener("click", () => {
      void this.plugin.copyDiagnosticsSummary();
    });

    captureFeedbackButton.addEventListener("click", () => {
      void this.plugin.captureBetaFeedbackNote();
    });

    composerButton.addEventListener("click", () => {
      void this.submitComposer();
    });

    composerInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void this.submitComposer();
      }
    });

    this.elements = {
      title,
      authBadge,
      authMeta: authDetail,
      sessionList,
      settingsPanel,
      contextList,
      pendingList,
      messages,
      previewPanel,
      composerInput,
      composerButton
    };

    this.plugin.registerViewInstance(this);
    this.renderFromState(this.plugin.getSnapshot());
  }

  async onClose(): Promise<void> {
    this.plugin.unregisterViewInstance(this);
    this.containerEl.empty();
  }

  renderFromState(snapshot: SidebarSnapshot): void {
    if (!this.elements) {
      return;
    }

    const activeSession = snapshot.sessions.find((session) => session.id === snapshot.activeSessionId) ?? snapshot.sessions[0];

    this.elements.title.setText(activeSession ? activeSession.title : "Copilot Sidebar");
    this.elements.authBadge.setText(`Auth: ${snapshot.authState}`);
    this.elements.authBadge.className = `copilot-auth-badge auth-${snapshot.authState}`;
    const checkedAt = new Date(snapshot.authCheckedAt).toLocaleTimeString();
    const compactDetail = snapshot.authDetail.length > 180
      ? `${snapshot.authDetail.slice(0, 177)}...`
      : snapshot.authDetail;
    this.elements.authMeta.setText(`${compactDetail} | checked ${checkedAt}`);

    this.renderSessions(snapshot);
    this.renderSettings(snapshot);
    this.renderContextNotes(snapshot);
    this.renderPendingChanges(snapshot);
    this.renderMessages(activeSession);
    this.renderPreview(snapshot);

    this.elements.composerButton.disabled = snapshot.isStreaming;
    this.elements.composerInput.disabled = snapshot.isStreaming;
    this.elements.composerInput.placeholder = snapshot.authState === "logged-in"
      ? "Ask Copilot about this vault..."
      : "Auth state is not logged-in. Use Refresh Auth to re-check login and entitlement.";
  }

  private renderSessions(snapshot: SidebarSnapshot): void {
    if (!this.elements) {
      return;
    }

    const list = this.elements.sessionList;
    list.empty();

    for (const session of snapshot.sessions) {
      const row = list.createDiv({ cls: `copilot-session-row${session.id === snapshot.activeSessionId ? " is-active" : ""}` });
      const switchButton = row.createEl("button", {
        text: session.title,
        cls: "copilot-session-switch"
      }) as HTMLButtonElement;

      switchButton.addEventListener("click", () => {
        void this.plugin.setActiveSession(session.id);
      });

      const deleteButton = row.createEl("button", {
        text: "Delete",
        cls: "copilot-session-delete"
      }) as HTMLButtonElement;
      deleteButton.disabled = snapshot.sessions.length === 1;

      deleteButton.addEventListener("click", () => {
        void this.plugin.deleteSession(session.id);
      });
    }
  }

  private renderSettings(snapshot: SidebarSnapshot): void {
    if (!this.elements) {
      return;
    }

    const panel = this.elements.settingsPanel;
    panel.empty();

    const modelRow = panel.createDiv({ cls: "copilot-setting-row" });
    modelRow.createDiv({ text: "Model", cls: "copilot-setting-label" });
    const modelSelect = modelRow.createEl("select", { cls: "copilot-setting-select" }) as HTMLSelectElement;
    for (const model of RECOMMENDED_MODELS) {
      const option = modelSelect.createEl("option") as HTMLOptionElement;
      option.value = model;
      option.text = model;
    }
    if (!RECOMMENDED_MODELS.includes(snapshot.model as (typeof RECOMMENDED_MODELS)[number])) {
      const customOption = modelSelect.createEl("option") as HTMLOptionElement;
      customOption.value = snapshot.model;
      customOption.text = `${snapshot.model} (custom)`;
    }
    modelSelect.value = snapshot.model;
    modelSelect.addEventListener("change", () => {
      void this.plugin.updateModel(modelSelect.value);
    });

    const contextRow = panel.createDiv({ cls: "copilot-setting-row" });
    contextRow.createDiv({ text: "Context Policy", cls: "copilot-setting-label" });
    const contextSelect = contextRow.createEl("select", { cls: "copilot-setting-select" }) as HTMLSelectElement;
    const selectionOption = contextSelect.createEl("option") as HTMLOptionElement;
    selectionOption.value = "selection-first";
    selectionOption.text = "Selection First";
    const noteOption = contextSelect.createEl("option") as HTMLOptionElement;
    noteOption.value = "note-only";
    noteOption.text = "Note Only";
    contextSelect.value = snapshot.contextPolicy;
    contextSelect.addEventListener("change", () => {
      const nextPolicy = contextSelect.value === "note-only" ? "note-only" : "selection-first";
      void this.plugin.updateContextPolicy(nextPolicy);
    });

    const applyPolicyRow = panel.createDiv({ cls: "copilot-setting-row" });
    applyPolicyRow.createDiv({ text: "Write Policy", cls: "copilot-setting-label" });
    const applyPolicySelect = applyPolicyRow.createEl("select", { cls: "copilot-setting-select" }) as HTMLSelectElement;
    const confirmOption = applyPolicySelect.createEl("option") as HTMLOptionElement;
    confirmOption.value = "confirm-write";
    confirmOption.text = "Confirm Before Apply";
    const autoOption = applyPolicySelect.createEl("option") as HTMLOptionElement;
    autoOption.value = "auto-apply";
    autoOption.text = "Auto Apply";
    applyPolicySelect.value = snapshot.changeApplyPolicy;
    applyPolicySelect.addEventListener("change", () => {
      const nextPolicy = applyPolicySelect.value === "auto-apply" ? "auto-apply" : "confirm-write";
      void this.plugin.updateChangeApplyPolicy(nextPolicy);
    });

    const debugRow = panel.createDiv({ cls: "copilot-setting-row" });
    const debugToggle = debugRow.createEl("input", {
      cls: "copilot-setting-checkbox",
      attr: { type: "checkbox" }
    }) as HTMLInputElement;
    debugToggle.checked = snapshot.debugLogging;
    debugRow.createDiv({ text: "Debug logging", cls: "copilot-setting-label" });
    debugToggle.addEventListener("change", () => {
      void this.plugin.updateDebugLogging(debugToggle.checked);
    });

    const retryRow = panel.createDiv({ cls: "copilot-setting-row" });
    const retryToggle = retryRow.createEl("input", {
      cls: "copilot-setting-checkbox",
      attr: { type: "checkbox" }
    }) as HTMLInputElement;
    retryToggle.checked = snapshot.retryFailedPrompt;
    retryRow.createDiv({ text: "Enable failed prompt retry", cls: "copilot-setting-label" });
    retryToggle.addEventListener("change", () => {
      void this.plugin.updateRetryFailedPrompt(retryToggle.checked);
    });

    const failedPrompt = snapshot.lastFailedPrompt.trim();
    const failedText = failedPrompt.length > 0
      ? failedPrompt.slice(0, 120)
      : "None";
    panel.createDiv({ text: `Last failed prompt: ${failedText}`, cls: "copilot-setting-hint" });
    const feedbackPath = snapshot.lastFeedbackNotePath.trim().length > 0
      ? snapshot.lastFeedbackNotePath
      : "None";
    panel.createDiv({ text: `Last feedback note: ${feedbackPath}`, cls: "copilot-setting-hint" });

    const diagnostics = snapshot.diagnostics;
    const diagnosticsLines = [
      `First token: ${formatDurationMs(diagnostics.lastFirstTokenLatencyMs)}`,
      `Response duration: ${formatDurationMs(diagnostics.lastResponseDurationMs)}`,
      `Response tokens: ${diagnostics.lastResponseTokenCount}`,
      `Stream renders: ${diagnostics.lastStreamRenderCount}`,
      `Last error: ${diagnostics.lastErrorCategory}`,
      `Error detail: ${diagnostics.lastErrorMessage || "none"}`,
      `Updated: ${new Date(diagnostics.updatedAt).toLocaleTimeString()}`
    ];
    const diagnosticsBox = panel.createEl("pre", { cls: "copilot-diagnostics-box" });
    diagnosticsBox.setText(diagnosticsLines.join("\n"));
  }

  private renderPendingChanges(snapshot: SidebarSnapshot): void {
    if (!this.elements) {
      return;
    }

    const list = this.elements.pendingList;
    list.empty();

    if (snapshot.pendingChanges.length === 0) {
      list.createDiv({ text: "No pending changes.", cls: "copilot-empty-state" });
      return;
    }

    for (const change of snapshot.pendingChanges) {
      const selectedClass = change.id === snapshot.selectedPendingChangeId ? " is-selected" : "";
      const row = list.createDiv({ cls: `copilot-pending-row${selectedClass}` });
      row.createDiv({ text: change.summary, cls: "copilot-pending-summary" });
      row.createDiv({ text: change.notePath, cls: "copilot-pending-path" });
      const actions = row.createDiv({ cls: "copilot-pending-actions" });

      const previewButton = actions.createEl("button", {
        text: "Preview",
        cls: "copilot-session-switch"
      }) as HTMLButtonElement;

      const applyButton = actions.createEl("button", {
        text: "Apply",
        cls: "copilot-session-switch"
      }) as HTMLButtonElement;

      const discardButton = actions.createEl("button", {
        text: "Discard",
        cls: "copilot-session-delete"
      }) as HTMLButtonElement;

      previewButton.addEventListener("click", () => {
        void this.plugin.selectPendingChange(change.id);
      });

      applyButton.addEventListener("click", () => {
        void this.plugin.applyPendingChange(change.id);
      });

      discardButton.addEventListener("click", () => {
        void this.plugin.discardPendingChange(change.id);
      });
    }
  }

  private renderContextNotes(snapshot: SidebarSnapshot): void {
    if (!this.elements) {
      return;
    }

    const list = this.elements.contextList;
    list.empty();

    if (snapshot.additionalContextPaths.length === 0) {
      list.createDiv({ text: "No additional context notes.", cls: "copilot-empty-state" });
      return;
    }

    for (const notePath of snapshot.additionalContextPaths) {
      const row = list.createDiv({ cls: "copilot-context-row" });
      row.createDiv({ text: notePath, cls: "copilot-context-path" });
      const removeButton = row.createEl("button", {
        text: "Remove",
        cls: "copilot-session-delete"
      }) as HTMLButtonElement;

      removeButton.addEventListener("click", () => {
        void this.plugin.removeContextPath(notePath);
      });
    }
  }

  private renderPreview(snapshot: SidebarSnapshot): void {
    if (!this.elements) {
      return;
    }

    const panel = this.elements.previewPanel;
    panel.empty();

    const header = panel.createDiv({ cls: "copilot-preview-header" });
    header.createDiv({ text: "Change Preview", cls: "copilot-preview-title" });
    const undoButton = header.createEl("button", {
      text: "Undo Last Apply",
      cls: "copilot-session-switch"
    }) as HTMLButtonElement;
    undoButton.disabled = !snapshot.lastAppliedChange;
    undoButton.addEventListener("click", () => {
      void this.plugin.undoLastAppliedChange();
    });

    const selected = snapshot.pendingChanges.find((change) => change.id === snapshot.selectedPendingChangeId);
    if (!selected) {
      panel.createDiv({ text: "Choose a pending change to preview diff.", cls: "copilot-empty-state" });
      if (snapshot.lastAppliedChange) {
        panel.createDiv({
          text: `Last applied: ${snapshot.lastAppliedChange.summary} (${snapshot.lastAppliedChange.notePath})`,
          cls: "copilot-preview-summary"
        });
      }
      return;
    }

    panel.createDiv({ text: selected.summary, cls: "copilot-preview-summary" });
    panel.createDiv({ text: selected.notePath, cls: "copilot-preview-path" });
    const diff = panel.createEl("pre", { cls: "copilot-preview-diff" });
    diff.setText(this.plugin.buildPendingPreview(selected));

    const actions = panel.createDiv({ cls: "copilot-preview-actions" });
    const applyButton = actions.createEl("button", {
      text: "Apply Previewed Change",
      cls: "copilot-button"
    }) as HTMLButtonElement;
    const discardButton = actions.createEl("button", {
      text: "Discard Previewed Change",
      cls: "copilot-button"
    }) as HTMLButtonElement;

    applyButton.addEventListener("click", () => {
      void this.plugin.applyPendingChange(selected.id);
    });

    discardButton.addEventListener("click", () => {
      void this.plugin.discardPendingChange(selected.id);
    });
  }

  private renderMessages(activeSession: ChatSession | undefined): void {
    if (!this.elements) {
      return;
    }

    const list = this.elements.messages;
    list.empty();

    if (!activeSession || activeSession.messages.length === 0) {
      list.createDiv({
        text: "Start the conversation with a question, or use Ask Current Note.",
        cls: "copilot-empty-state"
      });
      return;
    }

    for (const message of activeSession.messages) {
      const row = list.createDiv({ cls: `copilot-message message-${message.role}` });
      row.createDiv({ text: message.role.toUpperCase(), cls: "copilot-message-role" });
      const text = message.streaming ? `${message.content} ...` : message.content;
      row.createDiv({ text, cls: "copilot-message-content" });
    }
  }

  private async submitComposer(): Promise<void> {
    if (!this.elements) {
      return;
    }

    const prompt = this.elements.composerInput.value.trim();
    if (!prompt) {
      return;
    }

    this.elements.composerInput.value = "";
    await this.plugin.sendUserMessage(prompt);
  }
}

export default class CopilotSidebarPlugin extends Plugin {
  private settings: CopilotSidebarSettings = defaultSettings();
  private views = new Set<CopilotSidebarView>();
  private streaming = false;
  private activeStreamTimers = new Set<ReturnType<typeof setTimeout>>();
  private selectedPendingChangeId: string | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_COPILOT_SIDEBAR, (leaf) => new CopilotSidebarView(leaf, this));

    this.addCommand({
      id: "open-copilot-sidebar",
      name: "Open Copilot Sidebar",
      callback: async () => {
        await this.activateView();
      }
    });

    this.addCommand({
      id: "ask-about-current-note",
      name: "Ask about current note",
      callback: async () => {
        await this.askAboutCurrentNote();
      }
    });

    this.addCommand({
      id: "apply-pending-changes",
      name: "Apply pending changes",
      callback: async () => {
        await this.applyNextPendingChange();
      }
    });

    this.addCommand({
      id: "start-new-chat-session",
      name: "Start new chat session",
      callback: async () => {
        await this.startNewSession();
      }
    });

    this.addCommand({
      id: "undo-last-applied-change",
      name: "Undo last applied change",
      callback: async () => {
        await this.undoLastAppliedChange();
      }
    });

    this.addCommand({
      id: "open-sidebar-settings-panel",
      name: "Open sidebar settings panel",
      callback: async () => {
        await this.activateView();
        new Notice("Open the Copilot Sidebar and use the Settings section.");
      }
    });

    this.addCommand({
      id: "retry-last-failed-prompt",
      name: "Retry last failed prompt",
      callback: async () => {
        await this.retryLastFailedPrompt();
      }
    });

    this.addCommand({
      id: "copy-diagnostics-summary",
      name: "Copy diagnostics summary",
      callback: async () => {
        await this.copyDiagnosticsSummary();
      }
    });

    this.addCommand({
      id: "capture-beta-feedback-note",
      name: "Capture beta feedback note",
      callback: async () => {
        await this.captureBetaFeedbackNote();
      }
    });

    this.addCommand({
      id: "refresh-auth-status",
      name: "Refresh auth status",
      callback: async () => {
        await this.refreshAuthStatus("manual");
      }
    });

    void this.refreshAuthStatus("startup");
  }

  async onunload(): Promise<void> {
    for (const timer of this.activeStreamTimers) {
      clearTimeout(timer);
    }
    this.activeStreamTimers.clear();

    await this.app.workspace.detachLeavesOfType(VIEW_TYPE_COPILOT_SIDEBAR);
  }

  registerViewInstance(view: CopilotSidebarView): void {
    this.views.add(view);
  }

  unregisterViewInstance(view: CopilotSidebarView): void {
    this.views.delete(view);
  }

  getSnapshot(): SidebarSnapshot {
    const selectedPendingChangeId = this.settings.pendingChanges.some((change) => change.id === this.selectedPendingChangeId)
      ? this.selectedPendingChangeId
      : null;

    return {
      sessions: this.settings.sessions.map((session) => ({
        ...session,
        messages: session.messages.map((message) => ({ ...message }))
      })),
      activeSessionId: this.settings.activeSessionId,
      pendingChanges: this.settings.pendingChanges.map((change) => ({ ...change })),
      selectedPendingChangeId,
      additionalContextPaths: [...this.settings.additionalContextPaths],
      lastAppliedChange: this.settings.lastAppliedChange ? { ...this.settings.lastAppliedChange } : null,
      authState: this.settings.authState,
      authDetail: this.settings.authDetail,
      authCheckedAt: this.settings.authCheckedAt,
      model: this.settings.model,
      contextPolicy: this.settings.contextPolicy,
      changeApplyPolicy: this.settings.changeApplyPolicy,
      retryFailedPrompt: this.settings.retryFailedPrompt,
      lastFailedPrompt: this.settings.lastFailedPrompt,
      lastFeedbackNotePath: this.settings.lastFeedbackNotePath,
      diagnostics: { ...this.settings.diagnostics },
      debugLogging: this.settings.debugLogging,
      isStreaming: this.streaming
    };
  }

  buildPendingPreview(change: PendingChange): string {
    return buildPreviewDiff(change.before, change.after);
  }

  async setActiveSession(sessionId: string): Promise<void> {
    if (!this.settings.sessions.some((session) => session.id === sessionId)) {
      return;
    }

    this.settings.activeSessionId = sessionId;
    await this.persistAndRender();
  }

  async updateModel(model: string): Promise<void> {
    const trimmed = model.trim();
    if (!trimmed) {
      return;
    }

    this.settings.model = trimmed;
    await this.persistAndRender();
  }

  async updateContextPolicy(contextPolicy: ContextPolicy): Promise<void> {
    this.settings.contextPolicy = contextPolicy;
    await this.persistAndRender();
  }

  async updateChangeApplyPolicy(changeApplyPolicy: ChangeApplyPolicy): Promise<void> {
    this.settings.changeApplyPolicy = changeApplyPolicy;
    await this.persistAndRender();
  }

  async updateRetryFailedPrompt(enabled: boolean): Promise<void> {
    this.settings.retryFailedPrompt = enabled;
    await this.persistAndRender();
  }

  async updateDebugLogging(enabled: boolean): Promise<void> {
    this.settings.debugLogging = enabled;
    await this.persistAndRender();
  }

  async copyDiagnosticsSummary(): Promise<void> {
    const summary = this.buildDiagnosticsSummary();
    const clipboard = (globalThis as { navigator?: { clipboard?: { writeText?: (text: string) => Promise<void> } } })
      .navigator?.clipboard;

    if (clipboard?.writeText) {
      try {
        await clipboard.writeText(summary);
        new Notice("Diagnostics summary copied to clipboard.");
        return;
      } catch (error) {
        this.recordError("unknown", `Clipboard write failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.info("[copilot-sidebar] diagnostics-summary\n" + summary);
    new Notice("Diagnostics summary ready in console (clipboard unavailable).");
    await this.persistAndRender();
  }

  async captureBetaFeedbackNote(): Promise<void> {
    const existingFolder = this.app.vault.getAbstractFileByPath(BETA_FEEDBACK_FOLDER);
    if (existingFolder instanceof TFile) {
      this.recordError("filesystem", `${BETA_FEEDBACK_FOLDER} exists as a file, not a folder.`);
      new Notice("Cannot capture feedback: target folder path is already a file.");
      await this.persistAndRender();
      return;
    }

    if (!existingFolder) {
      try {
        await this.app.vault.createFolder(BETA_FEEDBACK_FOLDER);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!containsAny(message, ["already exists"])) {
          this.recordError("filesystem", `Failed to create feedback folder: ${message}`);
          new Notice("Cannot capture feedback note. Failed to create folder.");
          await this.persistAndRender();
          return;
        }
      }
    }

    const feedbackPath = `${BETA_FEEDBACK_FOLDER}/${this.createFeedbackFileName()}`;
    const content = this.buildBetaFeedbackNoteContent();

    try {
      const createdFile = await this.app.vault.create(feedbackPath, content);
      this.settings.lastFeedbackNotePath = createdFile.path;
      this.clearError();
      await this.persistAndRender();
      new Notice(`Beta feedback note created: ${createdFile.path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.recordError("filesystem", `Failed to create feedback note: ${message}`);
      new Notice("Cannot capture feedback note. See diagnostics for details.");
      await this.persistAndRender();
    }
  }

  async startNewSession(): Promise<void> {
    const session = createSession();
    this.settings.sessions = [session, ...this.settings.sessions].slice(0, MAX_SESSIONS);
    this.settings.activeSessionId = session.id;

    await this.activateView();
    await this.persistAndRender();
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (this.settings.sessions.length === 1) {
      new Notice("At least one session must remain.");
      return;
    }

    this.settings.sessions = this.settings.sessions.filter((session) => session.id !== sessionId);
    if (!this.settings.sessions.some((session) => session.id === this.settings.activeSessionId)) {
      this.settings.activeSessionId = this.settings.sessions[0].id;
    }

    await this.persistAndRender();
  }

  async cycleAuthState(): Promise<void> {
    const currentIndex = AUTH_ORDER.indexOf(this.settings.authState);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % AUTH_ORDER.length : 0;
    this.settings.authState = AUTH_ORDER[nextIndex];
    this.settings.authDetail = "Manual auth state override.";
    this.settings.authCheckedAt = Date.now();
    await this.persistAndRender();
  }

  async refreshAuthStatus(trigger: "startup" | "manual" = "manual"): Promise<void> {
    const probe = this.probeAuthStatusFromGh();
    this.settings.authState = probe.state;
    this.settings.authDetail = probe.detail;
    this.settings.authCheckedAt = probe.checkedAt;

    const authCategory = categoryFromAuthState(probe.state);
    if (authCategory === "none") {
      this.clearError();
    } else {
      this.recordError(authCategory, probe.detail);
    }

    await this.persistAndRender();

    if (trigger === "manual") {
      new Notice(`Auth check: ${probe.state}`);
    }
  }

  private probeAuthStatusFromGh(): AuthProbeResult {
    const checkedAt = Date.now();

    const ghVersion = this.runLocalCommand("gh", ["--version"], 2500);
    if (ghVersion.status !== 0) {
      return {
        state: "offline",
        detail: "gh CLI not found. Install/authenticate GitHub CLI.",
        checkedAt
      };
    }

    const authStatus = this.runLocalCommand("gh", ["auth", "status", "-h", "github.com"], 6000);
    const authOutput = compactOutput(authStatus.stdout, authStatus.stderr);

    if (authStatus.status !== 0) {
      if (containsAny(authOutput, ["expired", "token", "not logged", "authentication"])) {
        return {
          state: "token-expired",
          detail: `GitHub auth issue: ${authOutput}`,
          checkedAt
        };
      }

      return {
        state: "offline",
        detail: `Unable to reach GitHub auth status: ${authOutput}`,
        checkedAt
      };
    }

    const copilotStatus = this.runLocalCommand("gh", ["copilot", "status"], 6000);
    const copilotOutput = compactOutput(copilotStatus.stdout, copilotStatus.stderr);

    if (copilotStatus.status === 0) {
      return {
        state: "logged-in",
        detail: `GitHub login and Copilot status confirmed. ${copilotOutput}`,
        checkedAt
      };
    }

    if (containsAny(copilotOutput, ["not entitled", "not enabled", "no entitlement", "not subscribed"])) {
      return {
        state: "no-entitlement",
        detail: `GitHub login ok but Copilot entitlement missing. ${copilotOutput}`,
        checkedAt
      };
    }

    if (containsAny(copilotOutput, ["token", "authentication", "not logged", "login"])) {
      return {
        state: "token-expired",
        detail: `Copilot auth needs refresh. ${copilotOutput}`,
        checkedAt
      };
    }

    if (containsAny(copilotOutput, ["unknown command", "usage:"])) {
      return {
        state: "logged-in",
        detail: "GitHub login detected. Copilot status command unavailable in this gh build.",
        checkedAt
      };
    }

    return {
      state: "logged-in",
      detail: `GitHub login detected. Copilot status inconclusive: ${copilotOutput}`,
      checkedAt
    };
  }

  private runLocalCommand(command: string, args: string[], timeoutMs: number): CommandExecResult {
    const dynamicRequire = this.getDynamicRequire();
    if (!dynamicRequire) {
      return {
        status: -1,
        stdout: "",
        stderr: "dynamic require is unavailable in this runtime",
        error: "require-unavailable"
      };
    }

    try {
      const childProcess = dynamicRequire("node:child_process") as {
        spawnSync: (
          cmd: string,
          cmdArgs: string[],
          options: { encoding: "utf8"; timeout: number }
        ) => { status: number | null; stdout?: string; stderr?: string; error?: unknown };
      };

      const result = childProcess.spawnSync(command, args, {
        encoding: "utf8",
        timeout: timeoutMs
      });

      const error = result.error instanceof Error ? result.error.message : null;
      return {
        status: result.status ?? -1,
        stdout: typeof result.stdout === "string" ? result.stdout : "",
        stderr: typeof result.stderr === "string" ? result.stderr : "",
        error
      };
    } catch (error) {
      return {
        status: -1,
        stdout: "",
        stderr: "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getDynamicRequire(): ((moduleId: string) => unknown) | null {
    const fromGlobal = (globalThis as { require?: ((moduleId: string) => unknown) }).require;
    if (typeof fromGlobal === "function") {
      return fromGlobal;
    }

    const fromWindow = (globalThis as { window?: { require?: ((moduleId: string) => unknown) } }).window?.require;
    if (typeof fromWindow === "function") {
      return fromWindow;
    }

    return null;
  }

  async addActiveNoteToContext(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!(activeFile instanceof TFile)) {
      new Notice("Open a note first to add explicit context.");
      return;
    }

    if (this.settings.additionalContextPaths.includes(activeFile.path)) {
      new Notice("This note is already in additional context.");
      return;
    }

    this.settings.additionalContextPaths = [activeFile.path, ...this.settings.additionalContextPaths]
      .slice(0, MAX_ADDITIONAL_CONTEXT);
    await this.persistAndRender();
    new Notice(`Added context note: ${activeFile.path}`);
  }

  async removeContextPath(notePath: string): Promise<void> {
    const next = this.settings.additionalContextPaths.filter((path) => path !== notePath);
    if (next.length === this.settings.additionalContextPaths.length) {
      return;
    }

    this.settings.additionalContextPaths = next;
    await this.persistAndRender();
  }

  async selectPendingChange(changeId: string | null): Promise<void> {
    if (!changeId || !this.settings.pendingChanges.some((change) => change.id === changeId)) {
      this.selectedPendingChangeId = null;
    } else {
      this.selectedPendingChangeId = changeId;
    }

    this.syncSelectedPendingChange();
    this.renderViews();
  }

  async askAboutCurrentNote(): Promise<void> {
    await this.activateView();
    const context = await this.getPromptContext();

    const prompt = context.selection
      ? "Explain the selected text and suggest improvements."
      : "Summarize the current note and suggest improvements.";

    await this.sendUserMessage(prompt, context);
  }

  async applyPendingChange(changeId: string): Promise<void> {
    const change = this.settings.pendingChanges.find((item) => item.id === changeId);
    if (!change) {
      this.recordError("validation", "Pending change id was not found during apply.");
      new Notice("Pending change not found.");
      await this.persistAndRender();
      return;
    }

    const target = this.app.vault.getAbstractFileByPath(change.notePath);
    if (!(target instanceof TFile)) {
      this.recordError("filesystem", `Apply target missing: ${change.notePath}`);
      new Notice(`Target note no longer exists: ${change.notePath}`);
      this.settings.pendingChanges = this.settings.pendingChanges.filter((item) => item.id !== changeId);
      this.syncSelectedPendingChange();
      await this.persistAndRender();
      return;
    }

    if (this.settings.changeApplyPolicy === "confirm-write") {
      const accepted = typeof window !== "undefined"
        ? window.confirm(`Apply pending change to ${change.notePath}?`)
        : true;
      if (!accepted) {
        this.recordError("validation", `Apply confirmation canceled for ${change.notePath}`);
        new Notice("Apply canceled by policy confirmation.");
        await this.persistAndRender();
        return;
      }
    }

    await this.app.vault.modify(target, change.after);
    this.clearError();
    this.settings.lastAppliedChange = {
      ...change,
      appliedAt: Date.now()
    };
    this.settings.pendingChanges = this.settings.pendingChanges.filter((item) => item.id !== changeId);
    this.syncSelectedPendingChange();
    await this.persistAndRender();
    new Notice(`Applied change to ${change.notePath}`);
  }

  async discardPendingChange(changeId: string): Promise<void> {
    const beforeCount = this.settings.pendingChanges.length;
    this.settings.pendingChanges = this.settings.pendingChanges.filter((change) => change.id !== changeId);
    if (this.settings.pendingChanges.length === beforeCount) {
      this.recordError("validation", "Discard requested for unknown pending change id.");
      new Notice("Pending change not found.");
      await this.persistAndRender();
      return;
    }

    this.syncSelectedPendingChange();
    await this.persistAndRender();
    new Notice("Discarded pending change.");
  }

  async undoLastAppliedChange(): Promise<void> {
    const last = this.settings.lastAppliedChange;
    if (!last) {
      this.recordError("validation", "Undo requested with no last applied change.");
      new Notice("No applied change to undo.");
      await this.persistAndRender();
      return;
    }

    const target = this.app.vault.getAbstractFileByPath(last.notePath);
    if (!(target instanceof TFile)) {
      this.recordError("filesystem", `Undo target missing: ${last.notePath}`);
      new Notice(`Cannot undo. Note not found: ${last.notePath}`);
      this.settings.lastAppliedChange = null;
      await this.persistAndRender();
      return;
    }

    await this.app.vault.modify(target, last.before);
    this.clearError();
    this.settings.lastAppliedChange = null;
    await this.persistAndRender();
    new Notice(`Reverted last applied change in ${last.notePath}`);
  }

  async applyNextPendingChange(): Promise<void> {
    const first = this.settings.pendingChanges[0];
    if (!first) {
      this.recordError("validation", "Apply-next invoked with empty pending queue.");
      new Notice("No pending changes to apply.");
      await this.persistAndRender();
      return;
    }

    await this.applyPendingChange(first.id);
  }

  async retryLastFailedPrompt(): Promise<void> {
    const lastFailed = this.settings.lastFailedPrompt.trim();
    if (!lastFailed) {
      new Notice("No failed prompt to retry.");
      return;
    }

    await this.refreshAuthStatus("manual");
    if (this.settings.authState !== "logged-in") {
      this.recordError(categoryFromAuthState(this.settings.authState), `Retry blocked: auth=${this.settings.authState}`);
      new Notice(`Cannot retry while auth is ${this.settings.authState}.`);
      await this.persistAndRender();
      return;
    }

    await this.sendUserMessage(lastFailed);
  }

  private buildDiagnosticsSummary(): string {
    const d = this.settings.diagnostics;
    return [
      "Obsidian Copilot Sidebar Diagnostics",
      `time=${new Date().toISOString()}`,
      `authState=${this.settings.authState}`,
      `model=${this.settings.model}`,
      `contextPolicy=${this.settings.contextPolicy}`,
      `changeApplyPolicy=${this.settings.changeApplyPolicy}`,
      `firstTokenLatencyMs=${Math.round(d.lastFirstTokenLatencyMs)}`,
      `responseDurationMs=${Math.round(d.lastResponseDurationMs)}`,
      `responseTokenCount=${d.lastResponseTokenCount}`,
      `streamRenderCount=${d.lastStreamRenderCount}`,
      `lastErrorCategory=${d.lastErrorCategory}`,
      `lastErrorMessage=${d.lastErrorMessage || "none"}`,
      `diagnosticsUpdatedAt=${new Date(d.updatedAt).toISOString()}`
    ].join("\n");
  }

  private createFeedbackFileName(): string {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `feedback-${yyyy}${mm}${dd}-${hh}${min}${ss}-${ms}.md`;
  }

  private buildBetaFeedbackNoteContent(): string {
    const session = this.ensureActiveSession();
    const activePath = this.app.workspace.getActiveFile()?.path ?? "<none>";
    const recentMessages = session.messages
      .slice(-6)
      .map((message) => `- ${message.role}: ${message.content.slice(0, 200)}`)
      .join("\n");

    return [
      "# Copilot Sidebar Beta Feedback",
      "",
      `- Captured at: ${new Date().toISOString()}`,
      `- Active note: ${activePath}`,
      `- Session: ${session.title} (${session.id})`,
      `- Session message count: ${session.messages.length}`,
      `- Pending changes: ${this.settings.pendingChanges.length}`,
      "",
      "## Feedback",
      "- What did you try?",
      "- What worked well?",
      "- What felt confusing or slow?",
      "- What outcome did you expect?",
      "",
      "## Recent Chat Context",
      recentMessages.length > 0 ? recentMessages : "- <no recent messages>",
      "",
      "## Diagnostics",
      "```text",
      this.buildDiagnosticsSummary(),
      "```",
      "",
      "## Notes",
      "- Add screenshots/log snippets if needed.",
      "- Include reproduction steps for non-deterministic issues."
    ].join("\n");
  }

  private trimSessionMessages(session: ChatSession): void {
    if (session.messages.length <= MAX_MESSAGES_PER_SESSION) {
      return;
    }
    session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
  }

  private recordError(category: ErrorCategory, message: string): void {
    this.settings.diagnostics.lastErrorCategory = category;
    this.settings.diagnostics.lastErrorMessage = message;
    this.settings.diagnostics.updatedAt = Date.now();
  }

  private clearError(): void {
    this.settings.diagnostics.lastErrorCategory = "none";
    this.settings.diagnostics.lastErrorMessage = "";
    this.settings.diagnostics.updatedAt = Date.now();
  }

  async sendUserMessage(prompt: string, providedContext?: PromptContext): Promise<void> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    if (this.settings.retryFailedPrompt && this.settings.authState !== "logged-in") {
      this.settings.lastFailedPrompt = trimmed;
      this.recordError(categoryFromAuthState(this.settings.authState), `Prompt queued for retry while auth=${this.settings.authState}`);
    }

    if (this.settings.debugLogging) {
      console.info("[copilot-sidebar] sendUserMessage", {
        authState: this.settings.authState,
        promptLength: trimmed.length,
        contextPolicy: this.settings.contextPolicy,
        changeApplyPolicy: this.settings.changeApplyPolicy
      });
    }

    const session = this.ensureActiveSession();
    session.messages.push({
      id: createId("msg-user"),
      role: "user",
      content: trimmed,
      createdAt: Date.now()
    });
    this.trimSessionMessages(session);
    session.updatedAt = Date.now();

    if (session.title === "New chat session") {
      session.title = trimmed.slice(0, 42);
    }

    const assistantMessage: ChatMessage = {
      id: createId("msg-assistant"),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true
    };
    session.messages.push(assistantMessage);
    this.trimSessionMessages(session);

    this.streaming = true;
    await this.persistAndRender();

    const context = providedContext ?? await this.getPromptContext();
    const response = this.composeMockResponse(trimmed, context);
    const tokens = response.split(" ");

    const streamStartedAt = Date.now();
    let firstTokenAt: number | null = null;
    let lastRenderAt = 0;
    let renderCount = 0;

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      assistantMessage.content = assistantMessage.content
        ? `${assistantMessage.content} ${token}`
        : token;

      if (firstTokenAt === null) {
        firstTokenAt = Date.now();
      }

      const now = Date.now();
      const isBatchBoundary = (index + 1) % STREAM_RENDER_BATCH_TOKENS === 0;
      const exceededRenderInterval = now - lastRenderAt >= STREAM_RENDER_INTERVAL_MS;
      const isFinalToken = index === tokens.length - 1;

      if (isBatchBoundary || exceededRenderInterval || isFinalToken) {
        this.renderViews();
        lastRenderAt = now;
        renderCount += 1;
      }

      await this.delay(STREAM_DELAY_MS);
    }

    const streamFinishedAt = Date.now();

    assistantMessage.streaming = false;
    session.updatedAt = Date.now();
    this.streaming = false;

    this.settings.diagnostics.lastFirstTokenLatencyMs = firstTokenAt ? (firstTokenAt - streamStartedAt) : 0;
    this.settings.diagnostics.lastResponseDurationMs = streamFinishedAt - streamStartedAt;
    this.settings.diagnostics.lastResponseTokenCount = tokens.length;
    this.settings.diagnostics.lastStreamRenderCount = renderCount;
    this.settings.diagnostics.updatedAt = streamFinishedAt;

    if (this.settings.authState === "logged-in") {
      this.settings.lastFailedPrompt = "";
      this.clearError();
    }

    await this.maybeCreatePendingChange(trimmed, response, context);
    this.syncSelectedPendingChange();
    await this.persistAndRender();
  }

  private async loadSettings(): Promise<void> {
    const saved = await this.loadData();
    this.settings = normalizeSettings(saved);
    this.syncSelectedPendingChange();
  }

  private async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async persistAndRender(): Promise<void> {
    await this.saveSettings();
    this.renderViews();
  }

  private renderViews(): void {
    const snapshot = this.getSnapshot();
    for (const view of this.views) {
      view.renderFromState(snapshot);
    }
  }

  private async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_COPILOT_SIDEBAR)[0] ?? null;
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) {
        return;
      }

      leaf = rightLeaf;
      await leaf.setViewState({
        type: VIEW_TYPE_COPILOT_SIDEBAR,
        active: true
      });
    }

    workspace.revealLeaf(leaf);
  }

  private ensureActiveSession(): ChatSession {
    let activeSession = this.settings.sessions.find((session) => session.id === this.settings.activeSessionId);
    if (!activeSession) {
      activeSession = this.settings.sessions[0] ?? createSession();
      if (!this.settings.sessions.some((session) => session.id === activeSession?.id)) {
        this.settings.sessions.unshift(activeSession);
      }
      this.settings.activeSessionId = activeSession.id;
    }

    return activeSession;
  }

  private syncSelectedPendingChange(): void {
    if (this.settings.pendingChanges.length === 0) {
      this.selectedPendingChangeId = null;
      return;
    }

    if (!this.selectedPendingChangeId || !this.settings.pendingChanges.some((change) => change.id === this.selectedPendingChangeId)) {
      this.selectedPendingChangeId = this.settings.pendingChanges[0].id;
    }
  }

  private async getPromptContext(): Promise<PromptContext> {
    const activeFile = this.app.workspace.getActiveFile();
    let notePath: string | null = null;
    let noteContent = "";

    if (activeFile instanceof TFile) {
      notePath = activeFile.path;
      noteContent = await this.app.vault.cachedRead(activeFile);
    }

    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    const selection = markdownView?.editor?.getSelection()?.trim() ?? "";
    const additionalNotes = await this.collectAdditionalContextNotes(notePath);

    return {
      notePath,
      noteContent,
      selection,
      additionalNotes
    };
  }

  private async collectAdditionalContextNotes(activePath: string | null): Promise<AdditionalContextNote[]> {
    const notes: AdditionalContextNote[] = [];

    for (const notePath of this.settings.additionalContextPaths) {
      if (notePath === activePath) {
        continue;
      }

      const file = this.app.vault.getAbstractFileByPath(notePath);
      if (!(file instanceof TFile)) {
        continue;
      }

      const content = await this.app.vault.cachedRead(file);
      notes.push({ path: notePath, content });
    }

    return notes;
  }

  private composeMockResponse(prompt: string, context: PromptContext): string {
    if (this.settings.authState !== "logged-in") {
      return `Auth state is ${this.settings.authState}. Re-authenticate before sending production requests.`;
    }

    const selectionSummary = context.selection
      ? `Selection context: ${context.selection.slice(0, 220)}`
      : "Selection context: <empty>";

    const noteSummary = context.noteContent
      ? `Active note context: ${context.noteContent.slice(0, 220)}`
      : "Active note context: <empty>";

    const additionalSummary = context.additionalNotes.length > 0
      ? context.additionalNotes
        .map((note) => `${note.path}: ${note.content.slice(0, 120)}`)
        .join(" | ")
      : "No explicit additional note contexts.";

    const primaryContext = this.settings.contextPolicy === "selection-first" ? selectionSummary : noteSummary;
    const secondaryContext = this.settings.contextPolicy === "selection-first" ? noteSummary : selectionSummary;

    return [
      `Model ${this.settings.model} mock response:`,
      `Prompt: ${prompt}`,
      `Primary context (${this.settings.contextPolicy}): ${primaryContext}`,
      `Secondary context: ${secondaryContext}`,
      `Write policy: ${this.settings.changeApplyPolicy}`,
      `Merged additional context: ${additionalSummary}`,
      "Suggested next steps:",
      "1. Validate key claims in your note.",
      "2. Refine structure with clear headings.",
      "3. Apply pending change if you want an auto-generated patch."
    ].join(" ");
  }

  private async maybeCreatePendingChange(prompt: string, response: string, context: PromptContext): Promise<void> {
    if (this.settings.authState !== "logged-in") {
      return;
    }

    if (!context.notePath || !context.noteContent) {
      return;
    }

    if (!/apply|change|rewrite|edit|update/i.test(prompt)) {
      return;
    }

    const after = `${context.noteContent}\n\n## Copilot Suggestion\n${response}\n`;
    const pending: PendingChange = {
      id: createId("change"),
      notePath: context.notePath,
      before: context.noteContent,
      after,
      summary: `Append assistant suggestion to ${context.notePath}`,
      createdAt: Date.now()
    };

    this.settings.pendingChanges = [pending, ...this.settings.pendingChanges].slice(0, MAX_PENDING_CHANGES);
    this.selectedPendingChangeId = pending.id;
    new Notice(`Pending change created for ${context.notePath}`);
  }

  private async delay(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.activeStreamTimers.delete(timer);
        resolve();
      }, ms);

      this.activeStreamTimers.add(timer);
    });
  }
}

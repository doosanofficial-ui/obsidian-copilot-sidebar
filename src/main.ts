import { ItemView, MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";

const VIEW_TYPE_COPILOT_SIDEBAR = "copilot-sidebar-view";
const MAX_SESSIONS = 20;
const MAX_PENDING_CHANGES = 10;
const STREAM_DELAY_MS = 30;

type AuthState = "logged-in" | "no-entitlement" | "token-expired" | "offline";
type ContextPolicy = "selection-first" | "note-only";
type MessageRole = "user" | "assistant" | "system";

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

interface CopilotSidebarSettings {
  sessions: ChatSession[];
  activeSessionId: string;
  pendingChanges: PendingChange[];
  authState: AuthState;
  model: string;
  contextPolicy: ContextPolicy;
  debugLogging: boolean;
}

interface PromptContext {
  notePath: string | null;
  noteContent: string;
  selection: string;
}

interface SidebarSnapshot {
  sessions: ChatSession[];
  activeSessionId: string;
  pendingChanges: PendingChange[];
  authState: AuthState;
  model: string;
  isStreaming: boolean;
}

interface ViewElements {
  title: HTMLElement;
  authBadge: HTMLElement;
  sessionList: HTMLElement;
  pendingList: HTMLElement;
  messages: HTMLElement;
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
    authState: "logged-in",
    model: "gpt-5.3-codex",
    contextPolicy: "selection-first",
    debugLogging: false
  };
}

function isAuthState(value: unknown): value is AuthState {
  return value === "logged-in" || value === "no-entitlement" || value === "token-expired" || value === "offline";
}

function isContextPolicy(value: unknown): value is ContextPolicy {
  return value === "selection-first" || value === "note-only";
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === "user" || value === "assistant" || value === "system";
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

  return {
    sessions: normalizedSessions,
    activeSessionId,
    pendingChanges,
    authState: isAuthState(source.authState) ? source.authState : fallback.authState,
    model: typeof source.model === "string" && source.model.trim().length > 0 ? source.model : fallback.model,
    contextPolicy: isContextPolicy(source.contextPolicy) ? source.contextPolicy : fallback.contextPolicy,
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
    const authBadge = header.createDiv({ cls: "copilot-auth-badge" });

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
    const authCycleButton = controlRow.createEl("button", {
      text: "Cycle Auth",
      cls: "copilot-button"
    }) as HTMLButtonElement;

    const layout = root.createDiv({ cls: "copilot-sidebar-layout" });
    const leftPane = layout.createDiv({ cls: "copilot-sidebar-pane copilot-sidebar-pane-sessions" });
    leftPane.createDiv({ text: "Sessions", cls: "copilot-pane-title" });
    const sessionList = leftPane.createDiv({ cls: "copilot-session-list" });
    leftPane.createDiv({ text: "Pending Changes", cls: "copilot-pane-title" });
    const pendingList = leftPane.createDiv({ cls: "copilot-pending-list" });

    const rightPane = layout.createDiv({ cls: "copilot-sidebar-pane copilot-sidebar-pane-chat" });
    const messages = rightPane.createDiv({ cls: "copilot-message-list" });

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

    authCycleButton.addEventListener("click", () => {
      void this.plugin.cycleAuthState();
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
      sessionList,
      pendingList,
      messages,
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

    this.renderSessions(snapshot);
    this.renderPendingChanges(snapshot);
    this.renderMessages(activeSession);

    this.elements.composerButton.disabled = snapshot.isStreaming;
    this.elements.composerInput.disabled = snapshot.isStreaming;
    this.elements.composerInput.placeholder = snapshot.authState === "logged-in"
      ? "Ask Copilot about this vault..."
      : "Auth state is not logged-in. Use Cycle Auth (mock) to simulate recovery.";
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
      const row = list.createDiv({ cls: "copilot-pending-row" });
      row.createDiv({ text: change.summary, cls: "copilot-pending-summary" });
      row.createDiv({ text: change.notePath, cls: "copilot-pending-path" });
      const applyButton = row.createEl("button", {
        text: "Apply",
        cls: "copilot-session-switch"
      }) as HTMLButtonElement;

      applyButton.addEventListener("click", () => {
        void this.plugin.applyPendingChange(change.id);
      });
    }
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
    return {
      sessions: this.settings.sessions.map((session) => ({
        ...session,
        messages: session.messages.map((message) => ({ ...message }))
      })),
      activeSessionId: this.settings.activeSessionId,
      pendingChanges: this.settings.pendingChanges.map((change) => ({ ...change })),
      authState: this.settings.authState,
      model: this.settings.model,
      isStreaming: this.streaming
    };
  }

  async setActiveSession(sessionId: string): Promise<void> {
    if (!this.settings.sessions.some((session) => session.id === sessionId)) {
      return;
    }

    this.settings.activeSessionId = sessionId;
    await this.persistAndRender();
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
    await this.persistAndRender();
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
      new Notice("Pending change not found.");
      return;
    }

    const target = this.app.vault.getAbstractFileByPath(change.notePath);
    if (!(target instanceof TFile)) {
      new Notice(`Target note no longer exists: ${change.notePath}`);
      this.settings.pendingChanges = this.settings.pendingChanges.filter((item) => item.id !== changeId);
      await this.persistAndRender();
      return;
    }

    await this.app.vault.modify(target, change.after);
    this.settings.pendingChanges = this.settings.pendingChanges.filter((item) => item.id !== changeId);
    await this.persistAndRender();
    new Notice(`Applied change to ${change.notePath}`);
  }

  async applyNextPendingChange(): Promise<void> {
    const first = this.settings.pendingChanges[0];
    if (!first) {
      new Notice("No pending changes to apply.");
      return;
    }

    await this.applyPendingChange(first.id);
  }

  async sendUserMessage(prompt: string, providedContext?: PromptContext): Promise<void> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    const session = this.ensureActiveSession();
    session.messages.push({
      id: createId("msg-user"),
      role: "user",
      content: trimmed,
      createdAt: Date.now()
    });
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

    this.streaming = true;
    await this.persistAndRender();

    const context = providedContext ?? await this.getPromptContext();
    const response = this.composeMockResponse(trimmed, context);
    const tokens = response.split(" ");

    for (const token of tokens) {
      assistantMessage.content = assistantMessage.content
        ? `${assistantMessage.content} ${token}`
        : token;

      this.renderViews();
      await this.delay(STREAM_DELAY_MS);
    }

    assistantMessage.streaming = false;
    session.updatedAt = Date.now();
    this.streaming = false;

    await this.maybeCreatePendingChange(trimmed, response, context);
    await this.persistAndRender();
  }

  private async loadSettings(): Promise<void> {
    const saved = await this.loadData();
    this.settings = normalizeSettings(saved);
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

    return {
      notePath,
      noteContent,
      selection
    };
  }

  private composeMockResponse(prompt: string, context: PromptContext): string {
    if (this.settings.authState !== "logged-in") {
      return `Auth state is ${this.settings.authState}. Re-authenticate before sending production requests.`;
    }

    const contextSource = this.settings.contextPolicy === "selection-first" && context.selection
      ? `Selection context: ${context.selection.slice(0, 220)}`
      : context.noteContent
        ? `Note context: ${context.noteContent.slice(0, 220)}`
        : "No active note context available.";

    return [
      `Model ${this.settings.model} mock response:`,
      `Prompt: ${prompt}`,
      contextSource,
      "Suggested next steps:",
      "1. Validate key claims in your note.",
      "2. Refine structure with clear headings.",
      "3. Apply pending change if you want an auto-generated patch."
    ].join(" ");
  }

  private async maybeCreatePendingChange(prompt: string, response: string, context: PromptContext): Promise<void> {
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
      summary: "Append assistant suggestion to active note",
      createdAt: Date.now()
    };

    this.settings.pendingChanges = [pending, ...this.settings.pendingChanges].slice(0, MAX_PENDING_CHANGES);
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

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => CopilotSidebarPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE_COPILOT_SIDEBAR = "copilot-sidebar-view";
var MAX_SESSIONS = 20;
var MAX_PENDING_CHANGES = 10;
var STREAM_DELAY_MS = 30;
var AUTH_ORDER = ["logged-in", "no-entitlement", "token-expired", "offline"];
function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function createSession(title = "New chat session") {
  const now = Date.now();
  return {
    id: createId("session"),
    title,
    createdAt: now,
    updatedAt: now,
    messages: []
  };
}
function defaultSettings() {
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
function isAuthState(value) {
  return value === "logged-in" || value === "no-entitlement" || value === "token-expired" || value === "offline";
}
function isContextPolicy(value) {
  return value === "selection-first" || value === "note-only";
}
function isMessageRole(value) {
  return value === "user" || value === "assistant" || value === "system";
}
function normalizeSettings(raw) {
  const fallback = defaultSettings();
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const source = raw;
  const sessions = Array.isArray(source.sessions) ? source.sessions.filter((session) => Boolean(session && typeof session === "object" && session.id)).slice(0, MAX_SESSIONS).map((session) => ({
    id: String(session.id),
    title: typeof session.title === "string" && session.title.trim().length > 0 ? session.title : "New chat session",
    createdAt: typeof session.createdAt === "number" ? session.createdAt : Date.now(),
    updatedAt: typeof session.updatedAt === "number" ? session.updatedAt : Date.now(),
    messages: Array.isArray(session.messages) ? session.messages.filter((message) => Boolean(message && typeof message === "object" && message.id)).map((message) => {
      const role = isMessageRole(message.role) ? message.role : "user";
      return {
        id: String(message.id),
        role,
        content: typeof message.content === "string" ? message.content : "",
        createdAt: typeof message.createdAt === "number" ? message.createdAt : Date.now(),
        streaming: Boolean(message.streaming)
      };
    }) : []
  })) : [];
  const normalizedSessions = sessions.length > 0 ? sessions : [createSession()];
  const activeSessionId = normalizedSessions.some((session) => session.id === source.activeSessionId) ? String(source.activeSessionId) : normalizedSessions[0].id;
  const pendingChanges = Array.isArray(source.pendingChanges) ? source.pendingChanges.filter((change) => Boolean(change && typeof change === "object" && change.id && change.notePath)).slice(0, MAX_PENDING_CHANGES).map((change) => ({
    id: String(change.id),
    notePath: String(change.notePath),
    before: typeof change.before === "string" ? change.before : "",
    after: typeof change.after === "string" ? change.after : "",
    summary: typeof change.summary === "string" ? change.summary : "Generated suggestion",
    createdAt: typeof change.createdAt === "number" ? change.createdAt : Date.now()
  })) : [];
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
var CopilotSidebarView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.elements = null;
  }
  getViewType() {
    return VIEW_TYPE_COPILOT_SIDEBAR;
  }
  getDisplayText() {
    return "Copilot Sidebar";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    const root = container.createDiv({ cls: "copilot-sidebar-root" });
    const header = root.createDiv({ cls: "copilot-sidebar-header" });
    const title = header.createDiv({ text: "Copilot Sidebar", cls: "copilot-sidebar-title" });
    const authBadge = header.createDiv({ cls: "copilot-auth-badge" });
    const controlRow = root.createDiv({ cls: "copilot-sidebar-controls" });
    const newSessionButton = controlRow.createEl("button", {
      text: "New Session",
      cls: "copilot-button"
    });
    const askNoteButton = controlRow.createEl("button", {
      text: "Ask Current Note",
      cls: "copilot-button"
    });
    const applyButton = controlRow.createEl("button", {
      text: "Apply Pending",
      cls: "copilot-button"
    });
    const authCycleButton = controlRow.createEl("button", {
      text: "Cycle Auth",
      cls: "copilot-button"
    });
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
    });
    composerInput.placeholder = "Ask Copilot about this vault...";
    const composerButton = composer.createEl("button", {
      text: "Send",
      cls: "copilot-button copilot-send-button"
    });
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
  async onClose() {
    this.plugin.unregisterViewInstance(this);
    this.containerEl.empty();
  }
  renderFromState(snapshot) {
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
    this.elements.composerInput.placeholder = snapshot.authState === "logged-in" ? "Ask Copilot about this vault..." : "Auth state is not logged-in. Use Cycle Auth (mock) to simulate recovery.";
  }
  renderSessions(snapshot) {
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
      });
      switchButton.addEventListener("click", () => {
        void this.plugin.setActiveSession(session.id);
      });
      const deleteButton = row.createEl("button", {
        text: "Delete",
        cls: "copilot-session-delete"
      });
      deleteButton.disabled = snapshot.sessions.length === 1;
      deleteButton.addEventListener("click", () => {
        void this.plugin.deleteSession(session.id);
      });
    }
  }
  renderPendingChanges(snapshot) {
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
      });
      applyButton.addEventListener("click", () => {
        void this.plugin.applyPendingChange(change.id);
      });
    }
  }
  renderMessages(activeSession) {
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
  async submitComposer() {
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
};
var CopilotSidebarPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = defaultSettings();
    this.views = /* @__PURE__ */ new Set();
    this.streaming = false;
    this.activeStreamTimers = /* @__PURE__ */ new Set();
  }
  async onload() {
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
  async onunload() {
    for (const timer of this.activeStreamTimers) {
      clearTimeout(timer);
    }
    this.activeStreamTimers.clear();
    await this.app.workspace.detachLeavesOfType(VIEW_TYPE_COPILOT_SIDEBAR);
  }
  registerViewInstance(view) {
    this.views.add(view);
  }
  unregisterViewInstance(view) {
    this.views.delete(view);
  }
  getSnapshot() {
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
  async setActiveSession(sessionId) {
    if (!this.settings.sessions.some((session) => session.id === sessionId)) {
      return;
    }
    this.settings.activeSessionId = sessionId;
    await this.persistAndRender();
  }
  async startNewSession() {
    const session = createSession();
    this.settings.sessions = [session, ...this.settings.sessions].slice(0, MAX_SESSIONS);
    this.settings.activeSessionId = session.id;
    await this.activateView();
    await this.persistAndRender();
  }
  async deleteSession(sessionId) {
    if (this.settings.sessions.length === 1) {
      new import_obsidian.Notice("At least one session must remain.");
      return;
    }
    this.settings.sessions = this.settings.sessions.filter((session) => session.id !== sessionId);
    if (!this.settings.sessions.some((session) => session.id === this.settings.activeSessionId)) {
      this.settings.activeSessionId = this.settings.sessions[0].id;
    }
    await this.persistAndRender();
  }
  async cycleAuthState() {
    const currentIndex = AUTH_ORDER.indexOf(this.settings.authState);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % AUTH_ORDER.length : 0;
    this.settings.authState = AUTH_ORDER[nextIndex];
    await this.persistAndRender();
  }
  async askAboutCurrentNote() {
    await this.activateView();
    const context = await this.getPromptContext();
    const prompt = context.selection ? "Explain the selected text and suggest improvements." : "Summarize the current note and suggest improvements.";
    await this.sendUserMessage(prompt, context);
  }
  async applyPendingChange(changeId) {
    const change = this.settings.pendingChanges.find((item) => item.id === changeId);
    if (!change) {
      new import_obsidian.Notice("Pending change not found.");
      return;
    }
    const target = this.app.vault.getAbstractFileByPath(change.notePath);
    if (!(target instanceof import_obsidian.TFile)) {
      new import_obsidian.Notice(`Target note no longer exists: ${change.notePath}`);
      this.settings.pendingChanges = this.settings.pendingChanges.filter((item) => item.id !== changeId);
      await this.persistAndRender();
      return;
    }
    await this.app.vault.modify(target, change.after);
    this.settings.pendingChanges = this.settings.pendingChanges.filter((item) => item.id !== changeId);
    await this.persistAndRender();
    new import_obsidian.Notice(`Applied change to ${change.notePath}`);
  }
  async applyNextPendingChange() {
    const first = this.settings.pendingChanges[0];
    if (!first) {
      new import_obsidian.Notice("No pending changes to apply.");
      return;
    }
    await this.applyPendingChange(first.id);
  }
  async sendUserMessage(prompt, providedContext) {
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
    const assistantMessage = {
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
      assistantMessage.content = assistantMessage.content ? `${assistantMessage.content} ${token}` : token;
      this.renderViews();
      await this.delay(STREAM_DELAY_MS);
    }
    assistantMessage.streaming = false;
    session.updatedAt = Date.now();
    this.streaming = false;
    await this.maybeCreatePendingChange(trimmed, response, context);
    await this.persistAndRender();
  }
  async loadSettings() {
    const saved = await this.loadData();
    this.settings = normalizeSettings(saved);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async persistAndRender() {
    await this.saveSettings();
    this.renderViews();
  }
  renderViews() {
    const snapshot = this.getSnapshot();
    for (const view of this.views) {
      view.renderFromState(snapshot);
    }
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_COPILOT_SIDEBAR)[0] ?? null;
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
  ensureActiveSession() {
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
  async getPromptContext() {
    const activeFile = this.app.workspace.getActiveFile();
    let notePath = null;
    let noteContent = "";
    if (activeFile instanceof import_obsidian.TFile) {
      notePath = activeFile.path;
      noteContent = await this.app.vault.cachedRead(activeFile);
    }
    const markdownView = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    const selection = markdownView?.editor?.getSelection()?.trim() ?? "";
    return {
      notePath,
      noteContent,
      selection
    };
  }
  composeMockResponse(prompt, context) {
    if (this.settings.authState !== "logged-in") {
      return `Auth state is ${this.settings.authState}. Re-authenticate before sending production requests.`;
    }
    const contextSource = this.settings.contextPolicy === "selection-first" && context.selection ? `Selection context: ${context.selection.slice(0, 220)}` : context.noteContent ? `Note context: ${context.noteContent.slice(0, 220)}` : "No active note context available.";
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
  async maybeCreatePendingChange(prompt, response, context) {
    if (!context.notePath || !context.noteContent) {
      return;
    }
    if (!/apply|change|rewrite|edit|update/i.test(prompt)) {
      return;
    }
    const after = `${context.noteContent}

## Copilot Suggestion
${response}
`;
    const pending = {
      id: createId("change"),
      notePath: context.notePath,
      before: context.noteContent,
      after,
      summary: "Append assistant suggestion to active note",
      createdAt: Date.now()
    };
    this.settings.pendingChanges = [pending, ...this.settings.pendingChanges].slice(0, MAX_PENDING_CHANGES);
    new import_obsidian.Notice(`Pending change created for ${context.notePath}`);
  }
  async delay(ms) {
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.activeStreamTimers.delete(timer);
        resolve();
      }, ms);
      this.activeStreamTimers.add(timer);
    });
  }
};

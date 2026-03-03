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
var CopilotSidebarView = class extends import_obsidian.ItemView {
  constructor(leaf) {
    super(leaf);
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
    root.createDiv({ text: "Copilot Sidebar (Draft)", cls: "copilot-sidebar-title" });
    root.createDiv({
      text: "\uCD08\uAE30 \uC2A4\uCE90\uD3F4\uB4DC\uAC00 \uC900\uBE44\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC74C \uB2E8\uACC4\uB294 SDK \uC778\uC99D \uBC0F \uCC44\uD305 \uC2A4\uD2B8\uB9AC\uBC0D \uC5F0\uACB0\uC785\uB2C8\uB2E4.",
      cls: "copilot-sidebar-description"
    });
  }
  async onClose() {
    this.containerEl.empty();
  }
};
var CopilotSidebarPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerView(
      VIEW_TYPE_COPILOT_SIDEBAR,
      (leaf) => new CopilotSidebarView(leaf)
    );
    this.addCommand({
      id: "open-copilot-sidebar",
      name: "Open Copilot Sidebar",
      callback: async () => {
        await this.activateView();
      }
    });
  }
  async onunload() {
    await this.app.workspace.detachLeavesOfType(VIEW_TYPE_COPILOT_SIDEBAR);
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
};

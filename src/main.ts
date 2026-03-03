import { ItemView, Plugin, WorkspaceLeaf } from "obsidian";

const VIEW_TYPE_COPILOT_SIDEBAR = "copilot-sidebar-view";

class CopilotSidebarView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_COPILOT_SIDEBAR;
  }

  getDisplayText(): string {
    return "Copilot Sidebar";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();

    const root = container.createDiv({ cls: "copilot-sidebar-root" });
    root.createDiv({ text: "Copilot Sidebar (Draft)", cls: "copilot-sidebar-title" });
    root.createDiv({
      text: "초기 스캐폴드가 준비되었습니다. 다음 단계는 SDK 인증 및 채팅 스트리밍 연결입니다.",
      cls: "copilot-sidebar-description"
    });
  }

  async onClose(): Promise<void> {
    this.containerEl.empty();
  }
}

export default class CopilotSidebarPlugin extends Plugin {
  async onload(): Promise<void> {
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

  async onunload(): Promise<void> {
    await this.app.workspace.detachLeavesOfType(VIEW_TYPE_COPILOT_SIDEBAR);
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
}

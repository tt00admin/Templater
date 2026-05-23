import * as vscode from "vscode";
import path from "node:path";
import { scanSources } from "../templates/templateScanner";
import type {
  SourceScanResult,
  TemplateFile,
  TemplateSet,
  TemplateSource
} from "../templates/types";

export type TemplateTreeItem = SourceItem | TemplateSetItem | TemplateFileItem | MessageItem;

export class SourceItem extends vscode.TreeItem {
  constructor(
    public readonly result: SourceScanResult,
    collapsibleState = vscode.TreeItemCollapsibleState.Expanded
  ) {
    super(result.source.name, collapsibleState);
    this.description = result.source.path;
    this.contextValue = "templateSource";
    this.iconPath = new vscode.ThemeIcon(result.warning ? "warning" : "folder-library");
    this.tooltip = result.warning ?? result.source.path;
  }
}

export class TemplateSetItem extends vscode.TreeItem {
  constructor(public readonly template: TemplateSet) {
    super(template.manifest.displayName, vscode.TreeItemCollapsibleState.Collapsed);
    this.description =
      template.warning ?? `${template.files.filter((file) => !file.isDirectory).length} files`;
    this.contextValue = "templateSet";
    this.iconPath = new vscode.ThemeIcon(
      template.warning ? "warning" : template.kind === "file" ? "file" : "symbol-namespace"
    );
    this.tooltip = template.manifest.description ?? template.path;
  }
}

export class TemplateFileItem extends vscode.TreeItem {
  constructor(
    public readonly file: TemplateFile,
    public readonly ownerTemplate: TemplateSet
  ) {
    super(path.basename(file.relativePath), vscode.TreeItemCollapsibleState.None);
    this.description =
      path.dirname(file.relativePath) === "." ? undefined : path.dirname(file.relativePath);
    this.contextValue = "templateFile";
    this.iconPath = new vscode.ThemeIcon(file.isDirectory ? "folder" : "file");
    this.resourceUri = vscode.Uri.file(file.absolutePath);
    this.command = file.isDirectory
      ? undefined
      : {
          command: "vscode.open",
          title: "Open Template File",
          arguments: [vscode.Uri.file(file.absolutePath)]
        };
  }
}

class MessageItem extends vscode.TreeItem {
  constructor(label: string, description?: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

export class TemplateTreeProvider implements vscode.TreeDataProvider<TemplateTreeItem> {
  private readonly changed = new vscode.EventEmitter<TemplateTreeItem | undefined | null | void>();
  private results: SourceScanResult[] = [];

  readonly onDidChangeTreeData = this.changed.event;

  constructor(private readonly getSources: () => TemplateSource[]) {}

  async refresh(): Promise<void> {
    this.results = await scanSources(this.getSources());
    this.changed.fire();
  }

  getTreeItem(element: TemplateTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TemplateTreeItem): Promise<TemplateTreeItem[]> {
    if (!element) {
      if (this.results.length === 0) {
        await this.refresh();
      }
      return this.results.length > 0
        ? this.results.map((result) => new SourceItem(result))
        : [new MessageItem("No template sources", "Run Workspace Templater: Add Template Source")];
    }

    if (element instanceof SourceItem) {
      if (element.result.warning) {
        return [new MessageItem("Source unavailable", element.result.warning)];
      }
      const childTemplates = element.result.templates.filter(
        (template) => template.path !== element.result.source.path
      );
      return childTemplates.length > 0
        ? childTemplates.map((template) => templateToTreeItem(template))
        : [new MessageItem("No template sets")];
    }

    if (element instanceof TemplateSetItem) {
      if (element.template.warning) {
        return [new MessageItem("Template unavailable", element.template.warning)];
      }
      return element.template.files.map((file) => new TemplateFileItem(file, element.template));
    }

    return [];
  }

  getTemplateSets(): TemplateSet[] {
    return this.results
      .flatMap((result) => result.templates)
      .filter((template) => !template.warning);
  }

  getTemplateByPath(templatePath: string): TemplateSet | undefined {
    return this.getTemplateSets().find((template) => template.path === templatePath);
  }
}

function templateToTreeItem(template: TemplateSet): TemplateSetItem | TemplateFileItem {
  if (template.kind === "file" && template.files[0]) {
    return new TemplateFileItem(template.files[0], template);
  }

  return new TemplateSetItem(template);
}

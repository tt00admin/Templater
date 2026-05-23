import * as vscode from "vscode";
import { getTemplateSources } from "./config/templateSources";
import { registerTemplateCommands } from "./commands/templateCommands";
import { TemplateTreeProvider } from "./views/templateTreeProvider";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("templater");
  const treeProvider = new TemplateTreeProvider(getTemplateSources);

  context.subscriptions.push(output);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("templater.templates", treeProvider)
  );

  registerTemplateCommands(context, treeProvider, output);
  void treeProvider.refresh();
}

export function deactivate(): void {}

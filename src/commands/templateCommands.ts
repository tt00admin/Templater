import * as vscode from "vscode";
import path from "node:path";
import {
  addTemplateSource,
  getDefaultConflictAction,
  getRenameSuffix,
  getTemplateSources,
  isVariableReplacementEnabled,
  removeTemplateSource
} from "../config/templateSources";
import { askConflictAction } from "../apply/conflictResolver";
import { applyPlan } from "../apply/templateApplier";
import { createApplyPlan } from "../apply/templatePlanner";
import {
  buildVariablePrompts,
  createBuiltInVariables,
  mergeVariables
} from "../apply/variableResolver";
import type { TemplateSet, TemplateSource } from "../templates/types";
import {
  SourceItem,
  TemplateFileItem,
  TemplateSetItem,
  TemplateTreeProvider
} from "../views/templateTreeProvider";

export function registerTemplateCommands(
  context: vscode.ExtensionContext,
  treeProvider: TemplateTreeProvider,
  output: vscode.OutputChannel
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("templater.addSource", async () => {
      const folders = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: "Select template source directory"
      });
      const folder = folders?.[0];
      if (!folder) {
        return;
      }

      const defaultName = path.basename(folder.fsPath);
      const name = await vscode.window.showInputBox({
        title: "Template source name",
        value: defaultName,
        validateInput: (value) => (value.trim() ? undefined : "Name is required.")
      });
      if (!name) {
        return;
      }

      await addTemplateSource({ name: name.trim(), path: folder.fsPath });
      await treeProvider.refresh();
    }),
    vscode.commands.registerCommand("templater.removeSource", async (item?: SourceItem) => {
      const source = item?.result.source ?? (await pickSource());
      if (!source) {
        return;
      }
      const confirmed = await vscode.window.showWarningMessage(
        `Remove template source "${source.name}"?`,
        { modal: true },
        "Remove"
      );
      if (confirmed !== "Remove") {
        return;
      }
      await removeTemplateSource(source);
      await treeProvider.refresh();
    }),
    vscode.commands.registerCommand("templater.refresh", async () => {
      await treeProvider.refresh();
    }),
    vscode.commands.registerCommand("templater.applyTemplate", async (item?: unknown) => {
      const template =
        (await resolveTemplateFromItem(item, treeProvider)) ?? (await pickTemplate(treeProvider));
      if (!template) {
        return;
      }
      await applyTemplate(template, output);
      await treeProvider.refresh();
    }),
    vscode.commands.registerCommand("templater.previewTemplate", async (item?: unknown) => {
      if (item instanceof TemplateFileItem) {
        await previewTemplateFile(item);
        return;
      }

      const template =
        (await resolveTemplateFromItem(item, treeProvider)) ?? (await pickTemplate(treeProvider));
      if (!template) {
        return;
      }
      await previewTemplate(template);
    }),
    vscode.commands.registerCommand(
      "templater.diffTemplateFile",
      async (item?: TemplateFileItem) => {
        if (!item) {
          vscode.window.showErrorMessage(
            "Select a template file from the Workspace Templater view first."
          );
          return;
        }
        await diffTemplateFile(item);
      }
    ),
    vscode.commands.registerCommand("templater.openTemplateSource", async (item?: SourceItem) => {
      const source = item?.result.source ?? (await pickSource());
      if (!source) {
        return;
      }
      await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(source.path), {
        forceNewWindow: true
      });
    })
  );
}

async function resolveTemplateFromItem(
  item: unknown,
  treeProvider: TemplateTreeProvider
): Promise<TemplateSet | undefined> {
  if (item instanceof TemplateSetItem) {
    return item.template;
  }

  if (item instanceof SourceItem) {
    return item.result.templates.find((template) => template.path === item.result.source.path);
  }

  if (item instanceof TemplateFileItem) {
    return treeProvider.getTemplateByPath(item.file.absolutePath);
  }

  return undefined;
}

async function diffTemplateFile(item: TemplateFileItem): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage("Open a workspace before diffing a template file.");
    return;
  }

  const targetUri = vscode.Uri.file(path.join(workspaceRoot, item.file.relativePath));
  const templateUri = vscode.Uri.file(item.file.absolutePath);
  await vscode.commands.executeCommand(
    "vscode.diff",
    targetUri,
    templateUri,
    `Workspace ↔ Template: ${item.file.relativePath}`
  );
}

async function applyTemplate(template: TemplateSet, output: vscode.OutputChannel): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    vscode.window.showErrorMessage("Open a workspace before applying a template.");
    return;
  }

  const builtIns = createBuiltInVariables(workspaceRoot);
  const prompts = buildVariablePrompts(template.manifest, builtIns);
  const userValues: Record<string, string> = {};

  for (const prompt of prompts) {
    const value = await vscode.window.showInputBox({
      title: prompt.variable.label ?? prompt.variable.name,
      value: prompt.defaultValue,
      prompt: `Value for {{${prompt.variable.name}}}`,
      validateInput: (input) =>
        prompt.variable.required && !input.trim() ? "This value is required." : undefined
    });
    if (value === undefined) {
      vscode.window.showInformationMessage("Template apply cancelled.");
      return;
    }
    userValues[prompt.variable.name] = value;
  }

  const variables = mergeVariables(builtIns, userValues);
  const plan = await createApplyPlan(
    template,
    {
      workspaceRoot,
      conflictAction: getDefaultConflictAction(),
      renameSuffix: getRenameSuffix(),
      enableVariableReplacement: isVariableReplacementEnabled()
    },
    askConflictAction
  );

  if (plan.files.some((file) => file.action === "cancel")) {
    vscode.window.showInformationMessage("Template apply cancelled.");
    return;
  }

  const summary = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Applying ${template.manifest.displayName}`
    },
    async () => applyPlan(plan, variables, isVariableReplacementEnabled())
  );

  output.appendLine(`Applied template: ${template.manifest.displayName}`);
  output.appendLine(
    `created=${summary.created} overwritten=${summary.overwritten} renamed=${summary.renamed} skipped=${summary.skipped} failed=${summary.failed.length}`
  );
  for (const failure of summary.failed) {
    output.appendLine(`failed ${failure.path}: ${failure.reason}`);
  }

  const message = `Template applied: ${summary.created} created, ${summary.overwritten} overwritten, ${summary.renamed} renamed, ${summary.skipped} skipped.`;
  if (summary.failed.length > 0) {
    vscode.window.showWarningMessage(
      `${message} ${summary.failed.length} failed. See Workspace Templater output.`
    );
  } else {
    vscode.window.showInformationMessage(message);
  }
}

async function previewTemplate(template: TemplateSet): Promise<void> {
  const lines = [
    `# ${template.manifest.displayName}`,
    "",
    template.manifest.description ?? "",
    "",
    `Source: ${template.source.name}`,
    `Path: ${template.path}`,
    "",
    "## Files",
    "",
    ...template.files.filter((file) => !file.isDirectory).map((file) => `- ${file.relativePath}`)
  ];

  const document = await vscode.workspace.openTextDocument({
    language: "markdown",
    content: lines.join("\n")
  });
  await vscode.window.showTextDocument(document, { preview: true });
}

async function previewTemplateFile(item: TemplateFileItem): Promise<void> {
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(item.file.absolutePath));
  await vscode.window.showTextDocument(document, { preview: true });
}

async function pickTemplate(treeProvider: TemplateTreeProvider): Promise<TemplateSet | undefined> {
  await treeProvider.refresh();
  const selected = await vscode.window.showQuickPick(
    treeProvider.getTemplateSets().map((template) => ({
      label: template.manifest.displayName,
      description: template.source.name,
      detail: template.manifest.description,
      template
    })),
    { title: "Select template" }
  );
  return selected?.template;
}

async function pickSource(): Promise<TemplateSource | undefined> {
  const selected = await vscode.window.showQuickPick(
    getTemplateSources().map((source) => ({
      label: source.name,
      description: source.path,
      source
    })),
    { title: "Select template source" }
  );
  return selected?.source;
}

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

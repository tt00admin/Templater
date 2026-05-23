import * as vscode from "vscode";
import type { TemplateSource } from "../templates/types";

const section = "templater";

export function getTemplateSources(): TemplateSource[] {
  const sources = vscode.workspace.getConfiguration(section).get<TemplateSource[]>("sources", []);
  return sources.filter(isTemplateSource);
}

export async function addTemplateSource(source: TemplateSource): Promise<void> {
  const sources = getTemplateSources();
  const next = [
    ...sources.filter((item) => item.name !== source.name && item.path !== source.path),
    source
  ];
  await updateSources(next);
}

export async function removeTemplateSource(source: TemplateSource): Promise<void> {
  await updateSources(
    getTemplateSources().filter((item) => item.name !== source.name || item.path !== source.path)
  );
}

export function getDefaultConflictAction(): "ask" | "skip" | "overwrite" | "rename" {
  return vscode.workspace
    .getConfiguration(section)
    .get<"ask" | "skip" | "overwrite" | "rename">("defaultConflictAction", "ask");
}

export function isVariableReplacementEnabled(): boolean {
  return vscode.workspace.getConfiguration(section).get<boolean>("enableVariableReplacement", true);
}

export function getRenameSuffix(): string {
  return vscode.workspace.getConfiguration(section).get<string>("renameSuffix", ".template");
}

async function updateSources(sources: TemplateSource[]): Promise<void> {
  await vscode.workspace
    .getConfiguration(section)
    .update("sources", sources, vscode.ConfigurationTarget.Global);
}

function isTemplateSource(value: unknown): value is TemplateSource {
  if (!value || typeof value !== "object") {
    return false;
  }
  const source = value as Record<string, unknown>;
  return typeof source.name === "string" && typeof source.path === "string";
}

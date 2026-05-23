import path from "node:path";
import type { TemplateManifest } from "../templates/types";
import type { ResolvedVariables, VariablePrompt } from "./types";

export function createBuiltInVariables(
  workspaceRoot: string,
  date = new Date()
): ResolvedVariables {
  const isoDate = date.toISOString().slice(0, 10);
  return {
    workspaceName: path.basename(workspaceRoot),
    date: isoDate,
    year: String(date.getFullYear())
  };
}

export function buildVariablePrompts(
  manifest: TemplateManifest,
  builtIns: ResolvedVariables
): VariablePrompt[] {
  return manifest.variables.map((variable) => ({
    variable,
    defaultValue: resolvePlaceholders(variable.default ?? "", builtIns)
  }));
}

export function mergeVariables(
  builtIns: ResolvedVariables,
  userValues: ResolvedVariables
): ResolvedVariables {
  return {
    ...builtIns,
    ...userValues
  };
}

export function resolvePlaceholders(content: string, variables: ResolvedVariables): string {
  return content.replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (match, name: string) => {
    return Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] : match;
  });
}

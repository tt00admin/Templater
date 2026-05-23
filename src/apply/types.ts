import type { TemplateSet, TemplateVariable } from "../templates/types";

export type ConflictAction = "ask" | "skip" | "overwrite" | "rename" | "cancel";

export interface ApplyOptions {
  workspaceRoot: string;
  conflictAction: Exclude<ConflictAction, "cancel">;
  renameSuffix: string;
  enableVariableReplacement: boolean;
}

export interface PlannedFile {
  sourcePath: string;
  relativePath: string;
  targetPath: string;
  finalTargetPath: string;
  exists: boolean;
  action: Exclude<ConflictAction, "ask"> | "create";
  isBinary: boolean;
}

export interface ConflictResolution {
  action: Exclude<ConflictAction, "ask">;
  finalTargetPath?: string;
}

export interface ApplyPlan {
  template: TemplateSet;
  files: PlannedFile[];
  conflicts: PlannedFile[];
}

export interface ApplySummary {
  created: number;
  overwritten: number;
  skipped: number;
  renamed: number;
  failed: Array<{ path: string; reason: string }>;
}

export type ResolvedVariables = Record<string, string>;

export interface VariablePrompt {
  variable: TemplateVariable;
  defaultValue: string;
}

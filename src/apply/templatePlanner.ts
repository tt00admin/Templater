import fs from "node:fs/promises";
import path from "node:path";
import { isLikelyBinary } from "../utils/binary";
import { appendSuffix, isInside } from "../utils/pathUtils";
import type { TemplateSet } from "../templates/types";
import type { ApplyOptions, ApplyPlan, ConflictResolution, PlannedFile } from "./types";

export async function createApplyPlan(
  template: TemplateSet,
  options: ApplyOptions,
  resolveConflict?: (file: PlannedFile) => Promise<ConflictResolution>
): Promise<ApplyPlan> {
  const files: PlannedFile[] = [];

  for (const templateFile of template.files) {
    if (templateFile.isDirectory) {
      continue;
    }

    const targetPath = path.join(options.workspaceRoot, templateFile.relativePath);
    if (!isInside(options.workspaceRoot, targetPath)) {
      throw new Error(`Template file escapes workspace root: ${templateFile.relativePath}`);
    }

    const exists = await pathExists(targetPath);
    const sourceBuffer = await fs.readFile(templateFile.absolutePath);
    const initialFile: PlannedFile = {
      sourcePath: templateFile.absolutePath,
      relativePath: templateFile.relativePath,
      targetPath,
      finalTargetPath: targetPath,
      exists,
      action: "skip",
      isBinary: isLikelyBinary(sourceBuffer)
    };
    const resolution = exists
      ? await resolveConflictForFile(options, initialFile, resolveConflict)
      : ({ action: "create" } as const);
    const baseAction = resolution.action;
    const finalTargetPath =
      baseAction === "rename"
        ? (resolution.finalTargetPath ?? appendSuffix(targetPath, options.renameSuffix))
        : targetPath;

    files.push({
      sourcePath: templateFile.absolutePath,
      relativePath: templateFile.relativePath,
      targetPath,
      finalTargetPath,
      exists,
      action: baseAction,
      isBinary: initialFile.isBinary
    });
  }

  return {
    template,
    files,
    conflicts: files.filter((file) => file.exists)
  };
}

async function resolveConflictForFile(
  options: ApplyOptions,
  file: PlannedFile,
  resolveConflict?: (file: PlannedFile) => Promise<ConflictResolution>
): Promise<ConflictResolution> {
  if (options.conflictAction !== "ask") {
    return { action: options.conflictAction };
  }

  if (!resolveConflict) {
    return { action: "skip" };
  }

  return resolveConflict(file);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

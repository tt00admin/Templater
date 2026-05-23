import * as vscode from "vscode";
import fs from "node:fs/promises";
import path from "node:path";
import type { ConflictResolution, PlannedFile } from "./types";

export async function askConflictAction(file: PlannedFile): Promise<ConflictResolution> {
  const selected = await vscode.window.showQuickPick(
    [
      { label: "Skip", action: "skip" as const, description: "Keep the existing file." },
      {
        label: "Overwrite",
        action: "overwrite" as const,
        description: "Replace the existing file."
      },
      { label: "Rename", action: "rename" as const, description: "Create a renamed copy." },
      { label: "Cancel", action: "cancel" as const, description: "Stop applying this template." }
    ],
    {
      title: `Conflict: ${file.relativePath}`,
      placeHolder: "Choose how to handle this existing file"
    }
  );

  if (!selected) {
    return { action: "cancel" };
  }

  if (selected.action !== "rename") {
    return { action: selected.action };
  }

  const targetDirectory = path.dirname(file.targetPath);
  const currentName = path.basename(file.targetPath);
  const newName = await vscode.window.showInputBox({
    title: `Rename: ${file.relativePath}`,
    prompt: "Enter the file name to create.",
    value: currentName,
    valueSelection: [0, currentName.length],
    validateInput: async (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return "File name is required.";
      }
      if (trimmed.includes("/") || trimmed.includes("\\") || path.isAbsolute(trimmed)) {
        return "Enter a file name, not a path.";
      }
      const candidate = path.join(targetDirectory, trimmed);
      if (candidate === file.targetPath) {
        return "Enter a different file name.";
      }
      if (await pathExists(candidate)) {
        return "A file with that name already exists.";
      }
      return undefined;
    }
  });

  if (!newName) {
    return { action: "cancel" };
  }

  return {
    action: "rename",
    finalTargetPath: path.join(targetDirectory, newName.trim())
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

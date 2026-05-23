import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyPlan } from "../src/apply/templateApplier";
import { createApplyPlan } from "../src/apply/templatePlanner";
import type { TemplateSet } from "../src/templates/types";

let root: string;
let sourceRoot: string;
let workspaceRoot: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "templater-apply-"));
  sourceRoot = path.join(root, "source");
  workspaceRoot = path.join(root, "workspace");
  await fs.mkdir(sourceRoot);
  await fs.mkdir(workspaceRoot);
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("applyPlan", () => {
  it("writes files and replaces variables", async () => {
    const sourcePath = path.join(sourceRoot, "AGENT.md");
    await fs.writeFile(sourcePath, "# {{projectName}}");

    const plan = await createApplyPlan(
      templateSet([{ relativePath: "AGENT.md", absolutePath: sourcePath }]),
      {
        workspaceRoot,
        conflictAction: "ask",
        renameSuffix: ".template",
        enableVariableReplacement: true
      }
    );

    const summary = await applyPlan(plan, { projectName: "templater" }, true);
    const content = await fs.readFile(path.join(workspaceRoot, "AGENT.md"), "utf8");

    expect(summary.created).toBe(1);
    expect(content).toBe("# templater");
  });

  it("skips existing files", async () => {
    const sourcePath = path.join(sourceRoot, "README.md");
    const targetPath = path.join(workspaceRoot, "README.md");
    await fs.writeFile(sourcePath, "# Template");
    await fs.writeFile(targetPath, "# Existing");

    const plan = await createApplyPlan(
      templateSet([{ relativePath: "README.md", absolutePath: sourcePath }]),
      {
        workspaceRoot,
        conflictAction: "skip",
        renameSuffix: ".template",
        enableVariableReplacement: true
      }
    );

    const summary = await applyPlan(plan, {}, true);
    const content = await fs.readFile(targetPath, "utf8");

    expect(summary.skipped).toBe(1);
    expect(content).toBe("# Existing");
  });
});

function templateSet(files: Array<{ relativePath: string; absolutePath: string }>): TemplateSet {
  return {
    id: "local:docs",
    source: { name: "local", path: sourceRoot },
    name: "docs",
    kind: "folder",
    path: sourceRoot,
    manifest: { name: "docs", displayName: "Docs", variables: [], ignore: [] },
    files: files.map((file) => ({ ...file, isDirectory: false }))
  };
}

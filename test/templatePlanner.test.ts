import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApplyPlan } from "../src/apply/templatePlanner";
import type { TemplateSet } from "../src/templates/types";

let root: string;
let sourceRoot: string;
let workspaceRoot: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "templater-plan-"));
  sourceRoot = path.join(root, "source");
  workspaceRoot = path.join(root, "workspace");
  await fs.mkdir(sourceRoot);
  await fs.mkdir(workspaceRoot);
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("createApplyPlan", () => {
  it("marks new files as create", async () => {
    const sourcePath = path.join(sourceRoot, "README.md");
    await fs.writeFile(sourcePath, "# Demo");

    const plan = await createApplyPlan(
      templateSet([{ relativePath: "README.md", absolutePath: sourcePath }]),
      {
        workspaceRoot,
        conflictAction: "ask",
        renameSuffix: ".template",
        enableVariableReplacement: true
      }
    );

    expect(plan.files[0].action).toBe("create");
    expect(plan.conflicts).toHaveLength(0);
  });

  it("uses configured conflict action", async () => {
    const sourcePath = path.join(sourceRoot, "README.md");
    await fs.writeFile(sourcePath, "# Template");
    await fs.writeFile(path.join(workspaceRoot, "README.md"), "# Existing");

    const plan = await createApplyPlan(
      templateSet([{ relativePath: "README.md", absolutePath: sourcePath }]),
      {
        workspaceRoot,
        conflictAction: "rename",
        renameSuffix: ".template",
        enableVariableReplacement: true
      }
    );

    expect(plan.files[0].action).toBe("rename");
    expect(plan.files[0].finalTargetPath.endsWith("README.template.md")).toBe(true);
    expect(plan.conflicts).toHaveLength(1);
  });

  it("chooses an unused target for configured rename conflicts", async () => {
    const sourcePath = path.join(sourceRoot, "README.md");
    await fs.writeFile(sourcePath, "# Template");
    await fs.writeFile(path.join(workspaceRoot, "README.md"), "# Existing");
    await fs.writeFile(path.join(workspaceRoot, "README.template.md"), "# Existing renamed");

    const plan = await createApplyPlan(
      templateSet([{ relativePath: "README.md", absolutePath: sourcePath }]),
      {
        workspaceRoot,
        conflictAction: "rename",
        renameSuffix: ".template",
        enableVariableReplacement: true
      }
    );

    expect(plan.files[0].action).toBe("rename");
    expect(plan.files[0].finalTargetPath.endsWith("README.template-2.md")).toBe(true);
  });

  it("uses interactive conflict resolver for ask", async () => {
    const sourcePath = path.join(sourceRoot, "README.md");
    await fs.writeFile(sourcePath, "# Template");
    await fs.writeFile(path.join(workspaceRoot, "README.md"), "# Existing");

    const plan = await createApplyPlan(
      templateSet([{ relativePath: "README.md", absolutePath: sourcePath }]),
      {
        workspaceRoot,
        conflictAction: "ask",
        renameSuffix: ".template",
        enableVariableReplacement: true
      },
      async () => ({ action: "overwrite" })
    );

    expect(plan.files[0].action).toBe("overwrite");
  });

  it("uses a custom rename target from the conflict resolver", async () => {
    const sourcePath = path.join(sourceRoot, "README.md");
    const customTarget = path.join(workspaceRoot, "README.custom.md");
    await fs.writeFile(sourcePath, "# Template");
    await fs.writeFile(path.join(workspaceRoot, "README.md"), "# Existing");

    const plan = await createApplyPlan(
      templateSet([{ relativePath: "README.md", absolutePath: sourcePath }]),
      {
        workspaceRoot,
        conflictAction: "ask",
        renameSuffix: ".template",
        enableVariableReplacement: true
      },
      async () => ({ action: "rename", finalTargetPath: customTarget })
    );

    expect(plan.files[0].action).toBe("rename");
    expect(plan.files[0].finalTargetPath).toBe(customTarget);
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

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanSource } from "../src/templates/templateScanner";

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "templater-test-"));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("scanSource", () => {
  it("registers the added folder, descendant folders, and descendant files as templates", async () => {
    await fs.mkdir(path.join(root, "docs"));
    await fs.writeFile(path.join(root, "docs", "AGENT.md"), "# {{workspaceName}}");
    await fs.writeFile(
      path.join(root, "docs", "template.json"),
      JSON.stringify({ displayName: "Docs", ignore: [".DS_Store"] })
    );
    await fs.writeFile(path.join(root, "docs", ".DS_Store"), "");

    const result = await scanSource({ name: "local", path: root });

    expect(result.warning).toBeUndefined();
    expect(result.templates).toHaveLength(3);

    const rootTemplate = result.templates.find((template) => template.path === root);
    const docsTemplate = result.templates.find(
      (template) => template.path === path.join(root, "docs")
    );
    const fileTemplate = result.templates.find(
      (template) => template.path === path.join(root, "docs", "AGENT.md")
    );

    expect(rootTemplate?.kind).toBe("folder");
    expect(rootTemplate?.files.map((file) => file.relativePath)).toEqual(["docs", "docs/AGENT.md"]);
    expect(docsTemplate?.kind).toBe("folder");
    expect(docsTemplate?.manifest.displayName).toBe("Docs");
    expect(docsTemplate?.files.map((file) => file.relativePath)).toEqual(["AGENT.md"]);
    expect(fileTemplate?.kind).toBe("file");
    expect(fileTemplate?.files.map((file) => file.relativePath)).toEqual(["AGENT.md"]);
  });

  it("registers files in the added folder as both root contents and file templates", async () => {
    await fs.writeFile(path.join(root, "README.md"), "# {{workspaceName}}");
    await fs.writeFile(path.join(root, "settings.json"), "{}");
    await fs.writeFile(path.join(root, "notes.txt"), "notes");

    const result = await scanSource({ name: "single-template", path: root });

    expect(result.warning).toBeUndefined();
    expect(result.templates).toHaveLength(4);

    const rootTemplate = result.templates.find((template) => template.path === root);
    const fileTemplates = result.templates.filter((template) => template.kind === "file");

    expect(rootTemplate?.manifest.displayName).toBe(path.basename(root));
    expect(rootTemplate?.files.map((file) => file.relativePath)).toEqual([
      "notes.txt",
      "README.md",
      "settings.json"
    ]);
    expect(fileTemplates.map((template) => template.name).sort()).toEqual(
      ["notes.txt", "README.md", "settings.json"].sort()
    );
  });

  it("does not treat a same-name child folder as the added folder template", async () => {
    const sourceName = path.basename(root);
    await fs.mkdir(path.join(root, sourceName));
    await fs.writeFile(path.join(root, sourceName, "README.md"), "# Legacy wrapper");
    await fs.writeFile(path.join(root, "AGENT.md"), "# Root template");

    const result = await scanSource({ name: "local", path: root });

    expect(result.warning).toBeUndefined();
    expect(result.templates.map((template) => template.path)).not.toContain(
      path.join(root, sourceName)
    );

    const rootTemplate = result.templates.find((template) => template.path === root);
    expect(rootTemplate?.files.map((file) => file.relativePath)).toEqual(["AGENT.md"]);
  });

  it("returns warnings for missing sources", async () => {
    const result = await scanSource({ name: "missing", path: path.join(root, "missing") });
    expect(result.warning).toBeTruthy();
    expect(result.templates).toEqual([]);
  });
});

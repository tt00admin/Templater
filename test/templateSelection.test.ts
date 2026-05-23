import { describe, expect, it } from "vitest";
import { createTemplateForSelectedFile } from "../src/commands/templateSelection";
import type { TemplateFile, TemplateSet } from "../src/templates/types";

describe("createTemplateForSelectedFile", () => {
  it("keeps the selected file path relative to its owner template", () => {
    const file: TemplateFile = {
      relativePath: "config/settings.json",
      absolutePath: "/templates/app/config/settings.json",
      isDirectory: false
    };
    const ownerTemplate: TemplateSet = {
      id: "local:folder:app",
      source: { name: "local", path: "/templates" },
      name: "app",
      kind: "folder",
      path: "/templates/app",
      manifest: {
        name: "app",
        displayName: "App",
        variables: [{ name: "projectName", required: true }],
        ignore: []
      },
      files: [file]
    };

    const selectedTemplate = createTemplateForSelectedFile(ownerTemplate, file);

    expect(selectedTemplate.kind).toBe("file");
    expect(selectedTemplate.path).toBe(file.absolutePath);
    expect(selectedTemplate.files).toEqual([file]);
    expect(selectedTemplate.files[0].relativePath).toBe("config/settings.json");
    expect(selectedTemplate.manifest.variables).toEqual(ownerTemplate.manifest.variables);
  });

  it("returns standalone file templates unchanged", () => {
    const fileTemplate: TemplateSet = {
      id: "local:file:README.md",
      source: { name: "local", path: "/templates" },
      name: "README.md",
      kind: "file",
      path: "/templates/README.md",
      manifest: { name: "README.md", displayName: "README.md", variables: [], ignore: [] },
      files: [
        {
          relativePath: "README.md",
          absolutePath: "/templates/README.md",
          isDirectory: false
        }
      ]
    };

    expect(createTemplateForSelectedFile(fileTemplate, fileTemplate.files[0])).toBe(fileTemplate);
  });
});

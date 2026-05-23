import { describe, expect, it } from "vitest";
import { normalizeManifest } from "../src/templates/templateManifest";

describe("normalizeManifest", () => {
  it("fills defaults", () => {
    expect(normalizeManifest({}, "basic")).toEqual({
      name: "basic",
      displayName: "basic",
      variables: [],
      ignore: []
    });
  });

  it("keeps valid variable definitions", () => {
    const manifest = normalizeManifest(
      {
        displayName: "Docs",
        variables: [
          {
            name: "projectName",
            label: "Project name",
            default: "{{workspaceName}}",
            required: true
          }
        ],
        ignore: [".DS_Store", 42]
      },
      "docs"
    );

    expect(manifest.displayName).toBe("Docs");
    expect(manifest.variables).toEqual([
      { name: "projectName", label: "Project name", default: "{{workspaceName}}", required: true }
    ]);
    expect(manifest.ignore).toEqual([".DS_Store"]);
  });
});

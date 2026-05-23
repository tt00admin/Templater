import { describe, expect, it } from "vitest";
import {
  buildVariablePrompts,
  createBuiltInVariables,
  resolvePlaceholders
} from "../src/apply/variableResolver";

describe("variableResolver", () => {
  it("creates built-in variables", () => {
    const variables = createBuiltInVariables("/work/example", new Date("2026-05-22T00:00:00.000Z"));
    expect(variables).toEqual({
      workspaceName: "example",
      date: "2026-05-22",
      year: "2026"
    });
  });

  it("resolves placeholders", () => {
    expect(
      resolvePlaceholders("Hello {{ name }} from {{workspaceName}}", {
        name: "templater",
        workspaceName: "demo"
      })
    ).toBe("Hello templater from demo");
  });

  it("resolves defaults in prompts", () => {
    const prompts = buildVariablePrompts(
      {
        name: "docs",
        displayName: "Docs",
        variables: [{ name: "projectName", default: "{{workspaceName}}", required: true }],
        ignore: []
      },
      { workspaceName: "demo" }
    );

    expect(prompts[0].defaultValue).toBe("demo");
  });
});

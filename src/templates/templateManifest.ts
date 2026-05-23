import fs from "node:fs/promises";
import path from "node:path";
import type { TemplateManifest, TemplateVariable } from "./types";

interface RawManifest {
  name?: unknown;
  displayName?: unknown;
  description?: unknown;
  variables?: unknown;
  ignore?: unknown;
}

export async function readTemplateManifest(templatePath: string): Promise<TemplateManifest> {
  const fallbackName = path.basename(templatePath);
  const manifestPath = path.join(templatePath, "template.json");

  try {
    const content = await fs.readFile(manifestPath, "utf8");
    return normalizeManifest(JSON.parse(content) as RawManifest, fallbackName);
  } catch (error) {
    if (isMissingFile(error)) {
      return createDefaultManifest(fallbackName);
    }
    throw new Error(`Invalid template manifest at ${manifestPath}: ${errorMessage(error)}`);
  }
}

export function normalizeManifest(raw: RawManifest, fallbackName: string): TemplateManifest {
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : fallbackName;
  const displayName =
    typeof raw.displayName === "string" && raw.displayName.trim() ? raw.displayName.trim() : name;
  const description =
    typeof raw.description === "string" && raw.description.trim()
      ? raw.description.trim()
      : undefined;

  return {
    name,
    displayName,
    description,
    variables: normalizeVariables(raw.variables),
    ignore: normalizeIgnore(raw.ignore)
  };
}

export function createDefaultManifest(name: string): TemplateManifest {
  return {
    name,
    displayName: name,
    variables: [],
    ignore: []
  };
}

function normalizeVariables(value: unknown): TemplateVariable[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const raw = item as Record<string, unknown>;
    if (typeof raw.name !== "string" || !raw.name.trim()) {
      return [];
    }
    return [
      {
        name: raw.name.trim(),
        label: typeof raw.label === "string" ? raw.label : undefined,
        default: typeof raw.default === "string" ? raw.default : undefined,
        required: typeof raw.required === "boolean" ? raw.required : false
      }
    ];
  });
}

function normalizeIgnore(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

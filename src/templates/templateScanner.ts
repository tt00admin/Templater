import fs from "node:fs/promises";
import path from "node:path";
import { toPosixPath } from "../utils/pathUtils";
import { createDefaultManifest, readTemplateManifest } from "./templateManifest";
import type { SourceScanResult, TemplateFile, TemplateSet, TemplateSource } from "./types";

export async function scanSources(sources: TemplateSource[]): Promise<SourceScanResult[]> {
  return Promise.all(sources.map(scanSource));
}

export async function scanSource(source: TemplateSource): Promise<SourceScanResult> {
  try {
    const stat = await fs.stat(source.path);
    if (!stat.isDirectory()) {
      return { source, templates: [], warning: "Source path is not a directory." };
    }

    const templates = await scanTemplateSets(source);

    return { source, templates: templates.sort((a, b) => a.name.localeCompare(b.name)) };
  } catch (error) {
    return {
      source,
      templates: [],
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}

async function scanTemplateSets(source: TemplateSource): Promise<TemplateSet[]> {
  const sourceBaseName = path.basename(source.path);
  const templates: TemplateSet[] = [
    await scanTemplateFolder(source, source.path, ".", [sourceBaseName])
  ];

  async function visit(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink() || entry.name === ".DS_Store") {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      const relativePath = toPosixPath(path.relative(source.path, absolutePath));

      if (entry.isDirectory()) {
        if (directory === source.path && entry.name === sourceBaseName) {
          continue;
        }
        templates.push(await scanTemplateFolder(source, absolutePath, relativePath));
        await visit(absolutePath);
      } else if (entry.isFile() && entry.name !== "template.json") {
        templates.push(scanTemplateFile(source, absolutePath, relativePath));
      }
    }
  }

  await visit(source.path);
  return templates;
}

async function scanTemplateFolder(
  source: TemplateSource,
  templatePath: string,
  relativePath: string,
  ignore: string[] = []
): Promise<TemplateSet> {
  try {
    const manifest = await readTemplateManifest(templatePath);
    const files = await listTemplateFiles(templatePath, [...manifest.ignore, ...ignore]);
    return {
      id: `${source.name}:folder:${relativePath}`,
      source,
      name: manifest.name,
      kind: "folder",
      path: templatePath,
      manifest,
      files
    };
  } catch (error) {
    const name = path.basename(templatePath);
    return {
      id: `${source.name}:${name}`,
      source,
      name,
      kind: "folder",
      path: templatePath,
      manifest: {
        name,
        displayName: name,
        variables: [],
        ignore: []
      },
      files: [],
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}

function scanTemplateFile(
  source: TemplateSource,
  filePath: string,
  relativePath: string
): TemplateSet {
  const manifest = createDefaultManifest(relativePath);
  return {
    id: `${source.name}:file:${relativePath}`,
    source,
    name: relativePath,
    kind: "file",
    path: filePath,
    manifest,
    files: [
      {
        relativePath: path.basename(filePath),
        absolutePath: filePath,
        isDirectory: false
      }
    ]
  };
}

async function listTemplateFiles(root: string, ignore: string[]): Promise<TemplateFile[]> {
  const files: TemplateFile[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = toPosixPath(path.relative(root, absolutePath));

      if (
        entry.name === ".DS_Store" ||
        entry.name === "template.json" ||
        isIgnored(relativePath, ignore)
      ) {
        continue;
      }

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        files.push({ relativePath, absolutePath, isDirectory: true });
        await visit(absolutePath);
      } else if (entry.isFile()) {
        files.push({ relativePath, absolutePath, isDirectory: false });
      }
    }
  }

  await visit(root);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function isIgnored(relativePath: string, ignore: string[]): boolean {
  return ignore.some(
    (pattern) => relativePath === pattern || relativePath.startsWith(`${pattern}/`)
  );
}

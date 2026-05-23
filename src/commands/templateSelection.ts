import type { TemplateFile, TemplateSet } from "../templates/types";

export function createTemplateForSelectedFile(
  ownerTemplate: TemplateSet,
  file: TemplateFile
): TemplateSet {
  if (ownerTemplate.kind === "file") {
    return ownerTemplate;
  }

  return {
    ...ownerTemplate,
    id: `${ownerTemplate.id}:file:${file.relativePath}`,
    name: file.relativePath,
    kind: "file",
    path: file.absolutePath,
    manifest: {
      ...ownerTemplate.manifest,
      name: file.relativePath,
      displayName: file.relativePath
    },
    files: [file]
  };
}

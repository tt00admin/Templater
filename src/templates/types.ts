export interface TemplateSource {
  name: string;
  path: string;
}

export interface TemplateVariable {
  name: string;
  label?: string;
  default?: string;
  required?: boolean;
}

export interface TemplateManifest {
  name: string;
  displayName: string;
  description?: string;
  variables: TemplateVariable[];
  ignore: string[];
}

export interface TemplateFile {
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
}

export interface TemplateSet {
  id: string;
  source: TemplateSource;
  name: string;
  kind: "folder" | "file";
  path: string;
  manifest: TemplateManifest;
  files: TemplateFile[];
  warning?: string;
}

export interface SourceScanResult {
  source: TemplateSource;
  templates: TemplateSet[];
  warning?: string;
}

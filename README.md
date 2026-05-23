# Templater

`templater` is a VS Code extension for managing reusable project templates from one place and applying them safely to a workspace.

## Features

- Register local template source directories.
- Browse template sets in the `templater` Activity Bar view.
- Apply a template set to the current workspace.
- Detect existing-file conflicts before writing.
- Choose skip, overwrite, rename, or cancel for conflicts.
- Replace `{{workspaceName}}`, `{{date}}`, `{{year}}`, and custom variables.

## Quick Start

1. Run `templater: Add Template Source`.
2. Select a directory that contains reusable template files or folders.
3. Open the `Templater` Activity Bar view.
4. Pick a template set and run `Apply Template`.
5. Review any conflicts before files are written.

## Template Structure

The selected source folder itself, every descendant folder, and every descendant file are treated as template sets.

You do not need to create a child folder with the same name as the selected source folder. A same-name child folder directly under the selected source is treated as a legacy workaround and is ignored.

```text
templates/
  ai-agent-docs/
    template.json
    AGENT.md
    .codex/
      config.toml
```

Optional `template.json`:

```json
{
  "displayName": "AI Agent Docs",
  "description": "AGENT.md and assistant configuration files.",
  "variables": [
    {
      "name": "projectName",
      "label": "Project name",
      "default": "{{workspaceName}}",
      "required": true
    }
  ],
  "ignore": [".DS_Store"]
}
```

`template.json` is metadata for the folder that contains it and is not copied when applying templates. A single file template applies that one file to the workspace root.

## Commands

- `templater: Add Template Source`
- `templater: Remove Template Source`
- `templater: Refresh Templates`
- `templater: Apply Template`
- `templater: Preview Template`
- `templater: Diff Template File`
- `templater: Open Template Source`

## Extension Settings

- `templater.sources`: Template source directories.
- `templater.defaultConflictAction`: Default conflict action: `ask`, `skip`, `overwrite`, or `rename`.
- `templater.enableVariableReplacement`: Replace `{{variable}}` placeholders in text files.
- `templater.renameSuffix`: Suffix used when conflict action is `rename`.

## Manual Check

1. Run `npm install` and `npm run compile`.
2. Press F5 in VS Code to launch an Extension Development Host.
3. Run `templater: Add Template Source` and select the repository `examples` directory.
4. Open another workspace, choose `AI Agent Docs` in the `templater` view, and run `Apply Template`.
5. Re-run apply against the same workspace to verify conflict handling and `Diff Template File`.

## Development

```sh
npm install
npm run compile
npm run test
npm run lint
```

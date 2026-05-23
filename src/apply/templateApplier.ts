import fs from "node:fs/promises";
import path from "node:path";
import { resolvePlaceholders } from "./variableResolver";
import type { ApplyPlan, ApplySummary, ResolvedVariables } from "./types";

export async function applyPlan(
  plan: ApplyPlan,
  variables: ResolvedVariables,
  enableVariableReplacement: boolean
): Promise<ApplySummary> {
  const summary: ApplySummary = {
    created: 0,
    overwritten: 0,
    skipped: 0,
    renamed: 0,
    failed: []
  };

  for (const file of plan.files) {
    try {
      if (file.action === "cancel") {
        break;
      }
      if (file.action === "skip") {
        summary.skipped += 1;
        continue;
      }

      await fs.mkdir(path.dirname(file.finalTargetPath), { recursive: true });

      if (!file.isBinary && enableVariableReplacement) {
        const content = await fs.readFile(file.sourcePath, "utf8");
        await fs.writeFile(file.finalTargetPath, resolvePlaceholders(content, variables), "utf8");
      } else {
        await fs.copyFile(file.sourcePath, file.finalTargetPath);
      }

      if (file.action === "overwrite") {
        summary.overwritten += 1;
      } else if (file.action === "rename") {
        summary.renamed += 1;
      } else {
        summary.created += 1;
      }
    } catch (error) {
      summary.failed.push({
        path: file.relativePath,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return summary;
}

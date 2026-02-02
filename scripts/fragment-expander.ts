import path from "node:path";
import fs from "fs-extra";
import { getErrorMessage } from "./utils.js";

interface ExpandOptions {
  flags: string[];
  baseDir: string;
}

const TRANSFORM_BLOCK_REGEX =
  /<!--\s*docs\s+(\w+)([^>]*)-->([\s\S]*?)<!--\s*\/docs\s*-->/g;

export function parseOptions(attrString: string): Record<string, string> {
  const options: Record<string, string> = {};
  const attrRegex = /(\w+)=['"]([^'"]*)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    options[match[1]] = match[2];
  }
  return options;
}

export function expandContent(content: string, options: ExpandOptions): string {
  const { baseDir, flags } = options;

  return content.replace(
    TRANSFORM_BLOCK_REGEX,
    (_match, transformName: string, attrString: string) => {
      if (transformName !== "INCLUDE") {
        throw new Error(`Unknown transform type: ${transformName}`);
      }

      const attrs = parseOptions(attrString);
      const { path: includePath, featureFlag, elsePath, unlessFlags } = attrs;

      // Check feature flag condition
      if (featureFlag && !flags.includes(featureFlag)) {
        if (elsePath) {
          const fullElsePath = path.join(baseDir, elsePath);
          try {
            return fs.readFileSync(fullElsePath, "utf8");
          } catch (err) {
            throw new Error(
              `Failed to read elsePath '${elsePath}': ${getErrorMessage(err)}`,
            );
          }
        }
        return "";
      }

      // Check unlessFlags - skip if ANY of these flags are set
      if (unlessFlags) {
        const excludeFlags = unlessFlags.split(",").map((f) => f.trim());
        if (excludeFlags.some((f) => flags.includes(f))) {
          return "";
        }
      }

      if (!includePath) {
        throw new Error("INCLUDE directive missing required 'path' attribute");
      }

      const fullPath = path.join(baseDir, includePath);
      try {
        return fs.readFileSync(fullPath, "utf8");
      } catch (err) {
        throw new Error(
          `Failed to read '${includePath}': ${getErrorMessage(err)}`,
        );
      }
    },
  );
}

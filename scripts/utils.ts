import fs from "fs";

/**
 * Get all markdown files from a directory.
 * @param dir - Directory path to search
 * @returns Array of markdown filenames (not full paths)
 */
export function getMarkdownFiles(dir: string): string[] {
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
}

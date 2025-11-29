import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("README example conversations", () => {
  it("should include the full content of each example conversation", () => {
    const readmePath = path.join(process.cwd(), "README.md");
    const readme = fs.readFileSync(readmePath, "utf-8");

    // Check for example conversations section
    expect(readme).toContain("## Example Conversations");

    // Find all example conversation files
    const examplesDir = path.join(process.cwd(), "example-conversations");
    const exampleFiles = fs
      .readdirSync(examplesDir)
      .filter((f) => f.endsWith(".md"));

    // Each example file's full content should be included in README
    for (const file of exampleFiles) {
      const content = fs.readFileSync(path.join(examplesDir, file), "utf-8");
      expect(readme).toContain(content);
    }
  });
});

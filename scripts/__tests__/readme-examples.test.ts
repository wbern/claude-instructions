import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { CLI_OPTIONS } from "../cli-options.js";

const PATHS = {
  readme: path.join(process.cwd(), "README.md"),
  readmeSource: path.join(process.cwd(), "src", "README.md"),
  buildScript: path.join(process.cwd(), "scripts", "build.ts"),
  examplesDir: path.join(process.cwd(), "example-conversations"),
  sourcesDir: path.join(process.cwd(), "src", "sources"),
};

describe("README example conversations", () => {
  let readme: string;
  let readmeSource: string;

  beforeAll(() => {
    readme = fs.readFileSync(PATHS.readme, "utf-8");
    readmeSource = fs.readFileSync(PATHS.readmeSource, "utf-8");
  });

  it("should include the full content of each example conversation", () => {
    expect(readme).toContain("## Example Conversations");

    const exampleFiles = fs
      .readdirSync(PATHS.examplesDir)
      .filter((f) => f.endsWith(".md"));

    for (const file of exampleFiles) {
      const content = fs.readFileSync(
        path.join(PATHS.examplesDir, file),
        "utf-8",
      );
      expect(readme).toContain(content);
    }
  });

  it("should use EXAMPLE_CONVERSATIONS transform in README source", () => {
    expect(readmeSource).toContain("EXAMPLE_CONVERSATIONS");
  });

  it("should use src/README.md as source in build script", () => {
    const buildScript = fs.readFileSync(PATHS.buildScript, "utf-8");

    expect(buildScript).toContain("src/README.md");
  });

  it("should use COMMANDS_LIST transform in README source", () => {
    expect(readmeSource).toContain("COMMANDS_LIST");
  });

  it("should include dynamically generated commands list in README", () => {
    const commandFiles = fs
      .readdirSync(PATHS.sourcesDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

    for (const file of commandFiles) {
      const commandName = file.replace(".md", "");
      expect(readme).toContain(`/${commandName}`);
    }
  });

  it("should keep src/README.md clean with only transform markers, not expanded content", () => {
    // Source should have the markers
    expect(readmeSource).toContain("<!-- docs COMMANDS_LIST -->");
    expect(readmeSource).toContain("<!-- docs EXAMPLE_CONVERSATIONS -->");

    // Source should NOT have expanded content (command descriptions from COMMANDS_LIST)
    expect(readmeSource).not.toContain("### Planning");
    expect(readmeSource).not.toContain("### TDD Cycle");

    // Source should NOT have example conversation content
    expect(readmeSource).not.toContain("# Conversation:");
  });

  it("should document all public CLI parameters from CLI_OPTIONS", () => {
    for (const opt of CLI_OPTIONS) {
      if (opt.internal) continue;
      expect(readme).toContain(opt.flag);
    }
    // Also check hardcoded flags that aren't in CLI_OPTIONS
    expect(readme).toContain("--help");
    expect(readme).toContain("--version");
  });

  it("should use current version in devDependency example", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"),
    );
    const currentVersion = packageJson.version;

    // The README should have the devDependency example with the current version
    const expectedVersionPattern = `"@wbern/claude-instructions": "^${currentVersion}"`;
    expect(readme).toContain(expectedVersionPattern);
  });

  it("should have a do-not-edit warning at the top", () => {
    expect(readme).toMatch(/^<!--[\s\S]*DO NOT EDIT/);
    expect(readme).toContain("src/README.md");
  });
});

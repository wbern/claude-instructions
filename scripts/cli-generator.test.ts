import fs from "fs-extra";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("fs-extra", () => ({
  default: {
    copy: vi.fn(),
    ensureDir: vi.fn(),
    readdir: vi.fn().mockResolvedValue(["file1.md", "file2.md"]),
    pathExists: vi.fn().mockResolvedValue(false),
    readFile: vi.fn().mockResolvedValue(""),
    writeFile: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("./fragment-expander.js", () => ({
  expandContent: vi.fn((content: string) => content),
}));

vi.mock("./generate-readme.js", () => ({
  generateCommandsMetadata: vi.fn().mockReturnValue({}),
}));

// Mock markdownlint to return content unchanged in unit tests
vi.mock("markdownlint/sync", () => ({
  lint: vi.fn(() => ({ content: [] })),
}));

vi.mock("markdownlint", () => ({
  applyFixes: vi.fn((content: string) => content),
}));

import {
  AGENTS,
  checkForConflicts,
  generateToDirectory,
  getRequestedToolsOptions,
  getScopeOptions,
  getSkillsPath,
  SCOPES,
  stripClaudeOnlyFrontmatter,
} from "./cli-generator.js";

describe("generateToDirectory", () => {
  const MOCK_OUTPUT_PATH = "/mock/output/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept flags option and use it for generation", async () => {
    const result = await generateToDirectory(MOCK_OUTPUT_PATH, undefined, {
      flags: ["beads"],
    });

    expect(result.success).toBe(true);
    expect(result.flags).toEqual(["beads"]);
  });

  it("should generate files from sources to output directory", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md", "green.md"] as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    await generateToDirectory(MOCK_OUTPUT_PATH);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(MOCK_OUTPUT_PATH),
      expect.any(String),
    );
  });

  it("should accept scope parameter and use project-level opencode path by default", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    await generateToDirectory(undefined, SCOPES.PROJECT);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(".opencode/commands"),
      expect.any(String),
    );
  });

  it("should use project-level claude path when agent is claude", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    await generateToDirectory(undefined, SCOPES.PROJECT, {
      agent: AGENTS.CLAUDE,
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(".claude/commands"),
      expect.any(String),
    );
  });

  it("should use user-level opencode path when scope is user (default)", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    await generateToDirectory(undefined, SCOPES.USER);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(".config/opencode/commands"),
      expect.any(String),
    );
  });

  it("should use user-level claude path when scope is user and agent is claude", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    await generateToDirectory(undefined, SCOPES.USER, { agent: AGENTS.CLAUDE });

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(".claude/commands"),
      expect.any(String),
    );
  });

  it("should return actual count of files copied", async () => {
    const mockFiles = [
      "red.md",
      "green.md",
      "refactor.md",
      "cycle.md",
      "commit.md",
    ];
    vi.mocked(fs.readdir).mockResolvedValue(mockFiles as never);

    const result = await generateToDirectory(MOCK_OUTPUT_PATH);

    expect(result.filesGenerated).toBe(5);
  });

  it("should accept options object with skipTemplateInjection", async () => {
    const result = await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      skipTemplateInjection: true,
    });

    expect(result.success).toBe(true);
    expect(result.templateInjectionSkipped).toBe(true);
  });

  it("should append template from CLAUDE.md to copied command files", async () => {
    const templateContent = `<claude-commands-template>
## Project Context
This is a test project.
</claude-commands-template>`;
    const commandContent = `---
description: Test command
---

# Test Command`;

    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).endsWith("CLAUDE.md")) {
        return templateContent;
      }
      return commandContent;
    });
    vi.mocked(fs.readdir).mockResolvedValue(["test.md"] as never);

    const result = await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT);

    expect(result.templateInjected).toBe(true);
  });

  it("should fallback to AGENTS.md when CLAUDE.md does not exist", async () => {
    const templateContent = `<claude-commands-template>
## Agent Context
This is from AGENTS.md.
</claude-commands-template>`;
    const commandContent = `---
description: Test command
---

# Test Command`;

    vi.mocked(fs.pathExists).mockImplementation(async (filePath: unknown) => {
      return String(filePath).endsWith("AGENTS.md");
    });
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).endsWith("AGENTS.md")) {
        return templateContent;
      }
      return commandContent;
    });
    vi.mocked(fs.readdir).mockResolvedValue(["test.md"] as never);

    const result = await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT);

    expect(result.templateInjected).toBe(true);
  });

  it("should write template content appended to command files", async () => {
    const templateContent = `<claude-commands-template>
## Injected Content
This should appear at the end.
</claude-commands-template>`;
    const commandContent = `# Original Command`;

    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).endsWith("CLAUDE.md")) {
        return templateContent;
      }
      return commandContent;
    });
    vi.mocked(fs.readdir).mockResolvedValue(["test.md"] as never);

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("test.md"),
      expect.stringContaining("## Injected Content"),
    );
  });

  it("should generate files to prefixed path when commandPrefix option is provided", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md", "green.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      commandPrefix: "my-",
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("my-red.md"),
      expect.any(String),
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("my-green.md"),
      expect.any(String),
    );
  });

  it("should inject template to prefixed filenames when commandPrefix is used", async () => {
    const templateContent = `<claude-commands-template>
## Injected Content
</claude-commands-template>`;
    const commandContent = `# Original Command`;

    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).endsWith("CLAUDE.md")) {
        return templateContent;
      }
      return commandContent;
    });
    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      commandPrefix: "my-",
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("my-red.md"),
      expect.stringContaining("## Injected Content"),
    );
  });

  it("should only inject template to files matching commands filter", async () => {
    const templateContent = `<claude-commands-template commands="red,green">
## Only for TDD commands
</claude-commands-template>`;
    const commandContent = `# Original Command`;

    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).endsWith("CLAUDE.md")) {
        return templateContent;
      }
      return commandContent;
    });
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "commit.md",
    ] as never);

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT);

    // All 3 files are written, but only red.md and green.md get template content
    expect(fs.writeFile).toHaveBeenCalledTimes(5); // 3 initial + 2 with template
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("red.md"),
      expect.stringContaining("## Only for TDD commands"),
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("green.md"),
      expect.stringContaining("## Only for TDD commands"),
    );
    // commit.md is written but without the template content
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("commit.md"),
      expect.not.stringContaining("## Only for TDD commands"),
    );
  });

  it("should only generate selected commands when commands option is provided", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "commit.md",
      "refactor.md",
    ] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    const result = await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      commands: ["red.md", "commit.md"],
    });

    expect(result.filesGenerated).toBe(2);
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("red.md"),
      expect.any(String),
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("commit.md"),
      expect.any(String),
    );
  });

  it("should exclude underscore-prefixed source files by default", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "_example-command.md",
    ] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    const result = await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT);

    expect(result.filesGenerated).toBe(2);
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
    expect(fs.writeFile).not.toHaveBeenCalledWith(
      expect.stringContaining("_example-command.md"),
      expect.any(String),
    );
  });

  it("should include underscore-prefixed source files when includeContribCommands option is true", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "_example-command.md",
    ] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    const result = await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      includeContribCommands: true,
    });

    expect(result.filesGenerated).toBe(3);
    expect(fs.writeFile).toHaveBeenCalledTimes(3);
  });

  it("should strip underscore prefix from output filename when includeContribCommands is true", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "_example-command.md",
    ] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      includeContribCommands: true,
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("example-command.md"),
      expect.any(String),
    );
    expect(fs.writeFile).not.toHaveBeenCalledWith(
      expect.stringContaining("_example-command.md"),
      expect.any(String),
    );
  });

  it("should strip underscore-prefixed metadata from frontmatter", async () => {
    const sourceWithMetadata = `---
description: Test command
argument-hint: [optional]
_hint: Internal hint
_category: Workflow
_order: 1
_requested-tools:
  - Bash(git diff:*)
---

# Test Command`;

    vi.mocked(fs.readdir).mockResolvedValue(["test.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(sourceWithMetadata as never);

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT);

    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;

    // Should keep public metadata
    expect(writtenContent).toContain("description: Test command");
    expect(writtenContent).toContain("argument-hint: [optional]");

    // Should not contain any underscore-prefixed properties (including hyphenated ones)
    expect(writtenContent).not.toMatch(/^_[\w-]+:/m);
    expect(writtenContent).not.toContain("Bash(git diff:*)"); // multiline array items also stripped
  });
});

describe("checkForConflicts", () => {
  const MOCK_OUTPUT_PATH = "/mock/output/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return conflict when destination file already exists with different content", async () => {
    const existingContent = "# My custom commit command";
    const newContent = "# Standard commit process";

    vi.mocked(fs.readdir).mockResolvedValue(["commit.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes(MOCK_OUTPUT_PATH)) {
        return existingContent;
      }
      return newContent;
    });

    const conflicts = await checkForConflicts(MOCK_OUTPUT_PATH);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      filename: "commit.md",
      existingContent,
      newContent,
    });
  });

  it("should detect conflict with prefixed filename when user chose a prefix", async () => {
    const existingContent = "# My custom red command";
    const newContent = "# Standard red phase";

    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.pathExists).mockImplementation(async (filePath: unknown) => {
      return String(filePath).includes("my-red.md");
    });
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes("my-red.md")) {
        return existingContent;
      }
      return newContent;
    });

    const conflicts = await checkForConflicts(MOCK_OUTPUT_PATH, "project", {
      commandPrefix: "my-",
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      filename: "my-red.md",
      existingContent,
      newContent,
    });
  });
});

describe("checkExistingFiles", () => {
  const MOCK_OUTPUT_PATH = "/mock/output/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return existing file with isIdentical flag when content matches", async () => {
    const sameContent = "# Same content";

    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockResolvedValue(sameContent as never);

    const { checkExistingFiles } = await import("./cli-generator.js");
    const files = await checkExistingFiles(MOCK_OUTPUT_PATH);

    expect(files).toHaveLength(1);
    expect(files[0]).toEqual({
      filename: "red.md",
      existingContent: sameContent,
      newContent: sameContent,
      isIdentical: true,
    });
  });

  it("should only check files specified in commands option", async () => {
    const existingContent = "# Existing";
    const newContent = "# New";

    // Source has 3 files
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "add-command.md",
    ] as never);
    // All 3 exist in destination
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes(MOCK_OUTPUT_PATH)) {
        return existingContent;
      }
      return newContent;
    });

    const { checkExistingFiles } = await import("./cli-generator.js");
    // User only selected red.md - should only check that file
    const files = await checkExistingFiles(MOCK_OUTPUT_PATH, undefined, {
      commands: ["red.md"],
    });

    // Should only return red.md, not green.md or add-command.md
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe("red.md");
  });

  it("should include allowedTools in newContent when command has matching _requested-tools", async () => {
    const sourceContent = "---\ndescription: Code review\n---\n# Code Review";
    const existingWithAllowedTools =
      "---\nallowed-tools: Bash(git diff:*)\ndescription: Code review\n---\n# Code Review";
    const mockMetadata = {
      "code-review.md": {
        description: "Code review",
        category: "Workflow",
        order: 1,
        "_requested-tools": ["Bash(git diff:*)", "Bash(git status:*)"],
      },
    };

    const { generateCommandsMetadata } = await import("./generate-readme.js");
    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    vi.mocked(fs.readdir).mockResolvedValue(["code-review.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes(MOCK_OUTPUT_PATH)) {
        return existingWithAllowedTools;
      }
      return sourceContent;
    });

    const { checkExistingFiles } = await import("./cli-generator.js");
    const files = await checkExistingFiles(MOCK_OUTPUT_PATH, undefined, {
      allowedTools: ["Bash(git diff:*)"],
    });

    expect(files).toHaveLength(1);
    // newContent should include allowedTools header (command has _requested-tools)
    expect(files[0].newContent).toContain("allowed-tools: Bash(git diff:*)");
    // With allowedTools applied, content should match
    expect(files[0].isIdentical).toBe(true);
  });

  it("should produce identical output when re-running with same allowedTools", async () => {
    // Simulates: run CLI, select all tools, copy reuse command, paste it
    const sourceContent = "---\ndescription: Code review\n---\n# Code Review";
    const allRequestedTools = [
      "Bash(git diff:*)",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git rev-parse:*)",
      "Bash(git merge-base:*)",
      "Bash(git branch:*)",
    ];
    // Existing file has all tools (from first run)
    const existingWithAllTools = `---\nallowed-tools: ${allRequestedTools.join(", ")}\ndescription: Code review\n---\n# Code Review`;
    const mockMetadata = {
      "code-review.md": {
        description: "Code review",
        category: "Workflow",
        order: 1,
        "_requested-tools": allRequestedTools,
      },
    };

    const { generateCommandsMetadata } = await import("./generate-readme.js");
    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    vi.mocked(fs.readdir).mockResolvedValue(["code-review.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes(MOCK_OUTPUT_PATH)) {
        return existingWithAllTools;
      }
      return sourceContent;
    });

    const { checkExistingFiles } = await import("./cli-generator.js");
    // Pass ALL the same tools that were selected in first run
    const files = await checkExistingFiles(MOCK_OUTPUT_PATH, undefined, {
      allowedTools: allRequestedTools,
    });

    expect(files).toHaveLength(1);
    // newContent should have ALL tools
    expect(files[0].newContent).toContain(
      `allowed-tools: ${allRequestedTools.join(", ")}`,
    );
    // Should be identical since we're passing the same tools
    expect(files[0].isIdentical).toBe(true);
  });

  it("should produce identical output when re-running with prefix and same allowedTools", async () => {
    // Simulates the exact user scenario: --prefix=my- --allowed-tools="..."
    const sourceContent = "---\ndescription: Code review\n---\n# Code Review";
    const allRequestedTools = [
      "Bash(git diff:*)",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git rev-parse:*)",
      "Bash(git merge-base:*)",
      "Bash(git branch:*)",
    ];
    // Existing file has all tools (from first run) - note the PREFIX in path
    const existingWithAllTools = `---\nallowed-tools: ${allRequestedTools.join(", ")}\ndescription: Code review\n---\n# Code Review`;
    const mockMetadata = {
      "code-review.md": {
        description: "Code review",
        category: "Workflow",
        order: 1,
        "_requested-tools": allRequestedTools,
      },
    };

    const { generateCommandsMetadata } = await import("./generate-readme.js");
    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    vi.mocked(fs.readdir).mockResolvedValue(["code-review.md"] as never);
    vi.mocked(fs.pathExists).mockImplementation(async (filePath: unknown) => {
      // Only match the PREFIXED file path
      return String(filePath).includes("my-code-review.md");
    });
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes("my-code-review.md")) {
        return existingWithAllTools;
      }
      return sourceContent;
    });

    const { checkExistingFiles } = await import("./cli-generator.js");
    const files = await checkExistingFiles(MOCK_OUTPUT_PATH, undefined, {
      commandPrefix: "my-",
      allowedTools: allRequestedTools,
    });

    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe("my-code-review.md");
    // newContent should have ALL tools
    expect(files[0].newContent).toContain(
      `allowed-tools: ${allRequestedTools.join(", ")}`,
    );
    // Should be identical
    expect(files[0].isIdentical).toBe(true);
  });

  it("should NOT include allowedTools in newContent when command has no _requested-tools", async () => {
    const sourceContent = "---\ndescription: Red phase\n---\n# Red";
    const mockMetadata = {
      "red.md": {
        description: "Red phase",
        category: "TDD",
        order: 1,
        // No _requested-tools!
      },
    };

    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(true as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes("commands-metadata.json")) {
        return JSON.stringify(mockMetadata);
      }
      if (String(filePath).includes(MOCK_OUTPUT_PATH)) {
        return sourceContent;
      }
      return sourceContent;
    });

    const { checkExistingFiles } = await import("./cli-generator.js");
    const files = await checkExistingFiles(MOCK_OUTPUT_PATH, undefined, {
      allowedTools: ["Bash(pnpm test:*)"],
    });

    expect(files).toHaveLength(1);
    // newContent should NOT include allowedTools (command has no _requested-tools)
    expect(files[0].newContent).not.toContain("allowed-tools:");
  });

  it("should include allowedTools in newContent when using commandPrefix", async () => {
    const sourceContent = "---\ndescription: Code review\n---\n# Code Review";
    const existingWithAllowedTools =
      "---\nallowed-tools: Bash(git diff:*), Bash(git status:*)\ndescription: Code review\n---\n# Code Review";
    const mockMetadata = {
      "code-review.md": {
        description: "Code review",
        category: "Workflow",
        order: 1,
        "_requested-tools": ["Bash(git diff:*)", "Bash(git status:*)"],
      },
    };

    const { generateCommandsMetadata } = await import("./generate-readme.js");
    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    vi.mocked(fs.readdir).mockResolvedValue(["code-review.md"] as never);
    vi.mocked(fs.pathExists).mockImplementation(async (filePath: unknown) => {
      // Only match prefixed file at destination
      return String(filePath).includes("my-code-review.md");
    });
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes("my-code-review.md")) {
        return existingWithAllowedTools;
      }
      return sourceContent;
    });

    const { checkExistingFiles } = await import("./cli-generator.js");
    const files = await checkExistingFiles(MOCK_OUTPUT_PATH, undefined, {
      commandPrefix: "my-",
      allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
    });

    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe("my-code-review.md");
    // newContent should include allowedTools header
    expect(files[0].newContent).toContain(
      "allowed-tools: Bash(git diff:*), Bash(git status:*)",
    );
    expect(files[0].isIdentical).toBe(true);
  });

  it("should skip files that don't exist at destination", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md", "green.md"] as never);
    // red.md exists, green.md doesn't
    vi.mocked(fs.pathExists).mockImplementation(async (filePath: unknown) => {
      return String(filePath).includes("red.md");
    });
    vi.mocked(fs.readFile).mockResolvedValue("# Content" as never);

    const { checkExistingFiles } = await import("./cli-generator.js");
    const files = await checkExistingFiles(MOCK_OUTPUT_PATH);

    // Should only return red.md since green.md doesn't exist at destination
    expect(files).toHaveLength(1);
    expect(files[0].filename).toBe("red.md");
  });

  it("should strip underscore prefix from filename when includeContribCommands is true", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "_example-command.md",
    ] as never);
    vi.mocked(fs.pathExists).mockImplementation(async (filePath: unknown) => {
      // Match both red.md and example-command.md (underscore stripped)
      return (
        String(filePath).includes("red.md") ||
        String(filePath).includes("example-command.md")
      );
    });
    vi.mocked(fs.readFile).mockResolvedValue("# Content" as never);

    const { checkExistingFiles } = await import("./cli-generator.js");
    const files = await checkExistingFiles(MOCK_OUTPUT_PATH, undefined, {
      includeContribCommands: true,
    });

    expect(files).toHaveLength(2);
    expect(files.map((f) => f.filename).sort()).toEqual([
      "example-command.md",
      "red.md",
    ]);
  });
});

describe("getCommandsGroupedByCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return categories in defined order with Test-Driven Development first and Ship / Show / Ask last", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");
    const mockMetadata = {
      "ship.md": {
        description: "Ship",
        category: "Ship / Show / Ask",
        order: 1,
      },
      "red.md": {
        description: "Red",
        category: "Test-Driven Development",
        order: 1,
      },
      "commit.md": {
        description: "Commit",
        category: "Workflow",
        order: 1,
      },
      "plan.md": {
        description: "Plan",
        category: "Planning",
        order: 1,
      },
    };

    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    const { getCommandsGroupedByCategory } = await import("./cli-generator.js");
    const grouped = await getCommandsGroupedByCategory();

    const categoryOrder = Object.keys(grouped);
    expect(categoryOrder[0]).toBe("Test-Driven Development");
    expect(categoryOrder[categoryOrder.length - 1]).toBe("Ship / Show / Ask");
  });

  it("should include hint from _hint property in command options", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");
    const mockMetadata = {
      "red.md": {
        description: "Execute Red Phase - write ONE failing test",
        hint: "Write failing test",
        category: "Test-Driven Development",
        order: 2,
      },
    };

    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    const { getCommandsGroupedByCategory } = await import("./cli-generator.js");
    const grouped = await getCommandsGroupedByCategory();

    expect(grouped["Test-Driven Development"][0]).toMatchObject({
      value: "red.md",
      label: "red.md",
      hint: "Write failing test",
    });
  });
});

describe("generateToDirectory with allowedTools", () => {
  const MOCK_OUTPUT_PATH = "/mock/output/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept allowedTools option", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);

    const result = await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
    });

    expect(result.success).toBe(true);
  });

  it("should inject allowed-tools into command frontmatter when command has _requested-tools", async () => {
    const commandContent = `---
description: Code review
---

# Code Review`;
    const mockMetadata = {
      "code-review.md": {
        description: "Code review",
        category: "Workflow",
        order: 1,
        "_requested-tools": ["Bash(git diff:*)", "Bash(git status:*)"],
      },
    };

    const { generateCommandsMetadata } = await import("./generate-readme.js");
    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    vi.mocked(fs.readdir).mockResolvedValue(["code-review.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(commandContent as never);

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
      agent: AGENTS.CLAUDE,
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("code-review.md"),
      expect.stringContaining(
        "allowed-tools: Bash(git diff:*), Bash(git status:*)",
      ),
    );
  });

  it("should NOT inject allowed-tools into command without _requested-tools", async () => {
    const commandContent = `---
description: Red phase
---

# Red Phase`;
    const mockMetadata = {
      "red.md": {
        description: "Red phase",
        category: "TDD",
        order: 1,
        // No _requested-tools!
      },
    };

    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes("commands-metadata.json")) {
        return JSON.stringify(mockMetadata);
      }
      return commandContent;
    });

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
    });

    // File should be written but without allowed-tools header
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("red.md"),
      expect.not.stringContaining("allowed-tools"),
    );
  });

  it("should strip underscore prefix when injecting allowed-tools with includeContribCommands", async () => {
    const commandContent = `---
description: Contributor command
---

# Contributor Command`;
    const mockMetadata = {
      "_contributor-cmd.md": {
        description: "Contributor command",
        category: "Workflow",
        order: 1,
        "_requested-tools": ["Bash(git status:*)"],
      },
    };

    const { generateCommandsMetadata } = await import("./generate-readme.js");
    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    vi.mocked(fs.readdir).mockResolvedValue(["_contributor-cmd.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(commandContent as never);

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      allowedTools: ["Bash(git status:*)"],
      includeContribCommands: true,
      agent: AGENTS.CLAUDE,
    });

    // Should write to contributor-cmd.md (no underscore)
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("contributor-cmd.md"),
      expect.stringContaining("allowed-tools: Bash(git status:*)"),
    );
    // Should NOT write to _contributor-cmd.md
    expect(fs.writeFile).not.toHaveBeenCalledWith(
      expect.stringContaining("_contributor-cmd.md"),
      expect.any(String),
    );
  });
});

describe("generateToDirectory with skipFiles", () => {
  const MOCK_OUTPUT_PATH = "/mock/output/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not generate files listed in skipFiles", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "commit.md",
    ] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      skipFiles: ["commit.md"],
    });

    expect(fs.writeFile).toHaveBeenCalledTimes(2);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("red.md"),
      expect.any(String),
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("green.md"),
      expect.any(String),
    );
    expect(fs.writeFile).not.toHaveBeenCalledWith(
      expect.stringContaining("commit.md"),
      expect.anything(),
    );
  });

  it("should generate files to prefixed paths when skipFiles is empty and prefix is used", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "commit.md",
    ] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    // This simulates user selecting "Yes" or "Overwrite all" for all conflicts
    // with a prefix - skipFiles should be empty, all files should be generated
    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      commandPrefix: "my-",
      skipFiles: [],
    });

    // All 3 files should be generated to prefixed paths
    expect(fs.writeFile).toHaveBeenCalledTimes(3);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("my-red.md"),
      expect.any(String),
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("my-green.md"),
      expect.any(String),
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("my-commit.md"),
      expect.any(String),
    );
  });

  it("should skip files when skipFiles contains prefixed names from conflict resolver", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "commit.md",
    ] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    // Simulates the actual CLI flow with prefix:
    // 1. User runs CLI with prefix "my-"
    // 2. checkExistingFiles finds existing "my-commit.md" and returns { filename: "my-commit.md", ... }
    // 3. User says "No" to skip that file (or file is identical)
    // 4. CLI adds "my-commit.md" to skipFiles
    // 5. generateToDirectory should NOT generate "commit.md" (the source file)
    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      commandPrefix: "my-",
      skipFiles: ["my-commit.md"],
    });

    // commit.md should NOT be generated because "my-commit.md" is in skipFiles
    expect(fs.writeFile).not.toHaveBeenCalledWith(
      expect.stringContaining("commit.md"),
      expect.anything(),
    );
  });

  it("should generate to prefixed path to enable overwriting existing files", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["add-command.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    // Simulates overwriting an existing prefixed file:
    // 1. User has existing "my-add-command.md" with different content
    // 2. User selects "Yes" or "Overwrite all"
    // 3. skipFiles is empty (file should be overwritten)
    // 4. File should be written directly to "my-add-command.md"
    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      commandPrefix: "my-",
      skipFiles: [],
    });

    // Should write directly to the prefixed destination path
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("my-add-command.md"),
      expect.any(String),
    );
  });
});

describe("generateToDirectory with template injection and underscore files", () => {
  const MOCK_OUTPUT_PATH = "/mock/output/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should strip underscore prefix when injecting templates with includeContribCommands", async () => {
    const commandContent = `---
description: Contributor command
---

# Contributor Command`;
    const templateContent = `# CLAUDE.md

<claude-commands-template>
Template content to inject
</claude-commands-template>
`;

    vi.mocked(fs.readdir).mockResolvedValue(["_contributor-cmd.md"] as never);
    vi.mocked(fs.pathExists).mockImplementation(async (filePath: unknown) => {
      // Template file exists in cwd
      return String(filePath).includes("CLAUDE.md");
    });

    vi.mocked(fs.readFile).mockImplementation(async (filePath: unknown) => {
      if (String(filePath).includes("CLAUDE.md")) {
        return templateContent;
      }
      // First read: source file
      // Second read: output file (after initial write)
      return commandContent;
    });

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      includeContribCommands: true,
    });

    // Should write to contributor-cmd.md (no underscore) for initial write
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("contributor-cmd.md"),
      expect.any(String),
    );

    // Should NOT write to _contributor-cmd.md
    expect(fs.writeFile).not.toHaveBeenCalledWith(
      expect.stringContaining("_contributor-cmd.md"),
      expect.any(String),
    );

    // Template injection should also write to contributor-cmd.md (not _contributor-cmd.md)
    const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
    const allPaths = writeFileCalls.map((call) => String(call[0]));
    expect(allPaths.every((p) => !p.includes("_contributor-cmd.md"))).toBe(
      true,
    );
  });
});

describe("getRequestedToolsOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract unique _requested-tools from commands metadata", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");
    const mockMetadata = {
      "red.md": {
        description: "Red phase",
        category: "TDD",
        order: 1,
        "_requested-tools": ["Bash(git diff:*)", "Bash(git status:*)"],
      },
      "code-review.md": {
        description: "Code review",
        category: "Workflow",
        order: 2,
        "_requested-tools": ["Bash(git diff:*)", "Bash(git log:*)"],
      },
      "commit.md": {
        description: "Commit",
        category: "Workflow",
        order: 3,
      },
    };

    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    const options = await getRequestedToolsOptions();

    expect(options).toEqual([
      {
        value: "Bash(git diff:*)",
        label: "Bash(git diff:*)",
        hint: "/red, /code-review",
      },
      {
        value: "Bash(git status:*)",
        label: "Bash(git status:*)",
        hint: "/red",
      },
      {
        value: "Bash(git log:*)",
        label: "Bash(git log:*)",
        hint: "/code-review",
      },
    ]);
  });

  it("should include hint showing which commands use each tool", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");
    const mockMetadata = {
      "red.md": {
        description: "Red phase",
        category: "TDD",
        order: 1,
        "_requested-tools": ["Bash(git diff:*)", "Bash(git status:*)"],
      },
      "code-review.md": {
        description: "Code review",
        category: "Workflow",
        order: 2,
        "_requested-tools": ["Bash(git diff:*)", "Bash(git log:*)"],
      },
      "green.md": {
        description: "Green phase",
        category: "TDD",
        order: 2,
        "_requested-tools": ["Bash(git diff:*)"],
      },
      "refactor.md": {
        description: "Refactor phase",
        category: "TDD",
        order: 3,
        "_requested-tools": ["Bash(git diff:*)"],
      },
      "cycle.md": {
        description: "Full cycle",
        category: "TDD",
        order: 4,
        "_requested-tools": ["Bash(git diff:*)"],
      },
    };

    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    const options = await getRequestedToolsOptions();

    const gitDiffOption = options.find((o) => o.value === "Bash(git diff:*)");
    const gitStatusOption = options.find(
      (o) => o.value === "Bash(git status:*)",
    );
    const gitLogOption = options.find((o) => o.value === "Bash(git log:*)");

    // Tool used by 5 commands: show first 2, then "and 3 others"
    expect(gitDiffOption?.hint).toBe("/red, /code-review, and 3 others");
    // Tool used by 1 command: just show the command
    expect(gitStatusOption?.hint).toBe("/red");
    // Tool used by 1 command: just show the command
    expect(gitLogOption?.hint).toBe("/code-review");
  });

  it("should use singular 'other' when tool is used by exactly 3 commands", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");
    const mockMetadata = {
      "red.md": {
        description: "Red phase",
        category: "TDD",
        order: 1,
        "_requested-tools": ["Bash(pnpm test:*)"],
      },
      "green.md": {
        description: "Green phase",
        category: "TDD",
        order: 2,
        "_requested-tools": ["Bash(pnpm test:*)"],
      },
      "refactor.md": {
        description: "Refactor phase",
        category: "TDD",
        order: 3,
        "_requested-tools": ["Bash(pnpm test:*)"],
      },
    };

    vi.mocked(generateCommandsMetadata).mockReturnValue(mockMetadata);

    const options = await getRequestedToolsOptions();

    const testOption = options.find((o) => o.value === "Bash(pnpm test:*)");
    // 3 commands: show first 2, then "and 1 other" (singular)
    expect(testOption?.hint).toBe("/red, /green, and 1 other");
  });
});

describe("generateToDirectory edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error when neither outputPath nor scope is provided", async () => {
    await expect(generateToDirectory(undefined, undefined)).rejects.toThrow(
      "Either outputPath or scope must be provided",
    );
  });

  it("should only generate markdown files, not commands-metadata.json", async () => {
    // Source directory contains both .md files and commands-metadata.json
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "commands-metadata.json",
    ] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(
      "---\ndescription: Test\n---\n# Test" as never,
    );

    const MOCK_OUTPUT_PATH = "/mock/output/path";
    const result = await generateToDirectory(MOCK_OUTPUT_PATH, undefined, {
      flags: [],
    });

    // Should only generate 2 files (the .md files), not 3
    expect(result.filesGenerated).toBe(2);

    // fs.writeFile should only be called for .md files
    const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
    const writtenPaths = writeFileCalls.map((call) => call[0] as string);

    expect(writtenPaths).not.toContainEqual(
      expect.stringContaining("commands-metadata.json"),
    );
  });
});

describe("getScopeOptions", () => {
  it("should truncate long paths with ellipsis for narrow terminal widths", async () => {
    const { getScopeOptions } = await import("./cli-generator.js");

    // Use a narrow width to force truncation of the project path
    // Project path is longer due to repo structure, so it gets truncated
    const options = getScopeOptions(30);

    expect(options).toHaveLength(2);
    // Project path (options[0]) should be truncated with slash handling (line 47)
    expect(options[0].hint).toMatch(/^\.\.\.\//);
  });

  it("should not truncate paths for wide terminal widths", async () => {
    const { getScopeOptions } = await import("./cli-generator.js");

    // Use a very wide width
    const options = getScopeOptions(200);

    expect(options).toHaveLength(2);
    // Paths should NOT be truncated (no ellipsis)
    expect(options[0].hint).not.toMatch(/^\.\.\./);
    expect(options[1].hint).not.toMatch(/^\.\.\./);
  });
});

describe("generateSkillsToDirectory", () => {
  const MOCK_OUTPUT_PATH = "/mock/output/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle skill source with no description in frontmatter", async () => {
    // Source has frontmatter but no description field
    const sourceContent = `---
argument-hint: [optional]
---

# Test Skill

Content here.`;

    vi.mocked(fs.readFile).mockResolvedValue(sourceContent as never);

    const { generateSkillsToDirectory } = await import("./cli-generator.js");
    const result = await generateSkillsToDirectory(MOCK_OUTPUT_PATH, [
      "test.md",
    ]);

    expect(result.success).toBe(true);
    expect(result.skillsGenerated).toBe(1);

    // Should write SKILL.md with empty description
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("SKILL.md"),
      expect.stringContaining("name: test"),
    );
    // Description should be empty (not undefined or missing)
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenContent).toContain("description: ");
  });

  it("should handle skill source with no frontmatter at all", async () => {
    // Source has no frontmatter
    const sourceContent = `# Test Skill

Just content, no frontmatter.`;

    vi.mocked(fs.readFile).mockResolvedValue(sourceContent as never);

    const { generateSkillsToDirectory } = await import("./cli-generator.js");
    const result = await generateSkillsToDirectory(MOCK_OUTPUT_PATH, [
      "test.md",
    ]);

    expect(result.success).toBe(true);
    expect(result.skillsGenerated).toBe(1);

    // Should write SKILL.md with empty description and full body
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(writtenContent).toContain("name: test");
    expect(writtenContent).toContain("description: ");
    expect(writtenContent).toContain("# Test Skill");
  });

  it("should generate multiple skills in a single call", async () => {
    const sources: Record<string, string> = {
      "red.md": `---
description: Write a failing test
---

# Red Phase`,
      "green.md": `---
description: Make it pass
---

# Green Phase`,
    };

    vi.mocked(fs.readFile).mockImplementation(((filePath: string) =>
      Promise.resolve(
        sources[
          Object.keys(sources).find((key) => filePath.endsWith(key)) ?? ""
        ] ?? "",
      )) as typeof fs.readFile);

    const { generateSkillsToDirectory } = await import("./cli-generator.js");
    const result = await generateSkillsToDirectory(MOCK_OUTPUT_PATH, [
      "red.md",
      "green.md",
    ]);

    expect(result.success).toBe(true);
    expect(result.skillsGenerated).toBe(2);
    expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining("/red"));
    expect(fs.ensureDir).toHaveBeenCalledWith(
      expect.stringContaining("/green"),
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(2);

    const firstContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
    expect(firstContent).toContain("name: red");
    expect(firstContent).toContain("description: Write a failing test");

    const secondContent = vi.mocked(fs.writeFile).mock.calls[1][1] as string;
    expect(secondContent).toContain("name: green");
    expect(secondContent).toContain("description: Make it pass");
  });

  it("should pass feature flags to fragment expander", async () => {
    const { expandContent } = await import("./fragment-expander.js");
    const sourceContent = `---
description: Test skill
---

# Skill Content`;

    vi.mocked(fs.readFile).mockResolvedValue(sourceContent as never);

    const { generateSkillsToDirectory } = await import("./cli-generator.js");
    await generateSkillsToDirectory(MOCK_OUTPUT_PATH, ["test.md"], {
      flags: ["beads", "github"],
    });

    expect(expandContent).toHaveBeenCalledWith(
      sourceContent,
      expect.objectContaining({ flags: ["beads", "github"] }),
    );
  });
});

describe("generateToDirectory with flags option", () => {
  const MOCK_OUTPUT_PATH = "/mock/output/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept flags option in GenerateOptions", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);

    const result = await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      flags: ["beads", "github"],
    });

    expect(result.success).toBe(true);
  });

  it("should return flags in result when provided", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);

    const result = await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      flags: ["beads"],
    });

    expect(result.flags).toEqual(["beads"]);
  });

  it("should read from sources and expand content when flags provided without variant", async () => {
    const { expandContent } = await import("./fragment-expander.js");
    const sourceContent = `---
description: Red phase
---
# Red`;
    const expandedContent = `---
description: Red phase
---
# Red
Use Beads to track this task.`;

    vi.mocked(fs.readdir).mockResolvedValue(["red.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);
    vi.mocked(fs.readFile).mockResolvedValue(sourceContent as never);
    vi.mocked(expandContent).mockReturnValue(expandedContent);

    await generateToDirectory(MOCK_OUTPUT_PATH, SCOPES.PROJECT, {
      flags: ["beads"],
    });

    // Should call expandContent with the source content and flags
    expect(expandContent).toHaveBeenCalledWith(sourceContent, {
      flags: ["beads"],
      baseDir: expect.stringContaining("claude-instructions"),
    });

    // Should write expanded content
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("red.md"),
      expandedContent,
    );
  });
});

describe("getSkillsPath", () => {
  it("should return project-level opencode skills path", () => {
    const result = getSkillsPath(SCOPES.PROJECT, AGENTS.OPENCODE);
    expect(result).toContain(".opencode");
    expect(result).toContain("skills");
  });

  it("should return project-level claude skills path", () => {
    const result = getSkillsPath(SCOPES.PROJECT, AGENTS.CLAUDE);
    expect(result).toContain(".claude");
    expect(result).toContain("skills");
  });

  it("should return user-level claude skills path", () => {
    const result = getSkillsPath(SCOPES.USER, AGENTS.CLAUDE);
    expect(result).toContain(".claude");
    expect(result).toContain("skills");
  });

  it("should return user-level opencode skills path (default)", () => {
    const result = getSkillsPath(SCOPES.USER, AGENTS.OPENCODE);
    expect(result).toContain(".config");
    expect(result).toContain("opencode");
    expect(result).toContain("skills");
  });
});

describe("stripClaudeOnlyFrontmatter", () => {
  it("should strip single-line allowed-tools from frontmatter", () => {
    const content = `---
description: Test command
allowed-tools: Bash(git diff:*), Bash(git status:*)
---
# Content`;
    const result = stripClaudeOnlyFrontmatter(content);
    expect(result).not.toContain("allowed-tools");
    expect(result).toContain("description: Test command");
    expect(result).toContain("# Content");
  });

  it("should strip multiline allowed-tools from frontmatter", () => {
    const content = `---
description: Test command
allowed-tools:
  - Bash(git diff:*)
  - Bash(git status:*)
---
# Content`;
    const result = stripClaudeOnlyFrontmatter(content);
    expect(result).not.toContain("allowed-tools");
    expect(result).not.toContain("Bash(git diff:*)");
    expect(result).toContain("description: Test command");
  });

  it("should not strip non-Claude keys", () => {
    const content = `---
description: Test command
name: test
---
# Content`;
    const result = stripClaudeOnlyFrontmatter(content);
    expect(result).toContain("description: Test command");
    expect(result).toContain("name: test");
  });

  it("should return content unchanged when no frontmatter", () => {
    const content = "# Just content\nNo frontmatter here.";
    const result = stripClaudeOnlyFrontmatter(content);
    expect(result).toBe(content);
  });
});

describe("getScopeOptions (truncation edge case)", () => {
  it("should truncate path without slash when path has no slash after truncation", () => {
    // Use a very small maxLength (5) to force the no-slash branch in truncatePathFromLeft
    // (truncated part will be just a few chars with no slash)
    const options = getScopeOptions(5, AGENTS.OPENCODE);
    expect(options.length).toBeGreaterThan(0);
    // All hints should start with "..." due to extreme truncation
    expect(options[0].hint).toMatch(/^\.\.\./);
  });
});

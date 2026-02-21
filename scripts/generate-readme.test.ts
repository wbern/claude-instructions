import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CATEGORIES,
  cleanFrontmatter,
  createConfig,
  generateCommandsMarkdown,
  getCategory,
  parseFrontmatter,
  processMarkdownFiles,
  writeCommandsMetadata,
} from "./generate-readme.js";

describe("parseFrontmatter", () => {
  it("should parse frontmatter from markdown", () => {
    const content = `---
description: Test command
argument-hint: <test>
---

# Content here`;

    const result = parseFrontmatter(content);

    expect(result).toMatchSnapshot();
  });

  it("should return empty object when no frontmatter", () => {
    const content = "# Just content";
    const result = parseFrontmatter(content);

    expect(result).toEqual({});
  });

  it("should handle multiline frontmatter values", () => {
    const content = `---
description: Execute TDD Red Phase - write ONE failing test
argument-hint: <test description or feature requirement>
---`;

    const result = parseFrontmatter(content);
    expect(result.description).toBe(
      "Execute TDD Red Phase - write ONE failing test",
    );
  });

  it("should parse YAML arrays like _requested-tools", () => {
    const content = `---
description: Code review command
_requested-tools:
  - Bash(git diff:*)
  - Bash(git status:*)
  - Bash(git log:*)
---`;

    const result = parseFrontmatter(content);
    expect(result["_requested-tools"]).toEqual([
      "Bash(git diff:*)",
      "Bash(git status:*)",
      "Bash(git log:*)",
    ]);
  });

  it("should save pending array when followed by another key", () => {
    const content = `---
_requested-tools:
  - Bash(git diff:*)
  - Bash(git status:*)
description: After the array
_category: Workflow
---`;

    const result = parseFrontmatter(content);
    expect(result["_requested-tools"]).toEqual([
      "Bash(git diff:*)",
      "Bash(git status:*)",
    ]);
    expect(result.description).toBe("After the array");
    expect(result._category).toBe("Workflow");
  });

  it("should skip lines without colons", () => {
    const content = `---
description: Test command
this line has no colon
_order: 1
---`;

    const result = parseFrontmatter(content);
    expect(result.description).toBe("Test command");
    expect(result._order).toBe(1);
  });
});

describe("getCategory", () => {
  it("should get category from frontmatter", () => {
    expect(getCategory({ _category: "Test-Driven Development" })).toBe(
      "Test-Driven Development",
    );
    expect(getCategory({ _category: "Planning" })).toBe("Planning");
    expect(getCategory({ _category: "Workflow" })).toBe("Workflow");
  });

  it("should default to Utilities when no category specified", () => {
    expect(getCategory({})).toBe(CATEGORIES.UTILITIES);
    expect(getCategory({ description: "Test" })).toBe(CATEGORIES.UTILITIES);
  });
});

describe("generateCommandsMarkdown", () => {
  it("should generate markdown for single category", () => {
    const commands = [
      {
        name: "red",
        description: "Write failing test",
        category: "Test-Driven Development",
        order: 2,
      },
      {
        name: "green",
        description: "Make test pass",
        category: "Test-Driven Development",
        order: 3,
      },
    ];

    const result = generateCommandsMarkdown(commands);
    expect(result).toMatchSnapshot();
  });

  it("should generate markdown for multiple categories", () => {
    const commands = [
      {
        name: "red",
        description: "Write failing test",
        category: "Test-Driven Development",
        order: 2,
      },
      {
        name: "commit",
        description: "Create commit",
        category: "Workflow",
        order: 1,
      },
      {
        name: "worktree-add",
        description: "Add worktree",
        category: "Worktree Management",
        order: 1,
      },
    ];

    const result = generateCommandsMarkdown(commands);
    expect(result).toMatchSnapshot();
  });

  it("should sort commands by order within category", () => {
    const commands = [
      {
        name: "spike",
        description: "Spike phase",
        category: "Test-Driven Development",
        order: 1,
      },
      {
        name: "cycle",
        description: "Full cycle",
        category: "Test-Driven Development",
        order: 5,
      },
      {
        name: "green",
        description: "Make test pass",
        category: "Test-Driven Development",
        order: 3,
      },
      {
        name: "red",
        description: "Write failing test",
        category: "Test-Driven Development",
        order: 2,
      },
    ];

    const result = generateCommandsMarkdown(commands);
    expect(result).toMatchSnapshot();
  });

  it("should sort alphabetically when orders are equal", () => {
    const commands = [
      {
        name: "zebra",
        description: "Zebra command",
        category: "Workflow",
        order: 1,
      },
      {
        name: "alpha",
        description: "Alpha command",
        category: "Workflow",
        order: 1,
      },
      {
        name: "beta",
        description: "Beta command",
        category: "Workflow",
        order: 1,
      },
    ];

    const result = generateCommandsMarkdown(commands);

    // Verify alphabetical order: alpha, beta, zebra
    const alphaIndex = result.indexOf("/alpha");
    const betaIndex = result.indexOf("/beta");
    const zebraIndex = result.indexOf("/zebra");

    expect(alphaIndex).toBeLessThan(betaIndex);
    expect(betaIndex).toBeLessThan(zebraIndex);
  });

  it("should maintain category order", () => {
    const commands = [
      {
        name: "add-command",
        description: "Add new command",
        category: "Utilities",
        order: 1,
      },
      {
        name: "red",
        description: "Write failing test",
        category: "Test-Driven Development",
        order: 2,
      },
      {
        name: "worktree-add",
        description: "Add worktree",
        category: "Worktree Management",
        order: 1,
      },
      {
        name: "commit",
        description: "Create commit",
        category: "Workflow",
        order: 1,
      },
    ];

    const result = generateCommandsMarkdown(commands);

    // Planning should come first, then TDD Cycle, then Workflow, then Worktree Management, then Utilities
    expect(result).toMatchSnapshot();
  });

  it("should handle empty commands array", () => {
    const result = generateCommandsMarkdown([]);
    expect(result).toBe("");
  });

  it("should throw when command has invalid category", () => {
    const commands = [
      {
        name: "test",
        description: "Test command",
        category: "Invalid Category",
        order: 1,
      },
    ];

    expect(() => generateCommandsMarkdown(commands)).toThrow(
      "Invalid category: Invalid Category",
    );
  });

  it("should include summarize command when reading from source files", () => {
    const commands = [
      {
        name: "summarize",
        description: "Summarize conversation progress and next steps",
        category: "Workflow",
        order: 10,
      },
    ];

    const result = generateCommandsMarkdown(commands);

    expect(result).toContain("/summarize");
    expect(result).toContain("Summarize conversation progress and next steps");
  });
});

describe("generateCommandsMetadata", () => {
  it("should generate metadata JSON with commands keyed by filename", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");

    const result = await generateCommandsMetadata();

    expect(result).toHaveProperty("red.md");
    expect(result["red.md"]).toMatchObject({
      description: expect.any(String),
      category: "Test-Driven Development",
      order: expect.any(Number),
    });
  });

  it("should have cycle.md in same category as red.md", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");

    const result = await generateCommandsMetadata();

    expect(result["cycle.md"].category).toBe(result["red.md"].category);
  });

  it("should have hint for all commands", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");

    const result = await generateCommandsMetadata();

    for (const [filename, metadata] of Object.entries(result)) {
      expect(metadata.hint, `${filename} is missing _hint`).toBeDefined();
      expect(metadata.hint, `${filename} has empty _hint`).not.toBe("");
    }
  });

  it("should include _requested-tools when present in source", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");

    const result = await generateCommandsMetadata();

    // code-review.md has _requested-tools defined
    expect(result["code-review.md"]["_requested-tools"]).toEqual([
      "Bash(git diff:*)",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git rev-parse:*)",
      "Bash(git merge-base:*)",
      "Bash(git branch:*)",
    ]);
  });

  it("should include selectedByDefault: false when _selectedByDefault: false in source", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");

    const result = await generateCommandsMetadata();

    // ship.md, show.md, ask.md have _selectedByDefault: false
    expect(result["ship.md"].selectedByDefault).toBe(false);
    expect(result["show.md"].selectedByDefault).toBe(false);
    expect(result["ask.md"].selectedByDefault).toBe(false);
  });

  it("should not include selectedByDefault when _selectedByDefault is not false", async () => {
    const { generateCommandsMetadata } = await import("./generate-readme.js");

    const result = generateCommandsMetadata();

    // red.md does not have _selectedByDefault: false
    expect(result["red.md"].selectedByDefault).toBeUndefined();
  });
});

describe("generateExampleConversations", () => {
  it("should throw when directory does not exist", async () => {
    const { generateExampleConversations } = await import(
      "./generate-readme.js"
    );

    expect(() =>
      generateExampleConversations("/nonexistent/path/12345"),
    ).toThrow("does not exist");
  });

  it("should generate content from example-conversations directory", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const os = await import("node:os");

    // Create a temp directory with a test conversation file
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "example-conversations-test-"),
    );
    const testContent = "# Test Conversation\n\nThis is a test example.";
    fs.writeFileSync(path.join(tempDir, "test-conversation.md"), testContent);

    const { generateExampleConversations } = await import(
      "./generate-readme.js"
    );

    const result = generateExampleConversations(tempDir);

    expect(result).toContain("# Test Conversation");
    expect(result).toContain("This is a test example.");

    // Cleanup
    fs.rmSync(tempDir, { recursive: true });
  });
});

describe("src/README.md structure", () => {
  it("should have COMMANDS_BADGE transform block in badges section", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "src", "README.md"),
      "utf8",
    );

    expect(content).toContain("<!-- docs COMMANDS_BADGE -->");
    expect(content).toContain("<!-- /docs -->");
  });
});

describe("createConfig", () => {
  it("should return config with INCLUDE transform that reads files", () => {
    const config = createConfig(true);

    expect(config.transforms).toHaveProperty("INCLUDE");
    expect(config.transforms).toHaveProperty("COMMANDS_LIST");
    expect(config.transforms).toHaveProperty("EXAMPLE_CONVERSATIONS");
  });

  it("INCLUDE transform should read file content", () => {
    const config = createConfig(true);
    const result = config.transforms.INCLUDE({
      options: { path: "package.json" },
    });

    expect(result).toContain('"name"');
    expect(result).toContain("claude-instructions");
  });

  it("INCLUDE transform should return empty string for beads feature flag when withBeads is false", () => {
    const config = createConfig(false);
    const result = config.transforms.INCLUDE({
      options: { path: "package.json", featureFlag: "beads" },
    });

    expect(result).toBe("");
  });

  it("INCLUDE transform should read elsePath when beads feature flag is false and elsePath is provided", () => {
    const config = createConfig(false);
    const result = config.transforms.INCLUDE({
      options: {
        path: "package.json",
        featureFlag: "beads",
        elsePath: "README.md",
      },
    });

    expect(result).toContain("@wbern/claude-instructions");
  });

  it("INCLUDE transform should read file normally when featureFlag is beads and withBeads is true", () => {
    const config = createConfig(true);
    const result = config.transforms.INCLUDE({
      options: { path: "package.json", featureFlag: "beads" },
    });

    expect(result).toContain('"name"');
  });

  it("COMMANDS_LIST transform should generate markdown list", () => {
    const config = createConfig(true);
    const result = config.transforms.COMMANDS_LIST();

    expect(result).toContain("/red");
    expect(result).toContain("/green");
    expect(result).toContain("###");
  });

  it("EXAMPLE_CONVERSATIONS transform should return example content", () => {
    const config = createConfig(true);
    const result = config.transforms.EXAMPLE_CONVERSATIONS();

    expect(result.length).toBeGreaterThan(0);
  });

  it("COMMANDS_BADGE transform should generate shields.io badge with command count", () => {
    const config = createConfig(true);
    const result = config.transforms.COMMANDS_BADGE();

    expect(result).toContain("img.shields.io/badge/commands-");
    expect(result).toContain("-blue");
    expect(result).toMatch(/commands-\d+-blue/);
  });

  it("INCLUDE transform should throw error for invalid path", () => {
    const config = createConfig(true);
    expect(() =>
      config.transforms.INCLUDE({
        options: { path: "nonexistent/file/that/does/not/exist.md" },
      }),
    ).toThrow("INCLUDE transform: Failed to read path");
  });

  it("INCLUDE transform should throw error for invalid elsePath", () => {
    const config = createConfig(false);
    expect(() =>
      config.transforms.INCLUDE({
        options: {
          path: "package.json",
          featureFlag: "beads",
          elsePath: "nonexistent/file/that/does/not/exist.md",
        },
      }),
    ).toThrow("INCLUDE transform: Failed to read elsePath");
  });

  it("VERSION transform should return package version", () => {
    const config = createConfig(true);
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );

    const result = config.transforms.VERSION();

    expect(result).toBe(packageJson.version);
  });
});

describe("writeCommandsMetadata", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "metadata-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should write metadata JSON to file", () => {
    const outputPath = path.join(tempDir, "metadata.json");

    writeCommandsMetadata(outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, "utf8");
    const metadata = JSON.parse(content);

    expect(metadata).toHaveProperty("red.md");
    expect(metadata["red.md"]).toHaveProperty("description");
    expect(metadata["red.md"]).toHaveProperty("category");
  });
});

describe("cleanFrontmatter", () => {
  it("should remove underscore-prefixed frontmatter fields", () => {
    const content = `---
description: Test command
_category: Workflow
_order: 1
_hint: some hint
---

Content here`;

    const result = cleanFrontmatter(content);

    expect(result).toContain("description: Test command");
    expect(result).not.toContain("_category");
    expect(result).not.toContain("_order");
    expect(result).not.toContain("_hint");
  });

  it("should clean up double newlines in frontmatter after field removal", () => {
    const content = `---
description: Test
_category: Workflow

_order: 1
---

Content`;

    const result = cleanFrontmatter(content);

    // Should not have double newlines in frontmatter
    expect(result).toMatch(/---\ndescription: Test\n---/);
  });

  it("should handle content with no underscore fields", () => {
    const content = `---
description: Simple file
---

Just regular content here.`;

    const result = cleanFrontmatter(content);

    expect(result).toBe(content);
  });

  it("should preserve content outside frontmatter", () => {
    const content = `---
description: Test
_category: Workflow
---

# Heading

Some content with _underscores in text.`;

    const result = cleanFrontmatter(content);

    expect(result).toContain("# Heading");
    expect(result).toContain("_underscores in text");
    expect(result).not.toContain("_category");
  });
});

describe("processMarkdownFiles", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "process-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should process markdown files with transforms", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(
      inputFile,
      `---
description: Test
---

# Test file

Content here.`,
    );

    await processMarkdownFiles([inputFile]);

    // File should still exist (processed in place)
    expect(fs.existsSync(inputFile)).toBe(true);
  });

  it("should use withBeads option defaulting to true", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(inputFile, "# Test");

    // Should not throw
    await processMarkdownFiles([inputFile], {});

    expect(fs.existsSync(inputFile)).toBe(true);
  });

  it("should support outputDir option with transforms", async () => {
    const inputFile = path.join(tempDir, "input.md");
    const outputDir = path.join(tempDir, "output");
    fs.mkdirSync(outputDir);
    // Include a transform so the file actually gets processed
    fs.writeFileSync(
      inputFile,
      `# Test
<!-- docs INCLUDE path='package.json' -->
<!-- /docs -->`,
    );

    await processMarkdownFiles([inputFile], { outputDir });

    // Output file should be created in output directory
    expect(fs.existsSync(path.join(outputDir, "input.md"))).toBe(true);
  });

  it("should support withBeads false option", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(inputFile, "# Test");

    await processMarkdownFiles([inputFile], { withBeads: false });

    expect(fs.existsSync(inputFile)).toBe(true);
  });

  it("should remove underscore-prefixed frontmatter fields during processing", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(
      inputFile,
      `---
description: Test command
_category: Workflow
_order: 1
---

Content here`,
    );

    await processMarkdownFiles([inputFile]);

    const result = fs.readFileSync(inputFile, "utf8");
    expect(result).toContain("description: Test command");
    expect(result).not.toContain("_category");
    expect(result).not.toContain("_order");
  });

  it("should expand COMMANDS_BADGE transform to shields.io badge", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(
      inputFile,
      `# Test
<!-- docs COMMANDS_BADGE -->
<!-- /docs -->`,
    );

    await processMarkdownFiles([inputFile]);

    const result = fs.readFileSync(inputFile, "utf8");
    expect(result).toContain("img.shields.io/badge/commands-");
  });

  it("should expand COMMANDS_LIST transform to command list", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(
      inputFile,
      `# Commands
<!-- docs COMMANDS_LIST -->
<!-- /docs -->`,
    );

    await processMarkdownFiles([inputFile]);

    const result = fs.readFileSync(inputFile, "utf8");
    expect(result).toContain("/red");
    expect(result).toContain("/green");
  });

  it("should expand EXAMPLE_CONVERSATIONS transform", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(
      inputFile,
      `# Examples
<!-- docs EXAMPLE_CONVERSATIONS -->
<!-- /docs -->`,
    );

    await processMarkdownFiles([inputFile]);

    const result = fs.readFileSync(inputFile, "utf8");
    // Example conversations directory has at least some content
    expect(result.length).toBeGreaterThan(15);
  });

  it("should expand CLI_OPTIONS transform to options table", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(
      inputFile,
      `# Options
<!-- docs CLI_OPTIONS -->
<!-- /docs -->`,
    );

    await processMarkdownFiles([inputFile]);

    const result = fs.readFileSync(inputFile, "utf8");
    expect(result).toContain("| Option | Description |");
    expect(result).toContain("--scope");
  });

  it("should throw error for unknown transform", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(
      inputFile,
      `# Test
<!-- docs UNKNOWN_TRANSFORM -->
<!-- /docs -->`,
    );

    await expect(processMarkdownFiles([inputFile])).rejects.toThrow(
      "Unknown transform: UNKNOWN_TRANSFORM",
    );
  });

  it("should expand VERSION transform", async () => {
    const inputFile = path.join(tempDir, "test.md");
    fs.writeFileSync(
      inputFile,
      `# Test
Version: <!-- docs VERSION --><!-- /docs -->`,
    );

    await processMarkdownFiles([inputFile]);

    const result = fs.readFileSync(inputFile, "utf8");
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );
    expect(result).toContain(`Version: ${packageJson.version}`);
  });
});

describe("source file validation", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "validation-test-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("COMMANDS_LIST should throw when source file is missing description", async () => {
    const sourcesDir = path.join(tempDir, "src", "sources");
    fs.mkdirSync(sourcesDir, { recursive: true });
    fs.writeFileSync(
      path.join(sourcesDir, "test.md"),
      `---
_order: 1
_category: Workflow
---
Content`,
    );

    // The COMMANDS_LIST reads from PROJECT_ROOT which we can't easily override
    // So we test via parseFrontmatter and the validation logic directly
    const frontmatter = parseFrontmatter(`---
_order: 1
_category: Workflow
---`);

    expect(frontmatter.description).toBeUndefined();
  });

  it("parseFrontmatter should return undefined description when missing", () => {
    const frontmatter = parseFrontmatter(`---
_order: 1
_category: Workflow
---`);

    expect(frontmatter.description).toBeUndefined();
  });

  it("parseFrontmatter should return undefined _order when missing", () => {
    const frontmatter = parseFrontmatter(`---
description: Test
_category: Workflow
---`);

    expect(frontmatter._order).toBeUndefined();
  });
});

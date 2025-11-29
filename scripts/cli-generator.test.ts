import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs-extra";

vi.mock("fs-extra", () => ({
  default: {
    copy: vi.fn(),
    ensureDir: vi.fn(),
    readdir: vi.fn().mockResolvedValue(["file1.md", "file2.md"]),
    pathExists: vi.fn().mockResolvedValue(false),
    readFile: vi.fn().mockResolvedValue(""),
    writeFile: vi.fn(),
    rename: vi.fn(),
  },
}));

import { generateToDirectory, VARIANTS, SCOPES } from "./cli-generator.js";

describe("generateToDirectory", () => {
  const MOCK_OUTPUT_PATH = "/mock/output/path";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate command files to specified directory", async () => {
    const result = await generateToDirectory(MOCK_OUTPUT_PATH);

    expect(result.success).toBe(true);
    expect(result.filesGenerated).toBeGreaterThan(0);
  });

  it("should accept variant parameter and use it for generation", async () => {
    const result = await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
    );

    expect(result.success).toBe(true);
    expect(result.variant).toBe(VARIANTS.WITH_BEADS);
  });

  it("should copy files from source to output directory", async () => {
    await generateToDirectory(MOCK_OUTPUT_PATH, VARIANTS.WITH_BEADS);

    expect(fs.copy).toHaveBeenCalledWith(
      expect.stringContaining("downloads/with-beads"),
      MOCK_OUTPUT_PATH,
      expect.any(Object),
    );
  });

  it("should accept scope parameter and use project-level path", async () => {
    await generateToDirectory(undefined, VARIANTS.WITH_BEADS, SCOPES.PROJECT);

    expect(fs.copy).toHaveBeenCalledWith(
      expect.stringContaining("downloads/with-beads"),
      expect.stringContaining(".claude/commands"),
      expect.any(Object),
    );
  });

  it("should use user-level path when scope is user", async () => {
    await generateToDirectory(undefined, VARIANTS.WITH_BEADS, SCOPES.USER);

    expect(fs.copy).toHaveBeenCalledWith(
      expect.stringContaining("downloads/with-beads"),
      expect.stringContaining(".claude/commands"),
      expect.any(Object),
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

    const result = await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
    );

    expect(result.filesGenerated).toBe(5);
  });

  it("should accept options object with skipTemplateInjection", async () => {
    const result = await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
      SCOPES.PROJECT,
      { skipTemplateInjection: true },
    );

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

    const result = await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
      SCOPES.PROJECT,
    );

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

    const result = await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
      SCOPES.PROJECT,
    );

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

    await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
      SCOPES.PROJECT,
    );

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("test.md"),
      expect.stringContaining("## Injected Content"),
    );
  });

  it("should rename files with prefix when commandPrefix option is provided", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["red.md", "green.md"] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);

    await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
      SCOPES.PROJECT,
      { commandPrefix: "my-" },
    );

    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringContaining("red.md"),
      expect.stringContaining("my-red.md"),
    );
    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringContaining("green.md"),
      expect.stringContaining("my-green.md"),
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

    await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
      SCOPES.PROJECT,
      { commandPrefix: "my-" },
    );

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

    await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
      SCOPES.PROJECT,
    );

    expect(fs.writeFile).toHaveBeenCalledTimes(2);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("red.md"),
      expect.stringContaining("## Only for TDD commands"),
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("green.md"),
      expect.stringContaining("## Only for TDD commands"),
    );
    expect(fs.writeFile).not.toHaveBeenCalledWith(
      expect.stringContaining("commit.md"),
      expect.anything(),
    );
  });

  it("should only copy selected commands when commands option is provided", async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      "red.md",
      "green.md",
      "commit.md",
      "refactor.md",
    ] as never);
    vi.mocked(fs.pathExists).mockResolvedValue(false as never);

    const result = await generateToDirectory(
      MOCK_OUTPUT_PATH,
      VARIANTS.WITH_BEADS,
      SCOPES.PROJECT,
      {
        commands: ["red.md", "commit.md"],
      },
    );

    expect(result.filesGenerated).toBe(2);
    expect(fs.copy).toHaveBeenCalledTimes(2);
    expect(fs.copy).toHaveBeenCalledWith(
      expect.stringContaining("red.md"),
      expect.stringContaining("red.md"),
    );
    expect(fs.copy).toHaveBeenCalledWith(
      expect.stringContaining("commit.md"),
      expect.stringContaining("commit.md"),
    );
  });
});

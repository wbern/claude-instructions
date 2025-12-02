import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { generateToDirectory, VARIANTS } from "../cli-generator";

describe("Template Interpolation E2E", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "claude-instructions-test-"),
    );
  });

  afterEach(async () => {
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  it("should interpolate CLAUDE.md template content into generated commands", async () => {
    // Arrange: Create CLAUDE.md with template content in temp directory
    const customInstructions =
      "## Custom Project Rules\n\nAlways use TypeScript strict mode.";
    const claudeMdContent = `# Project Instructions

Some general instructions here.

<claude-commands-template>
${customInstructions}
</claude-commands-template>
`;
    await fs.writeFile(path.join(tempDir, "CLAUDE.md"), claudeMdContent);

    // Change to temp directory so generateToDirectory finds the CLAUDE.md
    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act: Generate commands to output directory
      const result = await generateToDirectory(
        outputDir,
        VARIANTS.WITHOUT_BEADS,
      );

      // Assert: Template was injected
      expect(result.templateInjected).toBe(true);

      // Assert: At least one command file exists
      const files = await fs.readdir(outputDir);
      const mdFiles = files.filter((f) => f.endsWith(".md"));
      expect(mdFiles.length).toBeGreaterThan(0);

      // Assert: Generated command contains the custom instructions
      const commitMdPath = path.join(outputDir, "commit.md");
      const commitContent = await fs.readFile(commitMdPath, "utf-8");
      expect(commitContent).toContain(customInstructions);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("should fallback to AGENTS.md when CLAUDE.md does not exist", async () => {
    // Arrange: Create AGENTS.md (not CLAUDE.md) with template content
    const customInstructions =
      "## Agent-Specific Rules\n\nUse functional programming patterns.";
    const agentsMdContent = `# Agent Instructions

Configuration for agents.

<claude-commands-template>
${customInstructions}
</claude-commands-template>
`;
    await fs.writeFile(path.join(tempDir, "AGENTS.md"), agentsMdContent);

    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act: Generate commands
      const result = await generateToDirectory(
        outputDir,
        VARIANTS.WITHOUT_BEADS,
      );

      // Assert: Template was injected from AGENTS.md
      expect(result.templateInjected).toBe(true);

      // Assert: Generated command contains the custom instructions from AGENTS.md
      const commitMdPath = path.join(outputDir, "commit.md");
      const commitContent = await fs.readFile(commitMdPath, "utf-8");
      expect(commitContent).toContain(customInstructions);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("should only inject template into specified commands when commands attribute is used", async () => {
    // Arrange: Create CLAUDE.md with command-specific template
    const commitOnlyInstructions =
      "## Commit-Specific Rules\n\nAlways sign commits.";
    const claudeMdContent = `# Project Instructions

<claude-commands-template commands="commit">
${commitOnlyInstructions}
</claude-commands-template>
`;
    await fs.writeFile(path.join(tempDir, "CLAUDE.md"), claudeMdContent);

    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act: Generate commands
      const result = await generateToDirectory(
        outputDir,
        VARIANTS.WITHOUT_BEADS,
      );

      // Assert: Template was injected
      expect(result.templateInjected).toBe(true);

      // Assert: commit.md SHOULD contain the custom instructions
      const commitContent = await fs.readFile(
        path.join(outputDir, "commit.md"),
        "utf-8",
      );
      expect(commitContent).toContain(commitOnlyInstructions);

      // Assert: red.md should NOT contain the custom instructions (not in commands list)
      const redContent = await fs.readFile(
        path.join(outputDir, "red.md"),
        "utf-8",
      );
      expect(redContent).not.toContain(commitOnlyInstructions);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("should inject template into multiple specified commands", async () => {
    // Arrange: Create CLAUDE.md targeting two commands
    const tddInstructions = "## Cycle Rules\n\nRun tests after each change.";
    const claudeMdContent = `# Project Instructions

<claude-commands-template commands="red,green">
${tddInstructions}
</claude-commands-template>
`;
    await fs.writeFile(path.join(tempDir, "CLAUDE.md"), claudeMdContent);

    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act
      const result = await generateToDirectory(
        outputDir,
        VARIANTS.WITHOUT_BEADS,
      );

      // Assert: Template was injected
      expect(result.templateInjected).toBe(true);

      // Assert: red.md SHOULD contain the instructions
      const redContent = await fs.readFile(
        path.join(outputDir, "red.md"),
        "utf-8",
      );
      expect(redContent).toContain(tddInstructions);

      // Assert: green.md SHOULD contain the instructions
      const greenContent = await fs.readFile(
        path.join(outputDir, "green.md"),
        "utf-8",
      );
      expect(greenContent).toContain(tddInstructions);

      // Assert: commit.md should NOT contain the instructions
      const commitContent = await fs.readFile(
        path.join(outputDir, "commit.md"),
        "utf-8",
      );
      expect(commitContent).not.toContain(tddInstructions);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("should not inject when CLAUDE.md exists but has no template tag", async () => {
    // Arrange: Create CLAUDE.md without <claude-commands-template> tag
    const claudeMdContent = `# Project Instructions

This is a project without any template blocks.

## Guidelines
- Use TypeScript
- Write tests
`;
    await fs.writeFile(path.join(tempDir, "CLAUDE.md"), claudeMdContent);

    const originalCwd = process.cwd();
    process.chdir(tempDir);

    try {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act
      const result = await generateToDirectory(
        outputDir,
        VARIANTS.WITHOUT_BEADS,
      );

      // Assert: Generation succeeded but no template was injected
      expect(result.success).toBe(true);
      expect(result.templateInjected).toBe(false);

      // Assert: Commands were generated
      const files = await fs.readdir(outputDir);
      expect(files.filter((f) => f.endsWith(".md")).length).toBeGreaterThan(0);
    } finally {
      process.chdir(originalCwd);
    }
  });
});

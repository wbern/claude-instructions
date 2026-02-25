import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateToDirectory } from "../cli-generator";

const PROJECT_ROOT = path.join(import.meta.dirname, "../..");

/**
 * Execute a function with a temporary working directory, restoring original cwd afterward.
 */
async function withCwd<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  const originalCwd = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(originalCwd);
  }
}

describe("Template Interpolation E2E", { timeout: 30000 }, () => {
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

    await withCwd(tempDir, async () => {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act: Generate commands to output directory using dynamic generation
      const result = await generateToDirectory(outputDir, undefined, {
        flags: [],
      });

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
    });
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

    await withCwd(tempDir, async () => {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act: Generate commands using dynamic generation
      const result = await generateToDirectory(outputDir, undefined, {
        flags: [],
      });

      // Assert: Template was injected from AGENTS.md
      expect(result.templateInjected).toBe(true);

      // Assert: Generated command contains the custom instructions from AGENTS.md
      const commitMdPath = path.join(outputDir, "commit.md");
      const commitContent = await fs.readFile(commitMdPath, "utf-8");
      expect(commitContent).toContain(customInstructions);
    });
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

    await withCwd(tempDir, async () => {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act: Generate commands using dynamic generation
      const result = await generateToDirectory(outputDir, undefined, {
        flags: [],
      });

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
    });
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

    await withCwd(tempDir, async () => {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act
      const result = await generateToDirectory(outputDir, undefined, {
        flags: [],
      });

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
    });
  });

  it("should append content from multiple templates targeting the same command", async () => {
    // Arrange: Create CLAUDE.md with two templates both targeting commit
    const firstTemplate = "## General Rules\n\nUse conventional commits.";
    const secondTemplate = "## Security Rules\n\nNever commit secrets.";
    const claudeMdContent = `# Project Instructions

<claude-commands-template commands="commit">
${firstTemplate}
</claude-commands-template>

<claude-commands-template commands="commit">
${secondTemplate}
</claude-commands-template>
`;
    await fs.writeFile(path.join(tempDir, "CLAUDE.md"), claudeMdContent);

    await withCwd(tempDir, async () => {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act
      const result = await generateToDirectory(outputDir, undefined, {
        flags: [],
      });

      // Assert: Template was injected
      expect(result.templateInjected).toBe(true);

      // Assert: commit.md contains BOTH templates appended
      const commitContent = await fs.readFile(
        path.join(outputDir, "commit.md"),
        "utf-8",
      );
      expect(commitContent).toContain(firstTemplate);
      expect(commitContent).toContain(secondTemplate);
    });
  });

  it("should append content from three templates all targeting the same command", async () => {
    // Arrange: Create CLAUDE.md with three templates all targeting commit
    const firstTemplate = "## Style Guide\n\nUse imperative mood.";
    const secondTemplate = "## Scope Rules\n\nAlways include scope.";
    const thirdTemplate = "## Footer Rules\n\nInclude issue reference.";
    const claudeMdContent = `# Project Instructions

<claude-commands-template commands="commit">
${firstTemplate}
</claude-commands-template>

<claude-commands-template commands="commit">
${secondTemplate}
</claude-commands-template>

<claude-commands-template commands="commit">
${thirdTemplate}
</claude-commands-template>
`;
    await fs.writeFile(path.join(tempDir, "CLAUDE.md"), claudeMdContent);

    await withCwd(tempDir, async () => {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act
      const result = await generateToDirectory(outputDir, undefined, {
        flags: [],
      });

      // Assert: Template was injected
      expect(result.templateInjected).toBe(true);

      // Assert: commit.md contains ALL THREE templates appended
      const commitContent = await fs.readFile(
        path.join(outputDir, "commit.md"),
        "utf-8",
      );
      expect(commitContent).toContain(firstTemplate);
      expect(commitContent).toContain(secondTemplate);
      expect(commitContent).toContain(thirdTemplate);
    });
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

    await withCwd(tempDir, async () => {
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act
      const result = await generateToDirectory(outputDir, undefined, {
        flags: [],
      });

      // Assert: Generation succeeded but no template was injected
      expect(result.success).toBe(true);
      expect(result.templateInjected).toBe(false);

      // Assert: Commands were generated
      const files = await fs.readdir(outputDir);
      expect(files.filter((f) => f.endsWith(".md")).length).toBeGreaterThan(0);
    });
  });

  it("should NOT inject template when outputting to user scope from a project with CLAUDE.md", async () => {
    // This is a security/privacy concern: project-specific instructions
    // should not leak into user-global commands
    const sensitiveProjectInstructions =
      "## Secret Project Rules\n\nNever mention Project X.";
    const claudeMdContent = `# Project Instructions

<claude-commands-template>
${sensitiveProjectInstructions}
</claude-commands-template>
`;
    // Create CLAUDE.md in the "project" directory (tempDir simulates cwd)
    await fs.writeFile(path.join(tempDir, "CLAUDE.md"), claudeMdContent);

    await withCwd(tempDir, async () => {
      // Output to user scope (different from project scope)
      // Real user dir would be: path.join(os.homedir(), ".claude", "commands")
      const testOutputDir = path.join(tempDir, "user-commands");

      // Act: Generate to user scope (simulated by passing 'user' scope)
      const result = await generateToDirectory(testOutputDir, "user", {
        flags: [],
      });

      // Assert: Template was NOT injected (project template shouldn't leak to user scope)
      expect(result.templateInjected).toBe(false);

      // Assert: Commands were generated but without the sensitive content
      const commitMdPath = path.join(testOutputDir, "commit.md");
      const commitContent = await fs.readFile(commitMdPath, "utf-8");
      expect(commitContent).not.toContain(sensitiveProjectInstructions);
    });
  });
});

describe("Template Injection Conflict Detection E2E", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "claude-instructions-template-conflict-"),
    );
  });

  afterEach(async () => {
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  it("should detect files as identical when re-generating with same template", async () => {
    // Arrange: Create CLAUDE.md with template content
    const customInstructions =
      "## Custom Project Rules\n\nAlways use TypeScript strict mode.";
    const claudeMdContent = `# Project Instructions

<claude-commands-template>
${customInstructions}
</claude-commands-template>
`;
    await fs.writeFile(path.join(tempDir, "CLAUDE.md"), claudeMdContent);

    await withCwd(tempDir, async () => {
      const { checkExistingFiles } = await import("../cli-generator.js");
      const outputDir = path.join(tempDir, ".claude", "commands");

      // Act: Generate commands (which injects template content)
      await generateToDirectory(outputDir, undefined, {
        flags: [],
        commands: ["commit.md"],
      });

      // Verify template was injected into generated file
      const generatedContent = await fs.readFile(
        path.join(outputDir, "commit.md"),
        "utf-8",
      );
      expect(generatedContent).toContain(customInstructions);

      // Act: Check for conflicts with same options
      const existingFiles = await checkExistingFiles(outputDir, undefined, {
        flags: [],
        commands: ["commit.md"],
      });

      // Assert: File should be detected as identical since same template applies
      expect(existingFiles).toHaveLength(1);
      expect(existingFiles[0].isIdentical).toBe(true);
    });
  });
});

describe("Allowed Tools Conflict Detection E2E", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "agent-instructions-allowed-tools-"),
    );
  });

  afterEach(async () => {
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  it("should detect files as identical when re-generating with same allowed tools", async () => {
    await withCwd(tempDir, async () => {
      const { checkExistingFiles } = await import("../cli-generator.js");
      const outputDir = path.join(tempDir, ".claude", "commands");
      // Use tools that code-review.md actually requests in _requested-tools
      const allowedTools = ["Bash(git diff:*)", "Bash(git status:*)"];

      // First generation with allowed tools - use code-review.md which has _requested-tools
      // Use agent=claude to enable allowed-tools injection (Claude Code feature)
      await generateToDirectory(outputDir, undefined, {
        flags: [],
        commands: ["code-review.md"],
        allowedTools,
        agent: "claude" as const,
      });

      // Verify file was created with allowed-tools header
      const firstContent = await fs.readFile(
        path.join(outputDir, "code-review.md"),
        "utf-8",
      );
      expect(firstContent).toContain(
        "allowed-tools: Bash(git diff:*), Bash(git status:*)",
      );

      // Check for conflicts with same allowed tools - should be identical
      const existingFiles = await checkExistingFiles(outputDir, undefined, {
        flags: [],
        commands: ["code-review.md"],
        allowedTools,
        agent: "claude" as const,
      });

      expect(existingFiles).toHaveLength(1);
      expect(existingFiles[0].isIdentical).toBe(true);
    });
  });

  it("should only inject allowed-tools into commands that requested them via _requested-tools", async () => {
    const outputDir = path.join(tempDir, ".claude", "commands");
    // These are tools that code-review.md requests in its _requested-tools
    const allowedTools = ["Bash(git diff:*)", "Bash(git status:*)"];

    // Generate both code-review.md (has _requested-tools) and red.md (no _requested-tools)
    // Use agent=claude to enable allowed-tools injection (Claude Code feature)
    await generateToDirectory(outputDir, undefined, {
      flags: [],
      commands: ["code-review.md", "red.md"],
      allowedTools,
      agent: "claude" as const,
    });

    // code-review.md SHOULD have allowed-tools (it has matching _requested-tools)
    const codeReviewContent = await fs.readFile(
      path.join(outputDir, "code-review.md"),
      "utf-8",
    );
    expect(codeReviewContent).toContain(
      "allowed-tools: Bash(git diff:*), Bash(git status:*)",
    );

    // red.md should NOT have allowed-tools (it has no _requested-tools)
    const redContent = await fs.readFile(
      path.join(outputDir, "red.md"),
      "utf-8",
    );
    expect(redContent).not.toContain("allowed-tools:");
  });

  it("should detect files as identical when using prefix and all requested tools", async () => {
    await withCwd(tempDir, async () => {
      const { checkExistingFiles } = await import("../cli-generator.js");
      const outputDir = path.join(tempDir, ".claude", "commands");
      // Use ALL tools that code-review.md requests in _requested-tools
      const allRequestedTools = [
        "Bash(git diff:*)",
        "Bash(git status:*)",
        "Bash(git log:*)",
        "Bash(git rev-parse:*)",
        "Bash(git merge-base:*)",
        "Bash(git branch:*)",
      ];

      // First generation with prefix and all allowed tools
      // Use agent=claude to enable allowed-tools injection (Claude Code feature)
      await generateToDirectory(outputDir, undefined, {
        flags: [],
        commands: ["code-review.md"],
        commandPrefix: "my-",
        allowedTools: allRequestedTools,
        agent: "claude" as const,
      });

      // Verify file was created with ALL tools in allowed-tools header
      const firstContent = await fs.readFile(
        path.join(outputDir, "my-code-review.md"),
        "utf-8",
      );
      expect(firstContent).toContain(
        `allowed-tools: ${allRequestedTools.join(", ")}`,
      );

      // Check for conflicts with same prefix and allowed tools - should be identical
      const existingFiles = await checkExistingFiles(outputDir, undefined, {
        flags: [],
        commands: ["code-review.md"],
        commandPrefix: "my-",
        allowedTools: allRequestedTools,
        agent: "claude" as const,
      });

      expect(existingFiles).toHaveLength(1);
      expect(existingFiles[0].filename).toBe("my-code-review.md");
      expect(existingFiles[0].newContent).toContain(
        `allowed-tools: ${allRequestedTools.join(", ")}`,
      );
      expect(existingFiles[0].isIdentical).toBe(true);
    });
  });
});

describe("Postinstall Workflow E2E", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "agent-instructions-postinstall-"),
    );
  });

  afterEach(async () => {
    if (tempDir && (await fs.pathExists(tempDir))) {
      await fs.remove(tempDir);
    }
  });

  it(
    "should regenerate commands on postinstall when configured as dev dependency",
    { timeout: 60000 },
    async () => {
      // Pack the package to get a local tarball (avoids registry)
      execSync(`pnpm pack --pack-destination ${tempDir}`, {
        cwd: PROJECT_ROOT,
        stdio: "pipe",
      });

      const files = await fs.readdir(tempDir);
      const tarball = files.find((f) => f.endsWith(".tgz"));
      expect(tarball).toBeDefined();

      // Create a minimal project with postinstall script
      const projectDir = path.join(tempDir, "test-project");
      await fs.mkdir(projectDir);

      const packageJson = {
        name: "test-project",
        version: "1.0.0",
        scripts: {
          postinstall:
            "claude-instructions --scope=project --agent=opencode --prefix= --skip-template-injection",
        },
        devDependencies: {
          "@wbern/claude-instructions": `file:${path.join(tempDir, tarball!)}`,
        },
      };
      await fs.writeJson(path.join(projectDir, "package.json"), packageJson);

      // Run pnpm install - this should trigger postinstall
      execSync("pnpm install", {
        cwd: projectDir,
        stdio: "pipe",
      });

      // Assert: Commands were generated in .opencode/commands (default agent)
      const commandsDir = path.join(projectDir, ".opencode", "commands");
      expect(await fs.pathExists(commandsDir)).toBe(true);

      const commandFiles = await fs.readdir(commandsDir);
      const mdFiles = commandFiles.filter((f) => f.endsWith(".md"));
      expect(mdFiles.length).toBeGreaterThan(0);
      expect(mdFiles).toContain("commit.md");
    },
  );
});

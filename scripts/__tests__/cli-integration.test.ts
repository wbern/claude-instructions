import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { main } from "../cli.js";
import { generateToDirectory } from "../cli-generator.js";

const PROJECT_ROOT = path.join(import.meta.dirname, "../..");
const BIN_PATH = path.join(PROJECT_ROOT, "bin", "cli.js");

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

describe("CLI Integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "agent-instructions-test-"),
    );
  });

  afterEach(() => {
    fs.removeSync(tempDir);
  });

  it("should have built CLI binary", () => {
    expect(fs.existsSync(BIN_PATH)).toBe(true);
  });

  it("should have shebang in CLI binary", () => {
    const content = fs.readFileSync(BIN_PATH, "utf-8");
    expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  it("should export main function from cli module", () => {
    expect(typeof main).toBe("function");
  });

  it("should have src directory with sources and fragments", () => {
    const srcDir = path.join(PROJECT_ROOT, "src");
    expect(fs.existsSync(path.join(srcDir, "sources"))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, "fragments"))).toBe(true);
  });

  it("should have package.json with correct bin entry", () => {
    const pkgJson = fs.readJsonSync(path.join(PROJECT_ROOT, "package.json"));
    expect(pkgJson.bin).toEqual({
      "agent-instructions": "./bin/cli.js",
      "claude-instructions": "./bin/cli.js",
    });
  });

  it("should have package.json with files array including bin and src", () => {
    const pkgJson = fs.readJsonSync(path.join(PROJECT_ROOT, "package.json"));
    expect(pkgJson.files).toContain("bin");
    expect(pkgJson.files).toContain("src");
  });

  it(
    "should run CLI from packed tarball without immediate failure",
    { timeout: 60000 },
    async () => {
      // Pack the package to temp dir (doesn't affect repo)
      // Use --pack-gzip-level 0 for faster compression (level 6 default is slow)
      execSync(`pnpm pack --pack-gzip-level 0 --pack-destination ${tempDir}`, {
        cwd: PROJECT_ROOT,
        stdio: "pipe",
      });

      // Find the tarball and verify size
      const files = fs.readdirSync(tempDir);
      const tarball = files.find((f) => f.endsWith(".tgz"));
      expect(tarball).toBeDefined();

      // Check tarball size (compressed) - current ~480KB, allow up to 600KB
      const tarballStats = fs.statSync(path.join(tempDir, tarball!));
      const tarballSizeKB = tarballStats.size / 1024;
      expect(tarballSizeKB).toBeLessThan(600);

      // Extract it
      const extractDir = path.join(tempDir, "extracted");
      fs.mkdirSync(extractDir);
      execSync(`tar -xzf ${path.join(tempDir, tarball!)} -C ${extractDir}`);

      const packageDir = path.join(extractDir, "package");

      // Install dependencies in isolated temp dir (package.json already exists from tarball)
      execSync("pnpm install --prefer-offline --ignore-scripts", {
        cwd: packageDir,
        stdio: "pipe",
      });

      // Run the CLI with a timeout - it should start and wait for input, not crash
      const cliPath = path.join(packageDir, "bin", "cli.js");

      const { spawnSync } = await import("node:child_process");
      const result = spawnSync("node", [cliPath], {
        timeout: 1000,
        stdio: "pipe",
        cwd: packageDir,
      });

      // Should timeout waiting for input (null status) or exit cleanly, not crash with code 1
      expect(result.status).not.toBe(1);
    },
  );

  it(
    "should never generate underscore-prefixed commands by default",
    { timeout: 30000 },
    async () => {
      const outputDir = path.join(tempDir, "commands");

      await generateToDirectory(outputDir);

      const generatedFiles = fs.readdirSync(outputDir);
      const underscoreFiles = generatedFiles.filter((f) => f.startsWith("_"));

      expect(
        underscoreFiles,
        "Underscore-prefixed commands must never be published - use includeContribCommands for local dev only",
      ).toEqual([]);
    },
  );

  it("should include contributor commands in .claude/commands/ for this repo", () => {
    const commandsDir = path.join(PROJECT_ROOT, ".claude", "commands");
    const files = fs.readdirSync(commandsDir);
    // Contributor commands have underscore stripped from output filename
    // e.g., _contribute-a-command.md source -> contribute-a-command.md output
    const contributorCommand = files.find((f) =>
      f.includes("contribute-a-command"),
    );

    expect(
      contributorCommand,
      "This repo's .claude/commands/ should include contributor commands (from underscore-prefixed sources)",
    ).toBeDefined();
  });

  it("should produce identical output when re-running with same allowed-tools via CLI", async () => {
    // This test simulates the exact user scenario:
    // 1. Run CLI with --allowed-tools (using --agent=claude to test allowed-tools injection)
    // 2. Copy the "reuse" command and run it again
    // 3. Files should be identical (no conflicts)
    const outputDir = path.join(tempDir, ".claude", "commands");
    const allRequestedTools = [
      "Bash(git diff:*)",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git rev-parse:*)",
      "Bash(git merge-base:*)",
      "Bash(git branch:*)",
    ];

    const allowedToolsArg = `--allowed-tools="${allRequestedTools.join(",")}"`;

    // First run - generate files using --agent=claude so allowed-tools is injected
    const firstCmd = `node ${BIN_PATH} --commands=code-review.md --prefix=my- ${allowedToolsArg} --scope=project --agent=claude --overwrite`;
    execSync(firstCmd, {
      cwd: tempDir,
      stdio: "pipe",
    });

    // Verify file was created with all tools
    const firstContent = fs.readFileSync(
      path.join(outputDir, "my-code-review.md"),
      "utf-8",
    );
    expect(firstContent).toContain(
      `allowed-tools: ${allRequestedTools.join(", ")}`,
    );

    // Second run with exact same command - should not show conflicts
    // Use withCwd to match the CLI's cwd (tempDir has no CLAUDE.md, so no template injection)
    await withCwd(tempDir, async () => {
      const { checkExistingFiles } = await import("../cli-generator.js");
      const existingFiles = await checkExistingFiles(outputDir, undefined, {
        commands: ["code-review.md"],
        commandPrefix: "my-",
        allowedTools: allRequestedTools,
        agent: "claude" as const,
      });

      expect(existingFiles).toHaveLength(1);
      expect(existingFiles[0].isIdentical).toBe(true);
    });
  });

  it("should generate to custom path when scope is an absolute path", async () => {
    const customBase = path.join(tempDir, "custom-output");
    const customCommandsDir = path.join(customBase, ".claude", "commands");
    const customSkillsDir = path.join(customBase, ".claude", "skills");

    await main({
      scope: customBase,
      commands: ["commit.md"],
      skills: ["tdd.md"],
      overwrite: true,
      agent: "claude",
    });

    // Verify command was created in the custom path
    expect(fs.existsSync(path.join(customCommandsDir, "commit.md"))).toBe(true);
    // Verify skill was created in the custom path
    expect(fs.existsSync(path.join(customSkillsDir, "tdd", "SKILL.md"))).toBe(
      true,
    );
  });

  it("should generate to .opencode in custom path when agent is opencode", async () => {
    const customBase = path.join(tempDir, "custom-output-oc");
    const customCommandsDir = path.join(customBase, ".opencode", "commands");
    const customSkillsDir = path.join(customBase, ".opencode", "skills");

    await main({
      scope: customBase,
      commands: ["commit.md"],
      skills: ["tdd.md"],
      overwrite: true,
      agent: "opencode",
    });

    // Verify command was created in .opencode path
    expect(fs.existsSync(path.join(customCommandsDir, "commit.md"))).toBe(true);
    // Verify skill was created in .opencode path
    expect(fs.existsSync(path.join(customSkillsDir, "tdd", "SKILL.md"))).toBe(
      true,
    );
  });

  it("should generate skill to .claude/skills/{name}/SKILL.md with proper frontmatter", async () => {
    const { generateSkillsToDirectory } = await import("../cli-generator.js");

    const skillsDir = path.join(tempDir, ".claude", "skills");

    await generateSkillsToDirectory(skillsDir, ["tdd.md"]);

    // Skill should be in a directory named after the command (without .md)
    const skillDir = path.join(skillsDir, "tdd");
    expect(fs.existsSync(skillDir)).toBe(true);

    // SKILL.md should exist inside the directory
    const skillFile = path.join(skillDir, "SKILL.md");
    expect(fs.existsSync(skillFile)).toBe(true);

    // Verify frontmatter has required Skills format fields
    const content = fs.readFileSync(skillFile, "utf-8");
    expect(content).toMatch(/^---\n/);
    expect(content).toMatch(/\nname: tdd\n/);
    expect(content).toMatch(/\ndescription: /);
  });

  it(
    "should generate skills via CLI --skills option",
    { timeout: 30000 },
    async () => {
      const skillsDir = path.join(tempDir, ".opencode", "skills");

      // Run CLI with --skills option (default agent is opencode)
      execSync(`node ${BIN_PATH} --scope=project --skills=tdd.md --overwrite`, {
        cwd: tempDir,
        stdio: "pipe",
      });

      // Skill should be generated
      const skillFile = path.join(skillsDir, "tdd", "SKILL.md");
      expect(fs.existsSync(skillFile)).toBe(true);

      const content = fs.readFileSync(skillFile, "utf-8");
      expect(content).toMatch(/\nname: tdd\n/);
    },
  );

  it(
    "should handle full user-scope command with all options combined",
    { timeout: 30000 },
    async () => {
      // This tests the exact CLI command a user might run with all options
      // Using --agent=opencode (default) so commands go to .config/opencode/commands/
      const commandsDir = path.join(tempDir, ".config", "opencode", "commands");
      const skillsDir = path.join(tempDir, ".config", "opencode", "skills");

      const commands = [
        "spike.md",
        "tdd.md",
        "red.md",
        "green.md",
        "refactor.md",
        "cycle.md",
        "simplify.md",
        "tdd-review.md",
        "issue.md",
        "create-issues.md",
        "commit.md",
        "busycommit.md",
        "pr.md",
        "summarize.md",
        "gap.md",
        "forever.md",
        "code-review.md",
        "polish.md",
        "worktree-add.md",
        "worktree-cleanup.md",
        "beepboop.md",
        "add-command.md",
        "kata.md",
        "create-adr.md",
        "research.md",
        "commitlint-checklist-nodejs.md",
        "upgrade-deps.md",
      ];

      const allowedTools = [
        "Bash(git diff:*)",
        "Bash(git status:*)",
        "Bash(git log:*)",
        "Bash(git rev-parse:*)",
        "Bash(git merge-base:*)",
        "Bash(git branch:*)",
        "WebFetch(domain:raw.githubusercontent.com)",
        "WebFetch(domain:api.github.com)",
      ];

      const cmd = [
        `node ${BIN_PATH}`,
        "--scope=user",
        "--flags=gh-cli,no-plan-files,beads",
        `--commands=${commands.join(",")}`,
        `--allowed-tools="${allowedTools.join(",")}"`,
        "--skills=tdd.md",
        "--overwrite",
      ].join(" ");

      // Override HOME to use tempDir so user-scope writes to our temp directory
      execSync(cmd, {
        cwd: tempDir,
        stdio: "pipe",
        env: { ...process.env, HOME: tempDir },
      });

      // Verify commands were generated
      expect(fs.existsSync(commandsDir)).toBe(true);
      const generatedCommands = fs.readdirSync(commandsDir);
      expect(generatedCommands.length).toBe(commands.length);

      // Verify skill was generated
      const skillFile = path.join(skillsDir, "tdd", "SKILL.md");
      expect(fs.existsSync(skillFile)).toBe(true);

      // Verify code-review was generated (OpenCode agent: no allowed-tools header, but file exists)
      const codeReviewFile = path.join(commandsDir, "code-review.md");
      expect(fs.existsSync(codeReviewFile)).toBe(true);
      const codeReviewContent = fs.readFileSync(codeReviewFile, "utf-8");
      // OpenCode agent does NOT inject allowed-tools; verify the file is a valid markdown command
      expect(codeReviewContent).toMatch(/^---/);
      // allowed-tools should NOT be present for OpenCode target
      expect(codeReviewContent).not.toContain("allowed-tools:");

      // Verify beads flag content is injected (create-issues uses beads)
      const createIssuesContent = fs.readFileSync(
        path.join(commandsDir, "create-issues.md"),
        "utf-8",
      );
      expect(createIssuesContent).toContain("beads"); // beads flag should inject content
    },
  );
});

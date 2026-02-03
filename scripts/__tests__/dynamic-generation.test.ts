import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { lint, readConfig } from "markdownlint/async";
import { describe, expect, it } from "vitest";
import { expandContent } from "../fragment-expander.js";

// Used for markdownlint validation of README
const lintAsync = promisify(lint);
const readConfigAsync = promisify(readConfig);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const SOURCES_DIR = path.join(PROJECT_ROOT, "src", "sources");

const getMarkdownFiles = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    : [];

describe("dynamic generation snapshots", () => {
  const sourceFiles = getMarkdownFiles(SOURCES_DIR);

  describe("with beads flag", () => {
    sourceFiles.forEach((file) => {
      it(`should match snapshot for ${file}`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: ["beads"],
          baseDir: PROJECT_ROOT,
        });
        expect(expanded).toMatchSnapshot();
      });
    });
  });

  describe("without beads flag", () => {
    sourceFiles.forEach((file) => {
      it(`should match snapshot for ${file}`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: [],
          baseDir: PROJECT_ROOT,
        });
        expect(expanded).toMatchSnapshot();
      });
    });
  });

  describe("gh-mcp flag produces different output", () => {
    const ghMcpAffectedFiles = [
      "issue.md",
      "create-issues.md",
      "code-review.md",
      "polish.md",
      "worktree-add.md",
      "worktree-cleanup.md",
    ];

    ghMcpAffectedFiles.forEach((file) => {
      it(`${file} should differ with and without gh-mcp flag`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const withGhMcp = expandContent(source, {
          flags: ["gh-mcp"],
          baseDir: PROJECT_ROOT,
        });
        const withoutGhMcp = expandContent(source, {
          flags: [],
          baseDir: PROJECT_ROOT,
        });
        // The two outputs should be different
        expect(withGhMcp).not.toEqual(withoutGhMcp);
      });

      it(`${file} with gh-mcp should include MCP-only instructions`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: ["gh-mcp"],
          baseDir: PROJECT_ROOT,
        });
        // gh-mcp flag should include MCP tool references without CLI fallback
        expect(expanded).toMatch(/mcp__github/);
      });
    });
  });

  describe("gh-cli flag produces different output", () => {
    const ghCliAffectedFiles = [
      "issue.md",
      "create-issues.md",
      "code-review.md",
      "polish.md",
      "worktree-add.md",
      "worktree-cleanup.md",
    ];

    ghCliAffectedFiles.forEach((file) => {
      it(`${file} should differ with and without gh-cli flag`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const withGhCli = expandContent(source, {
          flags: ["gh-cli"],
          baseDir: PROJECT_ROOT,
        });
        const withoutGhCli = expandContent(source, {
          flags: [],
          baseDir: PROJECT_ROOT,
        });
        // The two outputs should be different
        expect(withGhCli).not.toEqual(withoutGhCli);
      });

      it(`${file} with gh-cli should include gh CLI instructions`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: ["gh-cli"],
          baseDir: PROJECT_ROOT,
        });
        // gh-cli flag should include gh CLI instructions
        expect(expanded).toMatch(/gh (issue|pr|auth)/);
      });

      it(`${file} without gh-cli should include MCP references`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: [],
          baseDir: PROJECT_ROOT,
        });
        // Without gh-cli flag should include MCP tool references
        // Some files use "mcp__github", others use generic "MCP servers"
        expect(expanded).toMatch(/mcp__github|GitHub MCP|MCP servers/i);
      });
    });
  });
});

describe("dynamic generation content validation", () => {
  const COMMENT_BLOCK_PATTERN = /<!--\s*docs\s+\w+[^>]*-->/;
  const sourceFiles = getMarkdownFiles(SOURCES_DIR);

  describe("expanded content should not contain INCLUDE directives", () => {
    sourceFiles.forEach((file) => {
      it(`${file} with beads flag`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: ["beads"],
          baseDir: PROJECT_ROOT,
        });

        expect(expanded).not.toMatch(COMMENT_BLOCK_PATTERN);
      });

      it(`${file} without beads flag`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: [],
          baseDir: PROJECT_ROOT,
        });

        expect(expanded).not.toMatch(COMMENT_BLOCK_PATTERN);
      });
    });
  });
});

describe("beads content conditional inclusion", () => {
  it("should include Beads content when beads flag is enabled", () => {
    const prSource = fs.readFileSync(path.join(SOURCES_DIR, "pr.md"), "utf8");
    const expanded = expandContent(prSource, {
      flags: ["beads"],
      baseDir: PROJECT_ROOT,
    });

    expect(expanded).toContain("Beads");
  });

  it("should NOT include Beads content when beads flag is disabled", () => {
    const prSource = fs.readFileSync(path.join(SOURCES_DIR, "pr.md"), "utf8");
    const expanded = expandContent(prSource, {
      flags: [],
      baseDir: PROJECT_ROOT,
    });

    expect(expanded).not.toContain("### Beads Integration");
    expect(expanded).not.toContain("bd ready");
  });
});

describe("no-plan-files flag conditional inclusion", () => {
  it("should include plan file restriction when no-plan-files flag is enabled", () => {
    const commitSource = fs.readFileSync(
      path.join(SOURCES_DIR, "commit.md"),
      "utf8",
    );
    const expanded = expandContent(commitSource, {
      flags: ["no-plan-files"],
      baseDir: PROJECT_ROOT,
    });

    expect(expanded).toContain("plan.md");
    expect(expanded).toContain("NEVER");
  });

  it("should NOT include plan file restriction when no-plan-files flag is disabled", () => {
    const commitSource = fs.readFileSync(
      path.join(SOURCES_DIR, "commit.md"),
      "utf8",
    );
    const expanded = expandContent(commitSource, {
      flags: [],
      baseDir: PROJECT_ROOT,
    });

    expect(expanded).not.toContain("plan.md files");
  });
});

describe("expanded commands $ARGUMENTS validation", () => {
  const sourceFiles = getMarkdownFiles(SOURCES_DIR);

  describe("with beads flag", () => {
    sourceFiles.forEach((file) => {
      it(`${file} should have exactly one $ARGUMENTS`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: ["beads"],
          baseDir: PROJECT_ROOT,
        });
        const matches = expanded.match(/\$ARGUMENTS/g) || [];
        expect(matches.length).toBe(1);
      });
    });
  });

  describe("without beads flag", () => {
    sourceFiles.forEach((file) => {
      it(`${file} should have exactly one $ARGUMENTS`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: [],
          baseDir: PROJECT_ROOT,
        });
        const matches = expanded.match(/\$ARGUMENTS/g) || [];
        expect(matches.length).toBe(1);
      });
    });
  });
});

describe("universal-guidelines inclusion", () => {
  const UNIVERSAL_GUIDELINES_MARKER = "Never explicitly mention TDD";
  const sourceFiles = getMarkdownFiles(SOURCES_DIR);

  describe("with beads flag", () => {
    sourceFiles.forEach((file) => {
      it(`${file} should include universal-guidelines content`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: ["beads"],
          baseDir: PROJECT_ROOT,
        });
        expect(expanded).toContain(UNIVERSAL_GUIDELINES_MARKER);
      });
    });
  });

  describe("without beads flag", () => {
    sourceFiles.forEach((file) => {
      it(`${file} should include universal-guidelines content`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: [],
          baseDir: PROJECT_ROOT,
        });
        expect(expanded).toContain(UNIVERSAL_GUIDELINES_MARKER);
      });
    });
  });
});

describe("beads-awareness inclusion", () => {
  const BEADS_AWARENESS_MARKER = "Beads is available for task tracking";
  const sourceFiles = getMarkdownFiles(SOURCES_DIR);

  sourceFiles.forEach((file) => {
    it(`${file} with beads flag should include beads-awareness content`, () => {
      const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
      const expanded = expandContent(source, {
        flags: ["beads"],
        baseDir: PROJECT_ROOT,
      });
      expect(expanded).toContain(BEADS_AWARENESS_MARKER);
    });
  });
});

describe("without-beads should not contain beads references", () => {
  const sourceFiles = getMarkdownFiles(SOURCES_DIR);
  const BEADS_PATTERN = /\bbd\b|beads/i;

  sourceFiles.forEach((file) => {
    it(`${file} without beads flag should not contain 'bd' or 'beads'`, () => {
      const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
      const expanded = expandContent(source, {
        flags: [],
        baseDir: PROJECT_ROOT,
      });
      const lines = expanded.split("\n");

      lines.forEach((line, index) => {
        expect(
          line,
          `Line ${index + 1} contains beads reference: "${line.trim()}"`,
        ).not.toMatch(BEADS_PATTERN);
      });
    });
  });
});

describe("consistency checks inclusion", () => {
  it("gap.md with beads should include consistency checking guidance", () => {
    const source = fs.readFileSync(path.join(SOURCES_DIR, "gap.md"), "utf8");
    const expanded = expandContent(source, {
      flags: ["beads"],
      baseDir: PROJECT_ROOT,
    });
    expect(expanded).toContain("Consistency");
  });

  it("gap.md without beads should include consistency checking guidance", () => {
    const source = fs.readFileSync(path.join(SOURCES_DIR, "gap.md"), "utf8");
    const expanded = expandContent(source, {
      flags: [],
      baseDir: PROJECT_ROOT,
    });
    expect(expanded).toContain("Consistency");
  });

  it("refactor.md with beads should include consistency checking guidance", () => {
    const source = fs.readFileSync(
      path.join(SOURCES_DIR, "refactor.md"),
      "utf8",
    );
    const expanded = expandContent(source, {
      flags: ["beads"],
      baseDir: PROJECT_ROOT,
    });
    expect(expanded).toContain("Consistency");
  });

  it("refactor.md without beads should include consistency checking guidance", () => {
    const source = fs.readFileSync(
      path.join(SOURCES_DIR, "refactor.md"),
      "utf8",
    );
    const expanded = expandContent(source, {
      flags: [],
      baseDir: PROJECT_ROOT,
    });
    expect(expanded).toContain("Consistency");
  });
});

describe("fallback-arguments inclusion", () => {
  const TDD_CYCLE_COMMANDS = [
    "red.md",
    "green.md",
    "cycle.md",
    "refactor.md",
    "spike.md",
  ];
  const FALLBACK_MARKER = "bd ready";

  TDD_CYCLE_COMMANDS.forEach((file) => {
    it(`${file} with beads should include fallback-arguments content`, () => {
      const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
      const expanded = expandContent(source, {
        flags: ["beads"],
        baseDir: PROJECT_ROOT,
      });
      expect(expanded).toContain(FALLBACK_MARKER);
    });
  });
});

describe("allowed-tools should not contain Bash commands", () => {
  const BASH_PATTERN = /Bash\([^)]*\)/;
  const sourceFiles = getMarkdownFiles(SOURCES_DIR);

  describe("with beads flag", () => {
    sourceFiles.forEach((file) => {
      it(`${file} allowed-tools should not contain Bash commands`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: ["beads"],
          baseDir: PROJECT_ROOT,
        });
        // Extract frontmatter (between --- markers at start of file)
        const frontmatterMatch = expanded.match(/^---\n([\s\S]*?)\n---/);

        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          const allowedToolsMatch = frontmatter.match(
            /^allowed-tools:\s*(.*)$/m,
          );

          if (allowedToolsMatch) {
            const allowedTools = allowedToolsMatch[1];
            expect(
              allowedTools,
              `allowed-tools contains Bash command: "${allowedTools}"`,
            ).not.toMatch(BASH_PATTERN);
          }
        }
      });
    });
  });

  describe("without beads flag", () => {
    sourceFiles.forEach((file) => {
      it(`${file} allowed-tools should not contain Bash commands`, () => {
        const source = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const expanded = expandContent(source, {
          flags: [],
          baseDir: PROJECT_ROOT,
        });
        // Extract frontmatter (between --- markers at start of file)
        const frontmatterMatch = expanded.match(/^---\n([\s\S]*?)\n---/);

        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          const allowedToolsMatch = frontmatter.match(
            /^allowed-tools:\s*(.*)$/m,
          );

          if (allowedToolsMatch) {
            const allowedTools = allowedToolsMatch[1];
            expect(
              allowedTools,
              `allowed-tools contains Bash command: "${allowedTools}"`,
            ).not.toMatch(BASH_PATTERN);
          }
        }
      });
    });
  });
});

describe("generated commands should not contain internal metadata", () => {
  it(
    "should strip underscore-prefixed properties from generated output",
    { timeout: 30000 },
    async () => {
      const { generateToDirectory } = await import("../cli-generator.js");
      const tmpDir = fs.mkdtempSync(
        path.join(PROJECT_ROOT, "node_modules", ".tmp-test-"),
      );

      try {
        await generateToDirectory(tmpDir, undefined, { flags: ["beads"] });

        const generatedFiles = getMarkdownFiles(tmpDir);
        expect(generatedFiles.length).toBeGreaterThan(0);

        for (const file of generatedFiles) {
          const content = fs.readFileSync(path.join(tmpDir, file), "utf8");
          expect(
            content,
            `${file} contains underscore-prefixed metadata`,
          ).not.toMatch(/^_[\w-]+:/m);
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    },
  );
});

describe("reserved command names", () => {
  it("should not have plan.md source (conflicts with Claude Code ExitPlanMode - see issue #6109)", () => {
    const planSourcePath = path.join(SOURCES_DIR, "plan.md");
    expect(
      fs.existsSync(planSourcePath),
      "plan.md exists but triggers Claude Code's ExitPlanMode bug (github.com/anthropics/claude-code/issues/6109)",
    ).toBe(false);
  });

  it("should have create-issues.md as the renamed plan command", () => {
    const createIssuesPath = path.join(SOURCES_DIR, "create-issues.md");
    expect(
      fs.existsSync(createIssuesPath),
      "create-issues.md should exist as the renamed plan command",
    ).toBe(true);
  });
});

describe("markdownlint validation", () => {
  // Note: Dynamically expanded files may have extra blank lines where conditional
  // content was removed. The CLI applies post-processing to fix these issues.
  // These tests only validate the README which is generated through the build process.

  it("README should pass markdownlint", async () => {
    const readmePath = path.join(PROJECT_ROOT, "README.md");
    const configPath = path.join(PROJECT_ROOT, ".markdownlint.json");
    const config = await readConfigAsync(configPath);

    const results = await lintAsync({ files: [readmePath], config });

    const errors: string[] = [];
    for (const issues of Object.values(
      results as Record<
        string,
        Array<{
          lineNumber: number;
          ruleNames: string[];
          ruleDescription: string;
        }>
      >,
    )) {
      for (const issue of issues) {
        errors.push(
          `README.md:${issue.lineNumber}: ${issue.ruleNames.join("/")} ${issue.ruleDescription}`,
        );
      }
    }

    expect(errors, errors.join("\n")).toEqual([]);
  });
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const SOURCES_DIR = path.join(PROJECT_ROOT, "src", "sources");
const FRAGMENTS_DIR = path.join(PROJECT_ROOT, "src", "fragments");

const getMarkdownFiles = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
    : [];

describe("src/sources validation", () => {
  const files = getMarkdownFiles(SOURCES_DIR);

  if (files.length === 0) {
    it.skip("sources directory does not exist", () => {});
  } else {
    files.forEach((file) => {
      it(`${file} should contain $ARGUMENTS`, () => {
        const content = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        expect(content).toContain("$ARGUMENTS");
      });

      it(`${file} should not contain allowed-tools in frontmatter`, () => {
        const content = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
          expect(
            frontmatterMatch[1],
            "allowed-tools should be injected at install time, not baked into source",
          ).not.toMatch(/^allowed-tools:/m);
        }
      });
    });
  }
});

describe("src/fragments validation", () => {
  const files = getMarkdownFiles(FRAGMENTS_DIR);

  if (files.length === 0) {
    it.skip("fragments directory does not exist", () => {});
  } else {
    files.forEach((file) => {
      it(`${file} should not contain $ARGUMENTS`, () => {
        const content = fs.readFileSync(path.join(FRAGMENTS_DIR, file), "utf8");
        expect(content).not.toContain("$ARGUMENTS");
      });

      it(`${file} should not include other fragments`, () => {
        const content = fs.readFileSync(path.join(FRAGMENTS_DIR, file), "utf8");
        const includePattern = /path='src\/fragments\//;
        expect(
          content,
          `Fragment ${file} includes another fragment - fragments should be flat`,
        ).not.toMatch(includePattern);
      });
    });
  }
});

describe("src/fragments usage", () => {
  it("all fragments should be referenced in at least one source file", () => {
    const fragmentFiles = getMarkdownFiles(FRAGMENTS_DIR);
    const sourceFiles = getMarkdownFiles(SOURCES_DIR);

    // Collect all fragment references from source files (including elsePath)
    const referencedFragments = new Set<string>();
    for (const sourceFile of sourceFiles) {
      const content = fs.readFileSync(
        path.join(SOURCES_DIR, sourceFile),
        "utf8",
      );
      // Match both path='...' and elsePath='...'
      const pathMatches = content.matchAll(/path='src\/fragments\/([^']+)'/g);
      const elsePathMatches = content.matchAll(
        /elsePath='src\/fragments\/([^']+)'/g,
      );
      for (const match of pathMatches) {
        referencedFragments.add(match[1]);
      }
      for (const match of elsePathMatches) {
        referencedFragments.add(match[1]);
      }
    }

    // Check each fragment is referenced
    const unusedFragments = fragmentFiles.filter(
      (fragment) => !referencedFragments.has(fragment),
    );

    expect(
      unusedFragments,
      `Unused fragments found: ${unusedFragments.join(", ")}`,
    ).toEqual([]);
  });
});

describe("argument-hint frontmatter", () => {
  const files = getMarkdownFiles(SOURCES_DIR);

  files.forEach((file) => {
    it(`${file} should have argument-hint since it uses $ARGUMENTS`, () => {
      const content = fs.readFileSync(path.join(SOURCES_DIR, file), "utf8");

      // All source files use $ARGUMENTS, so they should all have argument-hint
      expect(content).toMatch(/^argument-hint:/m);
    });
  });
});

describe("README", () => {
  it("should contain Batman logo ASCII art", () => {
    const readmePath = path.join(PROJECT_ROOT, "README.md");
    const content = fs.readFileSync(readmePath, "utf8");

    expect(content).toContain("_==/          i     i          \\==_");
  });

  it("should contain npx usage instructions", () => {
    const readmePath = path.join(PROJECT_ROOT, "README.md");
    const content = fs.readFileSync(readmePath, "utf8");

    expect(content).toContain("npx @wbern/agent-instructions");
  });
});

// Claude Code bug: https://github.com/anthropics/claude-code/issues/12762
// Backticks containing `!` in tables get parsed as bash history expansion
describe("Claude Code table parsing bug workaround", () => {
  // Pattern to detect markdown tables with backtick-wrapped content containing !
  // The `!` triggers bash history expansion when Claude Code parses the command file
  // Matches: | `!something` | or | `foo!bar` | in table cells
  const problematicTablePattern = /\|[^|]*`[^`]*![^`]*`[^|]*\|/;

  const checkFilesForBug = (dir: string, files: string[]) => {
    files.forEach((file) => {
      it(`${file} should not have backticks with ! in tables (CC bug #12762)`, () => {
        const content = fs.readFileSync(path.join(dir, file), "utf8");

        // Extract table rows (lines starting and ending with |)
        const tableLines = content
          .split("\n")
          .filter((line) => line.trim().startsWith("|") && line.includes("`"));

        const problematicLines = tableLines.filter((line) =>
          problematicTablePattern.test(line),
        );

        expect(
          problematicLines,
          `Found table cells with backtick-wrapped ! that triggers Claude Code bash parsing bug.\n` +
            `Problematic lines:\n${problematicLines.join("\n")}\n\n` +
            `Workaround: Use plain text or bullet lists instead of tables with backticked content containing !.\n` +
            `See: https://github.com/anthropics/claude-code/issues/12762`,
        ).toEqual([]);
      });
    });
  };

  describe("generated commands", () => {
    const dir = path.join(PROJECT_ROOT, ".claude", "commands");
    checkFilesForBug(dir, getMarkdownFiles(dir));
  });

  describe("source files", () => {
    checkFilesForBug(SOURCES_DIR, getMarkdownFiles(SOURCES_DIR));
  });

  describe("fragment files", () => {
    checkFilesForBug(FRAGMENTS_DIR, getMarkdownFiles(FRAGMENTS_DIR));
  });
});

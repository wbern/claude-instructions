import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const DOWNLOADS_DIR = path.join(PROJECT_ROOT, "downloads");
const SOURCES_DIR = path.join(PROJECT_ROOT, "src", "sources");
const FRAGMENTS_DIR = path.join(PROJECT_ROOT, "src", "fragments");

const getMarkdownFiles = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
    : [];

["with-beads", "without-beads"].forEach((variant) => {
  describe(`downloads/${variant}`, () => {
    const variantDir = path.join(DOWNLOADS_DIR, variant);
    const files = getMarkdownFiles(variantDir);

    if (files.length === 0) {
      it.skip(`${variant} directory does not exist`, () => {});
    } else {
      files.forEach((file) => {
        it(`should match snapshot for ${file}`, () => {
          const content = fs.readFileSync(path.join(variantDir, file), "utf8");
          expect(content).toMatchSnapshot();
        });
      });
    }
  });
});

describe("downloads variants comparison", () => {
  it("should compile all source files to output directory", () => {
    const withBeadsDir = path.join(DOWNLOADS_DIR, "with-beads");
    const sourceFiles = getMarkdownFiles(SOURCES_DIR);
    const compiledFiles = getMarkdownFiles(withBeadsDir);

    if (sourceFiles.length > 0 && compiledFiles.length > 0) {
      sourceFiles.forEach((sourceFile) => {
        expect(compiledFiles).toContain(sourceFile);
      });
      expect(sourceFiles.length).toBe(compiledFiles.length);
    }
  });

  it("should have same number of files in both variants", () => {
    const withBeadsFiles = getMarkdownFiles(
      path.join(DOWNLOADS_DIR, "with-beads"),
    );
    const withoutBeadsFiles = getMarkdownFiles(
      path.join(DOWNLOADS_DIR, "without-beads"),
    );

    if (withBeadsFiles.length > 0 && withoutBeadsFiles.length > 0) {
      expect(withBeadsFiles.length).toBe(withoutBeadsFiles.length);
      expect(withBeadsFiles.sort()).toEqual(withoutBeadsFiles.sort());
    }
  });

  it("should have Beads content only in with-beads variant", () => {
    const withBeadsFile = path.join(DOWNLOADS_DIR, "with-beads", "pr.md");
    const withoutBeadsFile = path.join(DOWNLOADS_DIR, "without-beads", "pr.md");

    if (fs.existsSync(withBeadsFile) && fs.existsSync(withoutBeadsFile)) {
      const withBeadsContent = fs.readFileSync(withBeadsFile, "utf8");
      const withoutBeadsContent = fs.readFileSync(withoutBeadsFile, "utf8");

      // With-beads should have Beads Integration section
      expect(withBeadsContent).toContain("### Beads Integration");
      expect(withBeadsContent).toContain("bd ready");

      // Without-beads should NOT have expanded Beads content
      expect(withoutBeadsContent).not.toContain("### Beads Integration");
      expect(withoutBeadsContent).not.toContain("bd ready");
    }
  });
});

describe("downloads content validation", () => {
  const COMMENT_BLOCK_PATTERN = /^<!--\s+.+\s+-->/m;

  ["with-beads", "without-beads"].forEach((variant) => {
    const variantDir = path.join(DOWNLOADS_DIR, variant);
    const files = getMarkdownFiles(variantDir);

    if (files.length === 0) {
      it.skip(`${variant} directory does not exist`, () => {});
    } else {
      files.forEach((file) => {
        it(`${variant}/${file} should not contain markdown comment blocks`, () => {
          const content = fs.readFileSync(path.join(variantDir, file), "utf8");
          const lines = content.split("\n");

          lines.forEach((line) => {
            expect(line).not.toMatch(COMMENT_BLOCK_PATTERN);
          });
        });
      });
    }
  });
});

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

describe("compiled commands $ARGUMENTS validation", () => {
  ["with-beads", "without-beads"].forEach((variant) => {
    const variantDir = path.join(DOWNLOADS_DIR, variant);
    const files = getMarkdownFiles(variantDir);

    if (files.length === 0) {
      it.skip(`${variant} directory does not exist`, () => {});
    } else {
      files.forEach((file) => {
        it(`${variant}/${file} should have exactly one $ARGUMENTS`, () => {
          const content = fs.readFileSync(path.join(variantDir, file), "utf8");
          const matches = content.match(/\$ARGUMENTS/g) || [];
          expect(matches.length).toBe(1);
        });
      });
    }
  });
});

describe("universal-guidelines inclusion", () => {
  const UNIVERSAL_GUIDELINES_MARKER = "Never explicitly mention TDD";

  ["with-beads", "without-beads"].forEach((variant) => {
    const variantDir = path.join(DOWNLOADS_DIR, variant);
    const files = getMarkdownFiles(variantDir);

    files.forEach((file) => {
      it(`${variant}/${file} should include universal-guidelines content`, () => {
        const content = fs.readFileSync(path.join(variantDir, file), "utf8");
        expect(content).toContain(UNIVERSAL_GUIDELINES_MARKER);
      });
    });
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

describe("consistency checks inclusion", () => {
  ["with-beads", "without-beads"].forEach((variant) => {
    it(`${variant}/gap.md should include consistency checking guidance`, () => {
      const content = fs.readFileSync(
        path.join(DOWNLOADS_DIR, variant, "gap.md"),
        "utf8",
      );
      expect(content).toContain("Consistency");
    });

    it(`${variant}/refactor.md should include consistency checking guidance`, () => {
      const content = fs.readFileSync(
        path.join(DOWNLOADS_DIR, variant, "refactor.md"),
        "utf8",
      );
      expect(content).toContain("Consistency");
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

    expect(content).toContain("npx @wbern/claude-instructions");
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
    it(`with-beads/${file} should include fallback-arguments content`, () => {
      const content = fs.readFileSync(
        path.join(DOWNLOADS_DIR, "with-beads", file),
        "utf8",
      );
      expect(content).toContain(FALLBACK_MARKER);
    });
  });
});

describe("markdownlint validation", () => {
  ["with-beads", "without-beads"].forEach((variant) => {
    it(`${variant} should pass markdownlint`, () => {
      const variantDir = path.join(DOWNLOADS_DIR, variant);

      // Run markdownlint on the variant directory
      // This will throw if there are any errors
      expect(() => {
        execSync(`pnpm exec markdownlint "${variantDir}"/*.md`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
      }).not.toThrow();
    });
  });

  it("README.md should pass markdownlint", () => {
    expect(() => {
      execSync(`pnpm exec markdownlint README.md`, {
        encoding: "utf-8",
        stdio: "pipe",
      });
    }).not.toThrow();
  });
});

describe("beads-awareness inclusion", () => {
  const BEADS_AWARENESS_MARKER = "Beads is available for task tracking";
  const variantDir = path.join(DOWNLOADS_DIR, "with-beads");
  const files = getMarkdownFiles(variantDir);

  files.forEach((file) => {
    it(`with-beads/${file} should include beads-awareness content`, () => {
      const content = fs.readFileSync(path.join(variantDir, file), "utf8");
      expect(content).toContain(BEADS_AWARENESS_MARKER);
    });
  });
});

describe("without-beads variant should not contain beads references", () => {
  const variantDir = path.join(DOWNLOADS_DIR, "without-beads");
  const files = getMarkdownFiles(variantDir);
  const BEADS_PATTERN = /\bbd\b|beads/i;

  files.forEach((file) => {
    it(`without-beads/${file} should not contain 'bd' or 'beads'`, () => {
      const content = fs.readFileSync(path.join(variantDir, file), "utf8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        expect(
          line,
          `Line ${index + 1} contains beads reference: "${line.trim()}"`,
        ).not.toMatch(BEADS_PATTERN);
      });
    });
  });
});

describe("TDD commands category", () => {
  const TDD_COMMANDS = ["red.md", "green.md", "refactor.md", "spike.md"];
  const EXPECTED_CATEGORY = "Test-Driven Development";

  ["with-beads", "without-beads"].forEach((variant) => {
    it(`${variant} should have TDD commands in "${EXPECTED_CATEGORY}" category`, () => {
      const metadataPath = path.join(
        DOWNLOADS_DIR,
        variant,
        "commands-metadata.json",
      );
      const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

      TDD_COMMANDS.forEach((cmd) => {
        expect(
          metadata[cmd].category,
          `${cmd} should be in "${EXPECTED_CATEGORY}" category`,
        ).toBe(EXPECTED_CATEGORY);
      });
    });
  });
});

describe("allowed-tools should not contain Bash commands", () => {
  const BASH_PATTERN = /Bash\([^)]*\)/;

  ["with-beads", "without-beads"].forEach((variant) => {
    const variantDir = path.join(DOWNLOADS_DIR, variant);
    const files = getMarkdownFiles(variantDir);

    files.forEach((file) => {
      it(`${variant}/${file} allowed-tools should not contain Bash commands`, () => {
        const content = fs.readFileSync(path.join(variantDir, file), "utf8");
        // Extract frontmatter (between --- markers at start of file)
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

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

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
    });
  }
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

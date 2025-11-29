import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const DOWNLOADS_DIR = path.join(PROJECT_ROOT, "downloads");

describe("downloads/with-beads", () => {
  const withBeadsDir = path.join(DOWNLOADS_DIR, "with-beads");

  if (!fs.existsSync(withBeadsDir)) {
    it.skip("with-beads directory does not exist", () => {});
  } else {
    const files = fs.readdirSync(withBeadsDir).filter((f) => f.endsWith(".md"));

    files.forEach((file) => {
      it(`should match snapshot for ${file}`, () => {
        const content = fs.readFileSync(path.join(withBeadsDir, file), "utf8");
        expect(content).toMatchSnapshot();
      });
    });
  }
});

describe("downloads/without-beads", () => {
  const withoutBeadsDir = path.join(DOWNLOADS_DIR, "without-beads");

  if (!fs.existsSync(withoutBeadsDir)) {
    it.skip("without-beads directory does not exist", () => {});
  } else {
    const files = fs
      .readdirSync(withoutBeadsDir)
      .filter((f) => f.endsWith(".md"));

    files.forEach((file) => {
      it(`should match snapshot for ${file}`, () => {
        const content = fs.readFileSync(
          path.join(withoutBeadsDir, file),
          "utf8",
        );
        expect(content).toMatchSnapshot();
      });
    });
  }
});

describe("downloads variants comparison", () => {
  it("should compile all source files to output directory", () => {
    const sourcesDir = path.join(PROJECT_ROOT, "src", "sources");
    const withBeadsDir = path.join(DOWNLOADS_DIR, "with-beads");

    if (fs.existsSync(sourcesDir) && fs.existsSync(withBeadsDir)) {
      const sourceFiles = fs
        .readdirSync(sourcesDir)
        .filter((f) => f.endsWith(".md"));
      const compiledFiles = fs
        .readdirSync(withBeadsDir)
        .filter((f) => f.endsWith(".md"));

      // Every source file should have a corresponding compiled file
      sourceFiles.forEach((sourceFile) => {
        expect(compiledFiles).toContain(sourceFile);
      });

      expect(sourceFiles.length).toBe(compiledFiles.length);
    }
  });

  it("should have same number of files in both variants", () => {
    const withBeadsDir = path.join(DOWNLOADS_DIR, "with-beads");
    const withoutBeadsDir = path.join(DOWNLOADS_DIR, "without-beads");

    if (fs.existsSync(withBeadsDir) && fs.existsSync(withoutBeadsDir)) {
      const withBeadsFiles = fs
        .readdirSync(withBeadsDir)
        .filter((f) => f.endsWith(".md"));
      const withoutBeadsFiles = fs
        .readdirSync(withoutBeadsDir)
        .filter((f) => f.endsWith(".md"));

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

    if (!fs.existsSync(variantDir)) {
      it.skip(`${variant} directory does not exist`, () => {});
    } else {
      const files = fs.readdirSync(variantDir).filter((f) => f.endsWith(".md"));

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

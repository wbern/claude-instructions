#!/usr/bin/env tsx

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Constants
const SRC_DIR = "src/sources";
const OUT_DIR_WITH_BEADS = "downloads/with-beads";
const OUT_DIR_WITHOUT_BEADS = "downloads/without-beads";

function run(cmd: string, options?: { silent?: boolean }): void {
  execSync(cmd, {
    stdio: options?.silent ? "pipe" : "inherit",
    encoding: "utf-8",
  });
}

function listMarkdownFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

function buildVariant(
  variant: string,
  beadsFlag: string,
  outDir: string,
): void {
  console.log("");
  console.log(`🔨 Building variant: ${variant}`);
  console.log(`   📦 Beads integration: ${beadsFlag ? "DISABLED" : "ENABLED"}`);
  console.log("");

  // Ensure output directory exists
  fs.mkdirSync(outDir, { recursive: true });

  // Process source files with markdown-magic, output to variant directory
  console.log("📄 Processing source files...");
  const sourceFiles = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(SRC_DIR, f))
    .join(" ");

  run(
    `tsx scripts/generate-readme.ts ${beadsFlag} --output-dir "${outDir}" ${sourceFiles}`,
  );
  console.log("   ✅ Generated command files");

  // Copy files without markdown-magic blocks
  console.log("📄 Copying files without transforms...");
  for (const file of fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".md"))) {
    const destPath = path.join(outDir, file);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(path.join(SRC_DIR, file), destPath);
    }
  }

  // Remove markdown-magic comment blocks (workaround for markdown-magic bug)
  console.log("🧹 Removing comment blocks...");
  run(`tsx scripts/post-process.ts "${outDir}"`);

  // Fix markdown formatting issues
  console.log("🔧 Fixing markdown formatting...");
  run(`pnpm exec markdownlint --fix "${outDir}"/*.md`, { silent: true });
  console.log("   ✅ Markdown formatting fixed");
  console.log("");
}

console.log("🏗️  Building all variants...");

// Clean previous build
console.log("🧹 Cleaning previous build...");
run("pnpm clean");
console.log("");

// Build with-beads variant
buildVariant("with-beads", "", OUT_DIR_WITH_BEADS);

// Build without-beads variant
buildVariant("without-beads", "--without-beads", OUT_DIR_WITHOUT_BEADS);

// Generate commands metadata for both variants
console.log("📋 Generating commands metadata...");
run(
  `tsx scripts/generate-readme.ts --generate-metadata "${OUT_DIR_WITH_BEADS}/commands-metadata.json"`,
);
run(
  `tsx scripts/generate-readme.ts --generate-metadata "${OUT_DIR_WITHOUT_BEADS}/commands-metadata.json"`,
);

// Generate README
console.log("📖 Updating README.md...");
fs.copyFileSync("src/README.md", "README.md");
run("tsx scripts/generate-readme.ts README.md", { silent: true });
console.log("🧹 Removing comment blocks from README.md...");
run("tsx scripts/post-process.ts README.md");
console.log("🔧 Fixing markdown formatting...");
run("pnpm exec markdownlint --fix README.md", { silent: true });
console.log("   ✅ README.md updated");
console.log("");

// Copy to local .claude/commands for development
console.log("📋 Updating .claude/commands (with-beads variant)...");
fs.mkdirSync(".claude/commands", { recursive: true });
for (const file of fs
  .readdirSync(".claude/commands")
  .filter((f) => f.endsWith(".md"))) {
  fs.unlinkSync(path.join(".claude/commands", file));
}
for (const file of fs
  .readdirSync(OUT_DIR_WITH_BEADS)
  .filter((f) => f.endsWith(".md"))) {
  fs.copyFileSync(
    path.join(OUT_DIR_WITH_BEADS, file),
    path.join(".claude/commands", file),
  );
}
run('pnpm exec markdownlint --fix ".claude/commands"/*.md', { silent: true });
console.log("   ✅ .claude/commands updated");
console.log("");

// Summary
console.log("✅ Build complete!");
console.log("");
console.log("📂 Generated files:");
console.log("");
console.log("   With Beads (downloads/with-beads/):");
for (const file of listMarkdownFiles(OUT_DIR_WITH_BEADS)) {
  console.log(`     ✓ ${file}`);
}
console.log("");
console.log("   Without Beads (downloads/without-beads/):");
for (const file of listMarkdownFiles(OUT_DIR_WITHOUT_BEADS)) {
  console.log(`     ✓ ${file}`);
}
console.log("");
console.log("   Local (.claude/commands/):");
for (const file of listMarkdownFiles(".claude/commands")) {
  console.log(`     ✓ ${file}`);
}

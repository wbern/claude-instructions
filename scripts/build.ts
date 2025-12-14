#!/usr/bin/env tsx

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  processMarkdownFiles,
  writeCommandsMetadata,
} from "./generate-readme.js";
import { getMarkdownFiles } from "./utils.js";

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

async function buildVariant(
  variant: string,
  withBeads: boolean,
  outDir: string,
): Promise<void> {
  console.log("");
  console.log(`🔨 Building variant: ${variant}`);
  console.log(`   📦 Beads integration: ${withBeads ? "ENABLED" : "DISABLED"}`);
  console.log("");

  // Ensure output directory exists
  fs.mkdirSync(outDir, { recursive: true });

  // Process source files with markdown-magic, output to variant directory
  console.log("📄 Processing source files...");
  const sourceFiles = getMarkdownFiles(SRC_DIR).map((f) =>
    path.join(SRC_DIR, f),
  );

  await processMarkdownFiles(sourceFiles, { withBeads, outputDir: outDir });
  console.log("   ✅ Generated command files");

  // Copy files without transforms (plain markdown files)
  console.log("📄 Copying files without transforms...");
  for (const file of getMarkdownFiles(SRC_DIR)) {
    const destPath = path.join(outDir, file);
    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(path.join(SRC_DIR, file), destPath);
    }
  }

  // Fix markdown formatting issues
  console.log("🔧 Fixing markdown formatting...");
  run(`pnpm exec markdownlint --fix "${outDir}"/*.md`, { silent: true });
  console.log("   ✅ Markdown formatting fixed");
  console.log("");
}

async function main(): Promise<void> {
  console.log("🏗️  Building all variants...");

  // Clean previous build
  console.log("🧹 Cleaning previous build...");
  run("pnpm clean");
  console.log("");

  // Build with-beads variant
  await buildVariant("with-beads", true, OUT_DIR_WITH_BEADS);

  // Build without-beads variant
  await buildVariant("without-beads", false, OUT_DIR_WITHOUT_BEADS);

  // Generate commands metadata for both variants
  console.log("📋 Generating commands metadata...");
  writeCommandsMetadata(
    path.join(OUT_DIR_WITH_BEADS, "commands-metadata.json"),
  );
  writeCommandsMetadata(
    path.join(OUT_DIR_WITHOUT_BEADS, "commands-metadata.json"),
  );

  // Generate README
  console.log("📖 Updating README.md...");
  fs.copyFileSync("src/README.md", "README.md");
  await processMarkdownFiles(["README.md"]);
  run("pnpm exec markdownlint --fix README.md", { silent: true });
  console.log("   ✅ README.md updated");
  console.log("");

  // Copy to local .claude/commands for development
  console.log("📋 Updating .claude/commands (with-beads variant)...");
  fs.mkdirSync(".claude/commands", { recursive: true });
  for (const file of getMarkdownFiles(".claude/commands")) {
    fs.unlinkSync(path.join(".claude/commands", file));
  }
  for (const file of getMarkdownFiles(OUT_DIR_WITH_BEADS)) {
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
  for (const file of getMarkdownFiles(OUT_DIR_WITH_BEADS)) {
    console.log(`     ✓ ${file}`);
  }
  console.log("");
  console.log("   Without Beads (downloads/without-beads/):");
  for (const file of getMarkdownFiles(OUT_DIR_WITHOUT_BEADS)) {
    console.log(`     ✓ ${file}`);
  }
  console.log("");
  console.log("   Local (.claude/commands/):");
  for (const file of getMarkdownFiles(".claude/commands")) {
    console.log(`     ✓ ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node

// scripts/cli.ts
import { select as select2 } from "@clack/prompts";

// scripts/cli-generator.ts
import { select } from "@clack/prompts";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var VARIANTS = {
  WITH_BEADS: "with-beads",
  WITHOUT_BEADS: "without-beads"
};
var SCOPES = {
  PROJECT: "project",
  USER: "user"
};
var DIRECTORIES = {
  CLAUDE: ".claude",
  COMMANDS: "commands",
  DOWNLOADS: "downloads"
};
function getDestinationPath(outputPath, scope) {
  if (outputPath) {
    return outputPath;
  }
  if (scope === SCOPES.PROJECT) {
    return path.join(process.cwd(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }
  if (scope === SCOPES.USER) {
    return path.join(os.homedir(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }
  return void 0;
}
async function generateToDirectory(outputPath, variant, scope) {
  const sourcePath = path.join(__dirname, "..", DIRECTORIES.DOWNLOADS, variant || VARIANTS.WITH_BEADS);
  const destinationPath = getDestinationPath(outputPath, scope);
  if (!destinationPath) {
    throw new Error("Either outputPath or scope must be provided");
  }
  await fs.copy(sourcePath, destinationPath, {});
  return {
    success: true,
    filesGenerated: 1,
    variant
  };
}

// scripts/cli.ts
async function main() {
  const variant = await select2({
    message: "Select variant",
    options: [
      { value: VARIANTS.WITH_BEADS, label: "With Beads" },
      { value: VARIANTS.WITHOUT_BEADS, label: "Without Beads" }
    ]
  });
  const scope = await select2({
    message: "Select installation scope",
    options: [
      { value: SCOPES.PROJECT, label: "Project/Repository" },
      { value: SCOPES.USER, label: "User (Global)" }
    ]
  });
  await generateToDirectory(void 0, variant, scope);
}

// scripts/bin.ts
main().catch(console.error);

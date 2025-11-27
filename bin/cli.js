#!/usr/bin/env node

// scripts/cli.ts
import { select, isCancel, intro, outro } from "@clack/prompts";

// scripts/cli-generator.ts
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
var VARIANT_OPTIONS = [
  { value: VARIANTS.WITH_BEADS, label: "With Beads" },
  { value: VARIANTS.WITHOUT_BEADS, label: "Without Beads" }
];
var SCOPE_OPTIONS = [
  { value: SCOPES.PROJECT, label: "Project/Repository" },
  { value: SCOPES.USER, label: "User (Global)" }
];
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
  const files = await fs.readdir(sourcePath);
  await fs.copy(sourcePath, destinationPath, {});
  return {
    success: true,
    filesGenerated: files.length,
    variant
  };
}

// scripts/cli.ts
var BATMAN_LOGO = `
       _==/          i     i          \\==_
     /XX/            |\\___/|            \\XX\\
   /XXXX\\            |XXXXX|            /XXXX\\
  |XXXXXX\\_         _XXXXXXX_         _/XXXXXX|
 XXXXXXXXXXXxxxxxxxXXXXXXXXXXXxxxxxxxXXXXXXXXXXX
|XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
|XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|
 XXXXXX/^^^^"\\XXXXXXXXXXXXXXXXXXXXX/^^^^^\\XXXXXX
  |XXX|       \\XXX/^^\\XXXXX/^^\\XXX/       |XXX|
    \\XX\\       \\X/    \\XXX/    \\X/       /XX/
       "\\       "      \\X/      "       /"

            @wbern/claude-instructions
`;
async function main() {
  intro(BATMAN_LOGO);
  const variant = await select({
    message: "Select variant",
    options: [...VARIANT_OPTIONS]
  });
  if (isCancel(variant)) {
    return;
  }
  const scope = await select({
    message: "Select installation scope",
    options: [...SCOPE_OPTIONS]
  });
  if (isCancel(scope)) {
    return;
  }
  const result = await generateToDirectory(void 0, variant, scope);
  outro(`Installed ${result.filesGenerated} commands to .claude/commands`);
}

// scripts/bin.ts
main().catch(console.error);

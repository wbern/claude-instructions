#!/usr/bin/env node

// scripts/cli.ts
import { select, text, groupMultiselect, isCancel, intro, outro } from "@clack/prompts";
import os2 from "os";

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
var TEMPLATE_SOURCE_FILES = ["CLAUDE.md", "AGENTS.md"];
var ELLIPSIS = "...";
function truncatePathFromLeft(pathStr, maxLength) {
  if (pathStr.length <= maxLength) {
    return pathStr;
  }
  const truncated = pathStr.slice(-(maxLength - ELLIPSIS.length));
  const firstSlash = truncated.indexOf("/");
  if (firstSlash > 0) {
    return ELLIPSIS + truncated.slice(firstSlash);
  }
  return ELLIPSIS + truncated;
}
var VARIANT_OPTIONS = [
  { value: VARIANTS.WITH_BEADS, label: "With Beads", hint: "Includes Beads task tracking" },
  { value: VARIANTS.WITHOUT_BEADS, label: "Without Beads", hint: "Standard commands only" }
];
function getScopeOptions(terminalWidth = 80) {
  const projectPath = path.join(process.cwd(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  const userPath = path.join(os.homedir(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  return [
    { value: SCOPES.PROJECT, label: "Project/Repository", hint: truncatePathFromLeft(projectPath, terminalWidth) },
    { value: SCOPES.USER, label: "User (Global)", hint: truncatePathFromLeft(userPath, terminalWidth) }
  ];
}
async function getCommandsGroupedByCategory(variant) {
  const sourcePath = path.join(__dirname, "..", DIRECTORIES.DOWNLOADS, variant || VARIANTS.WITH_BEADS);
  const metadataPath = path.join(sourcePath, "commands-metadata.json");
  const metadataContent = await fs.readFile(metadataPath, "utf-8");
  const metadata = JSON.parse(metadataContent);
  const grouped = {};
  for (const [filename, data] of Object.entries(metadata)) {
    const category = data.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({
      value: filename,
      label: filename
    });
  }
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => {
      const orderA = metadata[a.value].order;
      const orderB = metadata[b.value].order;
      return orderA - orderB;
    });
  }
  return grouped;
}
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
function extractTemplateBlocks(content) {
  const matchWithCommands = content.match(/<claude-commands-template\s+commands="([^"]+)">([\s\S]*?)<\/claude-commands-template>/);
  if (matchWithCommands) {
    return {
      content: matchWithCommands[2].trim(),
      commands: matchWithCommands[1].split(",").map((c) => c.trim())
    };
  }
  const match = content.match(/<claude-commands-template>([\s\S]*?)<\/claude-commands-template>/);
  if (!match) {
    return null;
  }
  return { content: match[1].trim() };
}
async function generateToDirectory(outputPath, variant, scope, options) {
  const sourcePath = path.join(__dirname, "..", DIRECTORIES.DOWNLOADS, variant || VARIANTS.WITH_BEADS);
  const destinationPath = getDestinationPath(outputPath, scope);
  if (!destinationPath) {
    throw new Error("Either outputPath or scope must be provided");
  }
  const allFiles = await fs.readdir(sourcePath);
  const files = options?.commands ? allFiles.filter((f) => options.commands.includes(f)) : allFiles;
  if (options?.commands) {
    await fs.ensureDir(destinationPath);
    for (const file of files) {
      await fs.copy(path.join(sourcePath, file), path.join(destinationPath, file));
    }
  } else {
    await fs.copy(sourcePath, destinationPath, {});
  }
  if (options?.commandPrefix) {
    for (const file of files) {
      const oldPath = path.join(destinationPath, file);
      const newPath = path.join(destinationPath, options.commandPrefix + file);
      await fs.rename(oldPath, newPath);
    }
  }
  let templateInjected = false;
  if (!options?.skipTemplateInjection) {
    let templateSourcePath = null;
    for (const filename of TEMPLATE_SOURCE_FILES) {
      const candidatePath = path.join(process.cwd(), filename);
      if (await fs.pathExists(candidatePath)) {
        templateSourcePath = candidatePath;
        break;
      }
    }
    if (templateSourcePath) {
      const sourceContent = await fs.readFile(templateSourcePath, "utf-8");
      const template = extractTemplateBlocks(sourceContent);
      if (template) {
        for (const file of files) {
          const commandName = path.basename(file, ".md");
          if (template.commands && !template.commands.includes(commandName)) {
            continue;
          }
          const actualFileName = options?.commandPrefix ? options.commandPrefix + file : file;
          const filePath = path.join(destinationPath, actualFileName);
          const content = await fs.readFile(filePath, "utf-8");
          await fs.writeFile(filePath, content + "\n\n" + template.content);
        }
        templateInjected = true;
      }
    }
  }
  return {
    success: true,
    filesGenerated: files.length,
    variant,
    templateInjectionSkipped: options?.skipTemplateInjection,
    templateInjected
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
async function main(args) {
  intro(BATMAN_LOGO);
  let variant;
  let scope;
  let commandPrefix;
  let selectedCommands;
  if (args?.variant && args?.scope && args?.prefix !== void 0) {
    variant = args.variant;
    scope = args.scope;
    commandPrefix = args.prefix;
    selectedCommands = args.commands;
  } else {
    variant = await select({
      message: "Select variant",
      options: [...VARIANT_OPTIONS]
    });
    if (isCancel(variant)) {
      return;
    }
    const terminalWidth = process.stdout.columns || 80;
    const uiOverhead = 25;
    scope = await select({
      message: "Select installation scope",
      options: getScopeOptions(terminalWidth - uiOverhead)
    });
    if (isCancel(scope)) {
      return;
    }
    commandPrefix = await text({
      message: "Command prefix (optional)",
      placeholder: "e.g. my-"
    });
    if (isCancel(commandPrefix)) {
      return;
    }
    const groupedCommands = await getCommandsGroupedByCategory(variant);
    const allCommandValues = Object.values(groupedCommands).flat().map((cmd) => cmd.value);
    selectedCommands = await groupMultiselect({
      message: "Select commands to install (Enter to accept all)",
      options: groupedCommands,
      initialValues: allCommandValues
    });
    if (isCancel(selectedCommands)) {
      return;
    }
  }
  const result = await generateToDirectory(void 0, variant, scope, { commandPrefix, skipTemplateInjection: args?.skipTemplateInjection, commands: selectedCommands });
  const fullPath = scope === "project" ? `${process.cwd()}/.claude/commands` : `${os2.homedir()}/.claude/commands`;
  outro(`Installed ${result.filesGenerated} commands to ${fullPath}

If Claude Code is already running, restart it to pick up the new commands.

Happy TDD'ing!`);
}

// scripts/bin.ts
var STRING_ARGS = ["variant", "scope", "prefix"];
var ARRAY_ARGS = ["commands"];
var BOOLEAN_FLAGS = [
  { flag: "--skip-template-injection", key: "skipTemplateInjection" }
];
function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    for (const { flag, key } of BOOLEAN_FLAGS) {
      if (arg === flag) {
        args[key] = true;
      }
    }
    for (const key of STRING_ARGS) {
      const prefix = `--${key}=`;
      if (arg.startsWith(prefix)) {
        args[key] = arg.slice(prefix.length);
      }
    }
    for (const key of ARRAY_ARGS) {
      const prefix = `--${key}=`;
      if (arg.startsWith(prefix)) {
        args[key] = arg.slice(prefix.length).split(",");
      }
    }
  }
  return args;
}
async function run(argv) {
  const args = parseArgs(argv);
  await main(args);
}
run(process.argv.slice(2)).catch(console.error);
export {
  parseArgs,
  run
};

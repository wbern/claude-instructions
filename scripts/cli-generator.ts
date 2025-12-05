import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VARIANTS = {
  WITH_BEADS: "with-beads",
  WITHOUT_BEADS: "without-beads",
} as const;

export const SCOPES = {
  PROJECT: "project",
  USER: "user",
} as const;

export const DIRECTORIES = {
  CLAUDE: ".claude",
  COMMANDS: "commands",
  DOWNLOADS: "downloads",
} as const;

export const TEMPLATE_SOURCE_FILES = ["CLAUDE.md", "AGENTS.md"] as const;

export interface TemplateBlock {
  content: string;
  commands?: string[];
}

export type Variant = (typeof VARIANTS)[keyof typeof VARIANTS];
export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

const ELLIPSIS = "...";

function truncatePathFromLeft(pathStr: string, maxLength: number): string {
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

export const VARIANT_OPTIONS = [
  {
    value: VARIANTS.WITH_BEADS,
    label: "With Beads",
    hint: "Includes Beads task tracking",
  },
  {
    value: VARIANTS.WITHOUT_BEADS,
    label: "Without Beads",
    hint: "Standard commands only",
  },
] as const;

export function getScopeOptions(terminalWidth: number = 80) {
  const projectPath = path.join(
    process.cwd(),
    DIRECTORIES.CLAUDE,
    DIRECTORIES.COMMANDS,
  );
  const userPath = path.join(
    os.homedir(),
    DIRECTORIES.CLAUDE,
    DIRECTORIES.COMMANDS,
  );

  return [
    {
      value: SCOPES.PROJECT,
      label: "Project/Repository",
      hint: truncatePathFromLeft(projectPath, terminalWidth),
    },
    {
      value: SCOPES.USER,
      label: "User (Global)",
      hint: truncatePathFromLeft(userPath, terminalWidth),
    },
  ];
}

export interface GenerateOptions {
  skipTemplateInjection?: boolean;
  commandPrefix?: string;
  commands?: string[];
  skipFiles?: string[];
}

export interface FileConflict {
  filename: string;
  existingContent: string;
  newContent: string;
}

export interface ExistingFile {
  filename: string;
  existingContent: string;
  newContent: string;
  isIdentical: boolean;
}

export async function checkExistingFiles(
  outputPath: string | undefined,
  variant: Variant | undefined,
  scope?: Scope,
  options?: GenerateOptions,
): Promise<ExistingFile[]> {
  const sourcePath = path.join(
    __dirname,
    "..",
    DIRECTORIES.DOWNLOADS,
    variant || VARIANTS.WITH_BEADS,
  );
  const destinationPath = outputPath || getDestinationPath(outputPath, scope);

  if (!destinationPath) {
    return [];
  }

  const files = await fs.readdir(sourcePath);
  const existingFiles: ExistingFile[] = [];
  const prefix = options?.commandPrefix || "";

  for (const file of files) {
    const destFileName = prefix + file;
    const destFilePath = path.join(destinationPath, destFileName);
    const sourceFilePath = path.join(sourcePath, file);

    if (await fs.pathExists(destFilePath)) {
      const existingContent = await fs.readFile(destFilePath, "utf-8");
      const newContent = await fs.readFile(sourceFilePath, "utf-8");

      existingFiles.push({
        filename: destFileName,
        existingContent,
        newContent,
        isIdentical: existingContent === newContent,
      });
    }
  }

  return existingFiles;
}

export async function checkForConflicts(
  outputPath: string | undefined,
  variant: Variant | undefined,
  scope?: Scope,
  options?: GenerateOptions,
): Promise<FileConflict[]> {
  const existingFiles = await checkExistingFiles(
    outputPath,
    variant,
    scope,
    options,
  );
  return existingFiles
    .filter((file) => !file.isIdentical)
    .map(({ filename, existingContent, newContent }) => ({
      filename,
      existingContent,
      newContent,
    }));
}

export interface GenerateResult {
  success: boolean;
  filesGenerated: number;
  variant?: Variant;
  templateInjectionSkipped?: boolean;
  templateInjected?: boolean;
}

export async function getAvailableCommands(
  variant: Variant,
): Promise<string[]> {
  const sourcePath = path.join(
    __dirname,
    "..",
    DIRECTORIES.DOWNLOADS,
    variant || VARIANTS.WITH_BEADS,
  );
  return fs.readdir(sourcePath);
}

interface CommandOption {
  value: string;
  label: string;
  hint?: string;
  selectedByDefault?: boolean;
}

interface CommandMetadata {
  description: string;
  hint?: string;
  category: string;
  order: number;
  selectedByDefault?: boolean;
}

// Categories in display order (unlisted categories appear at the end alphabetically)
const CATEGORY_ORDER = [
  "Test-Driven Development",
  "Planning",
  "Workflow",
  "Worktree Management",
  "Utilities",
  "Ship / Show / Ask",
];

export async function getCommandsGroupedByCategory(
  variant: Variant,
): Promise<Record<string, CommandOption[]>> {
  const sourcePath = path.join(
    __dirname,
    "..",
    DIRECTORIES.DOWNLOADS,
    variant || VARIANTS.WITH_BEADS,
  );
  const metadataPath = path.join(sourcePath, "commands-metadata.json");

  const metadataContent = await fs.readFile(metadataPath, "utf-8");
  const metadata: Record<string, CommandMetadata> = JSON.parse(metadataContent);

  const grouped: Record<string, CommandOption[]> = {};

  for (const [filename, data] of Object.entries(metadata)) {
    const category = data.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({
      value: filename,
      label: filename,
      hint: data.hint,
      selectedByDefault: data.selectedByDefault !== false,
    });
  }

  // Sort commands within each category by order
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => {
      const orderA = metadata[a.value].order;
      const orderB = metadata[b.value].order;
      return orderA - orderB;
    });
  }

  // Sort categories by CATEGORY_ORDER (unlisted categories at end, alphabetically)
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    // Both in order list: sort by position
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // Only a in order list: a comes first
    if (indexA !== -1) return -1;
    // Only b in order list: b comes first
    if (indexB !== -1) return 1;
    // Neither in order list: alphabetical
    return a.localeCompare(b);
  });

  const sortedGrouped: Record<string, CommandOption[]> = {};
  for (const category of sortedCategories) {
    sortedGrouped[category] = grouped[category];
  }

  return sortedGrouped;
}

function getDestinationPath(
  outputPath: string | undefined,
  scope: string | undefined,
): string | undefined {
  if (outputPath) {
    return outputPath;
  }

  if (scope === SCOPES.PROJECT) {
    return path.join(process.cwd(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }

  if (scope === SCOPES.USER) {
    return path.join(os.homedir(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }

  return undefined;
}

export function extractTemplateBlocks(content: string): TemplateBlock[] {
  const blocks: TemplateBlock[] = [];

  // Match templates with commands attribute
  const withCommandsRegex =
    /<claude-commands-template\s+commands="([^"]+)">([\s\S]*?)<\/claude-commands-template>/g;
  for (const match of content.matchAll(withCommandsRegex)) {
    blocks.push({
      content: match[2].trim(),
      commands: match[1].split(",").map((c) => c.trim()),
    });
  }

  // Match templates without commands attribute
  const withoutCommandsRegex =
    /<claude-commands-template>([\s\S]*?)<\/claude-commands-template>/g;
  for (const match of content.matchAll(withoutCommandsRegex)) {
    blocks.push({
      content: match[1].trim(),
    });
  }

  return blocks;
}

export async function generateToDirectory(
  outputPath?: string,
  variant?: Variant,
  scope?: Scope,
  options?: GenerateOptions,
): Promise<GenerateResult> {
  const sourcePath = path.join(
    __dirname,
    "..",
    DIRECTORIES.DOWNLOADS,
    variant || VARIANTS.WITH_BEADS,
  );

  const destinationPath = getDestinationPath(outputPath, scope);

  if (!destinationPath) {
    throw new Error("Either outputPath or scope must be provided");
  }

  const allFiles = await fs.readdir(sourcePath);
  let files = options?.commands
    ? allFiles.filter((f) => options.commands!.includes(f))
    : allFiles;

  if (options?.skipFiles) {
    files = files.filter((f) => !options.skipFiles!.includes(f));
  }

  if (options?.commands || options?.skipFiles) {
    await fs.ensureDir(destinationPath);
    for (const file of files) {
      await fs.copy(
        path.join(sourcePath, file),
        path.join(destinationPath, file),
      );
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
    let templateSourcePath: string | null = null;
    for (const filename of TEMPLATE_SOURCE_FILES) {
      const candidatePath = path.join(process.cwd(), filename);
      if (await fs.pathExists(candidatePath)) {
        templateSourcePath = candidatePath;
        break;
      }
    }

    if (templateSourcePath) {
      const sourceContent = await fs.readFile(templateSourcePath, "utf-8");
      const templates = extractTemplateBlocks(sourceContent);
      if (templates.length > 0) {
        for (const file of files) {
          const commandName = path.basename(file, ".md");
          const actualFileName = options?.commandPrefix
            ? options.commandPrefix + file
            : file;
          const filePath = path.join(destinationPath, actualFileName);
          let content = await fs.readFile(filePath, "utf-8");
          let modified = false;
          for (const template of templates) {
            if (template.commands && !template.commands.includes(commandName)) {
              continue;
            }
            content = content + "\n\n" + template.content;
            modified = true;
          }
          if (modified) {
            await fs.writeFile(filePath, content);
          }
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
    templateInjected,
  };
}

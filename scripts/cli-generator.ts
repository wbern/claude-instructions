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

/** Frontmatter key for tools requested by a command */
export const REQUESTED_TOOLS_KEY = "_requested-tools" as const;

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
  allowedTools?: string[];
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

  const allFiles = await fs.readdir(sourcePath);
  const files = options?.commands
    ? allFiles.filter((f) => options.commands!.includes(f))
    : allFiles;
  const existingFiles: ExistingFile[] = [];
  const prefix = options?.commandPrefix || "";

  let metadata: Record<string, CommandMetadata> | null = null;
  let allowedToolsSet: Set<string> | null = null;

  if (options?.allowedTools && options.allowedTools.length > 0) {
    metadata = await loadCommandsMetadata(variant || VARIANTS.WITH_BEADS);
    allowedToolsSet = new Set(options.allowedTools);
  }

  for (const file of files) {
    const destFileName = prefix + file;
    const destFilePath = path.join(destinationPath, destFileName);
    const sourceFilePath = path.join(sourcePath, file);

    if (await fs.pathExists(destFilePath)) {
      const existingContent = await fs.readFile(destFilePath, "utf-8");
      let newContent = await fs.readFile(sourceFilePath, "utf-8");

      if (metadata && allowedToolsSet) {
        const commandMetadata = metadata[file];
        const requestedTools = commandMetadata?.[REQUESTED_TOOLS_KEY] || [];
        const toolsForCommand = requestedTools.filter((tool: string) =>
          allowedToolsSet!.has(tool),
        );

        if (toolsForCommand.length > 0) {
          const allowedToolsYaml = `allowed-tools: ${toolsForCommand.join(", ")}`;
          newContent = newContent.replace(
            /^---\n/,
            `---\n${allowedToolsYaml}\n`,
          );
        }
      }

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
  "_requested-tools"?: string[];
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

async function loadCommandsMetadata(
  variant: Variant,
): Promise<Record<string, CommandMetadata>> {
  const sourcePath = path.join(
    __dirname,
    "..",
    DIRECTORIES.DOWNLOADS,
    variant || VARIANTS.WITH_BEADS,
  );
  const metadataPath = path.join(sourcePath, "commands-metadata.json");

  const metadataContent = await fs.readFile(metadataPath, "utf-8");
  return JSON.parse(metadataContent);
}

export async function getCommandsGroupedByCategory(
  variant: Variant,
): Promise<Record<string, CommandOption[]>> {
  const metadata = await loadCommandsMetadata(variant);

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

  // Validate all categories are in CATEGORY_ORDER
  for (const category of Object.keys(grouped)) {
    if (!CATEGORY_ORDER.includes(category)) {
      throw new Error(`Unknown category: ${category}`);
    }
  }

  // Sort commands within each category by order
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => {
      const orderA = metadata[a.value].order;
      const orderB = metadata[b.value].order;
      return orderA - orderB;
    });
  }

  // Sort categories by CATEGORY_ORDER
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    return CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b);
  });

  const sortedGrouped: Record<string, CommandOption[]> = {};
  for (const category of sortedCategories) {
    sortedGrouped[category] = grouped[category];
  }

  return sortedGrouped;
}

interface RequestedToolOption {
  value: string;
  label: string;
  hint: string;
}

function extractLabelFromTool(tool: string): string {
  const match = tool.match(/^Bash\(([^:]+):/);
  return match ? match[1] : tool;
}

function formatCommandsHint(commands: string[]): string {
  if (commands.length <= 2) {
    return commands.map((c) => `/${c}`).join(", ");
  }
  const first = commands.slice(0, 2).map((c) => `/${c}`);
  const remaining = commands.length - 2;
  return `${first.join(", ")}, and ${remaining} ${remaining === 1 ? "other" : "others"}`;
}

export async function getRequestedToolsOptions(
  variant: Variant,
): Promise<RequestedToolOption[]> {
  const metadata = await loadCommandsMetadata(variant);

  const toolToCommands = new Map<string, string[]>();
  for (const [filename, data] of Object.entries(metadata)) {
    if (data[REQUESTED_TOOLS_KEY]) {
      const commandName = filename.replace(/\.md$/, "");
      for (const tool of data[REQUESTED_TOOLS_KEY]) {
        const commands = toolToCommands.get(tool) || [];
        commands.push(commandName);
        toolToCommands.set(tool, commands);
      }
    }
  }

  return Array.from(toolToCommands.entries()).map(([tool, commands]) => ({
    value: tool,
    label: extractLabelFromTool(tool),
    hint: formatCommandsHint(commands),
  }));
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
    const prefix = options?.commandPrefix || "";
    files = files.filter((f) => !options.skipFiles!.includes(prefix + f));
  }

  const prefix = options?.commandPrefix || "";

  if (options?.commands || options?.skipFiles || options?.commandPrefix) {
    await fs.ensureDir(destinationPath);
    for (const file of files) {
      await fs.copy(
        path.join(sourcePath, file),
        path.join(destinationPath, prefix + file),
      );
    }
  } else {
    await fs.copy(sourcePath, destinationPath, {});
  }

  if (options?.allowedTools && options.allowedTools.length > 0) {
    const metadata = await loadCommandsMetadata(variant || VARIANTS.WITH_BEADS);
    const allowedToolsSet = new Set(options.allowedTools);

    for (const file of files) {
      const commandMetadata = metadata[file];
      const requestedTools = commandMetadata?.[REQUESTED_TOOLS_KEY] || [];

      // Only inject tools that this command requested AND user selected
      const toolsForCommand = requestedTools.filter((tool: string) =>
        allowedToolsSet.has(tool),
      );

      if (toolsForCommand.length > 0) {
        const filePath = path.join(destinationPath, prefix + file);
        const content = await fs.readFile(filePath, "utf-8");
        const allowedToolsYaml = `allowed-tools: ${toolsForCommand.join(", ")}`;
        const modifiedContent = content.replace(
          /^---\n/,
          `---\n${allowedToolsYaml}\n`,
        );
        await fs.writeFile(filePath, modifiedContent);
      }
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

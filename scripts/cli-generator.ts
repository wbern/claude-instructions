import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { applyFixes } from "markdownlint";
import { lint } from "markdownlint/sync";
import { expandContent } from "./fragment-expander.js";
import { generateCommandsMetadata } from "./generate-readme.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SCOPES = {
  PROJECT: "project",
  USER: "user",
} as const;

export const DIRECTORIES = {
  CLAUDE: ".claude",
  COMMANDS: "commands",
  SOURCES: "src/sources",
} as const;

export const TEMPLATE_SOURCE_FILES = ["CLAUDE.md", "AGENTS.md"] as const;

/** Frontmatter key for tools requested by a command */
export const REQUESTED_TOOLS_KEY = "_requested-tools" as const;

export interface TemplateBlock {
  content: string;
  commands?: string[];
}

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

const ELLIPSIS = "...";

/**
 * Check if a file is a valid source file for generation.
 * Excludes underscore-prefixed "contributor" files unless explicitly included.
 */
function isSourceFile(
  filename: string,
  includeContribCommands?: boolean,
): boolean {
  return (
    filename.endsWith(".md") &&
    (includeContribCommands || !filename.startsWith("_"))
  );
}

/**
 * Strip the underscore prefix from contributor command filenames.
 * e.g., "_contribute-a-command.md" -> "contribute-a-command.md"
 */
function stripContribPrefix(filename: string): string {
  return filename.startsWith("_") ? filename.slice(1) : filename;
}

/**
 * Get all source files from the sources directory.
 */
async function getSourceFiles(
  includeContribCommands?: boolean,
): Promise<string[]> {
  const sourcePath = path.join(__dirname, "..", DIRECTORIES.SOURCES);
  return (await fs.readdir(sourcePath)).filter((f) =>
    isSourceFile(f, includeContribCommands),
  );
}

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

export const FLAG_OPTIONS = [
  {
    value: "beads",
    label: "Beads MCP",
    hint: "Local issue tracking",
    category: "Feature Flags",
  },
  {
    value: "no-plan-files",
    label: "No Plan Files",
    hint: "Forbid Claude Code's internal plan.md",
    category: "Feature Flags",
  },
  {
    value: "gh-cli",
    label: "GitHub CLI",
    hint: "Use gh CLI instead of GitHub MCP",
    category: "Feature Flags",
  },
  {
    value: "gh-mcp",
    label: "GitHub MCP",
    hint: "Use GitHub MCP only (no CLI fallback)",
    category: "Feature Flags",
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
  flags?: string[];
  includeContribCommands?: boolean;
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
  scope?: Scope,
  options?: GenerateOptions,
): Promise<ExistingFile[]> {
  const sourcePath = path.join(__dirname, "..", DIRECTORIES.SOURCES);
  const destinationPath = getDestinationPath(outputPath, scope);
  const flags = options?.flags ?? [];

  const allFiles = await getSourceFiles(options?.includeContribCommands);
  const files = options?.commands
    ? allFiles.filter((f) => options.commands!.includes(f))
    : allFiles;
  const existingFiles: ExistingFile[] = [];
  const prefix = options?.commandPrefix || "";

  let metadata: Record<string, CommandMetadata> | null = null;
  let allowedToolsSet: Set<string> | null = null;

  if (options?.allowedTools && options.allowedTools.length > 0) {
    metadata = await loadCommandsMetadata();
    allowedToolsSet = new Set(options.allowedTools);
  }

  const baseDir = path.join(__dirname, "..");

  for (const file of files) {
    const outputFileName = stripContribPrefix(file);
    const destFileName = prefix + outputFileName;
    const destFilePath = path.join(destinationPath, destFileName);
    const sourceFilePath = path.join(sourcePath, file);

    if (await fs.pathExists(destFilePath)) {
      const existingContent = await fs.readFile(destFilePath, "utf-8");
      // Expand source content with flags, strip internal metadata, apply markdown fixes
      const sourceContent = await fs.readFile(sourceFilePath, "utf-8");
      let newContent = applyMarkdownFixes(
        stripInternalMetadata(
          expandContent(sourceContent, {
            flags,
            baseDir,
          }),
        ),
      );

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
  scope?: Scope,
  options?: GenerateOptions,
): Promise<FileConflict[]> {
  const existingFiles = await checkExistingFiles(outputPath, scope, options);
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
  templateInjectionSkipped?: boolean;
  templateInjected?: boolean;
  flags?: string[];
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

async function loadCommandsMetadata(): Promise<
  Record<string, CommandMetadata>
> {
  return generateCommandsMetadata();
}

export async function getCommandsGroupedByCategory(): Promise<
  Record<string, CommandOption[]>
> {
  const metadata = await loadCommandsMetadata();

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

function formatCommandsHint(commands: string[]): string {
  if (commands.length <= 2) {
    return commands.map((c) => `/${c}`).join(", ");
  }
  const first = commands.slice(0, 2).map((c) => `/${c}`);
  const remaining = commands.length - 2;
  return `${first.join(", ")}, and ${remaining} ${remaining === 1 ? "other" : "others"}`;
}

export async function getRequestedToolsOptions(): Promise<
  RequestedToolOption[]
> {
  const metadata = await loadCommandsMetadata();

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
    label: tool,
    hint: formatCommandsHint(commands),
  }));
}

function getDestinationPath(
  outputPath: string | undefined,
  scope: string | undefined,
): string {
  if (outputPath) {
    return outputPath;
  }

  if (scope === SCOPES.PROJECT) {
    return path.join(process.cwd(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }

  if (scope === SCOPES.USER) {
    return path.join(os.homedir(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }

  throw new Error("Either outputPath or scope must be provided");
}

/**
 * Strips underscore-prefixed metadata from YAML frontmatter.
 * These are internal properties (e.g., _hint, _category, _order, _requested-tools)
 * that should not appear in generated output.
 */
export function stripInternalMetadata(content: string): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return content;
  }

  const frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split("\n");
  const filteredLines: string[] = [];
  let skipMultiline = false;

  for (const line of lines) {
    // Check if this is a top-level underscore property (includes hyphens like _requested-tools)
    if (/^_[\w-]+:/.test(line)) {
      // Check if it's a multiline value (ends with nothing after colon or has array indicator)
      skipMultiline = line.endsWith(":") || /^_[\w-]+:\s*$/.test(line);
      continue;
    }

    // Skip continuation lines of multiline values (indented lines)
    if (skipMultiline && /^\s+/.test(line)) {
      continue;
    }

    skipMultiline = false;
    filteredLines.push(line);
  }

  const newFrontmatter = filteredLines.join("\n");
  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);
}

/**
 * Applies markdownlint fixes to content.
 * Lints the content and applies all available auto-fixes.
 */
export function applyMarkdownFixes(content: string): string {
  const results = lint({
    strings: { content },
  });
  // markdownlint always returns the key we pass in strings
  return applyFixes(content, results.content);
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
  scope?: Scope,
  options?: GenerateOptions,
): Promise<GenerateResult> {
  const destinationPath = getDestinationPath(outputPath, scope);
  const sourcePath = path.join(__dirname, "..", DIRECTORIES.SOURCES);
  const flags = options?.flags ?? [];

  const allFiles = await getSourceFiles(options?.includeContribCommands);
  let files = options?.commands
    ? allFiles.filter((f) => options.commands!.includes(f))
    : allFiles;

  if (options?.skipFiles) {
    const prefix = options?.commandPrefix || "";
    files = files.filter((f) => !options.skipFiles!.includes(prefix + f));
  }

  const prefix = options?.commandPrefix || "";

  // Read source, expand with flags, strip internal metadata, fix lists, write to destination
  await fs.ensureDir(destinationPath);
  const baseDir = path.join(__dirname, "..");
  for (const file of files) {
    const sourceFilePath = path.join(sourcePath, file);
    const sourceContent = await fs.readFile(sourceFilePath, "utf-8");
    const expandedContent = expandContent(sourceContent, {
      flags,
      baseDir,
    });
    const cleanedContent = applyMarkdownFixes(
      stripInternalMetadata(expandedContent),
    );
    const outputFileName = stripContribPrefix(file);
    await fs.writeFile(
      path.join(destinationPath, prefix + outputFileName),
      cleanedContent,
    );
  }

  if (options?.allowedTools && options.allowedTools.length > 0) {
    const metadata = await loadCommandsMetadata();
    const allowedToolsSet = new Set(options.allowedTools);

    for (const file of files) {
      const commandMetadata = metadata[file];
      const requestedTools = commandMetadata?.[REQUESTED_TOOLS_KEY] || [];

      // Only inject tools that this command requested AND user selected
      const toolsForCommand = requestedTools.filter((tool: string) =>
        allowedToolsSet.has(tool),
      );

      if (toolsForCommand.length > 0) {
        const outputFileName = stripContribPrefix(file);
        const filePath = path.join(destinationPath, prefix + outputFileName);
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

  // Skip template injection for user scope to prevent project-specific
  // instructions from leaking into user-global commands
  if (!options?.skipTemplateInjection && scope !== SCOPES.USER) {
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
          const outputFileName = stripContribPrefix(file);
          const commandName = path.basename(outputFileName, ".md");
          const actualFileName = options?.commandPrefix
            ? options.commandPrefix + outputFileName
            : outputFileName;
          const filePath = path.join(destinationPath, actualFileName);
          let content = await fs.readFile(filePath, "utf-8");
          let modified = false;
          for (const template of templates) {
            if (template.commands && !template.commands.includes(commandName)) {
              continue;
            }
            content = `${content}\n\n${template.content}`;
            modified = true;
          }
          if (modified) {
            await fs.writeFile(filePath, applyMarkdownFixes(content));
          }
        }
        templateInjected = true;
      }
    }
  }

  return {
    success: true,
    filesGenerated: files.length,
    templateInjectionSkipped: options?.skipTemplateInjection,
    templateInjected,
    flags: options?.flags,
  };
}

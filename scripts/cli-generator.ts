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

export const AGENTS = {
  CLAUDE: "claude",
  OPENCODE: "opencode",
  BOTH: "both",
} as const;

export type Agent = (typeof AGENTS)[keyof typeof AGENTS];

export const DIRECTORIES = {
  CLAUDE: ".claude",
  OPENCODE: ".opencode",
  COMMANDS: "commands",
  SKILLS: "skills",
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

export function getScopeOptions(
  terminalWidth: number = 80,
  agent: Agent = AGENTS.OPENCODE,
) {
  const agentDir =
    agent === AGENTS.CLAUDE ? DIRECTORIES.CLAUDE : DIRECTORIES.OPENCODE;
  const userConfigDir =
    agent === AGENTS.CLAUDE
      ? path.join(os.homedir(), DIRECTORIES.CLAUDE)
      : path.join(os.homedir(), ".config", "opencode");

  const projectPath = path.join(process.cwd(), agentDir, DIRECTORIES.COMMANDS);
  const userPath = path.join(userConfigDir, DIRECTORIES.COMMANDS);

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
  agent?: Agent;
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
  const destinationPath = getDestinationPath(outputPath, scope, options?.agent);
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

  const templates = await loadTemplateBlocks(
    scope,
    options?.skipTemplateInjection,
  );

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

      if (templates.length > 0) {
        const commandName = path.basename(outputFileName, ".md");
        newContent = applyTemplateBlocks(newContent, commandName, templates);
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
  agent: Agent = AGENTS.OPENCODE,
): string {
  if (outputPath) {
    return outputPath;
  }

  if (scope === SCOPES.PROJECT) {
    const agentDir =
      agent === AGENTS.CLAUDE ? DIRECTORIES.CLAUDE : DIRECTORIES.OPENCODE;
    return path.join(process.cwd(), agentDir, DIRECTORIES.COMMANDS);
  }

  if (scope === SCOPES.USER) {
    if (agent === AGENTS.CLAUDE) {
      return path.join(os.homedir(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
    }
    // OpenCode user-level: ~/.config/opencode/commands/
    return path.join(os.homedir(), ".config", "opencode", DIRECTORIES.COMMANDS);
  }

  throw new Error("Either outputPath or scope must be provided");
}

/**
 * Get the skills output path for the given scope and agent.
 */
export function getSkillsPath(
  scope: string,
  agent: Agent = AGENTS.OPENCODE,
): string {
  if (scope === SCOPES.PROJECT) {
    const agentDir =
      agent === AGENTS.CLAUDE ? DIRECTORIES.CLAUDE : DIRECTORIES.OPENCODE;
    return path.join(process.cwd(), agentDir, DIRECTORIES.SKILLS);
  }
  if (agent === AGENTS.CLAUDE) {
    return path.join(os.homedir(), DIRECTORIES.CLAUDE, DIRECTORIES.SKILLS);
  }
  // OpenCode user-level: ~/.config/opencode/skills/
  return path.join(os.homedir(), ".config", "opencode", DIRECTORIES.SKILLS);
}

/**
 * Claude Code frontmatter keys not supported by OpenCode.
 * These are stripped when generating for OpenCode targets.
 */
const CLAUDE_ONLY_FRONTMATTER_KEYS = ["allowed-tools"] as const;

/**
 * Parse and transform frontmatter lines, returning the modified content.
 * Returns the original content unchanged if no frontmatter is present.
 */
function transformFrontmatter(
  content: string,
  transformLines: (lines: string[]) => string[],
): string {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return content;
  }
  const lines = frontmatterMatch[1].split("\n");
  const newFrontmatter = transformLines(lines).join("\n");
  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);
}

/**
 * Strip frontmatter keys matching a predicate, including multiline values.
 */
function stripFrontmatterKeys(
  content: string,
  isTargetKey: (line: string) => boolean,
): string {
  return transformFrontmatter(content, (lines) => {
    const filteredLines: string[] = [];
    let skipMultiline = false;

    for (const line of lines) {
      if (isTargetKey(line)) {
        skipMultiline = line.endsWith(":") || /:\s*$/.test(line);
        continue;
      }

      if (skipMultiline && /^\s+/.test(line)) {
        continue;
      }

      skipMultiline = false;
      filteredLines.push(line);
    }

    return filteredLines;
  });
}

/**
 * Strip Claude Code-specific frontmatter keys for OpenCode compatibility.
 * OpenCode supports: description, agent, model, subtask.
 * Claude Code-only keys (e.g. allowed-tools) are removed.
 */
export function stripClaudeOnlyFrontmatter(content: string): string {
  return stripFrontmatterKeys(content, (line) =>
    CLAUDE_ONLY_FRONTMATTER_KEYS.some((key) => line.startsWith(`${key}:`)),
  );
}

/**
 * Strips underscore-prefixed metadata from YAML frontmatter.
 * These are internal properties (e.g., _hint, _category, _order, _requested-tools)
 * that should not appear in generated output.
 */
export function stripInternalMetadata(content: string): string {
  return stripFrontmatterKeys(content, (line) => /^_[\w-]+:/.test(line));
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

  const tagPattern = "(?:claude|agent)-commands-template";

  // Match templates with commands attribute
  const withCommandsRegex = new RegExp(
    `<${tagPattern}\\s+commands="([^"]+)">([\\s\\S]*?)<\\/${tagPattern}>`,
    "g",
  );
  for (const match of content.matchAll(withCommandsRegex)) {
    blocks.push({
      content: match[2].trim(),
      commands: match[1].split(",").map((c) => c.trim()),
    });
  }

  // Match templates without commands attribute
  const withoutCommandsRegex = new RegExp(
    `<${tagPattern}>([\\s\\S]*?)<\\/${tagPattern}>`,
    "g",
  );
  for (const match of content.matchAll(withoutCommandsRegex)) {
    blocks.push({
      content: match[1].trim(),
    });
  }

  return blocks;
}

/**
 * Load template blocks from CLAUDE.md or AGENTS.md in the current working directory.
 * Returns empty array for user scope to prevent project-specific instructions from leaking.
 */
async function loadTemplateBlocks(
  scope?: Scope | string,
  skipTemplateInjection?: boolean,
): Promise<TemplateBlock[]> {
  if (skipTemplateInjection || scope === SCOPES.USER) {
    return [];
  }
  for (const filename of TEMPLATE_SOURCE_FILES) {
    const candidatePath = path.join(process.cwd(), filename);
    if (await fs.pathExists(candidatePath)) {
      const content = await fs.readFile(candidatePath, "utf-8");
      return extractTemplateBlocks(content);
    }
  }
  return [];
}

/**
 * Apply matching template blocks to command content, filtering by command name.
 * Returns the content with markdown fixes applied if any templates matched.
 */
function applyTemplateBlocks(
  content: string,
  commandName: string,
  templates: TemplateBlock[],
): string {
  let result = content;
  let modified = false;
  for (const template of templates) {
    if (template.commands && !template.commands.includes(commandName)) {
      continue;
    }
    result = `${result}\n\n${template.content}`;
    modified = true;
  }
  return modified ? applyMarkdownFixes(result) : result;
}

export async function generateToDirectory(
  outputPath?: string,
  scope?: Scope,
  options?: GenerateOptions,
): Promise<GenerateResult> {
  const destinationPath = getDestinationPath(outputPath, scope, options?.agent);
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
  const targetAgent = options?.agent ?? AGENTS.OPENCODE;
  for (const file of files) {
    const sourceFilePath = path.join(sourcePath, file);
    const sourceContent = await fs.readFile(sourceFilePath, "utf-8");
    const expandedContent = expandContent(sourceContent, {
      flags,
      baseDir,
    });
    let processedContent = stripInternalMetadata(expandedContent);
    // Strip Claude Code-specific frontmatter when generating for OpenCode
    if (targetAgent !== AGENTS.CLAUDE) {
      processedContent = stripClaudeOnlyFrontmatter(processedContent);
    }
    const cleanedContent = applyMarkdownFixes(processedContent);
    const outputFileName = stripContribPrefix(file);
    await fs.writeFile(
      path.join(destinationPath, prefix + outputFileName),
      cleanedContent,
    );
  }

  // allowed-tools is a Claude Code-specific frontmatter feature; skip for OpenCode
  if (
    options?.allowedTools &&
    options.allowedTools.length > 0 &&
    targetAgent === AGENTS.CLAUDE
  ) {
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

  const templates = await loadTemplateBlocks(
    scope,
    options?.skipTemplateInjection,
  );
  let templateInjected = false;

  if (templates.length > 0) {
    for (const file of files) {
      const outputFileName = stripContribPrefix(file);
      const commandName = path.basename(outputFileName, ".md");
      const actualFileName = options?.commandPrefix
        ? options.commandPrefix + outputFileName
        : outputFileName;
      const filePath = path.join(destinationPath, actualFileName);
      const content = await fs.readFile(filePath, "utf-8");
      const result = applyTemplateBlocks(content, commandName, templates);
      if (result !== content) {
        await fs.writeFile(filePath, result);
      }
    }
    templateInjected = true;
  }

  return {
    success: true,
    filesGenerated: files.length,
    templateInjectionSkipped: options?.skipTemplateInjection,
    templateInjected,
    flags: options?.flags,
  };
}

export interface GenerateSkillsOptions {
  flags?: string[];
}

export interface GenerateSkillsResult {
  success: boolean;
  skillsGenerated: number;
}

/**
 * Generates skills to .claude/skills/{skill-name}/SKILL.md format.
 * Skills use the Agent Skills standard with name and description in frontmatter.
 */
export async function generateSkillsToDirectory(
  outputPath: string,
  skills: string[],
  options?: GenerateSkillsOptions,
): Promise<GenerateSkillsResult> {
  const sourcePath = path.join(__dirname, "..", DIRECTORIES.SOURCES);
  const flags = options?.flags ?? [];
  const baseDir = path.join(__dirname, "..");

  await fs.ensureDir(outputPath);

  for (const skill of skills) {
    const sourceFilePath = path.join(sourcePath, skill);
    const sourceContent = await fs.readFile(sourceFilePath, "utf-8");

    // Expand fragments and strip internal metadata
    const expandedContent = expandContent(sourceContent, {
      flags,
      baseDir,
    });
    const cleanedContent = stripInternalMetadata(expandedContent);

    // Extract description from existing frontmatter
    const frontmatterMatch = cleanedContent.match(/^---\n([\s\S]*?)\n---/);
    let description = "";
    let bodyContent = cleanedContent;

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const descMatch = frontmatter.match(/^description:\s*(.*)$/m);
      if (descMatch) {
        description = descMatch[1];
      }
      // Remove old frontmatter from body
      bodyContent = cleanedContent.replace(/^---\n[\s\S]*?\n---\n*/, "");
    }

    // Skill name is the filename without .md
    const skillName = skill.replace(/\.md$/, "");

    // Create skill directory
    const skillDir = path.join(outputPath, skillName);
    await fs.ensureDir(skillDir);

    // Build SKILL.md with Agent Skills frontmatter format
    const skillContent = `---
name: ${skillName}
description: ${description}
---

${bodyContent}`;

    const skillFilePath = path.join(skillDir, "SKILL.md");
    await fs.writeFile(skillFilePath, applyMarkdownFixes(skillContent));
  }

  return {
    success: true,
    skillsGenerated: skills.length,
  };
}

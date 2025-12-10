import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateMarkdownTable } from "./cli-options.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Constants
const SOURCES_DIR = "src/sources";
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;
const CATEGORIES = {
  PLANNING: "Planning",
  TDD: "Test-Driven Development",
  WORKFLOW: "Workflow",
  SHIP_SHOW_ASK: "Ship / Show / Ask",
  WORKTREE: "Worktree Management",
  UTILITIES: "Utilities",
} as const;

// Types
interface Frontmatter {
  description?: string;
  _category?: string;
  _order?: number | string;
  [key: string]: unknown;
}

interface Command {
  name: string;
  description: string;
  category: string;
  order: number;
}

interface TransformArgs {
  options: {
    path?: string;
    featureFlag?: string;
    elsePath?: string;
    [key: string]: unknown;
  };
}

interface TransformConfig {
  transforms: {
    INCLUDE: (args: TransformArgs) => string;
    COMMANDS_LIST: () => string;
    EXAMPLE_CONVERSATIONS: () => string;
    CLI_OPTIONS: () => string;
  };
}

// Simple frontmatter parser
function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return {};

  const frontmatter: Frontmatter = {};
  const lines = match[1].split("\n");
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    // Check for array item (indented with "- ")
    if (line.match(/^\s+-\s+/) && currentKey && currentArray) {
      const value = line.replace(/^\s+-\s+/, "").trim();
      currentArray.push(value);
      continue;
    }

    // Save any pending array
    if (currentKey && currentArray) {
      frontmatter[currentKey] = currentArray;
      currentKey = null;
      currentArray = null;
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value: string | number = line.slice(colonIndex + 1).trim();

    // Check if this is the start of an array (empty value after colon)
    if (value === "") {
      currentKey = key;
      currentArray = [];
      continue;
    }

    // Parse numeric values for _order field
    if (key === "_order" && !isNaN(Number(value))) {
      value = parseInt(value, 10);
    }

    // Parse boolean values for _selectedByDefault field
    if (key === "_selectedByDefault") {
      frontmatter[key] = value === "true";
      continue;
    }

    frontmatter[key] = value;
  }

  // Save any pending array at end
  if (currentKey && currentArray) {
    frontmatter[currentKey] = currentArray;
  }

  return frontmatter;
}

// Get category from frontmatter or default to Utilities
function getCategory(frontmatter: Frontmatter): string {
  return frontmatter._category || CATEGORIES.UTILITIES;
}

/**
 * Create markdown-magic config with beads flag
 */
function createConfig(withBeads: boolean): TransformConfig {
  return {
    transforms: {
      // Include file content with optional feature flag filtering
      INCLUDE(args: TransformArgs): string {
        const { options } = args;

        // Check for conditional inclusion with optional else path
        if (options.featureFlag === "beads" && !withBeads) {
          if (options.elsePath) {
            const elsePath = path.join(PROJECT_ROOT, options.elsePath);
            return fs.readFileSync(elsePath, "utf8");
          }
          return "";
        }

        const filePath = path.join(PROJECT_ROOT, options.path || "");
        return fs.readFileSync(filePath, "utf8");
      },

      // Generate commands list
      COMMANDS_LIST(): string {
        const sourcesDir = path.join(PROJECT_ROOT, SOURCES_DIR);
        const files = fs
          .readdirSync(sourcesDir)
          .filter((f) => f.endsWith(".md"));

        const commands: Command[] = files.map((file) => {
          const content = fs.readFileSync(path.join(sourcesDir, file), "utf8");
          const frontmatter = parseFrontmatter(content);
          const name = file.replace(".md", "");

          return {
            name,
            description: frontmatter.description || "No description",
            category: getCategory(frontmatter),
            order:
              typeof frontmatter._order === "number" ? frontmatter._order : 999,
          };
        });

        return generateCommandsMarkdown(commands);
      },

      // Generate example conversations
      EXAMPLE_CONVERSATIONS(): string {
        return generateExampleConversations();
      },

      // Generate CLI options table
      CLI_OPTIONS(): string {
        return generateMarkdownTable();
      },
    },
  };
}

// Generate markdown from commands grouped by category
function generateCommandsMarkdown(commands: Command[]): string {
  const categoryOrder = Object.values(CATEGORIES);
  const validCategories = new Set<string>(categoryOrder);

  // Validate all categories before processing
  for (const cmd of commands) {
    if (!validCategories.has(cmd.category)) {
      throw new Error(`Invalid category: ${cmd.category}`);
    }
  }

  const grouped: Record<string, Command[]> = commands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>,
  );
  let markdown = "";

  for (const category of categoryOrder) {
    const cmds = grouped[category];
    if (!cmds) continue;

    markdown += `### ${category}\n\n`;

    // Sort by order field, then alphabetically as fallback
    cmds.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name);
    });

    for (const cmd of cmds) {
      markdown += `- \`/${cmd.name}\` - ${cmd.description}\n`;
    }

    markdown += "\n";
  }

  return markdown.trim();
}

// Types for metadata
interface CommandMetadata {
  description: string;
  hint?: string;
  category: string;
  order: number;
  selectedByDefault?: boolean;
  "_requested-tools"?: string[];
}

// Generate metadata JSON for all commands
function generateCommandsMetadata(): Record<string, CommandMetadata> {
  const sourcesDir = path.join(PROJECT_ROOT, SOURCES_DIR);
  const files = fs.readdirSync(sourcesDir).filter((f) => f.endsWith(".md"));

  const metadata: Record<string, CommandMetadata> = {};

  for (const file of files) {
    const content = fs.readFileSync(path.join(sourcesDir, file), "utf8");
    const frontmatter = parseFrontmatter(content);

    const requestedTools = frontmatter["_requested-tools"] as
      | string[]
      | undefined;

    metadata[file] = {
      description: frontmatter.description || "No description",
      hint: frontmatter._hint as string | undefined,
      category: getCategory(frontmatter),
      order: typeof frontmatter._order === "number" ? frontmatter._order : 999,
      ...(frontmatter._selectedByDefault === false
        ? { selectedByDefault: false }
        : {}),
      ...(requestedTools ? { "_requested-tools": requestedTools } : {}),
    };
  }

  return metadata;
}

// Generate example conversations from directory
function generateExampleConversations(examplesDir?: string): string {
  const dir = examplesDir || path.join(PROJECT_ROOT, "example-conversations");

  if (!fs.existsSync(dir)) {
    throw new Error(`Example conversations directory '${dir}' does not exist`);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  return files
    .map((file) => {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      return content;
    })
    .join("\n\n");
}

/**
 * Write metadata JSON to a file
 */
export function writeCommandsMetadata(outputPath: string): void {
  const metadata = generateCommandsMetadata();
  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
}

export interface ProcessFilesOptions {
  withBeads?: boolean;
  outputDir?: string;
}

// Regex to match transform blocks: <!-- docs TRANSFORM_NAME key='value' -->...<!-- /docs -->
const TRANSFORM_BLOCK_REGEX =
  /<!--\s*docs\s+(\w+)([^>]*)-->([\s\S]*?)<!--\s*\/docs\s*-->/g;

// Regex to match frontmatter fields with underscore prefix (build-only metadata)
const UNDERSCORE_FIELD_REGEX = /^_[a-zA-Z0-9_-]+:.*$/gm;

// Parse options from attribute string like: path='foo.md' featureFlag='beads'
function parseOptions(attrString: string): Record<string, string> {
  const options: Record<string, string> = {};
  const attrRegex = /(\w+)=['"]([^'"]*)['"]/g;
  let match;
  while ((match = attrRegex.exec(attrString)) !== null) {
    options[match[1]] = match[2];
  }
  return options;
}

/**
 * Clean markdown content by removing underscore-prefixed frontmatter fields.
 */
function cleanFrontmatter(content: string): string {
  // Remove underscore-prefixed frontmatter fields
  let cleaned = content.replace(UNDERSCORE_FIELD_REGEX, "");

  // Clean up any double newlines in frontmatter that may result from field removal
  cleaned = cleaned.replace(
    /---\n([\s\S]*?)\n---/g,
    (_match, frontmatterContent: string) => {
      const cleanedFrontmatter = frontmatterContent
        .replace(/\n\n+/g, "\n")
        .trim();
      return `---\n${cleanedFrontmatter}\n---`;
    },
  );

  return cleaned;
}

/**
 * Process a single markdown file, expanding transform blocks and cleaning output
 */
function processFile(
  content: string,
  transforms: TransformConfig["transforms"],
): string {
  // Expand transform blocks (this also removes the comment markers)
  const expanded = content.replace(
    TRANSFORM_BLOCK_REGEX,
    (_match, transformName: string, attrString: string) => {
      const options = parseOptions(attrString);

      switch (transformName) {
        case "INCLUDE":
          return transforms.INCLUDE({ options });
        case "COMMANDS_LIST":
          return transforms.COMMANDS_LIST();
        case "EXAMPLE_CONVERSATIONS":
          return transforms.EXAMPLE_CONVERSATIONS();
        case "CLI_OPTIONS":
          return transforms.CLI_OPTIONS();
        default:
          throw new Error(`Unknown transform: ${transformName}`);
      }
    },
  );

  // Clean underscore-prefixed frontmatter fields
  return cleanFrontmatter(expanded);
}

/**
 * Process markdown files with transforms
 */
export async function processMarkdownFiles(
  files: string[],
  options: ProcessFilesOptions = {},
): Promise<void> {
  const { withBeads = true, outputDir } = options;
  const config = createConfig(withBeads);

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const processed = processFile(content, config.transforms);

    const outputPath = outputDir
      ? path.join(outputDir, path.basename(file))
      : file;

    fs.writeFileSync(outputPath, processed, "utf8");
  }
}

// Export for testing
export {
  parseFrontmatter,
  getCategory,
  generateCommandsMarkdown,
  generateCommandsMetadata,
  generateExampleConversations,
  createConfig,
  cleanFrontmatter,
  CATEGORIES,
};

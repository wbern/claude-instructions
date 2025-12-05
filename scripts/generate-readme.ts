import { markdownMagic } from "markdown-magic";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

// Constants
const SOURCES_DIR = "src/sources";
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;
const CATEGORIES = {
  PLANNING: "Planning",
  TDD_CYCLE: "TDD Cycle",
  WORKFLOW: "Workflow",
  WORKFLOW_TDD: "Test-Driven Development",
  WORKFLOW_SHIP_SHOW_ASK: "Ship / Show / Ask",
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

interface MarkdownMagicConfig {
  transforms: {
    INCLUDE: (args: TransformArgs) => string;
    COMMANDS_LIST: () => string;
    EXAMPLE_CONVERSATIONS: () => string;
  };
  outputFlatten?: boolean;
  output?: {
    directory: string;
    removeComments: boolean;
    applyTransformsToSource: boolean;
  };
}

// Parse feature flags from environment or args
const WITH_BEADS =
  process.env.WITH_BEADS !== "false" &&
  !process.argv.includes("--without-beads");

// Simple frontmatter parser
function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return {};

  const frontmatter: Frontmatter = {};
  const lines = match[1].split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value: string | number = line.slice(colonIndex + 1).trim();

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

  return frontmatter;
}

// Get category from frontmatter or default to Utilities
function getCategory(frontmatter: Frontmatter): string {
  return frontmatter._category || CATEGORIES.UTILITIES;
}

const config: MarkdownMagicConfig = {
  transforms: {
    // Include file content with optional feature flag filtering
    INCLUDE(args: TransformArgs): string {
      const { options } = args;

      // Check for conditional inclusion with optional else path
      if (options.featureFlag === "beads" && !WITH_BEADS) {
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
      const files = fs.readdirSync(sourcesDir).filter((f) => f.endsWith(".md"));

      const commands: Command[] = files.map((file) => {
        const content = fs.readFileSync(path.join(sourcesDir, file), "utf8");
        const frontmatter = parseFrontmatter(content);
        const name = file.replace(".md", "");

        return {
          name,
          description: frontmatter.description || "No description",
          category: getCategory(frontmatter),
          order:
            typeof frontmatter._order === "number" ? frontmatter._order : 999, // Default to end if no order specified
        };
      });

      return generateCommandsMarkdown(commands);
    },

    // Generate example conversations
    EXAMPLE_CONVERSATIONS(): string {
      return generateExampleConversations();
    },
  },
};

// Generate markdown from commands grouped by category
function generateCommandsMarkdown(commands: Command[]): string {
  const grouped: Record<string, Command[]> = commands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>,
  );

  const categoryOrder = Object.values(CATEGORIES);
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

// Process files based on what's passed (only when running as script)
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // Check for metadata generation mode
  const metadataIndex = args.indexOf("--generate-metadata");
  if (metadataIndex !== -1) {
    const outputPath = args[metadataIndex + 1];
    if (!outputPath) {
      console.error("Error: --generate-metadata requires an output path");
      process.exit(1);
    }
    writeCommandsMetadata(outputPath);
    console.log(`   ✅ Generated commands metadata: ${outputPath}`);
    process.exit(0);
  }

  // Extract output directory if provided
  const outputDirIndex = args.indexOf("--output-dir");
  const outputDir: string | null =
    outputDirIndex !== -1 ? args[outputDirIndex + 1] : null;

  // Get file list (excluding flags)
  const files = args.filter(
    (arg) => !arg.startsWith("--") && arg !== outputDir,
  );
  const filesToProcess = files.length > 0 ? files : ["README.md"];

  // Configure based on whether we have an output directory
  const finalConfig = outputDir
    ? {
        ...config,
        outputFlatten: true,
        output: {
          directory: outputDir,
          removeComments: true, // Note: This option is broken in markdown-magic v4.0.4, we use post-process.js instead
          applyTransformsToSource: false,
        },
      }
    : config;

  markdownMagic(filesToProcess, finalConfig);
}

// Types for metadata
interface CommandMetadata {
  description: string;
  category: string;
  order: number;
  selectedByDefault?: boolean;
}

// Generate metadata JSON for all commands
function generateCommandsMetadata(): Record<string, CommandMetadata> {
  const sourcesDir = path.join(PROJECT_ROOT, SOURCES_DIR);
  const files = fs.readdirSync(sourcesDir).filter((f) => f.endsWith(".md"));

  const metadata: Record<string, CommandMetadata> = {};

  for (const file of files) {
    const content = fs.readFileSync(path.join(sourcesDir, file), "utf8");
    const frontmatter = parseFrontmatter(content);

    metadata[file] = {
      description: frontmatter.description || "No description",
      category: getCategory(frontmatter),
      order: typeof frontmatter._order === "number" ? frontmatter._order : 999,
      ...(frontmatter._selectedByDefault === false && {
        selectedByDefault: false,
      }),
    };
  }

  return metadata;
}

// Write metadata JSON to a file
function writeCommandsMetadata(outputPath: string): void {
  const metadata = generateCommandsMetadata();
  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
}

// Generate example conversations from directory
function generateExampleConversations(examplesDir?: string): string {
  const dir = examplesDir || path.join(PROJECT_ROOT, "example-conversations");

  if (!fs.existsSync(dir)) {
    return "";
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

// Export for testing
export {
  parseFrontmatter,
  getCategory,
  generateCommandsMarkdown,
  generateCommandsMetadata,
  generateExampleConversations,
  CATEGORIES,
};

import { markdownMagic } from 'markdown-magic';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Constants
const SOURCES_DIR = 'src/sources';
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;
const CATEGORIES = {
  TDD_WORKFLOW: 'TDD Workflow',
  WORKFLOW: 'Workflow',
  WORKTREE: 'Worktree Management',
  UTILITIES: 'Utilities'
};

const COMMAND_CATEGORIES = {
  'TDD Workflow': ['red', 'green', 'refactor', 'cycle', 'spike', 'issue'],
  'Workflow': ['commit', 'pr'],
  'Worktree Management': ['worktree-add', 'worktree-cleanup']
};

// Parse feature flags from environment or args
const WITH_BEADS = process.env.WITH_BEADS !== 'false' && !process.argv.includes('--without-beads');

// Simple frontmatter parser
function parseFrontmatter(content) {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) return {};

  const frontmatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    frontmatter[key] = value;
  }

  return frontmatter;
}

// Categorize commands based on predefined categories
function categorizeCommand(filename) {
  const name = filename.replace('.md', '');

  for (const [category, commands] of Object.entries(COMMAND_CATEGORIES)) {
    if (commands.includes(name)) {
      return category;
    }
  }

  return CATEGORIES.UTILITIES;
}

const config = {
  transforms: {
    // Include file content with optional feature flag filtering
    INCLUDE(args) {
      const { options } = args;
      const filePath = path.join(PROJECT_ROOT, options.path);

      // Check for conditional inclusion
      if (options.featureFlag === 'beads' && !WITH_BEADS) {
        return '';
      }

      return fs.readFileSync(filePath, 'utf8');
    },

    // Generate commands list
    COMMANDS_LIST() {
      const sourcesDir = path.join(PROJECT_ROOT, SOURCES_DIR);
      const files = fs.readdirSync(sourcesDir).filter(f => f.endsWith('.md'));

      const commands = files.map(file => {
        const content = fs.readFileSync(path.join(sourcesDir, file), 'utf8');
        const frontmatter = parseFrontmatter(content);
        const name = file.replace('.md', '');

        return {
          name,
          description: frontmatter.description || 'No description',
          category: categorizeCommand(name)
        };
      });

      return generateCommandsMarkdown(commands);
    },

    // Generate example conversations
    EXAMPLE_CONVERSATIONS() {
      const examplesDir = path.join(PROJECT_ROOT, 'example-conversations');

      if (!fs.existsSync(examplesDir)) {
        return '';
      }

      const files = fs.readdirSync(examplesDir)
        .filter(f => f.endsWith('.md'))
        .sort();

      return files.map(file => {
        const content = fs.readFileSync(path.join(examplesDir, file), 'utf8');
        return content;
      }).join('\n\n');
    }
  }
};

// Generate markdown from commands grouped by category
function generateCommandsMarkdown(commands) {
  const grouped = commands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const categoryOrder = Object.values(CATEGORIES);
  let markdown = '';

  for (const category of categoryOrder) {
    const cmds = grouped[category];
    if (!cmds) continue;

    markdown += `### ${category}\n\n`;

    cmds.sort((a, b) => a.name.localeCompare(b.name));

    for (const cmd of cmds) {
      markdown += `- \`/${cmd.name}\` - ${cmd.description}\n`;
    }

    markdown += '\n';
  }

  return markdown.trim();
}

// Process files based on what's passed (only when running as script)
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  // Extract output directory if provided
  const outputDirIndex = args.indexOf('--output-dir');
  const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : null;

  // Get file list (excluding flags)
  const files = args.filter(arg => !arg.startsWith('--') && arg !== outputDir);
  const filesToProcess = files.length > 0 ? files : ['README.md'];

  // Configure based on whether we have an output directory
  const finalConfig = outputDir ? {
    ...config,
    outputFlatten: true,
    output: {
      directory: outputDir,
      removeComments: true, // Note: This option is broken in markdown-magic v4.0.4, we use post-process.js instead
      applyTransformsToSource: false
    }
  } : config;

  markdownMagic(filesToProcess, finalConfig);
}

// Export for testing
export {
  parseFrontmatter,
  categorizeCommand,
  generateCommandsMarkdown,
  CATEGORIES,
  COMMAND_CATEGORIES
};

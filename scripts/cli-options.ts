interface CliOption {
  flag: string;
  key: string;
  type: "string" | "boolean" | "array";
  description: string;
  example?: string;
  requiredForNonInteractive?: boolean;
  internal?: boolean;
}

export const CLI_OPTIONS: CliOption[] = [
  {
    flag: "--scope",
    key: "scope",
    type: "string",
    description: "Installation scope (project, user, or a custom path)",
    example: "--scope=project",
    requiredForNonInteractive: true,
  },
  {
    flag: "--agent",
    key: "agent",
    type: "string",
    description: "Target agent (opencode, claude, both)",
    example: "--agent=opencode",
  },
  {
    flag: "--prefix",
    key: "prefix",
    type: "string",
    description: "Add prefix to command names",
    example: "--prefix=my-",
  },
  {
    flag: "--commands",
    key: "commands",
    type: "array",
    description: "Install only specific commands",
    example: "--commands=commit,red,green",
  },
  {
    flag: "--skip-template-injection",
    key: "skipTemplateInjection",
    type: "boolean",
    description: "Skip injecting project CLAUDE.md customizations",
  },
  {
    flag: "--update-existing",
    key: "updateExisting",
    type: "boolean",
    description: "Only update already-installed commands",
  },
  {
    flag: "--overwrite",
    key: "overwrite",
    type: "boolean",
    description: "Overwrite conflicting files without prompting",
  },
  {
    flag: "--skip-on-conflict",
    key: "skipOnConflict",
    type: "boolean",
    description: "Skip conflicting files without prompting",
  },
  {
    flag: "--flags",
    key: "flags",
    type: "array",
    description: "Enable feature flags (beads, github, gitlab, etc.)",
    example: "--flags=beads,github",
  },
  {
    flag: "--allowed-tools",
    key: "allowedTools",
    type: "array",
    description: "Pre-approve tools for commands (non-interactive mode)",
    example: "--allowed-tools=Bash(git diff:*),Bash(git status:*)",
  },
  {
    flag: "--include-contrib-commands",
    key: "includeContribCommands",
    type: "boolean",
    description: "Include underscore-prefixed contributor commands",
    internal: true,
  },
  {
    flag: "--skills",
    key: "skills",
    type: "array",
    description: "Generate selected commands as skills (.claude/skills/)",
    example: "--skills=tdd,commit",
  },
];

export function generateHelpText(): string {
  const lines = ["Usage: claude-instructions [options]", "", "Options:"];

  for (const opt of CLI_OPTIONS) {
    const suffix =
      opt.type === "string"
        ? "=<value>"
        : opt.type === "array"
          ? "=<list>"
          : "";
    const padding = 28 - (opt.flag.length + suffix.length);
    lines.push(
      `  ${opt.flag}${suffix}${" ".repeat(Math.max(1, padding))}${opt.description}`,
    );
  }

  lines.push("  --help, -h                  Show this help message");
  lines.push("  --version, -v               Show version number");

  return lines.join("\n");
}

export function generateMarkdownTable(): string {
  const lines = ["| Option | Description |", "|--------|-------------|"];

  for (const opt of CLI_OPTIONS) {
    if (opt.internal) continue;
    const display = opt.example || opt.flag;
    lines.push(`| \`${display}\` | ${opt.description} |`);
  }

  // Add hardcoded flags not in CLI_OPTIONS
  lines.push("| `--help, -h` | Show help message |");
  lines.push("| `--version, -v` | Show version number |");

  return lines.join("\n");
}

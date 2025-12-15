interface CliOption {
  flag: string;
  key: string;
  type: "string" | "boolean" | "array";
  description: string;
  example?: string;
  requiredForNonInteractive?: boolean;
}

export const CLI_OPTIONS: CliOption[] = [
  {
    flag: "--variant",
    key: "variant",
    type: "string",
    description: "Command variant (with-beads, without-beads)",
    example: "--variant=with-beads",
    requiredForNonInteractive: true,
  },
  {
    flag: "--scope",
    key: "scope",
    type: "string",
    description: "Installation scope (project, user)",
    example: "--scope=project",
    requiredForNonInteractive: true,
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
];

export function generateHelpText(): string {
  const lines = [
    "Usage: npx @wbern/claude-instructions [options]",
    "",
    "Options:",
  ];

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
    const display = opt.example || opt.flag;
    lines.push(`| \`${display}\` | ${opt.description} |`);
  }

  // Add hardcoded flags not in CLI_OPTIONS
  lines.push("| `--help, -h` | Show help message |");
  lines.push("| `--version, -v` | Show version number |");

  return lines.join("\n");
}

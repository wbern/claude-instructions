import { describe, expect, it } from "vitest";
import {
  CLI_OPTIONS,
  generateHelpText,
  generateMarkdownTable,
} from "../cli-options.js";

describe("CLI_OPTIONS", () => {
  it("should have required options with correct types", () => {
    const scopeOpt = CLI_OPTIONS.find((o) => o.key === "scope");
    expect(scopeOpt).toBeDefined();
    expect(scopeOpt?.type).toBe("string");
    expect(scopeOpt?.requiredForNonInteractive).toBe(true);

    const commandsOpt = CLI_OPTIONS.find((o) => o.key === "commands");
    expect(commandsOpt).toBeDefined();
    expect(commandsOpt?.type).toBe("array");
  });

  it("should have boolean options", () => {
    const booleanOpts = CLI_OPTIONS.filter((o) => o.type === "boolean");
    expect(booleanOpts.length).toBeGreaterThan(0);
    expect(booleanOpts.some((o) => o.key === "skipTemplateInjection")).toBe(
      true,
    );
  });

  it("should have skills option for selecting commands to generate as skills", () => {
    const skillsOpt = CLI_OPTIONS.find((o) => o.key === "skills");
    expect(skillsOpt).toBeDefined();
    expect(skillsOpt?.type).toBe("array");
    expect(skillsOpt?.flag).toBe("--skills");
  });
});

describe("generateHelpText", () => {
  it("should include usage line", () => {
    const help = generateHelpText();
    expect(help).toContain("Usage: claude-instructions");
  });

  it("should include all CLI options", () => {
    const help = generateHelpText();
    for (const opt of CLI_OPTIONS) {
      expect(help).toContain(opt.flag);
      expect(help).toContain(opt.description);
    }
  });

  it("should include help flag", () => {
    const help = generateHelpText();
    expect(help).toContain("--help");
  });

  it("should include version flag", () => {
    const help = generateHelpText();
    expect(help).toContain("--version");
  });

  it("should have descriptions for all flags including help and version", () => {
    const help = generateHelpText();
    // All CLI_OPTIONS have descriptions (tested above)
    // Verify hardcoded flags also have descriptions
    expect(help).toMatch(/--help.*\s+\S+/); // --help followed by description
    expect(help).toMatch(/--version.*\s+\S+/); // --version followed by description
  });

  it("should format string options with =<value>", () => {
    const help = generateHelpText();
    expect(help).toContain("--scope=<value>");
  });

  it("should format array options with =<list>", () => {
    const help = generateHelpText();
    expect(help).toContain("--commands=<list>");
  });

  it("should not add suffix to boolean options", () => {
    const help = generateHelpText();
    // Boolean option should not have =<value> or =<list>
    expect(help).toMatch(/--skip-template-injection\s+Skip/);
  });
});

describe("generateMarkdownTable", () => {
  it("should generate valid markdown table header", () => {
    const table = generateMarkdownTable();
    expect(table).toContain("| Option | Description |");
    expect(table).toContain("|--------|-------------|");
  });

  it("should include all public CLI options", () => {
    const table = generateMarkdownTable();
    for (const opt of CLI_OPTIONS) {
      if (opt.internal) continue;
      expect(table).toContain(opt.description);
    }
  });

  it("should use example when available", () => {
    const table = generateMarkdownTable();
    // Options with examples should show the example
    const scopeOpt = CLI_OPTIONS.find((o) => o.key === "scope");
    if (scopeOpt?.example) {
      expect(table).toContain(scopeOpt.example);
    }
  });

  it("should use flag when no example available", () => {
    const table = generateMarkdownTable();
    // Boolean options typically don't have examples
    const boolOpt = CLI_OPTIONS.find((o) => o.type === "boolean" && !o.example);
    if (boolOpt) {
      expect(table).toContain(boolOpt.flag);
    }
  });
});

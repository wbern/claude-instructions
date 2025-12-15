import { describe, it, expect } from "vitest";
import {
  CLI_OPTIONS,
  generateHelpText,
  generateMarkdownTable,
} from "../cli-options.js";

describe("CLI_OPTIONS", () => {
  it("should have required options with correct types", () => {
    const variantOpt = CLI_OPTIONS.find((o) => o.key === "variant");
    expect(variantOpt).toBeDefined();
    expect(variantOpt?.type).toBe("string");
    expect(variantOpt?.requiredForNonInteractive).toBe(true);

    const scopeOpt = CLI_OPTIONS.find((o) => o.key === "scope");
    expect(scopeOpt).toBeDefined();
    expect(scopeOpt?.type).toBe("string");

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
});

describe("generateHelpText", () => {
  it("should include usage line", () => {
    const help = generateHelpText();
    expect(help).toContain("Usage: npx @wbern/claude-instructions");
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
    expect(help).toContain("--variant=<value>");
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

  it("should include all CLI options", () => {
    const table = generateMarkdownTable();
    for (const opt of CLI_OPTIONS) {
      expect(table).toContain(opt.description);
    }
  });

  it("should use example when available", () => {
    const table = generateMarkdownTable();
    // Options with examples should show the example
    const variantOpt = CLI_OPTIONS.find((o) => o.key === "variant");
    if (variantOpt?.example) {
      expect(table).toContain(variantOpt.example);
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

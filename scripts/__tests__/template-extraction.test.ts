import { describe, expect, it } from "vitest";
import { extractTemplateBlocks } from "../cli-generator.js";

describe("extractTemplateBlocks", () => {
  it("should extract template block from markdown content", () => {
    const content = `# Project Instructions

Some intro text.

<claude-commands-template>
## Project Context
This is a React app using TypeScript.
</claude-commands-template>

More content after.`;

    const result = extractTemplateBlocks(content);

    expect(result).toEqual([
      {
        content: `## Project Context
This is a React app using TypeScript.`,
      },
    ]);
  });

  it("should extract commands filter from template with commands attribute", () => {
    const content = `<claude-commands-template commands="red,green,refactor">
## Only for TDD commands
</claude-commands-template>`;

    const result = extractTemplateBlocks(content);

    expect(result).toEqual([
      {
        content: "## Only for TDD commands",
        commands: ["red", "green", "refactor"],
      },
    ]);
  });

  it("should extract multiple template blocks targeting different commands", () => {
    const content = `# Project Instructions

<claude-commands-template commands="commit">
## Commit Rules
Always use conventional commits.
</claude-commands-template>

<claude-commands-template commands="red,green">
## TDD Rules
Run tests after each change.
</claude-commands-template>`;

    const result = extractTemplateBlocks(content);

    expect(result).toEqual([
      {
        content: "## Commit Rules\nAlways use conventional commits.",
        commands: ["commit"],
      },
      {
        content: "## TDD Rules\nRun tests after each change.",
        commands: ["red", "green"],
      },
    ]);
  });

  it("should extract template block from agent-commands-template tag", () => {
    const content = `# Project Instructions

<agent-commands-template>
## OpenCode Context
This project uses OpenCode.
</agent-commands-template>`;

    const result = extractTemplateBlocks(content);

    expect(result).toEqual([
      {
        content: "## OpenCode Context\nThis project uses OpenCode.",
      },
    ]);
  });

  it("should extract commands filter from agent-commands-template with commands attribute", () => {
    const content = `<agent-commands-template commands="commit,pr">
## Deploy rules
</agent-commands-template>`;

    const result = extractTemplateBlocks(content);

    expect(result).toEqual([
      {
        content: "## Deploy rules",
        commands: ["commit", "pr"],
      },
    ]);
  });

  it("should extract blocks from both tag names in the same file", () => {
    const content = `<claude-commands-template>
## From Claude tag
</claude-commands-template>

<agent-commands-template>
## From Agent tag
</agent-commands-template>`;

    const result = extractTemplateBlocks(content);

    expect(result).toEqual([
      { content: "## From Claude tag" },
      { content: "## From Agent tag" },
    ]);
  });

  it("should return empty array when no template blocks found", () => {
    const content = `# Project Instructions

No template blocks here, just regular markdown.

## Guidelines
- Use TypeScript
- Write tests
`;

    const result = extractTemplateBlocks(content);

    expect(result).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
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

    expect(result).toEqual({
      content: `## Project Context
This is a React app using TypeScript.`,
    });
  });

  it("should extract commands filter from template with commands attribute", () => {
    const content = `<claude-commands-template commands="red,green,refactor">
## Only for TDD commands
</claude-commands-template>`;

    const result = extractTemplateBlocks(content);

    expect(result).toEqual({
      content: "## Only for TDD commands",
      commands: ["red", "green", "refactor"],
    });
  });
});

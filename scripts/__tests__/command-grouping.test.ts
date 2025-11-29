import { describe, it, expect, vi } from "vitest";
import fs from "fs-extra";

vi.mock("fs-extra", () => ({
  default: {
    readFile: vi.fn(),
  },
}));

describe("getCommandsGroupedByCategory", () => {
  it("should return commands grouped by category from metadata file", async () => {
    const mockMetadata = {
      "red.md": { description: "Red phase", category: "TDD Cycle", order: 2 },
      "green.md": {
        description: "Green phase",
        category: "TDD Cycle",
        order: 3,
      },
      "commit.md": {
        description: "Create commit",
        category: "Workflow",
        order: 1,
      },
    };
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify(mockMetadata) as never,
    );

    const { getCommandsGroupedByCategory } =
      await import("../cli-generator.js");
    const result = await getCommandsGroupedByCategory("with-beads");

    expect(result).toEqual({
      "TDD Cycle": [
        { value: "red.md", label: "red.md" },
        { value: "green.md", label: "green.md" },
      ],
      Workflow: [{ value: "commit.md", label: "commit.md" }],
    });
  });
});

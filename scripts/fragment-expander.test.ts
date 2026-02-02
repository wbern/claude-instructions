import { describe, expect, it, vi } from "vitest";
import { expandContent } from "./fragment-expander.js";

vi.mock("fs-extra", () => ({
  default: {
    readFileSync: vi.fn().mockReturnValue("Fragment content here"),
  },
}));

describe("expandContent", () => {
  it("should return content unchanged when no INCLUDE directives present", () => {
    const content = "# Simple Markdown\n\nNo includes here.";

    const result = expandContent(content, { flags: [], baseDir: "/test" });

    expect(result).toBe(content);
  });

  it("should expand INCLUDE directive by reading the referenced file", async () => {
    const fs = await import("fs-extra");
    vi.mocked(fs.default.readFileSync).mockReturnValue("Included content");

    const content = `# Header
<!-- docs INCLUDE path='src/fragments/test.md' -->
<!-- /docs -->
# Footer`;

    const result = expandContent(content, { flags: [], baseDir: "/project" });

    expect(fs.default.readFileSync).toHaveBeenCalledWith(
      "/project/src/fragments/test.md",
      "utf8",
    );
    expect(result).toContain("Included content");
    expect(result).not.toContain("<!-- docs");
  });

  it("should skip INCLUDE when featureFlag is not in enabled flags", async () => {
    const fs = await import("fs-extra");
    vi.mocked(fs.default.readFileSync).mockClear();

    const content = `# Header
<!-- docs INCLUDE path='src/fragments/beads.md' featureFlag='beads' -->
<!-- /docs -->
# Footer`;

    const result = expandContent(content, { flags: [], baseDir: "/project" });

    expect(fs.default.readFileSync).not.toHaveBeenCalled();
    expect(result).toBe("# Header\n\n# Footer");
  });

  it("should include content when featureFlag IS in enabled flags", async () => {
    const fs = await import("fs-extra");
    vi.mocked(fs.default.readFileSync).mockReturnValue("Beads content");

    const content = `# Header
<!-- docs INCLUDE path='src/fragments/beads.md' featureFlag='beads' -->
<!-- /docs -->
# Footer`;

    const result = expandContent(content, {
      flags: ["beads"],
      baseDir: "/project",
    });

    expect(fs.default.readFileSync).toHaveBeenCalledWith(
      "/project/src/fragments/beads.md",
      "utf8",
    );
    expect(result).toContain("Beads content");
  });

  it("should use elsePath when featureFlag is not enabled", async () => {
    const fs = await import("fs-extra");
    vi.mocked(fs.default.readFileSync).mockReturnValue("Fallback content");

    const content = `# Header
<!-- docs INCLUDE path='src/fragments/beads.md' featureFlag='beads' elsePath='src/fragments/no-beads.md' -->
<!-- /docs -->
# Footer`;

    const result = expandContent(content, { flags: [], baseDir: "/project" });

    expect(fs.default.readFileSync).toHaveBeenCalledWith(
      "/project/src/fragments/no-beads.md",
      "utf8",
    );
    expect(result).toContain("Fallback content");
  });

  it("should throw error when included file does not exist", async () => {
    const fs = await import("fs-extra");
    vi.mocked(fs.default.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const content = `# Header
<!-- docs INCLUDE path='src/fragments/missing.md' -->
<!-- /docs -->
# Footer`;

    expect(() =>
      expandContent(content, { flags: [], baseDir: "/project" }),
    ).toThrow("Failed to read");
  });

  it("should throw error when elsePath file does not exist", async () => {
    const fs = await import("fs-extra");
    vi.mocked(fs.default.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const content = `# Header
<!-- docs INCLUDE path='src/fragments/beads.md' featureFlag='beads' elsePath='src/fragments/missing.md' -->
<!-- /docs -->
# Footer`;

    expect(() =>
      expandContent(content, { flags: [], baseDir: "/project" }),
    ).toThrow("Failed to read elsePath");
  });

  it("should throw error for unknown transform type", () => {
    const content = `# Header
<!-- docs UNKNOWN path='src/fragments/test.md' -->
<!-- /docs -->
# Footer`;

    expect(() =>
      expandContent(content, { flags: [], baseDir: "/project" }),
    ).toThrow("Unknown transform type: UNKNOWN");
  });

  it("should throw error when INCLUDE directive is missing path attribute", () => {
    const content = `# Header
<!-- docs INCLUDE -->
<!-- /docs -->
# Footer`;

    expect(() =>
      expandContent(content, { flags: [], baseDir: "/project" }),
    ).toThrow("INCLUDE directive missing required 'path' attribute");
  });

  it("should skip content when unlessFlags matches any enabled flag", async () => {
    const fs = await import("fs-extra");
    vi.mocked(fs.default.readFileSync).mockClear();

    const content = `# Header
<!-- docs INCLUDE path='src/fragments/default.md' unlessFlags='gh-cli,gh-mcp' -->
<!-- /docs -->
# Footer`;

    const result = expandContent(content, {
      flags: ["gh-cli"],
      baseDir: "/project",
    });

    expect(fs.default.readFileSync).not.toHaveBeenCalled();
    expect(result).toBe("# Header\n\n# Footer");
  });

  it("should include content when unlessFlags does not match any enabled flag", async () => {
    const fs = await import("fs-extra");
    vi.mocked(fs.default.readFileSync).mockReturnValue("Default content");

    const content = `# Header
<!-- docs INCLUDE path='src/fragments/default.md' unlessFlags='gh-cli,gh-mcp' -->
<!-- /docs -->
# Footer`;

    const result = expandContent(content, { flags: [], baseDir: "/project" });

    expect(fs.default.readFileSync).toHaveBeenCalledWith(
      "/project/src/fragments/default.md",
      "utf8",
    );
    expect(result).toContain("Default content");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCancel = Symbol("cancel");

vi.mock("@clack/prompts", () => ({
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  groupMultiselect: vi.fn(),
  confirm: vi.fn(),
  note: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn() },
  isCancel: (value: unknown) => value === mockCancel,
  intro: vi.fn(),
  outro: vi.fn(),
}));

vi.mock("./cli-generator.js", () => ({
  generateToDirectory: vi
    .fn()
    .mockResolvedValue({ success: true, filesGenerated: 5 }),
  checkForConflicts: vi.fn().mockResolvedValue([]),
  checkExistingFiles: vi.fn().mockResolvedValue([]),
  getAvailableCommands: vi
    .fn()
    .mockResolvedValue(["red.md", "green.md", "refactor.md"]),
  getCommandsGroupedByCategory: vi.fn().mockResolvedValue({
    "TDD Cycle": [
      { value: "red.md", label: "red.md", hint: "Red phase" },
      { value: "green.md", label: "green.md", hint: "Green phase" },
    ],
    Workflow: [
      { value: "commit.md", label: "commit.md", hint: "Create commit" },
    ],
  }),
  getRequestedToolsOptions: vi.fn().mockResolvedValue([
    { value: "Bash(git diff:*)", label: "git diff" },
    { value: "Bash(git status:*)", label: "git status" },
  ]),
  VARIANT_OPTIONS: [
    { value: "with-beads", label: "With Beads" },
    { value: "without-beads", label: "Without Beads" },
  ],
  getScopeOptions: vi.fn().mockReturnValue([
    {
      value: "project",
      label: "Project/Repository",
      hint: "/mock/path/.claude/commands",
    },
    {
      value: "user",
      label: "User (Global)",
      hint: "/home/user/.claude/commands",
    },
  ]),
}));

describe("CLI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export a main function", async () => {
    const { main } = await import("./cli.js");

    expect(typeof main).toBe("function");
  });

  it("should prompt for variant and scope then generate", async () => {
    const { select, text } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");

    await main();

    expect(select).toHaveBeenCalledTimes(2);
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({ commandPrefix: "" }),
    );
  });

  it("should exit gracefully when user cancels with Ctrl+C", async () => {
    const { select } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select).mockResolvedValueOnce(mockCancel);
    vi.mocked(generateToDirectory).mockClear();

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should show intro and outro messages", async () => {
    const { select, text, intro, outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");

    await main();

    expect(intro).toHaveBeenCalled();
    expect(outro).toHaveBeenCalled();
  });

  it("should show Batman logo in intro", async () => {
    const { select, text, intro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");

    await main();

    expect(intro).toHaveBeenCalledWith(
      expect.stringContaining("       _==/          i     i          \\==_"),
    );
  });

  it("should show file count and destination in outro", async () => {
    const { select, text, outro } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(generateToDirectory).mockResolvedValue({
      success: true,
      filesGenerated: 17,
      variant: "with-beads",
    } as never);

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");

    await main();

    expect(outro).toHaveBeenCalledWith(expect.stringContaining("17"));
    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining(".claude/commands"),
    );
  });

  it("should show detailed outro with full path, restart hint, and encouragement", async () => {
    const { select, text, outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");

    await main();

    expect(outro).toHaveBeenCalledWith(expect.stringContaining("Happy"));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining(process.cwd()));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining("restart"));
  });

  it("should prompt for command prefix and pass it to generator", async () => {
    const { select, text } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("my-");

    await main();

    expect(text).toHaveBeenCalled();
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({ commandPrefix: "my-" }),
    );
  });

  it("should exit gracefully when user cancels on prefix prompt", async () => {
    const { select, text } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce(mockCancel);

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should skip prompts when all arguments are provided via CLI", async () => {
    const { select, text } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({ variant: "with-beads", scope: "project", prefix: "my-" });

    expect(select).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({ commandPrefix: "my-" }),
    );
  });

  it("should pass skipTemplateInjection to generator", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({
      variant: "with-beads",
      scope: "project",
      prefix: "",
      skipTemplateInjection: true,
    });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({ skipTemplateInjection: true }),
    );
  });

  it("should prompt for command selection with groupMultiselect", async () => {
    const { select, text, groupMultiselect } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(groupMultiselect).mockResolvedValueOnce(["red.md", "green.md"]);
    vi.mocked(text).mockResolvedValueOnce("");

    await main();

    expect(groupMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Enter to accept all"),
        options: expect.any(Object),
      }),
    );
  });

  it("should pass selected commands to generator", async () => {
    const { select, text, groupMultiselect } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(groupMultiselect).mockResolvedValueOnce(["red.md", "green.md"]);
    vi.mocked(text).mockResolvedValueOnce("");

    await main();

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({ commands: ["red.md", "green.md"] }),
    );
  });

  it("should pass commands from CLI args to generator in non-interactive mode", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({
      variant: "with-beads",
      scope: "project",
      prefix: "",
      commands: ["red", "green"],
    });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({ commands: ["red", "green"] }),
    );
  });

  it("should show diff and prompt for confirmation when file already exists", async () => {
    const { confirm, note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "commit.md",
        existingContent: "# My custom commit",
        newContent: "# Standard commit process",
        isIdentical: false,
      },
    ]);
    vi.mocked(confirm).mockResolvedValueOnce(true);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    expect(note).toHaveBeenCalledWith(
      expect.stringContaining("-"),
      expect.stringContaining("commit.md"),
    );
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Overwrite"),
      }),
    );
  });

  it("should skip conflicting file when user declines overwrite", async () => {
    const { confirm } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "commit.md",
        existingContent: "# My custom commit",
        newContent: "# Standard commit process",
        isIdentical: false,
      },
    ]);
    vi.mocked(confirm).mockResolvedValueOnce(false);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({ skipFiles: ["commit.md"] }),
    );
  });

  it("should show compact diff with hunk headers and 3 context lines", async () => {
    const { note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    const existingContent = `# Header
Line 1
Line 2
Line 3
Old line here
Line 5
Line 6
Line 7`;
    const newContent = `# Header
Line 1
Line 2
Line 3
New line here
Line 5
Line 6
Line 7`;

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "test.md",
        existingContent,
        newContent,
        isIdentical: false,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("test.md"));
    const diffContent = String(noteCall?.[0] || "");

    // With 3 context lines, should show Line 2 (3 lines before change at line 5)
    expect(diffContent).toContain("Line 2");
    // And Line 7 (3 lines after change at line 5)
    expect(diffContent).toContain("Line 7");
  });

  it("should show multiple hunks for changes far apart in the file", async () => {
    const { note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    const existingContent = `Line 1
Line 2
OLD at top
Line 4
Line 5
Line 6
Line 7
Line 8
Line 9
Line 10
OLD at bottom
Line 12`;
    const newContent = `Line 1
Line 2
NEW at top
Line 4
Line 5
Line 6
Line 7
Line 8
Line 9
Line 10
NEW at bottom
Line 12`;

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "multi-hunk.md",
        existingContent,
        newContent,
        isIdentical: false,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("multi-hunk.md"));
    const diffContent = String(noteCall?.[0] || "");

    const hunkHeaders = diffContent.match(/@@ -\d+,\d+ \+\d+,\d+ @@/g) || [];
    expect(hunkHeaders.length).toBe(2);
  });

  it("should skip diff display when files are identical", async () => {
    const { note, log } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(note).mockClear();
    vi.mocked(log.info).mockClear();

    const content = `# Same content
Line 1
Line 2`;

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "identical.md",
        existingContent: content,
        newContent: content,
        isIdentical: true,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    // Should not show diff note for identical files
    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("identical.md"));
    expect(noteCall).toBeUndefined();

    // Should show skip message
    const logInfoCalls = vi.mocked(log.info).mock.calls;
    const skipCall = logInfoCalls.find((call) =>
      String(call[0]).includes("identical"),
    );
    expect(skipCall).toBeDefined();
  });

  it("should handle change at very first line with no preceding context", async () => {
    const { note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    const existingContent = `OLD first line
Line 2
Line 3`;
    const newContent = `NEW first line
Line 2
Line 3`;

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "first-line.md",
        existingContent,
        newContent,
        isIdentical: false,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("first-line.md"));
    const diffContent = String(noteCall?.[0] || "");

    expect(diffContent).toMatch(/@@ -1,\d+ \+1,\d+ @@/);
    expect(diffContent).toContain("- OLD first line");
    expect(diffContent).toContain("+ NEW first line");
  });

  it("should handle change at very last line with correct line number in hunk header", async () => {
    const { note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    const existingContent = `Line 1
Line 2
Line 3
Line 4
OLD LAST`;
    const newContent = `Line 1
Line 2
Line 3
Line 4
NEW LAST`;

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "last-line.md",
        existingContent,
        newContent,
        isIdentical: false,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("last-line.md"));
    const diffContent = String(noteCall?.[0] || "");

    // Hunk should reference line 2 or later (3 context lines before the change at line 5)
    expect(diffContent).toMatch(/@@ -[2345],\d+ \+[2345],\d+ @@/);
    expect(diffContent).toContain("- OLD LAST");
    expect(diffContent).toContain("+ NEW LAST");
    // Should show some context before the change
    expect(diffContent).toContain("Line 4");
  });

  it("should show colored diff output with ANSI escape codes", async () => {
    process.env.FORCE_COLOR = "1";
    vi.resetModules();

    const { note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "test.md",
        existingContent: "old line",
        newContent: "new line",
        isIdentical: false,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("test.md"));
    const diffContent = String(noteCall?.[0] || "");

    // ANSI escape codes start with \x1b[ (ESC[)
    // eslint-disable-next-line no-control-regex
    expect(diffContent).toMatch(/\x1b\[/);

    delete process.env.FORCE_COLOR;
  });

  it("should use background colors for added/removed lines for theme compatibility", async () => {
    process.env.FORCE_COLOR = "1";
    vi.resetModules();

    const { note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "test.md",
        existingContent: "old line",
        newContent: "new line",
        isIdentical: false,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("test.md"));
    const diffContent = String(noteCall?.[0] || "");

    // Background color codes: 42 = green bg, 41 = red bg
    // eslint-disable-next-line no-control-regex
    expect(diffContent).toMatch(/\x1b\[4[12]m/);

    delete process.env.FORCE_COLOR;
  });

  it("should show diff stats summary with lines added and removed", async () => {
    const { log } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "test.md",
        existingContent: "line 1\nline 2\nline 3",
        newContent: "line 1\nmodified line\nline 3\nnew line",
        isIdentical: false,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    // Should show stats with added/removed counts
    const logInfoCalls = vi.mocked(log.info).mock.calls;
    const statsCall = logInfoCalls.find(
      (call) => String(call[0]).includes("+") && String(call[0]).includes("-"),
    );
    expect(statsCall).toBeDefined();
  });

  it("should not show diff stats when files are identical", async () => {
    const { log } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(log.info).mockClear();
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "test.md",
        existingContent: "same content",
        newContent: "same content",
        isIdentical: true,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    // Should NOT show stats when there are no changes
    const logInfoCalls = vi.mocked(log.info).mock.calls;
    const statsCall = logInfoCalls.find(
      (call) =>
        String(call[0]).includes("+0") && String(call[0]).includes("-0"),
    );
    expect(statsCall).toBeUndefined();
  });

  it("should skip confirm prompt and show message when files are identical", async () => {
    const { log, confirm, note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(log.info).mockClear();
    vi.mocked(confirm).mockClear();
    vi.mocked(note).mockClear();
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "identical.md",
        existingContent: "same content",
        newContent: "same content",
        isIdentical: true,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    // Should NOT show diff or confirm prompt for identical files
    expect(vi.mocked(note)).not.toHaveBeenCalled();
    expect(vi.mocked(confirm)).not.toHaveBeenCalled();

    // Should show a skip message
    const logInfoCalls = vi.mocked(log.info).mock.calls;
    const skipCall = logInfoCalls.find((call) =>
      String(call[0]).includes("identical"),
    );
    expect(skipCall).toBeDefined();
  });

  it("should show git-style hunk headers with old and new line counts", async () => {
    const { note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(note).mockClear();
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "test.md",
        existingContent: "line 1\nline 2\nline 3",
        newContent: "line 1\nmodified\nline 3\nnew line",
        isIdentical: false,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("test.md"));
    const diffContent = String(noteCall?.[0] || "");

    // Should have git-style format: @@ -oldStart,oldCount +newStart,newCount @@
    expect(diffContent).toMatch(/@@ -\d+,\d+ \+\d+,\d+ @@/);
  });

  it("should show skip message when checkExistingFiles finds identical file", async () => {
    const { log, confirm, note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(log.info).mockClear();
    vi.mocked(confirm).mockClear();
    vi.mocked(note).mockClear();

    // checkExistingFiles returns file with isIdentical=true
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "identical.md",
        existingContent: "same content",
        newContent: "same content",
        isIdentical: true,
      },
    ]);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    // Should NOT show diff or confirm prompt
    expect(vi.mocked(note)).not.toHaveBeenCalled();
    expect(vi.mocked(confirm)).not.toHaveBeenCalled();

    // Should show a skip message mentioning the file
    const logInfoCalls = vi.mocked(log.info).mock.calls;
    const skipCall = logInfoCalls.find(
      (call) =>
        String(call[0]).includes("identical.md") &&
        String(call[0]).includes("identical"),
    );
    expect(skipCall).toBeDefined();
  });

  it("should not include commands with selectedByDefault: false in initial selection", async () => {
    const { select, text, groupMultiselect } = await import("@clack/prompts");
    const { getCommandsGroupedByCategory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Mock grouped commands with one category not selected by default
    vi.mocked(getCommandsGroupedByCategory).mockResolvedValueOnce({
      "TDD Cycle": [
        { value: "red.md", label: "red.md", selectedByDefault: true },
        { value: "green.md", label: "green.md", selectedByDefault: true },
      ],
      "Ship / Show / Ask": [
        { value: "ship.md", label: "ship.md", selectedByDefault: false },
        { value: "show.md", label: "show.md", selectedByDefault: false },
        { value: "ask.md", label: "ask.md", selectedByDefault: false },
      ],
    });

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(groupMultiselect).mockResolvedValueOnce(["red.md", "green.md"]);
    vi.mocked(text).mockResolvedValueOnce("");

    await main();

    // groupMultiselect should be called with initialValues that exclude non-default commands
    expect(groupMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        initialValues: expect.arrayContaining(["red.md", "green.md"]),
      }),
    );
    expect(groupMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        initialValues: expect.not.arrayContaining([
          "ship.md",
          "show.md",
          "ask.md",
        ]),
      }),
    );
  });

  it("should only show pre-existing commands in selection when updateExisting is true", async () => {
    const { select, text, groupMultiselect } = await import("@clack/prompts");
    const { getCommandsGroupedByCategory, checkExistingFiles } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Mock that only red.md and commit.md exist in the target directory
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "red.md",
        existingContent: "# Red",
        newContent: "# Red v2",
        isIdentical: false,
      },
      {
        filename: "commit.md",
        existingContent: "# Commit",
        newContent: "# Commit v2",
        isIdentical: false,
      },
    ]);

    // Mock grouped commands - includes commands that don't exist
    vi.mocked(getCommandsGroupedByCategory).mockResolvedValueOnce({
      "TDD Cycle": [
        { value: "red.md", label: "red.md", selectedByDefault: true },
        { value: "green.md", label: "green.md", selectedByDefault: true },
      ],
      Workflow: [
        { value: "commit.md", label: "commit.md", selectedByDefault: true },
        { value: "pr.md", label: "pr.md", selectedByDefault: true },
      ],
    });

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(groupMultiselect).mockResolvedValueOnce(["red.md", "commit.md"]);
    vi.mocked(text).mockResolvedValueOnce("");

    await main({ updateExisting: true });

    // groupMultiselect should only include commands that already exist
    expect(groupMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          "TDD Cycle": [expect.objectContaining({ value: "red.md" })],
          Workflow: [expect.objectContaining({ value: "commit.md" })],
        },
      }),
    );
    // Should NOT include green.md or pr.md since they don't exist
    const callOptions = vi.mocked(groupMultiselect).mock.calls[0][0].options;
    const allValues = Object.values(
      callOptions as Record<string, { value: string }[]>,
    )
      .flat()
      .map((opt) => opt.value);
    expect(allValues).not.toContain("green.md");
    expect(allValues).not.toContain("pr.md");
  });

  it("should warn and skip selection when updateExisting finds no existing commands", async () => {
    const { select, text, groupMultiselect, log } =
      await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Mock that no commands exist in the target directory
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([]);

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");

    await main({ updateExisting: true });

    // Should warn the user
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("No existing commands"),
    );
    // Should NOT show command selection
    expect(groupMultiselect).not.toHaveBeenCalled();
    // Should NOT generate any files
    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should filter to existing commands in non-interactive mode when updateExisting is true", async () => {
    const { checkExistingFiles, generateToDirectory } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Mock that only red.md exists in the target directory
    vi.mocked(checkExistingFiles).mockResolvedValue([
      {
        filename: "red.md",
        existingContent: "# Red",
        newContent: "# Red v2",
        isIdentical: false,
      },
    ]);

    // Non-interactive mode: all args provided
    await main({
      variant: "with-beads",
      scope: "project",
      prefix: "",
      updateExisting: true,
    });

    // Should only generate the existing command (red.md), not all commands
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({
        commands: ["red.md"],
      }),
    );
  });

  it("should warn and skip generation in non-interactive mode when updateExisting finds no existing commands", async () => {
    const { log } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Mock that no commands exist in the target directory
    vi.mocked(checkExistingFiles).mockResolvedValue([]);

    // Non-interactive mode: all args provided
    await main({
      variant: "with-beads",
      scope: "project",
      prefix: "",
      updateExisting: true,
    });

    // Should warn the user
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("No existing commands"),
    );
    // Should NOT generate any files
    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should skip conflict prompts and overwrite when overwrite is true", async () => {
    const { confirm, note } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(confirm).mockClear();
    vi.mocked(note).mockClear();

    // Mock that a conflicting file exists
    vi.mocked(checkExistingFiles).mockResolvedValue([
      {
        filename: "commit.md",
        existingContent: "# Old content",
        newContent: "# New content",
        isIdentical: false,
      },
    ]);

    await main({
      variant: "with-beads",
      scope: "project",
      prefix: "",
      overwrite: true,
    });

    // Should NOT show diff or prompt for confirmation
    expect(note).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    // Should still generate files (not skip the conflicting file)
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({
        skipFiles: [],
      }),
    );
  });

  it("should skip conflicting files without prompting when skipOnConflict is true", async () => {
    const { confirm, note } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(confirm).mockClear();
    vi.mocked(note).mockClear();

    // Mock that a conflicting file exists
    vi.mocked(checkExistingFiles).mockResolvedValue([
      {
        filename: "commit.md",
        existingContent: "# Old content",
        newContent: "# New content",
        isIdentical: false,
      },
    ]);

    await main({
      variant: "with-beads",
      scope: "project",
      prefix: "",
      skipOnConflict: true,
    });

    // Should NOT show diff or prompt for confirmation
    expect(note).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    // Should skip the conflicting file
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({
        skipFiles: ["commit.md"],
      }),
    );
  });

  it("should show 'Overwrite all' and 'Skip all' options when multiple files conflict", async () => {
    const { select, note } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select).mockClear();
    vi.mocked(note).mockClear();

    // Mock multiple conflicting files
    vi.mocked(checkExistingFiles).mockResolvedValue([
      {
        filename: "commit.md",
        existingContent: "# Old commit",
        newContent: "# New commit",
        isIdentical: false,
      },
      {
        filename: "red.md",
        existingContent: "# Old red",
        newContent: "# New red",
        isIdentical: false,
      },
      {
        filename: "green.md",
        existingContent: "# Old green",
        newContent: "# New green",
        isIdentical: false,
      },
    ]);

    // User selects "Yes" for first file
    vi.mocked(select).mockResolvedValueOnce("yes");
    // User selects "Skip all" for remaining files
    vi.mocked(select).mockResolvedValueOnce("skip_all");

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    // Should use select (not confirm) with 4 options
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("commit.md"),
        options: expect.arrayContaining([
          expect.objectContaining({ value: "yes" }),
          expect.objectContaining({ value: "no" }),
          expect.objectContaining({ value: "overwrite_all" }),
          expect.objectContaining({ value: "skip_all" }),
        ]),
      }),
    );

    // After "Skip all", should skip remaining files (red.md, green.md)
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({
        skipFiles: expect.arrayContaining(["red.md", "green.md"]),
      }),
    );
  });

  it("should overwrite all remaining files when 'Overwrite all' is selected", async () => {
    const { select } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select).mockClear();

    // Mock multiple conflicting files
    vi.mocked(checkExistingFiles).mockResolvedValue([
      {
        filename: "commit.md",
        existingContent: "# Old commit",
        newContent: "# New commit",
        isIdentical: false,
      },
      {
        filename: "red.md",
        existingContent: "# Old red",
        newContent: "# New red",
        isIdentical: false,
      },
      {
        filename: "green.md",
        existingContent: "# Old green",
        newContent: "# New green",
        isIdentical: false,
      },
    ]);

    // User selects "Overwrite all" for first file
    vi.mocked(select).mockResolvedValueOnce("overwrite_all");

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    // Should only prompt once (for first file)
    expect(select).toHaveBeenCalledTimes(1);

    // Should not skip any files (all overwritten)
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({
        skipFiles: [],
      }),
    );
  });

  it("should use confirm() instead of select() when only one file conflicts", async () => {
    const { select, confirm } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select).mockClear();
    vi.mocked(confirm).mockClear();

    // Mock single conflicting file
    vi.mocked(checkExistingFiles).mockResolvedValue([
      {
        filename: "commit.md",
        existingContent: "# Old commit",
        newContent: "# New commit",
        isIdentical: false,
      },
    ]);

    vi.mocked(confirm).mockResolvedValueOnce(true);

    await main({ variant: "with-beads", scope: "project", prefix: "" });

    // Should use confirm (not select) for single file
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Overwrite"),
      }),
    );
    // Should NOT use select with 4 options
    expect(select).not.toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({ value: "overwrite_all" }),
        ]),
      }),
    );
  });
});

describe("allowed tools prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should prompt for allowed tools selection with multiselect", async () => {
    const { select, text, groupMultiselect, multiselect } =
      await import("@clack/prompts");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");
    vi.mocked(groupMultiselect).mockResolvedValueOnce(["red.md"]);
    vi.mocked(multiselect).mockResolvedValueOnce([]);

    await main();

    expect(multiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("allowed"),
        options: [
          { value: "Bash(git diff:*)", label: "git diff" },
          { value: "Bash(git status:*)", label: "git status" },
        ],
      }),
    );
  });

  it("should pass selected allowed tools to generator", async () => {
    const { select, text, groupMultiselect, multiselect } =
      await import("@clack/prompts");
    const { generateToDirectory, checkExistingFiles } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Ensure no conflicting files to avoid triggering conflict resolution
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([]);

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");
    vi.mocked(groupMultiselect).mockResolvedValueOnce(["red.md"]);
    vi.mocked(multiselect).mockResolvedValueOnce([
      "Bash(git diff:*)",
      "Bash(git status:*)",
    ]);

    await main();

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({
        allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
      }),
    );
  });

  it("should exit gracefully when user cancels on allowed tools prompt", async () => {
    const { select, text, groupMultiselect, multiselect } =
      await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");
    vi.mocked(groupMultiselect).mockResolvedValueOnce(["red.md"]);
    vi.mocked(multiselect).mockResolvedValueOnce(mockCancel);

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should skip allowed tools prompt when no commands have requested tools", async () => {
    const { select, text, groupMultiselect, multiselect } =
      await import("@clack/prompts");
    const { getRequestedToolsOptions } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");
    vi.mocked(groupMultiselect).mockResolvedValueOnce(["red.md"]);
    vi.mocked(getRequestedToolsOptions).mockResolvedValueOnce([]);

    await main();

    expect(multiselect).not.toHaveBeenCalled();
  });

  it("should allow submitting with no allowed tools selected (optional)", async () => {
    const { select, text, groupMultiselect, multiselect } =
      await import("@clack/prompts");
    const { generateToDirectory, checkExistingFiles } =
      await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Ensure no conflicting files
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([]);

    vi.mocked(select)
      .mockResolvedValueOnce("with-beads")
      .mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");
    vi.mocked(groupMultiselect).mockResolvedValueOnce(["red.md"]);
    // User presses Enter without selecting any tools
    vi.mocked(multiselect).mockResolvedValueOnce([]);

    await main();

    // Should call multiselect with required: false
    expect(multiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        required: false,
      }),
    );

    // Should still generate files successfully
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "with-beads",
      "project",
      expect.objectContaining({
        allowedTools: [],
      }),
    );
  });
});

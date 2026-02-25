import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExistingFile } from "./cli-generator.js";

const mockCancel = Symbol("cancel");

// Flow configuration as data - change this array when the interactive flow changes
type MockFn = "select" | "text" | "groupMultiselect";
type StepKey =
  | "agent"
  | "scope"
  | "prefix"
  | "flags"
  | "commands"
  | "allowedTools"
  | "skills";

interface FlowStep {
  key: StepKey;
  mock: MockFn;
  default: unknown;
  optional?: boolean;
}

const INTERACTIVE_FLOW: FlowStep[] = [
  { key: "agent", mock: "select", default: "opencode" },
  { key: "scope", mock: "select", default: "project" },
  { key: "prefix", mock: "text", default: "" },
  { key: "flags", mock: "groupMultiselect", default: [] },
  { key: "commands", mock: "groupMultiselect", default: ["red.md"] },
  {
    key: "allowedTools",
    mock: "groupMultiselect",
    default: [],
    optional: true,
  },
  { key: "skills", mock: "groupMultiselect", default: [] },
];

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
  generateSkillsToDirectory: vi
    .fn()
    .mockResolvedValue({ success: true, skillsGenerated: 1 }),
  checkForConflicts: vi.fn().mockResolvedValue([]),
  checkExistingFiles: vi.fn().mockResolvedValue([]),
  DIRECTORIES: { CLAUDE: ".claude", OPENCODE: ".opencode" },
  AGENTS: { CLAUDE: "claude", OPENCODE: "opencode", BOTH: "both" },
  getSkillsPath: vi.fn().mockReturnValue("/mock/path/.opencode/skills"),
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
  FLAG_OPTIONS: [
    {
      value: "beads",
      label: "Beads MCP",
      hint: "Local issue tracking",
      category: "Feature Flags",
    },
    {
      value: "no-plan-files",
      label: "No Plan Files",
      hint: "Forbid Claude Code's internal plan.md",
      category: "Feature Flags",
    },
    {
      value: "gh-cli",
      label: "GitHub CLI",
      hint: "Use gh CLI instead of GitHub MCP",
      category: "Feature Flags",
    },
    {
      value: "gh-mcp",
      label: "GitHub MCP",
      hint: "Use GitHub MCP only (no CLI fallback)",
      category: "Feature Flags",
    },
  ],
  SCOPES: {
    PROJECT: "project",
    USER: "user",
  },
  getScopeOptions: vi.fn().mockReturnValue([
    {
      value: "project",
      label: "Project/Repository",
      hint: "/mock/path/.opencode/commands",
    },
    {
      value: "user",
      label: "User (Global)",
      hint: "/home/user/.config/opencode/commands",
    },
  ]),
}));

vi.mock("./tty.js", () => ({
  isInteractiveTTY: vi.fn().mockReturnValue(true),
}));

// Generic helper to setup interactive flow mocks
interface InteractiveFlowOptions {
  agent?: string;
  scope?: string;
  prefix?: string;
  flags?: string[];
  commands?: string[];
  allowedTools?: string[];
  skills?: string[];
  existingFiles?: ExistingFile[];
  cancelAt?: StepKey;
}

async function setupInteractiveMocks(options: InteractiveFlowOptions = {}) {
  const prompts = await import("@clack/prompts");
  const { checkExistingFiles } = await import("./cli-generator.js");

  vi.mocked(checkExistingFiles).mockResolvedValue(options.existingFiles ?? []);

  const mocks = {
    select: vi.mocked(prompts.select),
    text: vi.mocked(prompts.text),
    groupMultiselect: vi.mocked(prompts.groupMultiselect),
  } as Record<MockFn, { mockResolvedValueOnce: (value: unknown) => void }>;

  for (const step of INTERACTIVE_FLOW) {
    if (options.cancelAt === step.key) {
      mocks[step.mock].mockResolvedValueOnce(mockCancel);
      return;
    }

    if (step.optional && options[step.key] === undefined) {
      continue;
    }

    const value = options[step.key] ?? step.default;
    mocks[step.mock].mockResolvedValueOnce(value);
  }
}

describe("CLI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export a main function", async () => {
    const { main } = await import("./cli.js");

    expect(typeof main).toBe("function");
  });

  it("should prompt for scope and flags then generate", async () => {
    const { select } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ flags: ["beads"], commands: ["red.md"] });

    await main();

    // Now select is called twice: once for agent, once for scope
    expect(select).toHaveBeenCalledTimes(2);
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        commandPrefix: "",
        flags: ["beads"],
      }),
    );
  });

  it("should pass OPENCODE to getScopeOptions when agent is BOTH", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ agent: "both" });

    await main();

    // With agent=both, generateToDirectory is called for each sub-agent
    expect(generateToDirectory).toHaveBeenCalled();
  });

  it("should sum file counts from both agents when agent is both", async () => {
    const { outro } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(generateToDirectory).mockResolvedValue({
      success: true,
      filesGenerated: 7,
    } as never);

    await main({ scope: "project", agent: "both" });

    // Should report 14 (7 per agent x 2 agents), not 7
    expect(outro).toHaveBeenCalledWith(expect.stringContaining("14"));
  });

  it("should show .claude/skills/ hint in skills prompt when agent is claude", async () => {
    const { groupMultiselect } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ agent: "claude", allowedTools: [] });

    await main();

    // Find the skills prompt call (it includes "skills" in the message)
    const skillsCall = vi
      .mocked(groupMultiselect)
      .mock.calls.find((call) =>
        (call[0] as { message: string }).message?.includes("skills"),
      );
    expect(skillsCall).toBeDefined();
    const opts = (skillsCall![0] as { options: Record<string, unknown[]> })
      .options;
    const availableCommands = opts["Available commands"] as Array<{
      hint: string;
    }>;
    expect(availableCommands[0].hint).toBe(
      "Generate as skill in .claude/skills/",
    );
  });

  it("should exit gracefully when user cancels on agent selection", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ cancelAt: "agent" });

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should list agents alphabetically with no pre-selection bias", async () => {
    const { select } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks();

    await main();

    // First select call is agent selection
    const agentCall = vi.mocked(select).mock.calls[0];
    const agentOpts = agentCall[0] as {
      initialValue?: string;
      options: Array<{ value: string; label: string }>;
    };
    // No pre-selected default
    expect(agentOpts.initialValue).toBeUndefined();
    // Claude Code listed before OpenCode (alphabetical — no bias toward either)
    const labels = agentOpts.options.map((o) => o.label);
    expect(labels[0]).toBe("Claude Code");
    expect(labels[1]).toBe("OpenCode");
  });

  it("should exit gracefully when user cancels with Ctrl+C on scope", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ cancelAt: "scope" });

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should show intro and outro messages", async () => {
    const { intro, outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks();

    await main();

    expect(intro).toHaveBeenCalled();
    expect(outro).toHaveBeenCalled();
  });

  it("should show Batman logo in intro", async () => {
    const { intro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks();

    await main();

    expect(intro).toHaveBeenCalledWith(
      expect.stringContaining("       _==/          i     i          \\==_"),
    );
  });

  it("should show file count and destination in outro", async () => {
    const { outro } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(generateToDirectory).mockResolvedValue({
      success: true,
      filesGenerated: 17,
    } as never);
    await setupInteractiveMocks();

    await main();

    expect(outro).toHaveBeenCalledWith(expect.stringContaining("17"));
    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining(".opencode/commands"),
    );
  });

  it("should show detailed outro with full path, restart hint, and encouragement", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks();

    await main();

    expect(outro).toHaveBeenCalledWith(expect.stringContaining("Happy"));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining(process.cwd()));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining("restart"));
  });

  it("should show Claude Code restart hint when agent is claude", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await main({ scope: "project", agent: "claude" });

    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining("Claude Code is already running"),
    );
  });

  it("should show both-agent restart hint when agent is both", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await main({ scope: "project", agent: "both" });

    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining("OpenCode or Claude Code"),
    );
  });

  it("should use .claude path for user-level claude agent", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await main({ scope: "user", agent: "claude" });

    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining(".claude/commands"),
    );
  });

  it("should show kata workflow example in success message", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks();

    await main();

    expect(outro).toHaveBeenCalledWith(expect.stringContaining("/kata"));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining("/red"));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining("/green"));
    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining("for your kata"),
    );
    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining("See a full example:"),
    );
    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining("#example-conversations"),
    );
  });

  it("should show automation command in outro for interactive mode", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({
      scope: "project",
      prefix: "my-",
      flags: ["beads"],
      commands: ["red.md", "green.md"],
    });

    await main();

    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining("claude-instructions --scope=project"),
    );
    expect(outro).toHaveBeenCalledWith(expect.stringContaining("--prefix=my-"));
    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining("--flags=beads"),
    );
  });

  it("should prompt for skills selection in interactive mode", async () => {
    const { groupMultiselect } = await import("@clack/prompts");
    const { generateSkillsToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({
      commands: ["red.md", "tdd.md"],
      allowedTools: [],
      skills: ["tdd.md"],
    });

    await main();

    // Should prompt for skills selection after commands
    expect(groupMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("skills"),
      }),
    );

    // Should generate skills for selected commands
    expect(generateSkillsToDirectory).toHaveBeenCalledWith(
      expect.stringContaining(".opencode/skills"),
      ["tdd.md"],
      expect.any(Object),
    );
  });

  it("should exit gracefully when user cancels on skills selection", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Must explicitly set allowedTools so the mock for skills isn't consumed by allowedTools prompt
    await setupInteractiveMocks({ allowedTools: [], cancelAt: "skills" });

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should include --commands in automation note when specific commands selected", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({
      scope: "project",
      commands: ["red.md", "green.md"],
    });

    await main();

    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining("--commands=red.md,green.md"),
    );
  });

  it("should NOT include --commands in automation note when no commands selected", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({
      scope: "project",
      commands: [],
    });

    await main();

    expect(outro).toHaveBeenCalledWith(
      expect.not.stringContaining("--commands="),
    );
  });

  it("should include --allowed-tools in automation note when tools selected", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({
      scope: "project",
      allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
    });

    await main();

    // Value is quoted to protect shell special characters (*, parentheses)
    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining(
        '--allowed-tools="Bash(git diff:*),Bash(git status:*)"',
      ),
    );
  });

  it("should include --skills in automation note when skills selected", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({
      scope: "project",
      commands: ["red.md", "tdd.md"],
      allowedTools: [],
      skills: ["tdd.md"],
    });

    await main();

    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining("--skills=tdd.md"),
    );
  });

  it("should generate skills to user scope when scope is user", async () => {
    const { generateSkillsToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({
      scope: "user",
      skills: ["tdd.md"],
    });

    // Should call with user opencode directory path (default agent is opencode)
    expect(generateSkillsToDirectory).toHaveBeenCalledWith(
      expect.stringContaining(".opencode/skills"),
      ["tdd.md"],
      expect.any(Object),
    );
  });

  it("should NOT show automation note in non-interactive mode", async () => {
    const { outro } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await main({
      scope: "project",
      prefix: "my-",
      flags: ["beads"],
    });

    expect(outro).toHaveBeenCalledWith(
      expect.not.stringContaining("To automate this setup"),
    );
  });

  it("should prompt for command prefix and pass it to generator", async () => {
    const { text } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ prefix: "my-" });

    await main();

    expect(text).toHaveBeenCalled();
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({ commandPrefix: "my-" }),
    );
  });

  it("should exit gracefully when user cancels on prefix prompt", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ cancelAt: "prefix" });

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should exit gracefully when user cancels on flags prompt", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ cancelAt: "flags" });

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should skip prompts when all arguments are provided via CLI", async () => {
    const { select, text } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({ scope: "project", prefix: "my-" });

    expect(select).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({ commandPrefix: "my-" }),
    );
  });

  it("should pass skipTemplateInjection to generator", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({
      scope: "project",
      prefix: "",
      skipTemplateInjection: true,
    });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({ skipTemplateInjection: true }),
    );
  });

  it("should prompt for command selection with groupMultiselect", async () => {
    const { groupMultiselect } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ commands: ["red.md", "green.md"] });

    await main();

    expect(groupMultiselect).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        message: expect.stringContaining("Enter to accept all"),
        options: expect.any(Object),
      }),
    );
  });

  it("should pass selected commands to generator", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ commands: ["red.md", "green.md"] });

    await main();

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({ commands: ["red.md", "green.md"] }),
    );
  });

  it("should pass commands from CLI args to generator in non-interactive mode", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({
      scope: "project",
      prefix: "",
      commands: ["red", "green"],
    });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
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

    await main({ scope: "project", prefix: "" });

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
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
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

    await main({ scope: "project", prefix: "" });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
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

    await main({ scope: "project", prefix: "" });

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

    await main({ scope: "project", prefix: "" });

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

    await main({ scope: "project", prefix: "" });

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

    await main({ scope: "project", prefix: "" });

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

    await main({ scope: "project", prefix: "" });

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

    await main({ scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("test.md"));
    const diffContent = String(noteCall?.[0] || "");

    // ANSI escape codes start with \x1b[ (ESC[)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI escape codes
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

    await main({ scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("test.md"));
    const diffContent = String(noteCall?.[0] || "");

    // Background color codes: 42 = green bg, 41 = red bg
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Testing ANSI escape codes
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

    await main({ scope: "project", prefix: "" });

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

    await main({ scope: "project", prefix: "" });

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

    await main({ scope: "project", prefix: "" });

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

    await main({ scope: "project", prefix: "" });

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

    await main({ scope: "project", prefix: "" });

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

  it("should show diff correctly for new file (all additions)", async () => {
    const { note, confirm } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(confirm).mockResolvedValueOnce(true);

    // Empty existing content = all additions
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "new-file.md",
        existingContent: "",
        newContent: "# New File\n\nThis is entirely new content.",
        isIdentical: false,
      },
    ]);

    await main({ scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("new-file.md"));
    const diffContent = String(noteCall?.[0] || "");

    // Should show additions with @@ header (tests the || 1 fallback for firstOldLine)
    expect(diffContent).toContain("@@");
    expect(diffContent).toContain("New File");
  });

  it("should show diff correctly for deleted file (all deletions)", async () => {
    const { note, confirm } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(confirm).mockResolvedValueOnce(true);

    // Empty new content = all deletions
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "deleted-file.md",
        existingContent: "# Old File\n\nThis content will be removed.",
        newContent: "",
        isIdentical: false,
      },
    ]);

    await main({ scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("deleted-file.md"));
    const diffContent = String(noteCall?.[0] || "");

    // Should show deletions with @@ header (tests the || 1 fallback for firstNewLine)
    expect(diffContent).toContain("@@");
    expect(diffContent).toContain("Old File");
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

    vi.mocked(select).mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");
    vi.mocked(groupMultiselect)
      .mockResolvedValueOnce([]) // flags
      .mockResolvedValueOnce(["red.md", "green.md"]); // commands

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
    const { getCommandsGroupedByCategory, checkExistingFiles } = await import(
      "./cli-generator.js"
    );
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

    vi.mocked(select).mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");
    vi.mocked(groupMultiselect)
      .mockResolvedValueOnce([]) // flags
      .mockResolvedValueOnce(["red.md", "commit.md"]); // commands

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
    const { select, text, groupMultiselect, log } = await import(
      "@clack/prompts"
    );
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
    const { main } = await import("./cli.js");

    // Mock that no commands exist in the target directory
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([]);

    vi.mocked(select).mockResolvedValueOnce("project");
    vi.mocked(text).mockResolvedValueOnce("");
    vi.mocked(groupMultiselect).mockResolvedValueOnce([]); // flags

    await main({ updateExisting: true });

    // Should warn the user
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("No existing commands"),
    );
    // Should NOT generate any files
    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should filter to existing commands in non-interactive mode when updateExisting is true", async () => {
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
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
      scope: "project",
      prefix: "",
      updateExisting: true,
    });

    // Should only generate the existing command (red.md), not all commands
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        commands: ["red.md"],
      }),
    );
  });

  it("should warn and skip generation in non-interactive mode when updateExisting finds no existing commands", async () => {
    const { log } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
    const { main } = await import("./cli.js");

    // Mock that no commands exist in the target directory
    vi.mocked(checkExistingFiles).mockResolvedValue([]);

    // Non-interactive mode: all args provided
    await main({
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
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
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
      "project",
      expect.objectContaining({
        skipFiles: [],
      }),
    );
  });

  it("should log overwritten files when overwrite is true", async () => {
    const { log } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

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
      scope: "project",
      prefix: "",
      overwrite: true,
    });

    // Should log the overwritten file
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining("commit.md"));
  });

  it("should skip conflicting files without prompting when skipOnConflict is true", async () => {
    const { confirm, note } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
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
      "project",
      expect.objectContaining({
        skipFiles: ["commit.md"],
      }),
    );
  });

  it("should show 'Overwrite all' and 'Skip all' options when multiple files conflict", async () => {
    const { select, note } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
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

    await main({ scope: "project", prefix: "" });

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
      "project",
      expect.objectContaining({
        skipFiles: expect.arrayContaining(["red.md", "green.md"]),
      }),
    );
  });

  it("should overwrite all remaining files when 'Overwrite all' is selected", async () => {
    const { select } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
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

    await main({ scope: "project", prefix: "" });

    // Should only prompt once (for first file)
    expect(select).toHaveBeenCalledTimes(1);

    // Should not skip any files (all overwritten)
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        skipFiles: [],
      }),
    );
  });

  it("should overwrite user-level prefixed files when 'Yes' is selected", async () => {
    const { confirm } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
    const { main } = await import("./cli.js");

    vi.mocked(confirm).mockClear();

    // checkExistingFiles returns prefixed filenames for user-level commands
    vi.mocked(checkExistingFiles).mockResolvedValue([
      {
        filename: "my-red.md",
        existingContent: "# Old red",
        newContent: "# New red",
        isIdentical: false,
      },
    ]);

    // User selects "Yes" to overwrite
    vi.mocked(confirm).mockResolvedValueOnce(true);

    await main({ scope: "user", prefix: "my-" });

    // Should prompt for the prefixed file
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("my-red.md"),
      }),
    );

    // File should NOT be skipped (should be overwritten)
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "user",
      expect.objectContaining({
        skipFiles: [],
        commandPrefix: "my-",
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

    await main({ scope: "project", prefix: "" });

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

  it("should prompt for allowed tools selection with groupMultiselect for easy select-all", async () => {
    const { groupMultiselect } = await import("@clack/prompts");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ allowedTools: [] });

    await main();

    expect(groupMultiselect).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        message: expect.stringContaining("allowed"),
        options: {
          "All tools": [
            { value: "Bash(git diff:*)", label: "git diff" },
            { value: "Bash(git status:*)", label: "git status" },
          ],
        },
      }),
    );
  });

  it("should pass selected allowed tools to generator", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({
      allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
    });

    await main();

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
      }),
    );
  });

  it("should pass selected allowed tools to checkExistingFiles for conflict detection", async () => {
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({
      allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
    });

    await main();

    expect(checkExistingFiles).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
      }),
    );
  });

  it("should exit gracefully when user cancels on allowed tools prompt", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ cancelAt: "allowedTools" });

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should skip allowed tools prompt when no commands have requested tools", async () => {
    const { multiselect } = await import("@clack/prompts");
    const { getRequestedToolsOptions } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    vi.mocked(getRequestedToolsOptions).mockResolvedValueOnce([]);
    await setupInteractiveMocks();

    await main();

    expect(multiselect).not.toHaveBeenCalled();
  });

  it("should allow submitting with no allowed tools selected (optional)", async () => {
    const { groupMultiselect } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ allowedTools: [] });

    await main();

    expect(groupMultiselect).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        required: false,
      }),
    );

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        allowedTools: [],
      }),
    );
  });

  it("should exit gracefully when user cancels on command selection", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ cancelAt: "commands" });

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should exit gracefully when user cancels on single-file overwrite confirm", async () => {
    const { confirm } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
    const { main } = await import("./cli.js");

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "commit.md",
        existingContent: "# Existing",
        newContent: "# New",
        isIdentical: false,
      },
    ]);
    // User cancels on confirm prompt
    vi.mocked(confirm).mockResolvedValueOnce(mockCancel as never);

    await main({ scope: "project", prefix: "" });

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should exit gracefully when user cancels on multi-file overwrite select", async () => {
    const { select } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
    const { main } = await import("./cli.js");

    // Multiple conflicting files trigger select() instead of confirm()
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "commit.md",
        existingContent: "# Existing 1",
        newContent: "# New 1",
        isIdentical: false,
      },
      {
        filename: "red.md",
        existingContent: "# Existing 2",
        newContent: "# New 2",
        isIdentical: false,
      },
    ]);
    // User cancels on first file overwrite dialog
    vi.mocked(select).mockResolvedValueOnce(mockCancel);

    await main({ scope: "project", prefix: "" });

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should skip file when user selects 'no' on multi-file overwrite dialog", async () => {
    const { select } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
    const { main } = await import("./cli.js");

    // Multiple conflicting files trigger select() with yes/no/overwrite_all/skip_all
    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "commit.md",
        existingContent: "# Existing 1",
        newContent: "# New 1",
        isIdentical: false,
      },
      {
        filename: "red.md",
        existingContent: "# Existing 2",
        newContent: "# New 2",
        isIdentical: false,
      },
    ]);
    // User selects "no" for first file, "yes" for second
    vi.mocked(select).mockResolvedValueOnce("no").mockResolvedValueOnce("yes");

    await main({ scope: "project", prefix: "" });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({ skipFiles: ["commit.md"] }),
    );
  });

  it("should exit gracefully when user cancels on scope selection", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ cancelAt: "scope" });

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should merge nearby hunks into single hunk when changes are close", async () => {
    const { note } = await import("@clack/prompts");
    const { checkExistingFiles } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Create content with two changes 4 lines apart (within contextLines*2+1=7 range)
    // This should trigger the hunk extension logic at line 114
    const existingContent = `Line 1
Line 2
Line 3
OLD first change
Line 5
Line 6
Line 7
OLD second change
Line 9
Line 10`;
    const newContent = `Line 1
Line 2
Line 3
NEW first change
Line 5
Line 6
Line 7
NEW second change
Line 9
Line 10`;

    vi.mocked(checkExistingFiles).mockResolvedValueOnce([
      {
        filename: "nearby-hunks.md",
        existingContent,
        newContent,
        isIdentical: false,
      },
    ]);

    await main({ scope: "project", prefix: "" });

    const noteCall = vi
      .mocked(note)
      .mock.calls.find((call) => String(call[1]).includes("nearby-hunks.md"));
    const diffContent = String(noteCall?.[0] || "");

    // With nearby changes, should have only 1 hunk (merged)
    const hunkHeaders = diffContent.match(/@@ -\d+,\d+ \+\d+,\d+ @@/g) || [];
    expect(hunkHeaders.length).toBe(1);
    // Both changes should be in the diff
    expect(diffContent).toContain("OLD first change");
    expect(diffContent).toContain("NEW first change");
    expect(diffContent).toContain("OLD second change");
    expect(diffContent).toContain("NEW second change");
  });
});

describe("flags selection (dynamic generation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should warn and re-prompt when both gh-cli and gh-mcp flags are selected", async () => {
    const { select, text, groupMultiselect, log } = await import(
      "@clack/prompts"
    );
    const { main } = await import("./cli.js");

    // Set up the full interactive flow manually
    vi.mocked(select).mockResolvedValueOnce("project"); // scope
    vi.mocked(text).mockResolvedValueOnce(""); // prefix
    vi.mocked(groupMultiselect)
      .mockResolvedValueOnce(["gh-cli", "gh-mcp"]) // First flags attempt: both selected (invalid)
      .mockResolvedValueOnce(["gh-cli"]) // Second flags attempt: only one (valid)
      .mockResolvedValueOnce(["red.md"]) // commands
      .mockResolvedValueOnce([]); // allowed tools

    await main();

    // Should warn about mutual exclusivity
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("mutually exclusive"),
    );
  });

  it("should error when both gh-cli and gh-mcp flags are passed via CLI args", async () => {
    const { log } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({
      scope: "project",
      flags: ["gh-cli", "gh-mcp"],
    });

    // Should warn about mutual exclusivity
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("mutually exclusive"),
    );
    // Should not generate anything
    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should prompt for flags instead of variant in interactive mode", async () => {
    const { select, groupMultiselect } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await setupInteractiveMocks({ flags: ["beads"], commands: ["red.md"] });

    await main();

    // select is called twice: once for agent, once for scope
    expect(select).toHaveBeenCalledTimes(2);

    expect(groupMultiselect).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message: expect.stringContaining("feature"),
        options: expect.objectContaining({
          "Feature Flags": expect.arrayContaining([
            expect.objectContaining({ value: "beads" }),
          ]),
        }),
      }),
    );

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        flags: ["beads"],
      }),
    );
  });
});

describe("non-TTY mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should error with helpful message when required arguments are missing in non-TTY", async () => {
    const { isInteractiveTTY } = await import("./tty.js");
    const { log } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Simulate non-TTY environment
    vi.mocked(isInteractiveTTY).mockReturnValue(false);

    // Call with partial args (flags only, no scope) - should error instead of prompting
    await main({ flags: ["beads"] });

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("--scope"));
    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should error with helpful message when no arguments provided in non-TTY", async () => {
    const { isInteractiveTTY } = await import("./tty.js");
    const { log } = await import("@clack/prompts");
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    // Simulate non-TTY environment
    vi.mocked(isInteractiveTTY).mockReturnValue(false);

    // Call with no args at all - should error instead of prompting
    await main();

    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("--scope"));
    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it("should automatically skip conflicting files and log them in non-TTY mode", async () => {
    const { isInteractiveTTY } = await import("./tty.js");
    const { log, confirm, note } = await import("@clack/prompts");
    const { checkExistingFiles, generateToDirectory } = await import(
      "./cli-generator.js"
    );
    const { main } = await import("./cli.js");

    vi.mocked(isInteractiveTTY).mockReturnValue(false);
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
      scope: "project",
    });

    // Should NOT prompt for confirmation (non-TTY)
    expect(confirm).not.toHaveBeenCalled();
    expect(note).not.toHaveBeenCalled();

    // Should skip the conflicting file
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        skipFiles: ["commit.md"],
      }),
    );

    // Should log the skipped file
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("commit.md"));

    // Should show hint about resolving conflicts
    expect(log.info).toHaveBeenCalledWith(
      expect.stringMatching(/interactively|--overwrite/),
    );
  });

  it("should validate flags with valibot when both scope and flags are provided", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({
      scope: "project",
      prefix: "",
      flags: ["beads"],
    });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        flags: ["beads"],
      }),
    );
  });

  it("should pass allowedTools from CLI args to generator in non-interactive mode", async () => {
    const { generateToDirectory } = await import("./cli-generator.js");
    const { main } = await import("./cli.js");

    await main({
      scope: "project",
      prefix: "",
      allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
    });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      "project",
      expect.objectContaining({
        allowedTools: ["Bash(git diff:*)", "Bash(git status:*)"],
      }),
    );
  });
});

import os from "node:os";
import path from "node:path";
import {
  confirm,
  groupMultiselect,
  intro,
  isCancel,
  log,
  note,
  outro,
  select,
  text,
} from "@clack/prompts";
import { diffLines } from "diff";
import picocolors from "picocolors";
import * as v from "valibot";

const pc = process.env.FORCE_COLOR ? picocolors.createColors(true) : picocolors;

import {
  AGENTS,
  type Agent,
  checkExistingFiles,
  DIRECTORIES,
  type ExistingFile,
  FLAG_OPTIONS,
  generateSkillsToDirectory,
  generateToDirectory,
  getCommandsGroupedByCategory,
  getRequestedToolsOptions,
  getScopeOptions,
  getSkillsPath,
  SCOPES,
  type Scope,
} from "./cli-generator.js";
import { CLI_OPTIONS } from "./cli-options.js";
import { isInteractiveTTY } from "./tty.js";

// Schema for validating CLI scope - allows 'project', 'user', or a custom path
const ScopeValues = Object.values(SCOPES) as [Scope, ...Scope[]];
const ScopeSchema = v.union([
  v.picklist(ScopeValues),
  v.pipe(
    v.string(),
    v.regex(
      /^[/~.]/,
      'Custom scope must be a path starting with "/", "~", or "."',
    ),
  ),
]);

function isCustomPath(scope: string): boolean {
  return scope !== SCOPES.PROJECT && scope !== SCOPES.USER;
}

// Schema for validating CLI flags
const FlagValues = FLAG_OPTIONS.map((f) => f.value) as [string, ...string[]];
const FlagsSchema = v.array(v.picklist(FlagValues));

// Schema for validating CLI agent
const AgentValues = Object.values(AGENTS) as [Agent, ...Agent[]];
const AgentSchema = v.picklist(AgentValues);

type LineInfo = {
  text: string;
  type: "added" | "removed" | "unchanged";
  oldLineNum: number;
  newLineNum: number;
};

type DiffStats = { added: number; removed: number };

function splitChangeIntoLines(value: string): string[] {
  const lines = value.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function formatCompactDiff(
  oldContent: string,
  newContent: string,
  contextLines = 3,
): string {
  const changes = diffLines(oldContent, newContent);
  const lines: string[] = [];

  const allLines: LineInfo[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  for (const change of changes) {
    const changeLines = splitChangeIntoLines(change.value);

    for (const text of changeLines) {
      if (change.added) {
        allLines.push({
          text,
          type: "added",
          oldLineNum: -1,
          newLineNum: newLineNum++,
        });
      } else if (change.removed) {
        allLines.push({
          text,
          type: "removed",
          oldLineNum: oldLineNum++,
          newLineNum: -1,
        });
      } else {
        allLines.push({
          text,
          type: "unchanged",
          oldLineNum: oldLineNum++,
          newLineNum: newLineNum++,
        });
      }
    }
  }

  let i = 0;
  while (i < allLines.length) {
    if (allLines[i].type === "unchanged") {
      i++;
      continue;
    }

    const hunkStart = Math.max(0, i - contextLines);
    let hunkEnd = i;

    while (hunkEnd < allLines.length) {
      if (allLines[hunkEnd].type !== "unchanged") {
        hunkEnd++;
      } else {
        let nextChange = hunkEnd;
        while (
          nextChange < allLines.length &&
          nextChange < hunkEnd + contextLines * 2 + 1
        ) {
          if (allLines[nextChange].type !== "unchanged") break;
          nextChange++;
        }
        if (
          nextChange < allLines.length &&
          nextChange < hunkEnd + contextLines * 2 + 1 &&
          allLines[nextChange].type !== "unchanged"
        ) {
          hunkEnd = nextChange + 1;
        } else {
          break;
        }
      }
    }
    hunkEnd = Math.min(allLines.length, hunkEnd + contextLines);

    const hunkLines = allLines.slice(hunkStart, hunkEnd);
    const firstOldLine =
      hunkLines.find((l) => l.oldLineNum > 0)?.oldLineNum || 1;
    const firstNewLine =
      hunkLines.find((l) => l.newLineNum > 0)?.newLineNum || 1;
    const oldCount = hunkLines.filter((l) => l.type !== "added").length;
    const newCount = hunkLines.filter((l) => l.type !== "removed").length;
    lines.push(
      pc.cyan(
        `@@ -${firstOldLine},${oldCount} +${firstNewLine},${newCount} @@`,
      ),
    );

    for (let j = hunkStart; j < hunkEnd; j++) {
      const line = allLines[j];
      if (line.type === "added") {
        lines.push(pc.bgGreen(pc.black(`+ ${line.text}`)));
      } else if (line.type === "removed") {
        lines.push(pc.bgRed(pc.black(`- ${line.text}`)));
      } else {
        lines.push(pc.dim(`  ${line.text}`));
      }
    }

    lines.push("");
    i = hunkEnd;
  }

  return lines.join("\n").trimEnd();
}

function getDiffStats(oldContent: string, newContent: string): DiffStats {
  const changes = diffLines(oldContent, newContent);
  let added = 0;
  let removed = 0;

  for (const change of changes) {
    const lineCount = splitChangeIntoLines(change.value).length;

    if (change.added) added += lineCount;
    else if (change.removed) removed += lineCount;
  }

  return { added, removed };
}

const BATMAN_LOGO = `
       _==/          i     i          \\==_
     /XX/            |\\___/|            \\XX\\
   /XXXX\\            |XXXXX|            /XXXX\\
  |XXXXXX\\_         _XXXXXXX_         _/XXXXXX|
 XXXXXXXXXXXxxxxxxxXXXXXXXXXXXxxxxxxxXXXXXXXXXXX
|XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
|XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|
 XXXXXX/^^^^"\\XXXXXXXXXXXXXXXXXXXXX/^^^^^\\XXXXXX
  |XXX|       \\XXX/^^\\XXXXX/^^\\XXX/       |XXX|
    \\XX\\       \\X/    \\XXX/    \\X/       /XX/
       "\\       "      \\X/      "       /"

            @wbern/claude-instructions
`;

export interface CliArgs {
  scope?: string;
  prefix?: string;
  skipTemplateInjection?: boolean;
  commands?: string[];
  updateExisting?: boolean;
  overwrite?: boolean;
  skipOnConflict?: boolean;
  flags?: string[];
  allowedTools?: string[];
  includeContribCommands?: boolean;
  skills?: string[];
  agent?: string;
}

export async function main(args?: CliArgs): Promise<void> {
  intro(BATMAN_LOGO);

  let scope: string | symbol;
  let commandPrefix: string | symbol;
  let selectedCommands: string[] | symbol | undefined;
  let selectedAllowedTools: string[] | symbol | undefined;
  let selectedFlags: string[] | symbol | undefined;
  let selectedSkills: string[] | undefined;
  let cachedExistingFiles: ExistingFile[] | undefined;
  let customOutputPath: string | undefined;
  let selectedAgent: Agent = AGENTS.OPENCODE;

  if (args?.scope) {
    // Non-interactive mode (scope is the only required flag)
    scope = v.parse(ScopeSchema, args.scope);
    commandPrefix = args.prefix ?? "";
    selectedCommands = args.commands;
    selectedFlags = args.flags ? v.parse(FlagsSchema, args.flags) : undefined;
    selectedAllowedTools = args.allowedTools;
    selectedAgent = args.agent
      ? v.parse(AgentSchema, args.agent)
      : AGENTS.OPENCODE;

    // If scope is a custom path, compute the output path
    if (isCustomPath(scope as string)) {
      customOutputPath = path.join(
        scope as string,
        DIRECTORIES.CLAUDE,
        DIRECTORIES.COMMANDS,
      );
    }

    // Validate mutually exclusive flags in non-interactive mode
    if (selectedFlags) {
      const flags = selectedFlags as string[];
      if (flags.includes("gh-cli") && flags.includes("gh-mcp")) {
        log.warn(
          "gh-cli and gh-mcp are mutually exclusive. Please select only one.",
        );
        return;
      }
    }

    if (args.updateExisting) {
      cachedExistingFiles = await checkExistingFiles(
        customOutputPath,
        scope as Scope,
        {
          commandPrefix: commandPrefix || "",
          flags: selectedFlags,
          includeContribCommands: args.includeContribCommands,
        },
      );
      selectedCommands = cachedExistingFiles.map((f) => f.filename);

      if (selectedCommands.length === 0) {
        log.warn("No existing commands found in target directory");
        return;
      }
    }
  } else {
    // In non-TTY mode, we can't prompt - error out with helpful message
    if (!isInteractiveTTY()) {
      const requiredFlags = CLI_OPTIONS.filter(
        (opt) => opt.requiredForNonInteractive,
      )
        .map((opt) => opt.flag)
        .join(", ");
      log.warn(`Non-interactive mode requires ${requiredFlags} arguments`);
      return;
    }

    // Interactive mode: agent target first, then scope, then flags
    const agentChoice = await select({
      message: "Select target agent",
      options: [
        {
          value: AGENTS.OPENCODE,
          label: "OpenCode",
          hint: ".opencode/commands/",
        },
        {
          value: AGENTS.CLAUDE,
          label: "Claude Code",
          hint: ".claude/commands/",
        },
        { value: AGENTS.BOTH, label: "Both", hint: ".opencode/ and .claude/" },
      ],
    });

    if (isCancel(agentChoice)) {
      return;
    }

    selectedAgent = agentChoice as Agent;

    const terminalWidth = process.stdout.columns || 80;
    const uiOverhead = 25; // checkbox, label, padding
    scope = await select({
      message: "Select installation scope",
      options: getScopeOptions(
        terminalWidth - uiOverhead,
        selectedAgent === AGENTS.BOTH ? AGENTS.OPENCODE : selectedAgent,
      ),
    });

    if (isCancel(scope)) {
      return;
    }

    commandPrefix = await text({
      message: "Command prefix (optional)",
      placeholder: "e.g. my-",
    });

    if (isCancel(commandPrefix)) {
      return;
    }

    // Select feature flags (replaces variant selection)
    // Loop to allow re-prompting if mutually exclusive flags are selected
    while (true) {
      selectedFlags = await groupMultiselect({
        message: "Select feature flags (optional)",
        options: {
          "Feature Flags": FLAG_OPTIONS.map(({ value, label, hint }) => ({
            value,
            label,
            hint,
          })),
        },
        required: false,
      });

      if (isCancel(selectedFlags)) {
        return;
      }

      // Validate mutually exclusive flags: gh-cli and gh-mcp cannot both be selected
      const flags = selectedFlags as string[];
      if (flags.includes("gh-cli") && flags.includes("gh-mcp")) {
        log.warn(
          "gh-cli and gh-mcp are mutually exclusive. Please select only one.",
        );
        continue;
      }

      break;
    }

    let groupedCommands = await getCommandsGroupedByCategory();

    if (args?.updateExisting) {
      cachedExistingFiles = await checkExistingFiles(
        undefined,
        scope as Scope,
        {
          commandPrefix: (commandPrefix as string) || "",
          flags: selectedFlags as string[],
          includeContribCommands: args.includeContribCommands,
        },
      );
      const existingFilenames = new Set(
        cachedExistingFiles.map((f) => f.filename),
      );

      const filteredGrouped: typeof groupedCommands = {};
      for (const [category, commands] of Object.entries(groupedCommands)) {
        const filtered = commands.filter((cmd) =>
          existingFilenames.has(cmd.value),
        );
        if (filtered.length > 0) {
          filteredGrouped[category] = filtered;
        }
      }
      groupedCommands = filteredGrouped;

      if (Object.keys(groupedCommands).length === 0) {
        log.warn("No existing commands found in target directory");
        return;
      }
    }

    const enabledCommandValues = Object.values(groupedCommands)
      .flat()
      .filter((cmd) => cmd.selectedByDefault)
      .map((cmd) => cmd.value);
    selectedCommands = await groupMultiselect({
      message: "Select commands to install (Enter to accept all)",
      options: groupedCommands,
      initialValues: enabledCommandValues,
    });

    if (isCancel(selectedCommands)) {
      return;
    }

    const requestedToolsOptions = await getRequestedToolsOptions();

    if (requestedToolsOptions.length > 0) {
      selectedAllowedTools = await groupMultiselect({
        message: "Select allowed tools for commands (optional)",
        options: {
          "All tools": requestedToolsOptions,
        },
        required: false,
      });

      if (isCancel(selectedAllowedTools)) {
        return;
      }
    }

    // Skills selection - allow users to generate selected commands as skills
    const skillsHint =
      selectedAgent === AGENTS.CLAUDE
        ? "Generate as skill in .claude/skills/"
        : "Generate as skill in .opencode/skills/";
    const commandsForSkills = (selectedCommands as string[]).map((cmd) => ({
      value: cmd,
      label: cmd.replace(/\.md$/, ""),
      hint: skillsHint,
    }));
    const selectedSkillsResult = await groupMultiselect({
      message: "Select commands to also generate as skills (optional)",
      options: {
        "Available commands": commandsForSkills,
      },
      initialValues: ["tdd.md"].filter((s) =>
        (selectedCommands as string[]).includes(s),
      ),
      required: false,
    });

    if (isCancel(selectedSkillsResult)) return;
    selectedSkills = selectedSkillsResult as string[];
  }

  const existingFiles =
    cachedExistingFiles ??
    (await checkExistingFiles(customOutputPath, scope as Scope, {
      commandPrefix: commandPrefix as string,
      commands: selectedCommands as string[],
      allowedTools: selectedAllowedTools as string[] | undefined,
      flags: selectedFlags as string[] | undefined,
      includeContribCommands: args?.includeContribCommands,
      agent: selectedAgent,
    }));

  const skipFiles: string[] = [];
  const conflictingFiles = existingFiles.filter((f) => !f.isIdentical);
  const shouldSkipConflicts = args?.skipOnConflict || !isInteractiveTTY();
  if (args?.overwrite) {
    for (const file of conflictingFiles) {
      log.info(`Overwriting ${file.filename}`);
    }
  } else if (!shouldSkipConflicts) {
    const hasMultipleConflicts = conflictingFiles.length > 1;
    let overwriteAllSelected = false;
    let skipAllSelected = false;

    for (const file of existingFiles) {
      if (file.isIdentical) {
        log.info(`${file.filename} is identical, skipping`);
        skipFiles.push(file.filename);
        continue;
      }

      if (overwriteAllSelected) {
        continue;
      }

      if (skipAllSelected) {
        skipFiles.push(file.filename);
        continue;
      }

      const stats = getDiffStats(file.existingContent, file.newContent);

      const diff = formatCompactDiff(file.existingContent, file.newContent);
      note(diff, `Diff: ${file.filename}`);
      log.info(`+${stats.added} -${stats.removed}`);

      if (hasMultipleConflicts) {
        const choice = await select({
          message: `Overwrite ${file.filename}?`,
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "overwrite_all", label: "Overwrite all" },
            { value: "skip_all", label: "Skip all" },
          ],
        });

        if (isCancel(choice)) {
          return;
        }

        if (choice === "no") {
          skipFiles.push(file.filename);
        } else if (choice === "overwrite_all") {
          overwriteAllSelected = true;
        } else if (choice === "skip_all") {
          skipAllSelected = true;
          skipFiles.push(file.filename);
        }
      } else {
        const shouldOverwrite = await confirm({
          message: `Overwrite ${file.filename}?`,
        });
        if (isCancel(shouldOverwrite)) {
          return;
        }
        if (!shouldOverwrite) {
          skipFiles.push(file.filename);
        }
      }
    }
  } else {
    // shouldSkipConflicts is true here (after overwrite and interactive branches)
    for (const file of conflictingFiles) {
      skipFiles.push(file.filename);
      log.warn(`Skipping ${file.filename} (conflict)`);
    }
    if (conflictingFiles.length > 0 && !isInteractiveTTY()) {
      log.info(
        "To resolve conflicts, run interactively or use --overwrite to overwrite",
      );
    }
  }

  // For "both" agent, generate to OpenCode first then Claude
  const agentsToGenerate: Agent[] =
    selectedAgent === AGENTS.BOTH
      ? [AGENTS.OPENCODE, AGENTS.CLAUDE]
      : [selectedAgent];

  let totalFilesGenerated = 0;
  for (const agentTarget of agentsToGenerate) {
    const agentResult = await generateToDirectory(
      customOutputPath,
      scope as Scope,
      {
        commandPrefix: commandPrefix as string,
        skipTemplateInjection: args?.skipTemplateInjection,
        commands: selectedCommands as string[],
        skipFiles,
        allowedTools: selectedAllowedTools as string[] | undefined,
        flags: selectedFlags as string[] | undefined,
        includeContribCommands: args?.includeContribCommands,
        agent: agentTarget,
      },
    );
    totalFilesGenerated = agentResult.filesGenerated;
  }
  const result = { filesGenerated: totalFilesGenerated };

  // Generate skills (from interactive selection or --skills CLI option)
  let skillsGenerated = 0;
  const skillsToGenerate = selectedSkills ?? args?.skills;
  if (skillsToGenerate && skillsToGenerate.length > 0) {
    for (const agentTarget of agentsToGenerate) {
      const skillsPath = isCustomPath(scope as string)
        ? path.join(scope as string, DIRECTORIES.CLAUDE, "skills")
        : getSkillsPath(scope as string, agentTarget);
      const skillsResult = await generateSkillsToDirectory(
        skillsPath,
        skillsToGenerate,
        { flags: selectedFlags as string[] | undefined },
      );
      skillsGenerated = skillsResult.skillsGenerated;
    }
  }

  // Primary path for display message (first agent target)
  const primaryAgent = agentsToGenerate[0];
  const agentDir = primaryAgent === AGENTS.CLAUDE ? ".claude" : ".opencode";
  const fullPath = isCustomPath(scope as string)
    ? path.join(scope as string, DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS)
    : scope === "project"
      ? `${process.cwd()}/${agentDir}/commands`
      : primaryAgent === AGENTS.CLAUDE
        ? `${os.homedir()}/.claude/commands`
        : `${os.homedir()}/.config/opencode/commands`;

  // Build automation command for interactive mode
  const isInteractiveMode = !args?.scope;
  let automationNote = "";
  if (isInteractiveMode) {
    const parts = ["claude-instructions"];
    parts.push(`--scope=${scope as string}`);
    parts.push(`--agent=${selectedAgent}`);
    if (commandPrefix) {
      parts.push(`--prefix=${commandPrefix as string}`);
    }
    if (selectedFlags && (selectedFlags as string[]).length > 0) {
      parts.push(`--flags=${(selectedFlags as string[]).join(",")}`);
    }
    if (selectedCommands && (selectedCommands as string[]).length > 0) {
      parts.push(`--commands=${(selectedCommands as string[]).join(",")}`);
    }
    if (selectedAllowedTools && (selectedAllowedTools as string[]).length > 0) {
      // Quote value to protect shell special characters (*, parentheses)
      parts.push(
        `--allowed-tools="${(selectedAllowedTools as string[]).join(",")}"`,
      );
    }
    if (selectedSkills && selectedSkills.length > 0) {
      parts.push(`--skills=${selectedSkills.join(",")}`);
    }
    automationNote = `

To automate this setup:
  ${parts.join(" ")}`;
  }

  const skillsMessage =
    skillsGenerated > 0
      ? `\nInstalled ${skillsGenerated} skills to ${fullPath.replace("/commands", "/skills")}`
      : "";

  const agentRestartNote =
    selectedAgent === AGENTS.CLAUDE
      ? "If Claude Code is already running, restart it to pick up the new commands."
      : selectedAgent === AGENTS.BOTH
        ? "Restart your agent (OpenCode or Claude Code) to pick up the new commands."
        : "If OpenCode is already running, restart it to pick up the new commands.";

  outro(
    `Installed ${result.filesGenerated} commands to ${fullPath}${skillsMessage}

${agentRestartNote}

Try it out:

  /kata                  → Pick a practice challenge
  /red 1 returns "1"     → Write first failing test for your kata
  /green                 → Make it pass

See a full example: https://github.com/wbern/claude-instructions#example-conversations${automationNote}

Happy coding!`,
  );
}

import {
  select,
  text,
  groupMultiselect,
  isCancel,
  intro,
  outro,
  confirm,
  note,
  log,
} from "@clack/prompts";
import os from "os";
import { diffLines } from "diff";
import picocolors from "picocolors";

const pc = process.env.FORCE_COLOR ? picocolors.createColors(true) : picocolors;
import {
  generateToDirectory,
  checkExistingFiles,
  VARIANT_OPTIONS,
  getScopeOptions,
  getCommandsGroupedByCategory,
  getRequestedToolsOptions,
  type Variant,
  type Scope,
  type ExistingFile,
} from "./cli-generator.js";
import { CLI_OPTIONS } from "./cli-options.js";
import { isInteractiveTTY } from "./tty.js";

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
  variant?: string;
  scope?: string;
  prefix?: string;
  skipTemplateInjection?: boolean;
  commands?: string[];
  updateExisting?: boolean;
  overwrite?: boolean;
  skipOnConflict?: boolean;
}

export async function main(args?: CliArgs): Promise<void> {
  intro(BATMAN_LOGO);

  let variant: string | symbol;
  let scope: string | symbol;
  let commandPrefix: string | symbol;
  let selectedCommands: string[] | symbol | undefined;
  let selectedAllowedTools: string[] | symbol | undefined;
  let cachedExistingFiles: ExistingFile[] | undefined;

  if (args?.variant && args?.scope) {
    variant = args.variant;
    scope = args.scope;
    commandPrefix = args.prefix ?? "";
    selectedCommands = args.commands;

    if (args.updateExisting) {
      cachedExistingFiles = await checkExistingFiles(
        undefined,
        variant as Variant,
        scope as Scope,
        { commandPrefix: commandPrefix || "" },
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

    variant = await select({
      message: "Select variant",
      options: [...VARIANT_OPTIONS],
    });

    if (isCancel(variant)) {
      return;
    }

    const terminalWidth = process.stdout.columns || 80;
    const uiOverhead = 25; // checkbox, label, padding
    scope = await select({
      message: "Select installation scope",
      options: getScopeOptions(terminalWidth - uiOverhead),
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

    let groupedCommands = await getCommandsGroupedByCategory(
      variant as Variant,
    );

    if (args?.updateExisting) {
      cachedExistingFiles = await checkExistingFiles(
        undefined,
        variant as Variant,
        scope as Scope,
        { commandPrefix: (commandPrefix as string) || "" },
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

    const requestedToolsOptions = await getRequestedToolsOptions(
      variant as Variant,
    );

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
  }

  const existingFiles =
    cachedExistingFiles ??
    (await checkExistingFiles(undefined, variant as Variant, scope as Scope, {
      commandPrefix: commandPrefix as string,
      commands: selectedCommands as string[],
      allowedTools: selectedAllowedTools as string[] | undefined,
    }));

  const skipFiles: string[] = [];
  const shouldSkipConflicts = args?.skipOnConflict || !isInteractiveTTY();
  if (args?.overwrite) {
    for (const file of existingFiles) {
      if (!file.isIdentical) {
        log.info(`Overwriting ${file.filename}`);
      }
    }
  } else if (!shouldSkipConflicts) {
    const conflictingFiles = existingFiles.filter((f) => !f.isIdentical);
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
  } else if (shouldSkipConflicts) {
    for (const file of existingFiles) {
      if (!file.isIdentical) {
        skipFiles.push(file.filename);
        log.warn(`Skipping ${file.filename} (conflict)`);
      }
    }
    if (skipFiles.length > 0 && !isInteractiveTTY()) {
      log.info(
        "To resolve conflicts, run interactively or use --overwrite to overwrite",
      );
    }
  }

  const result = await generateToDirectory(
    undefined,
    variant as Variant,
    scope as Scope,
    {
      commandPrefix: commandPrefix as string,
      skipTemplateInjection: args?.skipTemplateInjection,
      commands: selectedCommands as string[],
      skipFiles,
      allowedTools: selectedAllowedTools as string[] | undefined,
    },
  );

  const fullPath =
    scope === "project"
      ? `${process.cwd()}/.claude/commands`
      : `${os.homedir()}/.claude/commands`;

  outro(
    `Installed ${result.filesGenerated} commands to ${fullPath}\n\nIf Claude Code is already running, restart it to pick up the new commands.\n\nTry it out: /red clicking submit with empty email shows validation error\n\nHappy TDD'ing!`,
  );
}

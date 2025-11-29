import { select, text, groupMultiselect, isCancel, intro, outro } from '@clack/prompts';
import os from 'os';
import { generateToDirectory, VARIANT_OPTIONS, getScopeOptions, getCommandsGroupedByCategory, type Variant, type Scope } from './cli-generator.js';

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
}

export async function main(args?: CliArgs): Promise<void> {
  intro(BATMAN_LOGO);

  let variant: string | symbol;
  let scope: string | symbol;
  let commandPrefix: string | symbol;
  let selectedCommands: string[] | symbol | undefined;

  if (args?.variant && args?.scope && args?.prefix !== undefined) {
    variant = args.variant;
    scope = args.scope;
    commandPrefix = args.prefix;
    selectedCommands = args.commands;
  } else {
    variant = await select({
      message: 'Select variant',
      options: [...VARIANT_OPTIONS]
    });

    if (isCancel(variant)) {
      return;
    }

    const terminalWidth = process.stdout.columns || 80;
    const uiOverhead = 25; // checkbox, label, padding
    scope = await select({
      message: 'Select installation scope',
      options: getScopeOptions(terminalWidth - uiOverhead)
    });

    if (isCancel(scope)) {
      return;
    }

    commandPrefix = await text({
      message: 'Command prefix (optional)',
      placeholder: 'e.g. my-'
    });

    if (isCancel(commandPrefix)) {
      return;
    }

    const groupedCommands = await getCommandsGroupedByCategory(variant as Variant);
    const allCommandValues = Object.values(groupedCommands).flat().map(cmd => cmd.value);
    selectedCommands = await groupMultiselect({
      message: 'Select commands to install (Enter to accept all)',
      options: groupedCommands,
      initialValues: allCommandValues
    });

    if (isCancel(selectedCommands)) {
      return;
    }
  }

  const result = await generateToDirectory(undefined, variant as Variant, scope as Scope, { commandPrefix: commandPrefix as string, skipTemplateInjection: args?.skipTemplateInjection, commands: selectedCommands as string[] });

  const fullPath = scope === 'project'
    ? `${process.cwd()}/.claude/commands`
    : `${os.homedir()}/.claude/commands`;

  outro(`Installed ${result.filesGenerated} commands to ${fullPath}\n\nIf Claude Code is already running, restart it to pick up the new commands.\n\nHappy TDD'ing!`);
}

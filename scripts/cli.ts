import { select, isCancel, intro, outro } from '@clack/prompts';
import { generateToDirectory, VARIANT_OPTIONS, SCOPE_OPTIONS, type Variant, type Scope } from './cli-generator.js';

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

export async function main(): Promise<void> {
  intro(BATMAN_LOGO);

  const variant = await select({
    message: 'Select variant',
    options: [...VARIANT_OPTIONS]
  });

  if (isCancel(variant)) {
    return;
  }

  const scope = await select({
    message: 'Select installation scope',
    options: [...SCOPE_OPTIONS]
  });

  if (isCancel(scope)) {
    return;
  }

  const result = await generateToDirectory(undefined, variant as Variant, scope as Scope);

  outro(`Installed ${result.filesGenerated} commands to .claude/commands`);
}

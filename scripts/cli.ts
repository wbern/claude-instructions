import { select } from '@clack/prompts';
import { generateToDirectory, VARIANTS, SCOPES, type Variant, type Scope } from './cli-generator.js';

export async function main(): Promise<void> {
  const variant = await select({
    message: 'Select variant',
    options: [
      { value: VARIANTS.WITH_BEADS, label: 'With Beads' },
      { value: VARIANTS.WITHOUT_BEADS, label: 'Without Beads' }
    ]
  }) as Variant;

  const scope = await select({
    message: 'Select installation scope',
    options: [
      { value: SCOPES.PROJECT, label: 'Project/Repository' },
      { value: SCOPES.USER, label: 'User (Global)' }
    ]
  }) as Scope;

  await generateToDirectory(undefined, variant, scope);
}

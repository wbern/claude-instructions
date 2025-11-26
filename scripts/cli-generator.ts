import { select } from '@clack/prompts';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VARIANTS = {
  WITH_BEADS: 'with-beads',
  WITHOUT_BEADS: 'without-beads'
} as const;

export const SCOPES = {
  PROJECT: 'project',
  USER: 'user'
} as const;

export const DIRECTORIES = {
  CLAUDE: '.claude',
  COMMANDS: 'commands',
  DOWNLOADS: 'downloads'
} as const;

export type Variant = typeof VARIANTS[keyof typeof VARIANTS];
export type Scope = typeof SCOPES[keyof typeof SCOPES];

export interface GenerateResult {
  success: boolean;
  filesGenerated: number;
  variant?: Variant;
}

function getDestinationPath(outputPath: string | undefined, scope: string | undefined): string | undefined {
  if (outputPath) {
    return outputPath;
  }

  if (scope === SCOPES.PROJECT) {
    return path.join(process.cwd(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }

  if (scope === SCOPES.USER) {
    return path.join(os.homedir(), DIRECTORIES.CLAUDE, DIRECTORIES.COMMANDS);
  }

  return undefined;
}

export async function generateToDirectory(outputPath?: string, variant?: Variant, scope?: Scope): Promise<GenerateResult> {
  const sourcePath = path.join(__dirname, '..', DIRECTORIES.DOWNLOADS, variant || VARIANTS.WITH_BEADS);

  const destinationPath = getDestinationPath(outputPath, scope);

  if (!destinationPath) {
    throw new Error('Either outputPath or scope must be provided');
  }

  await fs.copy(sourcePath, destinationPath, {});

  return {
    success: true,
    filesGenerated: 1,
    variant
  };
}

export async function promptForVariant(): Promise<Variant> {
  const variant = await select({
    message: 'Select variant',
    options: [
      { value: VARIANTS.WITH_BEADS, label: 'With Beads' },
      { value: VARIANTS.WITHOUT_BEADS, label: 'Without Beads' }
    ]
  });

  return variant as Variant;
}

export async function promptForScope(): Promise<Scope> {
  const scope = await select({
    message: 'Select installation scope',
    options: [
      { value: SCOPES.PROJECT, label: 'Project/Repository' },
      { value: SCOPES.USER, label: 'User (Global)' }
    ]
  });

  return scope as Scope;
}

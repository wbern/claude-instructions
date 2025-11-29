declare module "markdown-magic" {
  export interface MarkdownMagicConfig {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transforms: Record<string, (args: any) => string>;
    outputFlatten?: boolean;
    output?: {
      directory: string;
      removeComments: boolean;
      applyTransformsToSource: boolean;
    };
  }

  export function markdownMagic(
    files: string[],
    config: MarkdownMagicConfig,
  ): void;
}

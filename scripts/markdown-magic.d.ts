declare module 'markdown-magic' {
  export interface MarkdownMagicConfig {
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
    config: MarkdownMagicConfig
  ): void;
}

import { describe, it, expect, vi } from 'vitest';

vi.mock('@clack/prompts', () => ({
  select: vi.fn()
}));

vi.mock('./cli-generator.js', () => ({
  generateToDirectory: vi.fn().mockResolvedValue({ success: true, filesGenerated: 5 }),
  VARIANTS: { WITH_BEADS: 'with-beads', WITHOUT_BEADS: 'without-beads' },
  SCOPES: { PROJECT: 'project', USER: 'user' }
}));

describe('CLI', () => {
  it('should export a main function', async () => {
    const { main } = await import('./cli.js');

    expect(typeof main).toBe('function');
  });

  it('should prompt for variant and scope then generate', async () => {
    const { select } = await import('@clack/prompts');
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');

    await main();

    expect(select).toHaveBeenCalledTimes(2);
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      'with-beads',
      'project'
    );
  });
});

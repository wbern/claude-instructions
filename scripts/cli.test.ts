import { describe, it, expect, vi } from 'vitest';

const mockCancel = Symbol('cancel');

vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  isCancel: (value: unknown) => value === mockCancel,
  intro: vi.fn(),
  outro: vi.fn()
}));

vi.mock('./cli-generator.js', () => ({
  generateToDirectory: vi.fn().mockResolvedValue({ success: true, filesGenerated: 5 }),
  VARIANT_OPTIONS: [
    { value: 'with-beads', label: 'With Beads' },
    { value: 'without-beads', label: 'Without Beads' }
  ],
  SCOPE_OPTIONS: [
    { value: 'project', label: 'Project/Repository' },
    { value: 'user', label: 'User (Global)' }
  ]
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

  it('should exit gracefully when user cancels with Ctrl+C', async () => {
    const { select } = await import('@clack/prompts');
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    vi.mocked(select).mockResolvedValueOnce(mockCancel);
    vi.mocked(generateToDirectory).mockClear();

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it('should show intro and outro messages', async () => {
    const { select, intro, outro } = await import('@clack/prompts');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');

    await main();

    expect(intro).toHaveBeenCalled();
    expect(outro).toHaveBeenCalled();
  });

  it('should show Batman logo in intro', async () => {
    const { select, intro } = await import('@clack/prompts');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');

    await main();

    expect(intro).toHaveBeenCalledWith(expect.stringContaining('       _==/          i     i          \\==_'));
  });

  it('should show file count and destination in outro', async () => {
    const { select, outro } = await import('@clack/prompts');
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    vi.mocked(generateToDirectory).mockResolvedValue({
      success: true,
      filesGenerated: 17,
      variant: 'with-beads'
    } as never);

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');

    await main();

    expect(outro).toHaveBeenCalledWith(expect.stringContaining('17'));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining('.claude/commands'));
  });
});

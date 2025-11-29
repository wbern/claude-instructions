import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCancel = Symbol('cancel');

vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  groupMultiselect: vi.fn(),
  isCancel: (value: unknown) => value === mockCancel,
  intro: vi.fn(),
  outro: vi.fn()
}));

vi.mock('./cli-generator.js', () => ({
  generateToDirectory: vi.fn().mockResolvedValue({ success: true, filesGenerated: 5 }),
  getAvailableCommands: vi.fn().mockResolvedValue(['red.md', 'green.md', 'refactor.md']),
  getCommandsGroupedByCategory: vi.fn().mockResolvedValue({
    'TDD Cycle': [
      { value: 'red.md', label: 'red.md', hint: 'Red phase' },
      { value: 'green.md', label: 'green.md', hint: 'Green phase' }
    ],
    'Workflow': [
      { value: 'commit.md', label: 'commit.md', hint: 'Create commit' }
    ]
  }),
  VARIANT_OPTIONS: [
    { value: 'with-beads', label: 'With Beads' },
    { value: 'without-beads', label: 'Without Beads' }
  ],
  getScopeOptions: vi.fn().mockReturnValue([
    { value: 'project', label: 'Project/Repository', hint: '/mock/path/.claude/commands' },
    { value: 'user', label: 'User (Global)', hint: '/home/user/.claude/commands' }
  ])
}));

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export a main function', async () => {
    const { main } = await import('./cli.js');

    expect(typeof main).toBe('function');
  });

  it('should prompt for variant and scope then generate', async () => {
    const { select, text } = await import('@clack/prompts');
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');
    vi.mocked(text).mockResolvedValueOnce('');

    await main();

    expect(select).toHaveBeenCalledTimes(2);
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      'with-beads',
      'project',
      expect.objectContaining({ commandPrefix: '' })
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
    const { select, text, intro, outro } = await import('@clack/prompts');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');
    vi.mocked(text).mockResolvedValueOnce('');

    await main();

    expect(intro).toHaveBeenCalled();
    expect(outro).toHaveBeenCalled();
  });

  it('should show Batman logo in intro', async () => {
    const { select, text, intro } = await import('@clack/prompts');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');
    vi.mocked(text).mockResolvedValueOnce('');

    await main();

    expect(intro).toHaveBeenCalledWith(expect.stringContaining('       _==/          i     i          \\==_'));
  });

  it('should show file count and destination in outro', async () => {
    const { select, text, outro } = await import('@clack/prompts');
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
    vi.mocked(text).mockResolvedValueOnce('');

    await main();

    expect(outro).toHaveBeenCalledWith(expect.stringContaining('17'));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining('.claude/commands'));
  });

  it('should show detailed outro with full path, restart hint, and encouragement', async () => {
    const { select, text, outro } = await import('@clack/prompts');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');
    vi.mocked(text).mockResolvedValueOnce('');

    await main();

    expect(outro).toHaveBeenCalledWith(expect.stringContaining('Happy'));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining(process.cwd()));
    expect(outro).toHaveBeenCalledWith(expect.stringContaining('restart'));
  });

  it('should prompt for command prefix and pass it to generator', async () => {
    const { select, text } = await import('@clack/prompts');
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');
    vi.mocked(text).mockResolvedValueOnce('my-');

    await main();

    expect(text).toHaveBeenCalled();
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      'with-beads',
      'project',
      expect.objectContaining({ commandPrefix: 'my-' })
    );
  });

  it('should exit gracefully when user cancels on prefix prompt', async () => {
    const { select, text } = await import('@clack/prompts');
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');
    vi.mocked(text).mockResolvedValueOnce(mockCancel);

    await main();

    expect(generateToDirectory).not.toHaveBeenCalled();
  });

  it('should skip prompts when all arguments are provided via CLI', async () => {
    const { select, text } = await import('@clack/prompts');
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    await main({ variant: 'with-beads', scope: 'project', prefix: 'my-' });

    expect(select).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      'with-beads',
      'project',
      expect.objectContaining({ commandPrefix: 'my-' })
    );
  });

  it('should pass skipTemplateInjection to generator', async () => {
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    await main({ variant: 'with-beads', scope: 'project', prefix: '', skipTemplateInjection: true });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      'with-beads',
      'project',
      expect.objectContaining({ skipTemplateInjection: true })
    );
  });

  it('should prompt for command selection with groupMultiselect', async () => {
    const { select, text, groupMultiselect } = await import('@clack/prompts');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');
    vi.mocked(groupMultiselect).mockResolvedValueOnce(['red.md', 'green.md']);
    vi.mocked(text).mockResolvedValueOnce('');

    await main();

    expect(groupMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Enter to accept all'),
        options: expect.any(Object)
      })
    );
  });

  it('should pass selected commands to generator', async () => {
    const { select, text, groupMultiselect } = await import('@clack/prompts');
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    vi.mocked(select)
      .mockResolvedValueOnce('with-beads')
      .mockResolvedValueOnce('project');
    vi.mocked(groupMultiselect).mockResolvedValueOnce(['red.md', 'green.md']);
    vi.mocked(text).mockResolvedValueOnce('');

    await main();

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      'with-beads',
      'project',
      expect.objectContaining({ commands: ['red.md', 'green.md'] })
    );
  });

  it('should pass commands from CLI args to generator in non-interactive mode', async () => {
    const { generateToDirectory } = await import('./cli-generator.js');
    const { main } = await import('./cli.js');

    await main({ variant: 'with-beads', scope: 'project', prefix: '', commands: ['red', 'green'] });

    expect(generateToDirectory).toHaveBeenCalledWith(
      undefined,
      'with-beads',
      'project',
      expect.objectContaining({ commands: ['red', 'green'] })
    );
  });
});

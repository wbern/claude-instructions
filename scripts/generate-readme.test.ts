import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  getCategory,
  generateCommandsMarkdown,
  CATEGORIES
} from './generate-readme.js';

describe('parseFrontmatter', () => {
  it('should parse frontmatter from markdown', () => {
    const content = `---
description: Test command
argument-hint: <test>
---

# Content here`;

    const result = parseFrontmatter(content);

    expect(result).toMatchSnapshot();
  });

  it('should return empty object when no frontmatter', () => {
    const content = '# Just content';
    const result = parseFrontmatter(content);

    expect(result).toEqual({});
  });

  it('should handle multiline frontmatter values', () => {
    const content = `---
description: Execute TDD Red Phase - write ONE failing test
argument-hint: <test description or feature requirement>
---`;

    const result = parseFrontmatter(content);
    expect(result.description).toBe('Execute TDD Red Phase - write ONE failing test');
  });
});

describe('getCategory', () => {
  it('should get category from frontmatter', () => {
    expect(getCategory({ _category: 'TDD Cycle' })).toBe('TDD Cycle');
    expect(getCategory({ _category: 'Planning' })).toBe('Planning');
    expect(getCategory({ _category: 'Workflow' })).toBe('Workflow');
  });

  it('should default to Utilities when no category specified', () => {
    expect(getCategory({})).toBe(CATEGORIES.UTILITIES);
    expect(getCategory({ description: 'Test' })).toBe(CATEGORIES.UTILITIES);
  });
});

describe('generateCommandsMarkdown', () => {
  it('should generate markdown for single category', () => {
    const commands = [
      { name: 'red', description: 'Write failing test', category: 'TDD Cycle', order: 2 },
      { name: 'green', description: 'Make test pass', category: 'TDD Cycle', order: 3 }
    ];

    const result = generateCommandsMarkdown(commands);
    expect(result).toMatchSnapshot();
  });

  it('should generate markdown for multiple categories', () => {
    const commands = [
      { name: 'red', description: 'Write failing test', category: 'TDD Cycle', order: 2 },
      { name: 'commit', description: 'Create commit', category: 'Workflow', order: 1 },
      { name: 'worktree-add', description: 'Add worktree', category: 'Worktree Management', order: 1 }
    ];

    const result = generateCommandsMarkdown(commands);
    expect(result).toMatchSnapshot();
  });

  it('should sort commands by order within category', () => {
    const commands = [
      { name: 'spike', description: 'Spike phase', category: 'TDD Cycle', order: 1 },
      { name: 'cycle', description: 'Full cycle', category: 'TDD Cycle', order: 5 },
      { name: 'green', description: 'Make test pass', category: 'TDD Cycle', order: 3 },
      { name: 'red', description: 'Write failing test', category: 'TDD Cycle', order: 2 }
    ];

    const result = generateCommandsMarkdown(commands);
    expect(result).toMatchSnapshot();
  });

  it('should maintain category order', () => {
    const commands = [
      { name: 'add-command', description: 'Add new command', category: 'Utilities', order: 1 },
      { name: 'red', description: 'Write failing test', category: 'TDD Cycle', order: 2 },
      { name: 'worktree-add', description: 'Add worktree', category: 'Worktree Management', order: 1 },
      { name: 'commit', description: 'Create commit', category: 'Workflow', order: 1 }
    ];

    const result = generateCommandsMarkdown(commands);

    // Planning should come first, then TDD Cycle, then Workflow, then Worktree Management, then Utilities
    expect(result).toMatchSnapshot();
  });

  it('should handle empty commands array', () => {
    const result = generateCommandsMarkdown([]);
    expect(result).toBe('');
  });
});

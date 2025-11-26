import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs-extra';

vi.mock('@clack/prompts', () => ({
  select: vi.fn()
}));

vi.mock('fs-extra', () => ({
  default: {
    copy: vi.fn(),
    ensureDir: vi.fn()
  }
}));

import { generateToDirectory, promptForVariant, promptForScope, VARIANTS, SCOPES } from './cli-generator.js';
import { select } from '@clack/prompts';

describe('CLI Generator', () => {
  const MOCK_OUTPUT_PATH = '/mock/output/path';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateToDirectory', () => {
    it('should generate command files to specified directory', async () => {
      const result = await generateToDirectory(MOCK_OUTPUT_PATH);

      expect(result.success).toBe(true);
      expect(result.filesGenerated).toBeGreaterThan(0);
    });

    it('should accept variant parameter and use it for generation', async () => {
      const result = await generateToDirectory(MOCK_OUTPUT_PATH, VARIANTS.WITH_BEADS);

      expect(result.success).toBe(true);
      expect(result.variant).toBe(VARIANTS.WITH_BEADS);
    });

    it('should copy files from source to output directory', async () => {
      await generateToDirectory(MOCK_OUTPUT_PATH, VARIANTS.WITH_BEADS);

      expect(fs.copy).toHaveBeenCalledWith(
        expect.stringContaining('downloads/with-beads'),
        MOCK_OUTPUT_PATH,
        expect.any(Object)
      );
    });

    it('should accept scope parameter and use project-level path', async () => {
      await generateToDirectory(undefined, VARIANTS.WITH_BEADS, SCOPES.PROJECT);

      expect(fs.copy).toHaveBeenCalledWith(
        expect.stringContaining('downloads/with-beads'),
        expect.stringContaining('.claude/commands'),
        expect.any(Object)
      );
    });

    it('should use user-level path when scope is user', async () => {
      await generateToDirectory(undefined, VARIANTS.WITH_BEADS, SCOPES.USER);

      expect(fs.copy).toHaveBeenCalledWith(
        expect.stringContaining('downloads/with-beads'),
        expect.stringContaining('.claude/commands'),
        expect.any(Object)
      );
    });
  });

  describe('promptForVariant', () => {
    it('should prompt user to select variant', async () => {
      vi.mocked(select).mockResolvedValue(VARIANTS.WITH_BEADS);

      const result = await promptForVariant();

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
          options: expect.arrayContaining([
            expect.objectContaining({ value: VARIANTS.WITH_BEADS }),
            expect.objectContaining({ value: VARIANTS.WITHOUT_BEADS })
          ])
        })
      );
      expect(result).toBe(VARIANTS.WITH_BEADS);
    });
  });

  describe('promptForScope', () => {
    it('should prompt user to select installation scope', async () => {
      vi.mocked(select).mockResolvedValue(SCOPES.PROJECT);

      const result = await promptForScope();

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
          options: expect.arrayContaining([
            expect.objectContaining({ value: SCOPES.PROJECT }),
            expect.objectContaining({ value: SCOPES.USER })
          ])
        })
      );
      expect(result).toBe(SCOPES.PROJECT);
    });
  });
});

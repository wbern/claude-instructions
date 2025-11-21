import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const DOWNLOADS_DIR = path.join(PROJECT_ROOT, 'downloads');

describe('downloads/with-beads', () => {
  const withBeadsDir = path.join(DOWNLOADS_DIR, 'with-beads');

  if (!fs.existsSync(withBeadsDir)) {
    it.skip('with-beads directory does not exist', () => {});
  } else {
    const files = fs.readdirSync(withBeadsDir).filter(f => f.endsWith('.md'));

    files.forEach(file => {
      it(`should match snapshot for ${file}`, () => {
        const content = fs.readFileSync(path.join(withBeadsDir, file), 'utf8');
        expect(content).toMatchSnapshot();
      });
    });
  }
});

describe('downloads/without-beads', () => {
  const withoutBeadsDir = path.join(DOWNLOADS_DIR, 'without-beads');

  if (!fs.existsSync(withoutBeadsDir)) {
    it.skip('without-beads directory does not exist', () => {});
  } else {
    const files = fs.readdirSync(withoutBeadsDir).filter(f => f.endsWith('.md'));

    files.forEach(file => {
      it(`should match snapshot for ${file}`, () => {
        const content = fs.readFileSync(path.join(withoutBeadsDir, file), 'utf8');
        expect(content).toMatchSnapshot();
      });
    });
  }
});

describe('downloads variants comparison', () => {
  it('should have same number of files in both variants', () => {
    const withBeadsDir = path.join(DOWNLOADS_DIR, 'with-beads');
    const withoutBeadsDir = path.join(DOWNLOADS_DIR, 'without-beads');

    if (fs.existsSync(withBeadsDir) && fs.existsSync(withoutBeadsDir)) {
      const withBeadsFiles = fs.readdirSync(withBeadsDir).filter(f => f.endsWith('.md'));
      const withoutBeadsFiles = fs.readdirSync(withoutBeadsDir).filter(f => f.endsWith('.md'));

      expect(withBeadsFiles.length).toBe(withoutBeadsFiles.length);
      expect(withBeadsFiles.sort()).toEqual(withoutBeadsFiles.sort());
    }
  });

  it('should have Beads content only in with-beads variant', () => {
    const withBeadsFile = path.join(DOWNLOADS_DIR, 'with-beads', 'pr.md');
    const withoutBeadsFile = path.join(DOWNLOADS_DIR, 'without-beads', 'pr.md');

    if (fs.existsSync(withBeadsFile) && fs.existsSync(withoutBeadsFile)) {
      const withBeadsContent = fs.readFileSync(withBeadsFile, 'utf8');
      const withoutBeadsContent = fs.readFileSync(withoutBeadsFile, 'utf8');

      // With-beads should have Beads Integration section
      expect(withBeadsContent).toContain('### Beads Integration');
      expect(withBeadsContent).toContain('bd ready');

      // Without-beads should NOT have expanded Beads content
      expect(withoutBeadsContent).not.toContain('### Beads Integration');
      expect(withoutBeadsContent).not.toContain('bd ready');
    }
  });
});

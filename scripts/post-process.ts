#!/usr/bin/env node
/**
 * Post-process markdown files to remove markdown-magic comment blocks.
 *
 * This is a workaround for markdown-magic v4.0.4 where the removeComments
 * option is documented but not actually implemented.
 */

import fs from 'fs';
import path from 'path';

// Regex to match markdown-magic comment blocks
const MAGIC_COMMENT_REGEX = /<!--\s*docs\s+.*?-->\n?|<!--\s*\/docs\s*-->\n?/g;

// Regex to match frontmatter fields with underscore prefix (build-only metadata)
const UNDERSCORE_FIELD_REGEX = /^_[a-zA-Z0-9_-]+:.*$/gm;

function processFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf8');

  // Remove markdown-magic comment blocks
  let cleaned = content.replace(MAGIC_COMMENT_REGEX, '');

  // Remove underscore-prefixed frontmatter fields
  cleaned = cleaned.replace(UNDERSCORE_FIELD_REGEX, '');

  // Clean up any double newlines in frontmatter that may result from field removal
  cleaned = cleaned.replace(/---\n([\s\S]*?)\n---/g, (_match, frontmatterContent: string) => {
    const cleanedFrontmatter = frontmatterContent.replace(/\n\n+/g, '\n').trim();
    return `---\n${cleanedFrontmatter}\n---`;
  });

  if (content !== cleaned) {
    fs.writeFileSync(filePath, cleaned, 'utf8');
    return true;
  }
  return false;
}

function processDirectory(dirPath: string): number {
  let filesProcessed = 0;
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      filesProcessed += processDirectory(filePath);
    } else if (file.endsWith('.md')) {
      if (processFile(filePath)) {
        filesProcessed++;
      }
    }
  });

  return filesProcessed;
}

// Get target from command line args (can be directory or file)
const target: string | undefined = process.argv[2];

if (!target) {
  console.error('Usage: tsx post-process.ts <directory-or-file>');
  process.exit(1);
}

if (!fs.existsSync(target)) {
  console.error(`Error: '${target}' does not exist`);
  process.exit(1);
}

const stat = fs.statSync(target);
let count: number;

if (stat.isDirectory()) {
  count = processDirectory(target);
} else if (target.endsWith('.md')) {
  count = processFile(target) ? 1 : 0;
} else {
  console.error(`Error: '${target}' is not a directory or markdown file`);
  process.exit(1);
}

console.log(`   ✅ Removed comment blocks from ${count} file(s)`);

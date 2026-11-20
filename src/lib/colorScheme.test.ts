import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');

describe('light-only color scheme', () => {
  it('tells browsers not to auto-darken the paper palette', () => {
    expect(readFileSync(join(root, 'index.html'), 'utf8')).toContain('<meta name="color-scheme" content="only light" />');
    expect(readFileSync(join(root, 'src/index.css'), 'utf8')).toMatch(/color-scheme:\s*only light;/);
  });
});

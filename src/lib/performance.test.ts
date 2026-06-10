import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

describe('first screen loading boundaries', () => {
  it('keeps heavy non-home pages out of the initial app bundle', () => {
    const appSource = readFileSync(join(repoRoot, 'src/App.tsx'), 'utf8');

    expect(appSource).toContain('lazy(');
    expect(appSource).not.toMatch(/import\s+Create\s+from\s+['"]\.\/pages\/Create['"]/);
    expect(appSource).not.toMatch(/import\s+Map\s+from\s+['"]\.\/pages\/Map['"]/);
    expect(appSource).not.toMatch(/import\s+Detail\s+from\s+['"]\.\/pages\/Detail['"]/);
    expect(appSource).not.toMatch(/import\s+ShareCatdex\s+from\s+['"]\.\/pages\/ShareCatdex['"]/);
  });

  it('loads poster generation only after the home share action is used', () => {
    const homeSource = readFileSync(join(repoRoot, 'src/pages/Home.tsx'), 'utf8');

    expect(homeSource).not.toMatch(/import\s+\{\s*shareCatCardPoster\s*\}\s+from\s+['"]\.\.\/lib\/sharePoster['"]/);
    expect(homeSource).toContain("import('../lib/sharePoster')");
  });

  it('loads photo conversion libraries only after a photo is selected', () => {
    const createSource = readFileSync(join(repoRoot, 'src/pages/Create.tsx'), 'utf8');

    expect(createSource).not.toMatch(/import\s+imageCompression\s+from\s+['"]browser-image-compression['"]/);
    expect(createSource).not.toMatch(/import\s+heic2any\s+from\s+['"]heic2any['"]/);
    expect(createSource).toContain("import('browser-image-compression')");
    expect(createSource).toContain("import('heic2any')");
  });

  it('loads map-only overlays and screenshot capture only after those actions are used', () => {
    const mapSource = readFileSync(join(repoRoot, 'src/pages/Map.tsx'), 'utf8');

    expect(mapSource).not.toMatch(/import\s+html2canvas\s+from\s+['"]html2canvas['"]/);
    expect(mapSource).not.toMatch(/import\s+SingleCatPosterPreviewModal\s+from\s+['"]\.\.\/components\/share\/SingleCatPosterPreviewModal['"]/);
    expect(mapSource).not.toMatch(/import\s+LocationPicker\s+from\s+['"]\.\.\/components\/LocationPicker['"]/);
    expect(mapSource).toContain("import('html2canvas')");
    expect(mapSource).toContain("import('../components/share/SingleCatPosterPreviewModal')");
    expect(mapSource).toContain("import('../components/LocationPicker')");
  });
});

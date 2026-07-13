import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { translations } from '../translations';

const repoRoot = process.cwd();

describe('cat app brand copy', () => {
  const expectPng = (png: Buffer) => {
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  };

  const expectPngWithAlpha = (png: Buffer) => {
    expectPng(png);
    expect(png.readUInt8(25)).toBe(6);
  };

  const expectTransparentCorners = (png: Buffer) => {
    const decoded = PNG.sync.read(png);
    const corners = [
      [0, 0],
      [decoded.width - 1, 0],
      [0, decoded.height - 1],
      [decoded.width - 1, decoded.height - 1],
    ];

    corners.forEach(([x, y]) => {
      const alphaOffset = ((decoded.width * y + x) << 2) + 3;
      expect(decoded.data[alphaOffset]).toBe(0);
    });
  };

  it('uses one product name across supported languages', () => {
    expect(translations.zh.appName).toBe('轉角遇到貓');
    expect(translations.en.appName).toBe('FOUND CAT');
  });

  it('does not expose old product names in user-facing brand surfaces', () => {
    const fileText = [
      'public/cat-logo-universal.svg',
      'public/cat-logo.svg',
      'public/design-logo-options.html',
      'index.html',
      'vite.config.ts',
      'src/components/PWAPrompt.tsx',
      'src/hooks/useShareSticker.ts',
      'src/components/ReelModal.tsx',
      'src/lib/catdexDeck.ts',
    ]
      .map((filePath) => readFileSync(join(repoRoot, filePath), 'utf8'))
      .join('\n');

    const userFacingText = `${JSON.stringify(translations)}\n${fileText}`;

    expect(translations.zh.appSubtitle).toBe('FOUND CAT');
    expect(translations.en.appSubtitle).toBe('FOUND CAT');
    expect(userFacingText).not.toMatch(/Daily Scrapbook/i);
    expect(userFacingText).not.toMatch(/Cat Scrapbook/i);
    expect(userFacingText).not.toMatch(/Corner Cat Stickerbook/i);
    expect(userFacingText).not.toMatch(/Corner Cat/i);
    expect(userFacingText).not.toMatch(/貓遇/);
    expect(userFacingText).not.toMatch(/maoyu/i);
    expect(userFacingText).toMatch(/轉角遇到貓/);
    expect(userFacingText).toMatch(/FOUND CAT/);
  });

  it('does not use the old universal SVG logo in page headers', () => {
    const pageText = [
      'src/pages/Home.tsx',
      'src/pages/Create.tsx',
      'src/pages/Catdex.tsx',
      'src/pages/ShareCatdex.tsx',
      'src/pages/Detail.tsx',
      'src/pages/Map.tsx',
    ]
      .map((filePath) => readFileSync(join(repoRoot, filePath), 'utf8'))
      .join('\n');

    expect(pageText).not.toContain('/cat-logo-universal.svg');
    expect(pageText).not.toContain('/cat-logo.svg');
    expect(pageText).toContain('CatBrandHeader');
  });

  it('uses cropped AI Moodboard V1 PNG assets for the selected brand system', () => {
    const icon192 = readFileSync(join(repoRoot, 'public/cat-icon-192.png'));
    const icon512 = readFileSync(join(repoRoot, 'public/cat-icon-512.png'));
    const l1Logo = readFileSync(join(repoRoot, 'public/brand/moodboard-l1-logo.png'));
    const l4Map = readFileSync(join(repoRoot, 'public/brand/moodboard-l4-map.png'));

    expectPng(icon192);
    expect(icon192.readUInt32BE(16)).toBe(192);
    expect(icon192.readUInt32BE(20)).toBe(192);
    expectPngWithAlpha(icon192);
    expectTransparentCorners(icon192);
    expectPng(icon512);
    expect(icon512.readUInt32BE(16)).toBe(512);
    expect(icon512.readUInt32BE(20)).toBe(512);
    expectPngWithAlpha(icon512);
    expectTransparentCorners(icon512);
    expectPng(l1Logo);
    expectPng(l4Map);
  });

  it('declares maskable PWA icons and preloads the first-screen brand art', () => {
    const viteConfig = readFileSync(join(repoRoot, 'vite.config.ts'), 'utf8');
    const indexHtml = readFileSync(join(repoRoot, 'index.html'), 'utf8');

    expect(viteConfig).toContain("registerType: 'autoUpdate'");
    expect(viteConfig).toContain('cleanupOutdatedCaches: true');
    expect(viteConfig).toContain('clientsClaim: true');
    expect(viteConfig).toContain('skipWaiting: true');
    expect(viteConfig).toContain("src: 'cat-icon-192.png'");
    expect(viteConfig).toContain("src: 'cat-icon-512.png'");
    expect(viteConfig).toContain("src: 'cat-icon-maskable-192.png'");
    expect(viteConfig).toContain("src: 'cat-icon-maskable-512.png'");
    expect(viteConfig).toContain("purpose: 'any'");
    expect(viteConfig).toContain("purpose: 'maskable'");
    expect(viteConfig).not.toContain("purpose: 'any maskable'");
    expect(indexHtml).toContain('rel="preload" as="image" href="/brand/moodboard-l1-logo-transparent.png"');
    expect(indexHtml).toContain('rel="apple-touch-icon" href="/cat-icon-512.png"');
    expect(indexHtml).toContain('rel="prefetch" as="image" href="/cat-icon-512.png"');
  });

  it('does not block launch on external Google font requests', () => {
    const indexHtml = readFileSync(join(repoRoot, 'index.html'), 'utf8');

    expect(indexHtml).not.toContain('fonts.googleapis.com');
    expect(indexHtml).not.toContain('fonts.gstatic.com');
  });

  it('uses local system Traditional Chinese fonts before decorative rounded fonts', () => {
    const indexCss = readFileSync(join(repoRoot, 'src/index.css'), 'utf8');

    expect(indexCss).toContain('"PingFang TC"');
    expect(indexCss).toContain('"Microsoft JhengHei"');
    expect(indexCss.indexOf('"PingFang TC"')).toBeLessThan(indexCss.indexOf('"Noto Sans TC"'));
    expect(indexCss.indexOf('"Noto Sans TC"')).toBeLessThan(indexCss.indexOf('"M PLUS Rounded 1c"'));
    expect(indexCss).not.toContain('body {\n  font-family: "M PLUS Rounded 1c", sans-serif;');
  });

  it('self-hosts the approved rounded display type without making it the body font', () => {
    const indexCss = readFileSync(join(repoRoot, 'src/index.css'), 'utf8');
    const indexHtml = readFileSync(join(repoRoot, 'index.html'), 'utf8');
    const fontCssPath = join(repoRoot, 'public/fonts/chill-round-gothic/font.css');
    const designSystem = readFileSync(join(repoRoot, 'design-system/MASTER.md'), 'utf8');
    const displayFontDir = join(repoRoot, 'public/fonts/chill-round-gothic');
    const fontCss = existsSync(fontCssPath) ? readFileSync(fontCssPath, 'utf8') : '';
    const fontShards = existsSync(displayFontDir)
      ? readdirSync(displayFontDir).filter((fileName) => fileName.endsWith('.woff2'))
      : [];

    expect(indexCss).toContain("font-family: 'FoundCat Round'");
    expect(indexHtml).toContain('href="/fonts/chill-round-gothic/font.css?v=3.750"');
    expect(indexCss).not.toContain('@import url("/fonts/chill-round-gothic/font.css")');
    expect(fontCss).toContain("font-family: 'FoundCat Round'");
    expect(fontCss).toContain("url('/fonts/chill-round-gothic/");
    expect(fontCss).toContain('font-display: swap');
    expect(fontCss).toContain('U+7cec');
    expect(fontCss).toContain('U+9ebb');
    expect(fontCss).toContain('?v=3.750');
    expect(indexCss).toContain('.font-cat-display');
    expect(indexCss).toContain('.font-cat-number');
    expect(`${indexCss}\n${fontCss}`).not.toContain('font.emtech.cc');
    expect(indexCss).not.toMatch(/body\s*\{[^}]*FoundCat Round/s);
    expect(existsSync(join(displayFontDir, 'LICENSE.txt'))).toBe(true);
    expect(existsSync(join(displayFontDir, 'font.css'))).toBe(true);
    expect(fontShards).toHaveLength(302);
    expect(designSystem).toContain('FoundCat Round');
    expect(designSystem).toContain('寒蟬圓黑體');
  });

  it('keeps versioned font shards out of PWA precache while caching them on demand', () => {
    const viteConfig = readFileSync(join(repoRoot, 'vite.config.ts'), 'utf8');

    expect(viteConfig).toContain("'**/fonts/**/*.css'");
    expect(viteConfig).toContain("'**/fonts/**/*.woff2'");
    expect(viteConfig).toContain("cacheName: 'found-cat-fonts-v3750'");
    expect(viteConfig).toContain("handler: 'CacheFirst'");
  });

  it('uses transparent AI Moodboard V1 brand marks in app headers', () => {
    const l1Logo = readFileSync(join(repoRoot, 'public/brand/moodboard-l1-logo-transparent.png'));
    const l4Map = readFileSync(join(repoRoot, 'public/brand/moodboard-l4-map-transparent.png'));
    const brandSurfaces = [
      'src/components/brand/BrandMarks.tsx',
    ]
      .map((filePath) => readFileSync(join(repoRoot, filePath), 'utf8'))
      .join('\n');

    expectPngWithAlpha(l1Logo);
    expectPngWithAlpha(l4Map);
    expect(brandSurfaces).toContain('/brand/moodboard-l1-logo-transparent.png');
    expect(brandSurfaces).toContain('/brand/moodboard-l4-map-transparent.png');
    expect(brandSurfaces).toContain('FOUND CAT');
    expect(brandSurfaces).not.toContain('/brand/moodboard-l1-logo.png');
    expect(brandSurfaces).not.toContain('/brand/moodboard-l4-map.png');
  });
});

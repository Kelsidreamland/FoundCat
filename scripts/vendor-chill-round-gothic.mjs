import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const repoRoot = new URL('../', import.meta.url).pathname;
const sourceCssPath = process.argv[2];

if (!sourceCssPath) {
  throw new Error('Usage: node scripts/vendor-chill-round-gothic.mjs <emfont-css-path>');
}

const fontDir = join(repoRoot, 'public/fonts/chill-round-gothic');
const requiredNumberSeed = 'WNo.-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const fontVersion = '3.750';
const licenseUrl = 'https://raw.githubusercontent.com/Warren2060/ChillRoundGothic/main/License.txt';
const upstreamUrl = 'https://github.com/Warren2060/ChillRoundGothic';

function parseUnicodeRanges(value) {
  return value.split(',').map((rawRange) => {
    const [start, end = start] = rawRange.trim().replace(/^U\+/i, '').split('-');
    return [Number.parseInt(start, 16), Number.parseInt(end, 16)];
  });
}

function blockSupportsAnyCharacter(block, codePoints) {
  const rangeMatch = block.match(/unicode-range:\s*([^;]+);/i);
  if (!rangeMatch) return false;
  const ranges = parseUnicodeRanges(rangeMatch[1]);
  return codePoints.some((codePoint) => ranges.some(([start, end]) => codePoint >= start && codePoint <= end));
}

async function download(url, destination, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await writeFile(destination, Buffer.from(await response.arrayBuffer()));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }
  throw new Error(`Failed to download ${url}: ${lastError}`);
}

async function downloadIfMissing(url, destination) {
  try {
    await access(destination);
  } catch {
    await download(url, destination);
  }
}

const sourceCss = await readFile(sourceCssPath, 'utf8');
const allBlocks = [...sourceCss.matchAll(/@font-face\s*\{[\s\S]*?\}/g)]
  .map(([block]) => block);
const selectedBlocks = allBlocks;

if (selectedBlocks.length === 0) {
  throw new Error('No Chill Round Gothic shards matched the application character set.');
}

await mkdir(fontDir, { recursive: true });

const assets = selectedBlocks.map((block) => {
  const urlMatch = block.match(/url\('([^']+\.woff2)'\)/);
  if (!urlMatch) throw new Error('Selected @font-face block has no WOFF2 URL.');
  const url = urlMatch[1];
  const fileName = new URL(url).pathname.split('/').pop();
  return { url, fileName };
});

const uniqueAssets = [...new Map(assets.map((asset) => [asset.fileName, asset])).values()];
const localDisplayCss = selectedBlocks
  .map((block) => block
    .replace("font-family: 'ChillRoundGothic'", "font-family: 'FoundCat Round'")
    .replace(/https:\/\/font\.emtech\.cc\/file\/_generated\/103-ChillRoundGothic-700\//g, '/fonts/chill-round-gothic/')
    .replace(/url\('([^']+\.woff2)'\)/g, `url('$1?v=${fontVersion}')`))
  .join('\n');
const numberCodePoints = [...requiredNumberSeed].map((character) => character.codePointAt(0));
const localNumberCss = selectedBlocks
  .filter((block) => blockSupportsAnyCharacter(block, numberCodePoints))
  .map((block) => block
    .replace("font-family: 'ChillRoundGothic'", "font-family: 'FoundCat Number'")
    .replace(/https:\/\/font\.emtech\.cc\/file\/_generated\/103-ChillRoundGothic-700\//g, '/fonts/chill-round-gothic/')
    .replace(/url\('([^']+\.woff2)'\)/g, `url('$1?v=${fontVersion}')`))
  .join('\n');
const localCss = `${localDisplayCss}\n${localNumberCss}`;

for (let index = 0; index < uniqueAssets.length; index += 12) {
  const batch = uniqueAssets.slice(index, index + 12);
  await Promise.all(batch.map(({ url, fileName }) => downloadIfMissing(url, join(fontDir, fileName))));
}
await writeFile(join(fontDir, 'font.css'), `${localCss}\n`);
await downloadIfMissing(licenseUrl, join(fontDir, 'LICENSE.txt'));
await writeFile(join(fontDir, 'README.md'), [
  '# Chill Round Gothic',
  '',
  `- Upstream: ${upstreamUrl}`,
  `- Version: ${fontVersion} / emfont Unicode shards`,
  '- Local family name: `FoundCat Round`',
  '- All upstream Unicode shards are self-hosted, but browsers download only the shards required by visible text.',
  '- The `FoundCat Number` alias includes only the Latin/number shard to avoid duplicating the CJK font-face declarations.',
  '',
].join('\n'));

const totalBytes = (await Promise.all(uniqueAssets.map(async ({ fileName }) => {
  const file = await readFile(join(fontDir, fileName));
  return file.byteLength;
}))).reduce((sum, size) => sum + size, 0);

console.log(JSON.stringify({
  css: relative(repoRoot, join(fontDir, 'font.css')),
  files: uniqueAssets.length,
  totalBytes,
}, null, 2));

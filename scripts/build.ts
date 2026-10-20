import { access, copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { buildManifest } from '../src/manifest';
import { DEFAULT_REPO_SLUG, PRODUCT_NAME } from '../src/shared/config';

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

const outdir = resolve('dist');
if (outdir !== resolve(process.cwd(), 'dist')) throw new Error('Unexpected build output directory');
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
const define = {
  __BUILD_TIME__: String(Date.now()),
  'process.env.ADSHIELD_REPO': JSON.stringify(process.env.ADSHIELD_REPO ?? DEFAULT_REPO_SLUG),
};
const entries = [
  ['background/index', 'background', 'esm'],
  ['content/cosmetics', 'content/cosmetics', 'iife'],
  ['content/picker', 'content/picker', 'iife'],
  ['youtube/main', 'youtube/main', 'iife'],
  ['youtube/bridge', 'youtube/bridge', 'iife'],
  ['popup/popup', 'popup', 'iife'],
  ['options/options', 'options', 'iife'],
] as const;

for (const [source, output, format] of entries) {
  const entry = `src/${source}.ts`;
  const present = await exists(entry);
  await build({
    ...(present ? { entryPoints: [entry] } : { stdin: { contents: '// Not implemented yet.', resolveDir: process.cwd() } }),
    outfile: `dist/${output}.js`, bundle: true, format, platform: 'browser', target: 'chrome120', define,
    legalComments: 'eof',
  });
  if (!present) console.log(`Scaffold placeholder: ${output}.js`);
}

for (const page of ['popup', 'options']) {
  const directory = `src/${page}`;
  const files = await exists(directory) ? await readdir(directory) : [];
  for (const file of files.filter((file) => /\.(html|css)$/.test(file))) {
    await copyFile(`${directory}/${file}`, `dist/${file}`);
  }
  if (!(await exists(`dist/${page}.html`))) {
    await writeFile(`dist/${page}.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><title>${PRODUCT_NAME}</title><body><p>${PRODUCT_NAME}: setup in progress.</p></body></html>\n`);
  }
}
await mkdir('dist/icons', { recursive: true });
for (const file of (await readdir('src/icons')).filter((file) => file.endsWith('.png'))) {
  await copyFile(`src/icons/${file}`, `dist/icons/${file}`);
}
if (await exists('filters')) await cp('filters', 'dist/filters', { recursive: true });
if (await exists('rules/rules.json')) await copyFile('rules/rules.json', 'dist/bundled-rules.json');
const meta: { rulesets: { id: string; enabled: boolean }[] } = await exists('filters/meta.json')
  ? JSON.parse(await readFile('filters/meta.json', 'utf8')) : { rulesets: [] };
const { version } = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };
await writeFile('dist/manifest.json', `${JSON.stringify(buildManifest({ version, rulesets: meta.rulesets }), null, 2)}\n`);
console.log(`Built dist/manifest.json (v${version}, ${meta.rulesets.length} rulesets)`);

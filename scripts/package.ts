import { execFile } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const { version } = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid release version');
const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8')) as { version: string };
if (manifest.version !== version) throw new Error('Build is stale: run npm run build first');
await mkdir('release', { recursive: true });
const releaseDir = resolve('release');
const stage = await mkdtemp(resolve('release/.package-'));
const archive = resolve(`release/adshield-${version}.zip`);
try {
  const dist = resolve('dist');
  // Chrome writes indexed DNR caches into unpacked dist during testing. These
  // reserved browser-generated files must never enter a store upload.
  await cp(dist, stage, { recursive: true, filter: source => relative(dist, source).split(sep)[0] !== '_metadata' });
  for (const file of ['LICENSE', 'PRIVACY.md', 'THIRD_PARTY_NOTICES.md']) await copyFile(file, resolve(stage, file));
  if (process.platform === 'win32') {
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      "$ErrorActionPreference = 'Stop'; Compress-Archive -Path (Join-Path $env:ADSHIELD_PACKAGE_DIR '*') -DestinationPath $env:ADSHIELD_ARCHIVE_PATH -Force"],
    { env: { ...process.env, ADSHIELD_ARCHIVE_PATH: archive, ADSHIELD_PACKAGE_DIR: stage } });
  } else {
    await run('zip', ['-q', '-r', '-FS', archive, '.'], { cwd: stage });
  }
} finally {
  const child = relative(releaseDir, stage);
  if (!child || child.startsWith(`..${sep}`) || child === '..' || isAbsolute(child)) throw new Error('Unsafe package staging directory');
  await rm(stage, { recursive: true, force: true });
}
const size = (await stat(archive)).size;
if (!size) throw new Error('Empty release archive');
console.log(`Packaged release/adshield-${version}.zip (${size.toLocaleString('en-US')} bytes)`);

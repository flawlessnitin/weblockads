import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { chromium, type BrowserContext } from '@playwright/test';

const args = process.argv.slice(2);
let userDataDir: string | undefined;
if (args[0] === '--signed-in') {
  if (!args[1]) throw new Error('Usage: capture-youtube.ts [--signed-in <userDataDir>] <videoId…>');
  userDataDir = resolve(args.splice(0, 2)[1]);
  const fromRepo = relative(process.cwd(), userDataDir);
  const inRepo = !fromRepo.startsWith(`..${sep}`) && fromRepo !== '..' && !isAbsolute(fromRepo);
  if (inRepo && !fromRepo.startsWith(`.cache${sep}`)) throw new Error('Keep in-repository browser profiles inside ignored .cache/');
  if (process.env.CI) throw new Error('Signed-in captures must never run in CI');
}
if (args.length === 0 || args.some((id) => !/^[a-zA-Z0-9_-]{11}$/.test(id))) {
  throw new Error('Usage: capture-youtube.ts [--signed-in <userDataDir>] <videoId…> (11-character IDs)');
}

// Do not save request headers, cookies or an unsanitized response body.
// The plan's tracking fields are removed, along with credentials/session fields
// and signed URL parameters that must not enter a public fixture repository.
const sensitiveKey = /tracking|token|cookie|authorization|visitor|session|nonce|cipher|signature|attestation|userId|params|serialized|continuation|encrypted/i;
function scrub(value: unknown): unknown {
  if (typeof value === 'string') {
    if (/SAPISID|__Secure/.test(value)) return undefined;
    if (/^(https?:\/\/|\/)/.test(value)) {
      try {
        const url = new URL(value, 'https://www.youtube.com');
        url.username = ''; url.password = ''; url.hash = '';
        for (const key of [...url.searchParams.keys()]) url.searchParams.set(key, '[redacted]');
        return value.startsWith('/') ? `${value.startsWith('//') ? `//${url.host}` : ''}${url.pathname}${url.search}` : url.href;
      } catch { return '[redacted URL]'; }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(scrub).filter((entry) => entry !== undefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
      if (sensitiveKey.test(key)) return [];
      const cleaned = scrub(entry);
      return cleaned === undefined ? [] : [[key, cleaned]];
    }));
  }
  return value;
}
function countAdPlacements(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  return Object.entries(value).reduce((count, [key, entry]) => count + (key === 'adPlacements' ? 1 : 0) + countAdPlacements(entry), 0);
}

await mkdir('tests/fixtures/youtube', { recursive: true });
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const launchOptions = {
  ...(executablePath ? { executablePath } : { channel: 'chromium' as const }),
  headless: !userDataDir, args: ['--disable-extensions', '--autoplay-policy=no-user-gesture-required'],
};
const browser = userDataDir ? undefined : await chromium.launch(launchOptions);
const context: BrowserContext = userDataDir
  ? await chromium.launchPersistentContext(userDataDir, launchOptions)
  : await browser!.newContext();
let filesWritten = 0;
let playerFilesWithAdPlacements = 0;
const failures: string[] = [];
try {
  if (userDataDir) {
    const loginPage = context.pages()[0] ?? await context.newPage();
    await loginPage.goto('https://www.youtube.com/');
    const prompt = createInterface({ input: stdin, output: stdout });
    try { await prompt.question('Log in yourself using ONLY the dedicated test account, then press Enter to capture. '); }
    finally { prompt.close(); }
  }
  for (const videoId of args) {
    const page = await context.newPage();
    const pending = new Set<Promise<void>>();
    const kindCounts = new Map<string, number>();
    async function save(kind: string, value: unknown): Promise<void> {
      if (!value || typeof value !== 'object') return;
      const cleaned = scrub(value);
      const occurrence = (kindCounts.get(kind) ?? 0) + 1;
      kindCounts.set(kind, occurrence);
      const suffix = occurrence === 1 ? kind : `${kind}-${occurrence}`;
      const filename = `tests/fixtures/youtube/${new Date().toISOString().slice(0, 10)}-${videoId}-${suffix}.json`;
      await writeFile(filename, `${JSON.stringify(cleaned, null, 2)}\n`);
      const adKeys = countAdPlacements(cleaned);
      if ((kind === 'player' || kind === 'initial-player') && adKeys > 0) playerFilesWithAdPlacements++;
      filesWritten++;
      console.log(`Saved ${filename} (adPlacements keys: ${adKeys})`);
    }
    page.on('response', (response) => {
      const kind = response.url().includes('/youtubei/v1/player') ? 'player'
        : response.url().includes('/youtubei/v1/get_watch') ? 'get-watch'
        : response.url().includes('/youtubei/v1/next') ? 'next' : null;
      if (!kind || !response.ok()) return;
      const operation = response.json().then((body: unknown) => save(kind, body))
        .catch(() => { console.warn(`${videoId}: could not read a ${kind} response`); });
      pending.add(operation);
      void operation.finally(() => pending.delete(operation));
    });
    try {
      await page.goto(`https://www.youtube.com/watch?v=${videoId}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(15_000);
      const initial = await page.evaluate(() => {
        const win = window as Window & { ytInitialPlayerResponse?: unknown; ytInitialData?: unknown };
        return { player: win.ytInitialPlayerResponse, next: win.ytInitialData };
      });
      await save('initial-player', initial.player);
      await save('initial-next', initial.next);
      const botCheck = await page.locator('body').innerText().then((text) => /confirm you.?re not a bot|sign in to confirm/i.test(text));
      console.log(`${videoId}: botCheck=${botCheck}, initialPlayer=${Boolean(initial.player)}`);
      if (botCheck) failures.push(`${videoId}: bot check`);
      // A real related-video click captures SPA responses that a fresh watch
      // page may never request (including the current get_watch endpoint).
      if (!botCheck) {
        const links = page.locator('#related a[href^="/watch?v="]');
        for (let i = 0; i < await links.count(); i++) {
          if (await links.nth(i).isVisible()) {
            await links.nth(i).click();
            await page.waitForURL((url) => url.searchParams.get('v') !== videoId, { timeout: 20_000 });
            await page.waitForTimeout(15_000);
            console.log(`${videoId}: captured a related-video SPA navigation`);
            break;
          }
        }
      }
    } catch (error) {
      failures.push(`${videoId}: ${error instanceof Error ? error.message.split('\n')[0] : 'capture failed'}`);
    } finally {
      await Promise.all([...pending]);
      await page.close();
    }
  }
} finally {
  await context.close();
  await browser?.close();
}
console.log(`Capture summary: ${filesWritten} files; ${playerFilesWithAdPlacements} player responses containing adPlacements.`);
for (const failure of failures) console.warn(failure);
if (playerFilesWithAdPlacements === 0) throw new Error('Task 7 is incomplete: no real player response containing adPlacements was captured.');

import { chromium, expect, test } from '@playwright/test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import videos from './videos.json' with { type: 'json' };
import { BOT_CHECK_PATTERN, classifyRun } from './classify';

test('YouTube signed-out playback has no ads or enforcement warning', async () => {
  const extension = resolve('dist');
  await mkdir('.cache', { recursive: true });
  const profile = await mkdtemp(resolve('.cache/nightly-youtube-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const observations: { videoId: string; sawAdShowing: boolean; sawEnforcement: boolean; botCheck: boolean; playbackAdvanced: boolean; error?: string }[] = [];
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 15_000 });
    await expect.poll(() => worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length)).toBe(3);
    for (const videoId of videos) {
      const page = await context.newPage();
      const observation = { videoId, sawAdShowing: false, sawEnforcement: false, botCheck: false, playbackAdvanced: false } as typeof observations[number];
      try {
        await page.goto(`https://www.youtube.com/watch?v=${videoId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        // Only watch visible player videos: YouTube can retain old/hidden ones.
        const startedAt = Date.now();
        let firstTime: number | undefined;
        while (Date.now() - startedAt < 20_000) {
          const sample = await page.evaluate((botCheckPattern) => {
            const visible = (el: Element) => el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden';
            const players = [...document.querySelectorAll<HTMLVideoElement>('.html5-video-player video')].filter(visible);
            const video = players.find(el => el.readyState >= 2 && !el.paused) ?? players.at(-1);
            if (video?.paused) { video.muted = true; void video.play().catch(() => {}); }
            const text = document.body.innerText;
            return {
              sawAdShowing: !!document.querySelector('.html5-video-player.ad-showing'),
              sawEnforcement: [...document.querySelectorAll('ytd-enforcement-message-view-model, .ytp-error-content-wrap')].some(el => visible(el) && /ad.?block|ad blockers|violat.*terms/i.test(el.textContent ?? '')),
              botCheck: new RegExp(botCheckPattern, 'i').test(text),
              time: video?.currentTime,
            };
          }, BOT_CHECK_PATTERN);
          observation.sawAdShowing ||= sample.sawAdShowing;
          observation.sawEnforcement ||= sample.sawEnforcement;
          observation.botCheck ||= sample.botCheck;
          if (sample.time !== undefined) {
            firstTime ??= sample.time;
            observation.playbackAdvanced ||= sample.time > firstTime + 1;
          }
          await page.waitForTimeout(500);
        }
      } catch (error) {
        observation.error = error instanceof Error ? error.message.split('\n')[0] : 'Playback check failed';
      } finally {
        observations.push(observation);
        console.log(JSON.stringify(observation));
        await page.close();
      }
    }
  } finally {
    const verdict = classifyRun(observations);
    await mkdir('test-results', { recursive: true });
    await writeFile('test-results/youtube-result.json', JSON.stringify({ verdict, observations }, null, 2));
    console.log(`YouTube verdict: ${verdict}`);
    await context.close();
  }
  expect(classifyRun(observations)).not.toBe('fail');
});

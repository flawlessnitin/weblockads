// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bundled from '../../rules/rules.json';
import { startFallback } from '../../src/youtube/fallback';

describe('startFallback', () => {
  let player: HTMLElement;
  let video: HTMLVideoElement;
  let stop: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div class="html5-video-player"><video></video><button class="ytp-skip-ad-button">Skip</button></div>';
    player = document.querySelector('.html5-video-player')!;
    video = document.querySelector('video')!;
    Object.defineProperty(video, 'duration', { value: 30, configurable: true });
    stop = () => {};
  });
  afterEach(() => { stop(); vi.useRealTimers(); });
  const tick = () => vi.advanceTimersByTime(250);

  it('mutes and accelerates an ad', () => {
    stop = startFallback(document, () => bundled.youtube, vi.fn());
    player.classList.add('ad-showing'); tick();
    expect(video.muted).toBe(true);
    expect(video.playbackRate).toBe(16);
  });
  it('clicks the first visible skip button', () => {
    const button = document.querySelector('button')!;
    Object.defineProperty(button, 'offsetWidth', { value: 100 });
    const click = vi.spyOn(button, 'click');
    stop = startFallback(document, () => bundled.youtube, vi.fn());
    player.classList.add('ad-showing'); tick();
    expect(click).toHaveBeenCalledOnce();
  });
  it('restores user state', () => {
    video.muted = true; video.volume = 0.3; video.playbackRate = 1.5;
    stop = startFallback(document, () => bundled.youtube, vi.fn());
    player.classList.add('ad-showing'); tick();
    player.classList.remove('ad-showing'); tick();
    expect(video.muted).toBe(true);
    expect(video.volume).toBe(0.3);
    expect(video.playbackRate).toBe(1.5);
  });
  it('unmutes a user who was not muted', () => {
    video.muted = false;
    stop = startFallback(document, () => bundled.youtube, vi.fn());
    player.classList.add('ad-showing'); tick();
    player.classList.remove('ad-showing'); tick();
    expect(video.muted).toBe(false);
  });
  it('ignores non-ad video', () => {
    video.muted = false; video.volume = 0.3; video.playbackRate = 1.5;
    stop = startFallback(document, () => bundled.youtube, vi.fn());
    vi.advanceTimersByTime(2500);
    expect([video.muted, video.volume, video.playbackRate]).toEqual([false, 0.3, 1.5]);
  });
  it('reports the duration once per ad', () => {
    const handled = vi.fn();
    stop = startFallback(document, () => bundled.youtube, handled);
    player.classList.add('ad-showing'); tick(); tick();
    player.classList.remove('ad-showing'); tick(); tick();
    expect(handled).toHaveBeenCalledExactlyOnceWith(30);
  });
  it('stop halts ticks', () => {
    stop = startFallback(document, () => bundled.youtube, vi.fn());
    stop(); player.classList.add('ad-showing'); tick();
    expect(video.muted).toBe(false);
    expect(video.playbackRate).toBe(1);
  });
  it('uses the average when the duration is unknown', () => {
    Object.defineProperty(video, 'duration', { value: NaN });
    const handled = vi.fn();
    stop = startFallback(document, () => bundled.youtube, handled);
    player.classList.add('ad-showing'); tick();
    player.classList.remove('ad-showing'); tick();
    expect(handled).toHaveBeenCalledExactlyOnceWith(15);
  });
});

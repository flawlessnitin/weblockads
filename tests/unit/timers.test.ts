// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installTimerBoosts } from '../../src/youtube/timers';

const originalSetTimeout = window.setTimeout;
const boosts = [{ delayMs: 17000, callbackIncludes: '[native code]', factor: 0.001 }];
const nativeCallback = Array.prototype.push.bind([]);

function install() {
  const spy = vi.fn(() => 1);
  window.setTimeout = spy as unknown as typeof window.setTimeout;
  installTimerBoosts(window, () => boosts);
  return spy;
}

afterEach(() => { window.setTimeout = originalSetTimeout; });

describe('installTimerBoosts', () => {
  it('shortens an exact delay with a native callback', () => {
    const spy = install();
    window.setTimeout(nativeCallback, 17000);
    expect(spy).toHaveBeenCalledWith(nativeCallback, 17);
  });
  it('leaves other delays untouched', () => {
    const spy = install();
    window.setTimeout(nativeCallback, 16999);
    expect(spy).toHaveBeenCalledWith(nativeCallback, 16999);
  });
  it('leaves non-matching callbacks untouched', () => {
    const spy = install();
    const own = () => {};
    window.setTimeout(own, 17000);
    expect(spy).toHaveBeenCalledWith(own, 17000);
  });
  it('keeps setTimeout looking native', () => {
    install();
    expect(Function.prototype.toString.call(window.setTimeout)).toContain('[native code]');
  });
});

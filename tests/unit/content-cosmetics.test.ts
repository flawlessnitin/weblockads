// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { installFakeChrome } from '../helpers/fake-chrome';

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.replaceChildren();
});
afterEach(() => {
  window.dispatchEvent(new Event('pagehide'));
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('stops cosmetic updates when reloading the extension invalidates an existing tab', async () => {
  const fake = installFakeChrome();
  let invalidated = false;
  fake.runtime.sendMessage.mockImplementation(() => {
    if (invalidated) throw new Error('Extension context invalidated.');
    return Promise.resolve({ active: true, styles: '', scripts: [], extended: [] });
  });
  await import('../../src/content/cosmetics');
  window.dispatchEvent(new Event('DOMContentLoaded'));
  await vi.advanceTimersByTimeAsync(0);
  invalidated = true;
  const card = document.createElement('div'); card.className = 'new-card-after-reload';
  document.body.append(card);
  await vi.advanceTimersByTimeAsync(50);
  const callsAfterDisconnect = fake.runtime.sendMessage.mock.calls.length;
  const next = document.createElement('div'); next.className = 'another-card-after-reload';
  document.body.append(next);
  await vi.advanceTimersByTimeAsync(100);
  expect(fake.runtime.sendMessage).toHaveBeenCalledTimes(callsAfterDisconnect);
});

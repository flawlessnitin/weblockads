import { describe, expect, it } from 'vitest';
import { classifyRun, isBotCheckText } from '../e2e/classify';

describe('isBotCheckText', () => {
  it("recognises Google's unusual-traffic rate-limit page", () => {
    expect(isBotCheckText('About this page Our systems have detected unusual traffic from your computer network.')).toBe(true);
  });
  it('recognises the YouTube sign-in bot check', () => {
    expect(isBotCheckText("Sign in to confirm you're not a bot")).toBe(true);
  });
  it('ignores a normal watch page', () => {
    expect(isBotCheckText('Me at the zoo 412M views Subscribe')).toBe(false);
  });
});

const normal = { sawAdShowing: false, sawEnforcement: false, botCheck: false, playbackAdvanced: true };
describe('classifyRun', () => {
  it('classifyRun returns inconclusive on bot check', () => {
    expect(classifyRun([{ ...normal, botCheck: true, playbackAdvanced: false }, { ...normal, botCheck: true, playbackAdvanced: false }])).toBe('inconclusive');
  });
  it('any ad returns fail', () => {
    expect(classifyRun([normal, { ...normal, sawAdShowing: true }])).toBe('fail');
    expect(classifyRun([{ ...normal, sawEnforcement: true, botCheck: true }])).toBe('fail');
  });
  it('normal returns pass', () => {
    expect(classifyRun([normal])).toBe('pass');
  });
  it('no playback and no bot check returns fail', () => {
    expect(classifyRun([{ ...normal, playbackAdvanced: false }])).toBe('fail');
  });
});

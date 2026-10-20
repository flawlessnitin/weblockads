import { describe, expect, it } from 'vitest';
import { classifyRun } from '../e2e/classify';

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

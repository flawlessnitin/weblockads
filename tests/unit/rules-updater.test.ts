import { beforeEach, describe, expect, it, vi } from 'vitest';
import bundled from '../../rules/rules.json';
import { BUILD_TIME } from '../../src/shared/config';
import { getStoredRules, saveStoredRules } from '../../src/shared/storage';
import { checkForUpdate, getActiveRules } from '../../src/rules/updater';
import { installFakeChrome } from '../helpers/fake-chrome';

const remote = (value: unknown) => vi.fn(async () => new Response(JSON.stringify(value)));

describe('rules updater', () => {
  beforeEach(() => {
    installFakeChrome();
    vi.stubGlobal('fetch', remote(bundled));
  });
  it('ignores lower version', async () => {
    await saveStoredRules({ rules: { ...bundled, version: 5 }, receivedAt: 10 });
    expect(await checkForUpdate(remote({ ...bundled, version: 4 }))).toBe('unchanged');
    expect((await getStoredRules())?.rules.version).toBe(5);
  });
  it('stores a valid newer version with the current receipt time', async () => {
    await saveStoredRules({ rules: { ...bundled, version: 1 }, receivedAt: 10 });
    vi.spyOn(Date, 'now').mockReturnValue(123456789);
    expect(await checkForUpdate(remote({ ...bundled, version: 2 }))).toBe('updated');
    expect(await getStoredRules()).toEqual({ rules: { ...bundled, version: 2 }, receivedAt: 123456789 });
  });
  it('keeps stored rules on a network error', async () => {
    const stored = { rules: bundled, receivedAt: 10 };
    await saveStoredRules(stored);
    expect(await checkForUpdate(vi.fn(async () => { throw new Error('offline'); }))).toBe('failed');
    expect(await getStoredRules()).toEqual(stored);
  });
  it('rejects schema-invalid remote JSON', async () => {
    await saveStoredRules({ rules: bundled, receivedAt: 10 });
    expect(await checkForUpdate(remote({ version: 2 }))).toBe('failed');
    expect((await getStoredRules())?.rules).toEqual(bundled);
  });
  it('uses bundled rules and BUILD_TIME when nothing is stored', async () => {
    expect(await getActiveRules()).toEqual({ rules: bundled, receivedAt: BUILD_TIME });
  });
  it('uses bundled rules over an older stored version', async () => {
    await saveStoredRules({ rules: { ...bundled, version: 0 }, receivedAt: 10 });
    expect(await getActiveRules()).toEqual({ rules: bundled, receivedAt: BUILD_TIME });
  });
  it('does not downgrade when update checks overlap', async () => {
    await saveStoredRules({ rules: bundled, receivedAt: 10 });
    await Promise.all([
      checkForUpdate(remote({ ...bundled, version: 3 })),
      checkForUpdate(remote({ ...bundled, version: 2 })),
    ]);
    expect((await getStoredRules())?.rules.version).toBe(3);
  });
});

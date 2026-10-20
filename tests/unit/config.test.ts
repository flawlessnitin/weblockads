import { expect, it } from 'vitest';
import { DEFAULT_REPO_SLUG, REPO_SLUG, RULES_URL } from '../../src/shared/config';

it('defaults to the published repository', () => {
  expect(DEFAULT_REPO_SLUG).toBe('flawlessnitin/weblockads');
  expect(REPO_SLUG).toBe(process.env.ADSHIELD_REPO ?? DEFAULT_REPO_SLUG);
  expect(RULES_URL).toBe(`https://raw.githubusercontent.com/${REPO_SLUG}/main/rules/rules.json`);
});

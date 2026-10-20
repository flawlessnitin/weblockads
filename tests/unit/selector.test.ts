// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { buildSelector } from '../../src/content/selector';

beforeEach(() => { document.body.innerHTML = ''; });
it('prefers a unique id', () => {
  document.body.innerHTML = '<div id="promo"></div>';
  expect(buildSelector(document.querySelector('#promo')!)).toBe('#promo');
});
it('uses unique classes', () => {
  document.body.innerHTML = '<div class="ad-box"></div><div></div>';
  expect(buildSelector(document.querySelector('.ad-box')!)).toBe('div.ad-box');
});
it('uniquely identifies duplicate elements', () => {
  document.body.innerHTML = '<section><div class="promo"></div><div class="promo"></div></section>';
  const el = document.querySelectorAll('.promo')[1];
  const matches = document.querySelectorAll(buildSelector(el));
  expect(matches.length).toBe(1);
  expect(matches[0]).toBe(el);
});
it('does not use random-looking classes', () => {
  document.body.innerHTML = '<div class="x1a2b3c4d5e6f7"></div><div></div>';
  const el = document.querySelector('div')!;
  const selector = buildSelector(el);
  expect(selector).not.toContain('x1a2b3c4d5e6f7');
  expect(document.querySelector(selector)).toBe(el);
});

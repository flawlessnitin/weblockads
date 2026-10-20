import { expect, it } from 'vitest';
import { buildReportUrl } from '../../src/popup/report';

const report = (pageUrl: string) => new URL(buildReportUrl({ pageUrl, extVersion: '0.1.0', rulesVersion: 3, repoSlug: 'flawlessnitin/weblockads' }));

it('encodes the exact report title and rules version', () => {
  const url = report('https://www.youtube.com/watch?v=x&t=2');
  expect(url.origin + url.pathname).toBe('https://github.com/flawlessnitin/weblockads/issues/new');
  expect(url.searchParams.get('title')).toBe('Ads still showing on www.youtube.com');
  expect(url.searchParams.get('body')).toContain('Rules version: 3');
  expect(url.searchParams.get('labels')).toBe('site-report');
});

it('keeps only the YouTube video id from the page address', () => {
  const body = report('https://www.youtube.com/watch?v=x&t=2&pp=private').searchParams.get('body')!;
  expect(body).toContain('Page URL: https://www.youtube.com/watch?v=x\n');
  expect(body).not.toContain('pp=private');
});

it('drops query strings and fragments from other sites', () => {
  const body = report('https://example.com/search?q=secret+term&token=abc#account').searchParams.get('body')!;
  expect(body).toContain('Page URL: https://example.com/search\n');
  expect(body).not.toMatch(/secret|token|account/);
});

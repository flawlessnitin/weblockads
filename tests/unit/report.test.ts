import { expect, it } from 'vitest';
import { buildReportUrl } from '../../src/popup/report';

it('encodes the exact report title and rules version', () => {
  const url = new URL(buildReportUrl({ pageUrl: 'https://www.youtube.com/watch?v=x&t=2', extVersion: '0.1.0', rulesVersion: 3, repoSlug: 'OWNER/adshield' }));
  expect(url.origin + url.pathname).toBe('https://github.com/OWNER/adshield/issues/new');
  expect(url.searchParams.get('title')).toBe('Ads still showing on www.youtube.com');
  expect(url.searchParams.get('body')).toContain('Rules version: 3');
  expect(url.searchParams.get('body')).toContain('https://www.youtube.com/watch?v=x&t=2');
  expect(url.searchParams.get('labels')).toBe('site-report');
});

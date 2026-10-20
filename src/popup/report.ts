// Reports become public GitHub issues, so keep only what identifies the page:
// no query strings or fragments, except YouTube's video id.
function reportablePageUrl(pageUrl: string): string {
  const page = new URL(pageUrl);
  const videoId = /(^|\.)youtube\.com$/.test(page.hostname) ? page.searchParams.get('v') : null;
  return `${page.origin}${page.pathname}${videoId ? `?v=${encodeURIComponent(videoId)}` : ''}`;
}

export function buildReportUrl(input: { pageUrl: string; extVersion: string; rulesVersion: number; repoSlug: string }): string {
  const url = new URL(`https://github.com/${input.repoSlug}/issues/new`);
  url.searchParams.set('title', `Ads still showing on ${new URL(input.pageUrl).hostname}`);
  url.searchParams.set('body', `Page URL: ${reportablePageUrl(input.pageUrl)}\nExtension version: ${input.extVersion}\nRules version: ${input.rulesVersion}\n\nWhat did you see?\n`);
  url.searchParams.set('labels', 'site-report');
  return url.href;
}

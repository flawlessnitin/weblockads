export function buildReportUrl(input: { pageUrl: string; extVersion: string; rulesVersion: number; repoSlug: string }): string {
  const url = new URL(`https://github.com/${input.repoSlug}/issues/new`);
  url.searchParams.set('title', `Ads still showing on ${new URL(input.pageUrl).hostname}`);
  url.searchParams.set('body', `Page URL: ${input.pageUrl}\nExtension version: ${input.extVersion}\nRules version: ${input.rulesVersion}\n\nWhat did you see?\n`);
  url.searchParams.set('labels', 'site-report');
  return url.href;
}

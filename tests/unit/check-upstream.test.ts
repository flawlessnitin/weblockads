import { expect, it } from 'vitest';
import { findYoutubeChanges } from '../../scripts/nightly/check-upstream';

it('findYoutubeChanges matches only added youtube.com lines', () => {
  expect(findYoutubeChanges([
    { sha: 'added', message: 'YouTube fix', patch: '@@ -1 +1 @@\n+youtube.com##.new-ad' },
    { sha: 'removed', message: 'Remove rule', patch: '-youtube.com##.old-ad' },
    { sha: 'other', message: 'Other site', patch: '+example.com##.ad' },
    { sha: 'context', message: 'Context only', patch: ' youtube.com##.unchanged\n+example.org##.ad' },
    { sha: 'header', message: 'Diff header', patch: '+++ b/youtube.com.txt' },
  ])).toEqual([{ sha: 'added', message: 'YouTube fix' }]);
});

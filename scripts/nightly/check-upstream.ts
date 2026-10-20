import { pathToFileURL } from 'node:url';

export function findYoutubeChanges(commits: { sha: string; message: string; patch: string }[]): { sha: string; message: string }[] {
  return commits.filter(commit => commit.patch.split('\n').some(line => line.startsWith('+') && !line.startsWith('+++') && line.includes('youtube.com')))
    .map(({ sha, message }) => ({ sha, message }));
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`https://api.github.com/repos/uBlockOrigin/uAssets/${path}`, {
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`GitHub upstream API: HTTP ${response.status}`);
  return response.json();
}
async function main(): Promise<void> {
  const since = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
  const paths = ['filters/quick-fixes.txt', 'filters/filters.txt'];
  const commits = new Map<string, string>();
  for (const path of paths) {
    for (let page = 1; ; page++) {
      const query = new URLSearchParams({ path, since, per_page: '100', page: String(page) });
      const entries = await getJson(`commits?${query}`);
      if (!Array.isArray(entries)) throw new Error('Invalid GitHub commits response');
      for (const entry of entries) {
        if (typeof entry?.sha !== 'string' || !/^[a-f0-9]{40}$/.test(entry.sha) || typeof entry.commit?.message !== 'string') throw new Error('Invalid GitHub commit');
        commits.set(entry.sha, entry.commit.message);
      }
      if (entries.length < 100) break;
    }
  }
  const patches = [];
  for (const [sha, message] of commits) {
    const detail = await getJson(`commits/${sha}`);
    if (!detail || typeof detail !== 'object' || !('files' in detail) || !Array.isArray(detail.files)) throw new Error('Invalid GitHub commit files');
    const patch = detail.files.filter(file => paths.includes(file.filename) && typeof file.patch === 'string')
      .map(file => file.patch as string).join('\n');
    patches.push({ sha, message, patch });
  }
  console.log(JSON.stringify(findYoutubeChanges(patches), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Upstream check failed'); process.exitCode = 1; });
}

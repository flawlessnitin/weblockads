import { getDomain } from 'tldts';

export function getSiteKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return getDomain(parsed.hostname, { allowPrivateDomains: true });
  } catch {
    return null;
  }
}

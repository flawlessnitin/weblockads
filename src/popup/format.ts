const countFormatter = new Intl.NumberFormat('en-US');
export function formatCount(n: number): string {
  return countFormatter.format(Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
}
export function formatDuration(seconds: number): string {
  const n = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  if (n >= 3600) return `${Math.floor(n / 3600)} h ${Math.floor(n % 3600 / 60)} m`;
  if (n >= 60) return `${Math.floor(n / 60)} m`;
  return n === 0 ? '0 m' : `${n} s`;
}
export function formatAgo(ms: number, now = Date.now()): string {
  const age = Math.max(0, now - ms);
  if (age < 60_000) return 'just now';
  if (age < 3_600_000) return `${Math.floor(age / 60_000)} min ago`;
  if (age < 86_400_000) return `${Math.floor(age / 3_600_000)} h ago`;
  return `${Math.floor(age / 86_400_000)} d ago`;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function pruneByPaths(root: unknown, paths: readonly string[]): { removed: number; adBreaks: number } {
  const result = { removed: 0, adBreaks: 0 };
  if (!object(root)) return result;
  function visit(node: unknown, segments: string[], depth: number): void {
    if (!object(node)) return;
    const segment = segments[depth];
    const keys = segment === '*' ? Object.keys(node) : Object.hasOwn(node, segment) ? [segment] : [];
    for (const key of keys) {
      if (depth < segments.length - 1) visit(node[key], segments, depth + 1);
      else {
        const value = node[key];
        if (delete node[key]) {
          result.removed++;
          if (key === 'adPlacements' && Array.isArray(value)) result.adBreaks += value.length;
        }
      }
    }
  }
  for (const path of paths) visit(root, path.split('.'), 0);
  return result;
}

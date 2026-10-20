import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import bundled from '../../rules/rules.json';
import { pruneByPaths } from '../../src/youtube/prune';

const directory = join(process.cwd(), 'tests/fixtures/youtube');
const files = readdirSync(directory).filter((file) => file.endsWith('.json'));
if (files.length === 0) throw new Error('Real YouTube fixtures are required');

function playbackFields(value: unknown, path: string[] = []): { path: string[]; value: unknown }[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, entry]) => [
    ...(['streamingData', 'videoDetails', 'playabilityStatus'].includes(key) ? [{ path: [...path, key], value: structuredClone(entry) }] : []),
    ...playbackFields(entry, [...path, key]),
  ]);
}

for (const file of files) {
  describe(file, () => {
    it('removes all ad keys', () => {
      const json: unknown = JSON.parse(readFileSync(join(directory, file), 'utf8'));
      pruneByPaths(json, bundled.youtube.prunePaths);
      const serialized = JSON.stringify(json);
      for (const key of ['adPlacements', 'playerAds', 'adSlots']) expect(serialized).not.toContain(`"${key}"`);
    });
    it('keeps playback fields intact', () => {
      const json: unknown = JSON.parse(readFileSync(join(directory, file), 'utf8'));
      const original = playbackFields(json);
      pruneByPaths(json, bundled.youtube.prunePaths);
      for (const field of original) {
        const current = field.path.reduce<unknown>((value, key) =>
          value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, json);
        expect(current, field.path.join('.')).toEqual(field.value);
      }
    });
  });
}

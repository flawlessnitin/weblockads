import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { FiltersEngine } from '@ghostery/adblocker';
import { convertWithAdguard } from '@ghostery/urlfilter2dnr';
import { FILTER_LISTS, UBLOCK_QUICK_FIXES_URL } from './filter-lists';
import { postProcessRules } from './postprocess-rules';

const sources: { id: string; url: string; sha256: string }[] = [];
const allText: string[] = [];
const converted: Record<string, chrome.declarativeNetRequest.Rule[]> = {};
await mkdir('.cache/lists', { recursive: true });
await mkdir('.cache/conversion', { recursive: true });

async function download(id: string, url: string): Promise<string> {
  console.log(`Downloading ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const text = await response.text();
  if (text.trim().length === 0 || /^\s*</.test(text)) throw new Error(`${url}: not a filter list`);
  await writeFile(`.cache/lists/${id}.txt`, text);
  sources.push({ id, url, sha256: createHash('sha256').update(text).digest('hex') });
  return text;
}

for (const list of FILTER_LISTS) {
  const parts = [await download(list.id, list.url)];
  if (list.id === 'ublock') parts.push(await download('ublock-quick-fixes', UBLOCK_QUICK_FIXES_URL));
  const text = parts.join('\n');
  allText.push(text);
  const result = await convertWithAdguard(text.split(/\r?\n/));
  converted[list.id] = result.rules;
  await writeFile(`.cache/conversion/${list.id}.json`, JSON.stringify({ errors: result.errors, limitations: result.limitations }, null, 2));
  console.log(`${list.id}: converted ${result.rules.length} rules; ${result.errors.length} unsupported/invalid entries; ${result.limitations.length} converter limitations`);
}

const { rulesets, dropped } = postProcessRules(converted, { regexBudget: 1000 });
const engine = FiltersEngine.parse(allText.join('\n'), {
  loadNetworkFilters: false, loadCosmeticFilters: true, loadGenericCosmeticsFilters: true,
  loadExtendedSelectors: false, enableHtmlFiltering: false,
});
await mkdir('filters/dnr', { recursive: true });
const meta = {
  builtAt: Date.now(),
  rulesets: FILTER_LISTS.map(({ id, enabled }) => ({ id, enabled, ruleCount: rulesets[id].length })),
  sources,
};
for (const { id, ruleCount } of meta.rulesets) {
  await writeFile(`filters/dnr/${id}.json`, `${JSON.stringify(rulesets[id])}\n`);
  console.log(`${id}: ${ruleCount} final DNR rules`);
}
await writeFile('filters/cosmetic-engine.bin', engine.serialize());
await writeFile('filters/meta.json', `${JSON.stringify(meta, null, 2)}\n`);
console.log(`Total DNR rules: ${meta.rulesets.reduce((sum, ruleset) => sum + ruleset.ruleCount, 0)}`);
console.log(`Dropped redirects: ${dropped.redirect}; regex over budget: ${dropped.regexOverBudget}`);

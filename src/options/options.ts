import { PRODUCT_NAME, REPO_SLUG } from '../shared/config';
import { getSettings, updateSettings } from '../shared/storage';
import { formatAgo } from '../popup/format';
import type { StoredRules } from '../shared/storage';

const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.title = `${PRODUCT_NAME} settings`;
element('product-name').textContent = PRODUCT_NAME;
element('version').textContent = `Version ${chrome.runtime.getManifest().version}`;
element<HTMLAnchorElement>('notices').href = `https://github.com/${REPO_SLUG}/blob/main/THIRD_PARTY_NOTICES.md`;
const youtube = element<HTMLInputElement>('youtube-enabled');
const checkUpdates = element<HTMLButtonElement>('check-updates');

function showError(): void {
  element('status').textContent = "Couldn't save this change. Please try again.";
  element('status').hidden = false;
}
async function request(message: object): Promise<unknown> {
  const result = await chrome.runtime.sendMessage(message);
  if (!result || result.error) throw new Error('Request failed');
  return result;
}
function empty(text: string): HTMLParagraphElement {
  const p = document.createElement('p'); p.className = 'empty'; p.textContent = text; return p;
}
function row(label: string, buttonText: string, action: () => Promise<void>, code = false): HTMLLIElement {
  const item = document.createElement('li');
  const text = document.createElement(code ? 'code' : 'span'); text.textContent = label;
  const button = document.createElement('button'); button.textContent = buttonText;
  button.setAttribute('aria-label', `${buttonText}: ${label}`);
  button.addEventListener('click', () => {
    button.disabled = true; element('status').hidden = true;
    void action().then(renderSettings).catch(showError).finally(() => { button.disabled = false; });
  });
  item.append(text, button); return item;
}
async function renderSettings(): Promise<void> {
  const settings = await getSettings();
  const sites = element('disabled-sites'); sites.replaceChildren();
  for (const site of settings.disabledSites) sites.append(row(site, 'Turn back on', async () => {
    await request({ type: 'popup:setSiteEnabled', site, enabled: true });
  }));
  if (!settings.disabledSites.length) sites.append(empty('Blocking is on for all sites.'));
  const hides = element('hidden-elements'); hides.replaceChildren();
  let count = 0;
  for (const [site, selectors] of Object.entries(settings.customHides)) {
    if (!selectors.length) continue;
    const heading = document.createElement('h3'); heading.textContent = site;
    const list = document.createElement('ul');
    for (const selector of selectors) {
      count++;
      list.append(row(selector, 'Remove', async () => {
        const latest = await getSettings();
        const customHides = { ...latest.customHides };
        const next = (customHides[site] ?? []).filter(value => value !== selector);
        if (next.length) customHides[site] = next; else delete customHides[site];
        await updateSettings({ customHides });
      }, true));
    }
    hides.append(heading, list);
  }
  if (!count) hides.append(empty('No elements hidden yet. Use Hide element from the toolbar.'));
  youtube.checked = settings.youtubeEnabled; youtube.disabled = false;
}
async function renderRules(): Promise<void> {
  const active = await request({ type: 'rules:get' }) as StoredRules;
  element('rules-info').textContent = `Version ${active.rules.version} · updated ${formatAgo(active.receivedAt)}`;
}
youtube.addEventListener('change', () => {
  const enabled = youtube.checked;
  youtube.disabled = true; element('status').hidden = true;
  void (async () => {
    await updateSettings({ youtubeEnabled: enabled });
    await request({ type: 'settings:changed' });
  })().catch(showError).finally(() => { void renderSettings().catch(showError); });
});
checkUpdates.addEventListener('click', () => {
  checkUpdates.disabled = true; element('update-result').textContent = 'Checking…';
  void (async () => {
    const result = await request({ type: 'rules:checkNow' });
    if (result === 'failed') element('update-result').textContent = "Couldn't reach GitHub";
    else if (result === 'unchanged') element('update-result').textContent = 'Already up to date';
    else {
      const active = await request({ type: 'rules:get' }) as StoredRules;
      element('update-result').textContent = `Updated to v${active.rules.version}`;
    }
    await renderRules();
  })().catch(() => { element('update-result').textContent = "Couldn't reach GitHub"; })
    .finally(() => { checkUpdates.disabled = false; });
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) void renderSettings().catch(showError);
});
void Promise.all([renderSettings(), renderRules()]).then(() => { checkUpdates.disabled = false; })
  .catch(() => { element('status').textContent = "Couldn't load settings. Reload this page to try again."; element('status').hidden = false; });

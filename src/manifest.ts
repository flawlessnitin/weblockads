import { PRODUCT_NAME } from './shared/config';

export function buildManifest(opts: {
  version: string;
  rulesets: { id: string; enabled: boolean }[];
}): chrome.runtime.ManifestV3 {
  return {
    manifest_version: 3,
    name: PRODUCT_NAME,
    version: opts.version,
    description: 'Blocks ads and trackers on websites, including YouTube.',
    permissions: ['declarativeNetRequest', 'storage', 'scripting', 'alarms', 'webRequest'],
    host_permissions: ['<all_urls>'],
    background: { service_worker: 'background.js', type: 'module' },
    action: { default_popup: 'popup.html', default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } },
    options_page: 'options.html',
    icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
    declarative_net_request: {
      rule_resources: opts.rulesets.map(({ id, enabled }) => ({ id, enabled, path: `filters/dnr/${id}.json` })),
    },
  };
}

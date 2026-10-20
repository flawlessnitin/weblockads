import { describe, expect, it } from 'vitest';
import { buildManifest } from '../../src/manifest';
import { PRODUCT_NAME } from '../../src/shared/config';

describe('buildManifest', () => {
  it('builds the MV3 manifest with ordered rulesets and dynamic content scripts', () => {
    const manifest = buildManifest({
      version: '0.1.0',
      rulesets: [
        { id: 'ublock', enabled: true },
        { id: 'easylist', enabled: true },
      ],
    });

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe(PRODUCT_NAME);
    expect(manifest.permissions).toEqual([
      'declarativeNetRequest', 'storage', 'scripting', 'alarms', 'webRequest',
    ]);
    expect(manifest.host_permissions).toEqual(['<all_urls>']);
    expect(manifest.background).toEqual({ service_worker: 'background.js', type: 'module' });
    expect(manifest.action?.default_popup).toBe('popup.html');
    expect(manifest.options_page).toBe('options.html');
    expect(manifest.declarative_net_request?.rule_resources).toEqual([
      { id: 'ublock', enabled: true, path: 'filters/dnr/ublock.json' },
      { id: 'easylist', enabled: true, path: 'filters/dnr/easylist.json' },
    ]);
    expect(manifest).not.toHaveProperty('content_scripts');
  });
});

import { vi } from 'vitest';

// Chrome is the system boundary. Its event signatures differ by event.
type Listener = (...args: any[]) => unknown;

function storageArea() {
  let data: Record<string, unknown> = {};
  return {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys == null) return structuredClone(data);
      const names = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const result: Record<string, unknown> = {};
      for (const key of names) {
        if (key in data) result[key] = data[key];
        else if (typeof keys === 'object' && !Array.isArray(keys)) result[key] = keys[key];
      }
      return structuredClone(result);
    }),
    set: vi.fn(async (values: Record<string, unknown>) => { Object.assign(data, structuredClone(values)); }),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const key of typeof keys === 'string' ? [keys] : keys) delete data[key];
    }),
    clear: vi.fn(async () => { data = {}; }),
  };
}

export type FakeChrome = ReturnType<typeof installFakeChrome>;

export function installFakeChrome() {
  const listeners = new Map<string, Set<Listener>>();
  function event(path: string) {
    const callbacks = new Set<Listener>();
    listeners.set(path, callbacks);
    return {
      addListener: vi.fn((listener: Listener) => { callbacks.add(listener); }),
      removeListener: vi.fn((listener: Listener) => { callbacks.delete(listener); }),
      hasListener: (listener: Listener) => callbacks.has(listener),
    };
  }
  let dynamicRules: chrome.declarativeNetRequest.Rule[] = [];
  let registered: chrome.scripting.RegisteredContentScript[] = [];
  const fake = {
    storage: { local: storageArea(), session: storageArea() },
    declarativeNetRequest: {
      getDynamicRules: vi.fn(async () => structuredClone(dynamicRules)),
      updateDynamicRules: vi.fn(async (opts: { removeRuleIds?: number[]; addRules?: chrome.declarativeNetRequest.Rule[] }) => {
        dynamicRules = dynamicRules.filter((rule) => !opts.removeRuleIds?.includes(rule.id));
        dynamicRules.push(...structuredClone(opts.addRules ?? []));
      }),
    },
    scripting: {
      registerContentScripts: vi.fn(async (scripts: chrome.scripting.RegisteredContentScript[]) => {
        const duplicate = scripts.find((script) => registered.some((existing) => existing.id === script.id));
        if (duplicate) throw new Error(`Duplicate script ID '${duplicate.id}'`);
        registered.push(...structuredClone(scripts));
      }),
      getRegisteredContentScripts: vi.fn(async () => structuredClone(registered)),
      unregisterContentScripts: vi.fn(async (filter?: { ids?: string[] }) => {
        registered = filter?.ids ? registered.filter((script) => !filter.ids!.includes(script.id)) : [];
      }),
      insertCSS: vi.fn(async (_injection: chrome.scripting.CSSInjection) => {}),
      executeScript: vi.fn(async (_injection: unknown) => []),
    },
    alarms: { create: vi.fn(async (_name: string, _info: chrome.alarms.AlarmCreateInfo) => {}), onAlarm: event('alarms.onAlarm') },
    runtime: {
      onMessage: event('runtime.onMessage'), onInstalled: event('runtime.onInstalled'), onStartup: event('runtime.onStartup'),
      getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      getManifest: vi.fn(() => ({ version: '0.1.0' })),
      openOptionsPage: vi.fn(async () => {}),
      sendMessage: vi.fn(async (message: unknown) => new Promise<unknown>((resolve, reject) => {
        let pending = false;
        for (const listener of listeners.get('runtime.onMessage') ?? []) {
          const result = listener(message, {}, resolve);
          if (result === true) pending = true;
          else if (result instanceof Promise) { pending = true; result.then(resolve, reject); }
        }
        if (!pending) resolve(undefined);
      })),
    },
    tabs: {
      query: vi.fn(async (_query?: unknown) => [{ id: 7, url: 'https://www.youtube.com/watch?v=x' }]),
      reload: vi.fn(async (_id: number) => {}), create: vi.fn(async (_opts: unknown) => ({})),
      onUpdated: event('tabs.onUpdated'), onRemoved: event('tabs.onRemoved'),
    },
    webRequest: { onErrorOccurred: event('webRequest.onErrorOccurred') },
    fire: async (path: string, ...args: unknown[]) => Promise.all([...listeners.get(path) ?? []].map((listener) => listener(...args))),
  };
  vi.stubGlobal('chrome', fake);
  return fake;
}

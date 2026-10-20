import type { RemoteRules } from '../rules/schema';
import { hookFunction } from './natives';
import { pruneByPaths } from './prune';

export function installPlayerHooks(
  win: Window,
  getRules: () => RemoteRules['youtube'],
  onPruned: (adBreaks: number) => void,
): void {
  const realm = win as Window & typeof globalThis;
  const nativeParse = realm.JSON.parse;
  const nativeStringify = realm.JSON.stringify;
  const nativeResponseText = realm.Response.prototype.text;
  const nativeResponseClone = realm.Response.prototype.clone;
  const matches = (url: string) => getRules().responseUrlIncludes.some((part) => url.includes(part));
  const applyPrune = (value: unknown) => {
    const result = pruneByPaths(value, getRules().prunePaths);
    if (result.removed > 0) onPruned(result.adBreaks);
    return result;
  };
  const prune = (value: unknown) => {
    applyPrune(value);
    return value;
  };
  const rewriteText = (url: string, text: string): string => {
    if (!matches(url)) return text;
    const prefix = text.match(/^\s*\)\]\}'[^\n]*\n/)?.[0] ?? '';
    try {
      const value: unknown = nativeParse(text.slice(prefix.length));
      return applyPrune(value).removed > 0 ? prefix + nativeStringify(value) : text;
    } catch { return text; }
  };
  const copyMetadata = (value: Response, source: Response): Response => {
    Object.defineProperties(value, {
      url: { value: source.url, configurable: true },
      redirected: { value: source.redirected, configurable: true },
      type: { value: source.type, configurable: true },
      clone: { configurable: true, value: new Proxy(nativeResponseClone, {
        apply(original, thisArg, args) { return copyMetadata(Reflect.apply(original, thisArg, args), source); },
      }) },
    });
    return value;
  };
  hookFunction(realm, 'fetch', (original) => async function (this: unknown, ...args: Parameters<typeof original>) {
    const response: Response = await Reflect.apply(original, this, args);
    if (!matches(response.url) || response.status === 0) return response;
    try {
      const clone: Response = Reflect.apply(nativeResponseClone, response, []);
      const text: string = await Reflect.apply(nativeResponseText, clone, []);
      const rewritten = rewriteText(response.url, text);
      if (rewritten === text) return response;
      const headers = new realm.Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      return copyMetadata(new realm.Response(rewritten, { status: response.status, statusText: response.statusText, headers }), response);
    } catch { return response; }
  });
  hookFunction(realm.JSON, 'parse', (original) => function (this: unknown, ...args: Parameters<typeof original>) {
    return prune(Reflect.apply(original, this, args));
  });
  hookFunction(realm.Response.prototype, 'json', () => async function (this: Response) {
    // Decode with saved natives: JS-backed Response implementations may call
    // the global JSON.parse, which would otherwise also prune unrelated URLs.
    const text: string = await Reflect.apply(nativeResponseText, this, []);
    const value: unknown = Reflect.apply(nativeParse, realm.JSON, [text]);
    return matches(this.url) ? prune(value) : value;
  });
  hookFunction(realm.Response.prototype, 'text', (original) => async function (this: Response) {
    return rewriteText(this.url, await Reflect.apply(original, this, []));
  });

  const xhrCache = new WeakMap<XMLHttpRequest, { raw: string; url: string; output: string }>();
  const cachedText = (request: XMLHttpRequest, raw: string): string => {
    const url = request.responseURL;
    const cached = xhrCache.get(request);
    if (cached?.raw === raw && cached.url === url) return cached.output;
    const output = rewriteText(url, raw);
    xhrCache.set(request, { raw, url, output });
    return output;
  };
  hookFunction(realm.XMLHttpRequest.prototype, 'open', (original) => function (this: XMLHttpRequest, ...args: unknown[]) {
    xhrCache.delete(this);
    return Reflect.apply(original, this, args);
  });
  for (const key of ['responseText', 'response'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(realm.XMLHttpRequest.prototype, key);
    if (!descriptor?.get || !descriptor.configurable) continue;
    Object.defineProperty(realm.XMLHttpRequest.prototype, key, {
      ...descriptor,
      get: new Proxy(descriptor.get, { apply(original, thisArg, args) {
        const value: unknown = Reflect.apply(original, thisArg, args);
        const request = thisArg as XMLHttpRequest;
        if (typeof value === 'string') return cachedText(request, value);
        return request.responseType === 'json' && matches(request.responseURL) ? prune(value) : value;
      } }),
    });
  }
  for (const key of ['ytInitialPlayerResponse', 'ytInitialData'] as const) {
    const target = win as Window & { ytInitialPlayerResponse?: unknown; ytInitialData?: unknown };
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor && !descriptor.configurable) { prune(target[key]); continue; }
    let stored = target[key];
    Object.defineProperty(target, key, {
      configurable: true, enumerable: descriptor?.enumerable ?? true,
      get() { return prune(stored); },
      set(value: unknown) { stored = value; },
    });
  }
}

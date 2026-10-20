// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import bundled from '../../rules/rules.json';
import { installPlayerHooks } from '../../src/youtube/player-hooks';

const originalParse = JSON.parse;
const originalResponseJson = Response.prototype.json;
const originalResponseText = Response.prototype.text;
const originalXHRText = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText')!;
const originalXHRResponse = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response')!;
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalFetch = fetch;
const win = window as Window & { ytInitialPlayerResponse?: unknown; ytInitialData?: unknown };

afterEach(() => {
  JSON.parse = originalParse;
  Response.prototype.json = originalResponseJson;
  Response.prototype.text = originalResponseText;
  Object.defineProperty(XMLHttpRequest.prototype, 'responseText', originalXHRText);
  Object.defineProperty(XMLHttpRequest.prototype, 'response', originalXHRResponse);
  XMLHttpRequest.prototype.open = originalXHROpen;
  globalThis.fetch = originalFetch;
  Reflect.deleteProperty(win, 'ytInitialPlayerResponse');
  Reflect.deleteProperty(win, 'ytInitialData');
});

describe('installPlayerHooks', () => {
  it('prunes JSON.parse results and reports ad breaks', () => {
    const onPruned = vi.fn();
    installPlayerHooks(window, () => bundled.youtube, onPruned);
    expect(JSON.parse('{"adPlacements":[1],"videoDetails":{}}')).toEqual({ videoDetails: {} });
    expect(onPruned).toHaveBeenCalledWith(1);
  });
  it('prunes /youtubei/v1/player responses read via Response.json', async () => {
    const onPruned = vi.fn();
    installPlayerHooks(window, () => bundled.youtube, onPruned);
    const response = new Response('{"adPlacements":[1],"videoDetails":{}}');
    Object.defineProperty(response, 'url', { value: 'https://www.youtube.com/youtubei/v1/player?key=x' });
    expect(await response.json()).toEqual({ videoDetails: {} });
    expect(onPruned).toHaveBeenCalledWith(1);
  });
  it('leaves responses for /other untouched', async () => {
    installPlayerHooks(window, () => bundled.youtube, vi.fn());
    const response = new Response('{"adPlacements":[1]}');
    Object.defineProperty(response, 'url', { value: 'https://www.youtube.com/other' });
    expect(await response.json()).toEqual({ adPlacements: [1] });
  });
  it('prunes initial player data on get with rules that arrive late', () => {
    let rules = { ...bundled.youtube, prunePaths: [] as string[] };
    installPlayerHooks(window, () => rules, vi.fn());
    win.ytInitialPlayerResponse = { playerAds: [] };
    rules = { ...rules, prunePaths: ['playerAds'] };
    expect(win.ytInitialPlayerResponse).toEqual({});
  });
  it('preserves native Function.prototype.toString output', () => {
    installPlayerHooks(window, () => bundled.youtube, vi.fn());
    expect(Function.prototype.toString.call(JSON.parse)).toContain('[native code]');
  });
  it('does not report when nothing is removed', () => {
    const onPruned = vi.fn();
    installPlayerHooks(window, () => bundled.youtube, onPruned);
    expect(JSON.parse('{"videoDetails":{}}')).toEqual({ videoDetails: {} });
    expect(onPruned).not.toHaveBeenCalled();
  });
  it('prunes get_watch text before the page parses it', async () => {
    installPlayerHooks(window, () => bundled.youtube, vi.fn());
    const response = new Response('{"adSlots":[1],"videoDetails":{}}');
    Object.defineProperty(response, 'url', { value: 'https://www.youtube.com/youtubei/v1/get_watch?prettyPrint=false' });
    const text = await response.text();
    expect(text).not.toContain('"adSlots"');
    expect(text).toContain('"videoDetails"');
  });
  it('prunes matched XHR responseText before the page parses it', () => {
    Object.defineProperty(XMLHttpRequest.prototype, 'responseText', { ...originalXHRText, get: () => '{"adPlacements":[1],"videoDetails":{}}' });
    installPlayerHooks(window, () => bundled.youtube, vi.fn());
    const request = new XMLHttpRequest();
    Object.defineProperty(request, 'responseURL', { value: 'https://www.youtube.com/youtubei/v1/player?key=x' });
    expect(request.responseText).not.toContain('"adPlacements"');
    expect(request.responseText).toContain('"videoDetails"');
  });
  it('prunes get_watch bodies read through a stream reader', async () => {
    const response = new Response('[{"playerResponse":{"adSlots":[1],"videoDetails":{}}}]');
    const url = 'https://www.youtube.com/youtubei/v1/get_watch?prettyPrint=false';
    Object.defineProperty(response, 'url', { value: url });
    globalThis.fetch = vi.fn(async () => response);
    installPlayerHooks(window, () => bundled.youtube, vi.fn());
    const result = await fetch(url);
    const reader = result.body!.getReader();
    let text = '';
    const decoder = new TextDecoder();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      text += decoder.decode(chunk.value, { stream: true });
    }
    expect(text).not.toContain('"adSlots"');
    expect(text).toContain('"videoDetails"');
    expect(result.url).toBe(url);
  });
});

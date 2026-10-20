import type { RemoteRules } from '../rules/schema';
import { AVERAGE_AD_SECONDS } from '../shared/config';

export function startFallback(
  doc: Document,
  getRules: () => RemoteRules['youtube'],
  onAdHandled: (seconds: number) => void,
  intervalMs = 250,
): () => void {
  let saved: { video: HTMLVideoElement; muted: boolean; volume: number; playbackRate: number; duration: number } | null = null;
  function restore(report: boolean): void {
    if (!saved) return;
    const state = saved;
    saved = null;
    state.video.muted = state.muted;
    state.video.volume = state.volume;
    state.video.playbackRate = state.playbackRate;
    if (report) onAdHandled(Number.isFinite(state.duration) ? state.duration : AVERAGE_AD_SECONDS);
  }
  const timer = setInterval(() => {
    const rules = getRules();
    let inAd: boolean;
    try { inAd = !!doc.querySelector(rules.adShowingSelector); }
    catch { restore(false); return; }
    if (!inAd) { restore(true); return; }
    if (!saved) {
      const video = doc.querySelector<HTMLVideoElement>('.html5-video-player video');
      if (video) {
        saved = { video, muted: video.muted, volume: video.volume, playbackRate: video.playbackRate, duration: video.duration };
        video.muted = true;
        try { video.playbackRate = rules.maxPlaybackRate; }
        catch { try { video.playbackRate = 2; } catch { /* Some live media disallow rate changes. */ } }
      }
    }
    for (const selector of rules.skipButtonSelectors) {
      let buttons: NodeListOf<HTMLElement>;
      try { buttons = doc.querySelectorAll<HTMLElement>(selector); } catch { continue; }
      for (const button of buttons) {
        const style = doc.defaultView?.getComputedStyle(button);
        if ((button.offsetWidth || button.offsetHeight || button.getClientRects().length)
          && style?.display !== 'none' && style?.visibility !== 'hidden') {
          button.click();
          return;
        }
      }
    }
  }, intervalMs);
  return () => { clearInterval(timer); restore(false); };
}

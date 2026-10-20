export function classifyRun(obs: { sawAdShowing: boolean; sawEnforcement: boolean; botCheck: boolean; playbackAdvanced: boolean }[]): 'pass' | 'fail' | 'inconclusive' {
  if (obs.some(run => run.sawAdShowing || run.sawEnforcement)) return 'fail';
  if (obs.every(run => run.botCheck)) return 'inconclusive';
  if (!obs.some(run => run.playbackAdvanced)) return 'fail';
  return 'pass';
}

// Shared with the browser page as a string, since page.evaluate cannot import.
export const BOT_CHECK_PATTERN = "confirm you.?re not a bot|sign in to confirm|sign in to watch|unusual traffic from your computer network";
export function isBotCheckText(text: string): boolean {
  return new RegExp(BOT_CHECK_PATTERN, 'i').test(text);
}

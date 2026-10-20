export function classifyRun(obs: { sawAdShowing: boolean; sawEnforcement: boolean; botCheck: boolean; playbackAdvanced: boolean }[]): 'pass' | 'fail' | 'inconclusive' {
  if (obs.some(run => run.sawAdShowing || run.sawEnforcement)) return 'fail';
  if (obs.every(run => run.botCheck)) return 'inconclusive';
  if (!obs.some(run => run.playbackAdvanced)) return 'fail';
  return 'pass';
}

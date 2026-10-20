import type { TimerBoost } from '../rules/schema';
import { hookFunction } from './natives';

// YouTube delays playback with a long native-callback timer when it detects
// removed ads; matching timers are shortened by the factor in the rules data.
export function installTimerBoosts(win: Window, getBoosts: () => TimerBoost[]): void {
  hookFunction(win, 'setTimeout', (original) => function (this: unknown, ...args: unknown[]) {
    const [callback, delay] = args;
    const boost = getBoosts().find((entry) => Number(delay) === entry.delayMs
      && String(callback).includes(entry.callbackIncludes));
    if (boost) args[1] = Math.round(boost.delayMs * boost.factor);
    return Reflect.apply(original, this, args);
  } as typeof original);
}

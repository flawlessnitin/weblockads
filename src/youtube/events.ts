import type { RemoteRules } from '../rules/schema';

export const RULES_EVENT = 'yt-cfg-sync';
export const STATS_EVENT = 'yt-cfg-ack';
export type YoutubeRulesPayload = RemoteRules['youtube'];
export interface YoutubeStatsPayload { count: number; seconds: number }

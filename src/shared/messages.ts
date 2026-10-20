export type Message =
  | { type: 'popup:getState' }
  | { type: 'popup:setSiteEnabled'; site: string; enabled: boolean }
  | { type: 'stats:youtubeAds'; count: number; seconds: number }
  | { type: 'rules:get' }
  | { type: 'rules:checkNow' }
  | { type: 'picker:start'; tabId: number }
  | { type: 'picker:save'; site: string; selector: string }
  | { type: 'settings:changed' };

declare const __BUILD_TIME__: number;

export const PRODUCT_NAME = 'weblockads';
export const REPO_SLUG: string = process.env.ADSHIELD_REPO ?? 'OWNER/adshield';
export const RULES_URL = `https://raw.githubusercontent.com/${REPO_SLUG}/main/rules/rules.json`;
export const YOUTUBE_MATCHES = [
  '*://www.youtube.com/*',
  '*://youtube.com/*',
  '*://www.youtube-nocookie.com/*',
];
export const AVERAGE_AD_SECONDS = 15;
export const BUILD_TIME: number = typeof __BUILD_TIME__ === 'number' ? __BUILD_TIME__ : 0;

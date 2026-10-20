// Declared with the storage contract; validation is implemented in Task 6.
export interface RemoteRules {
  version: number;
  youtube: {
    prunePaths: string[];
    responseUrlIncludes: string[];
    hideSelectors: string[];
    adShowingSelector: string;
    skipButtonSelectors: string[];
    maxPlaybackRate: number;
  };
}

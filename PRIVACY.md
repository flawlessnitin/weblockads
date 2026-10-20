# Privacy policy

Last updated: 2026-10-21.

The extension collects no personal data for the developer. It has no telemetry, analytics, advertising SDK, account system or developer-operated server. It does not upload browsing history, page contents, settings, counters, cookies or credentials.

Blocking happens on your device. Site choices, hidden-element selectors, totals and the last valid rules are stored in Chrome's local extension storage. Per-tab counters use session storage. Nothing is synced to an account. Uninstalling the extension removes its extension storage.

## Automatic network activity

The only automatic external request initiated by the extension is a versioned JSON rules file from the configured GitHub repository, hosted at `raw.githubusercontent.com`. Checks occur on installation/browser startup, daily and when you choose to check now. Requests omit credentials and contain no extension statistics or browsing information. Like any web host, GitHub receives normal connection information such as the requesting IP address. Invalid data is rejected; downloaded code never runs.

Community ad-filter lists and the cosmetic engine are bundled with the extension. They are not downloaded by the installed extension. Developer build tools and GitHub workflows separately access list hosts, YouTube and the GitHub API; these are development operations.

## Links you choose to open

**Report site** opens an editable GitHub issue form containing the current page URL, extension version and rules version. This information is included in the URL sent to GitHub when you choose that action. Review the form and remove private information before submitting. The extension never submits an issue automatically. License and attribution links also open external sites only when selected. GitHub's and those sites' own privacy policies apply to visits you choose to make.

The permission to access all websites is used to block requests and hide ads, not to send website data to the developer. `webRequest` observes blocked-request errors to estimate counts; request contents are not logged or uploaded. YouTube processing reads player data locally to remove ad information. No Google sign-in credentials are requested by the extension.

The source code and permission explanations are available in the repository. Future features that change these practices require an updated policy.

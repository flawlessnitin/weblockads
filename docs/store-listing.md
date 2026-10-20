# Chrome Web Store listing draft

Release gate: do not submit until the full acceptance pass is recorded, the real owner/repository is configured, the rules URL resolves, and the owner approves publication. Display name comes from `PRODUCT_NAME` in `src/shared/config.ts`.

## Single purpose

V1 statement for submission: **Blocks ads and trackers on websites, including YouTube video ads.**

The plan's full-product wording, "Blocks ads, trackers and ad pop-ups on websites, including YouTube video ads", is reserved for the later pop-up-protection release. V1 must not claim pop-up protection that has not been implemented.

## Description

Block website ads and trackers using bundled community filter lists. Remove YouTube player ad data and hide feed and masthead ad elements. A fallback mutes, speeds up and skips detected video ads when possible, then restores your volume and playback speed.

Turn blocking off for an individual site, permanently hide an unwanted element, and see local blocking estimates. Rules update as validated JSON from the owner's GitHub repository; there is no remotely loaded code. No analytics or automatic browsing-data uploads. A user-selected Report site link opens an editable GitHub form with the page address (query strings removed) and version details.

Chrome desktop only. V1 includes regular YouTube, Shorts and supported embeds. It does not include Hotstar or dedicated pop-up/pop-under protection. Some ads, particularly server-stitched ads, may still get through; do not promise universal blocking. Per-tab and all-time counts and skipped time are estimates. The Pop-ups counter stays at zero until the later feature ships.

## Permission justifications

- `declarativeNetRequest`: block ad/tracker network requests and allow sites the user turns off.
- `storage`: keep settings, custom hides, counters and validated rules on this device.
- `scripting`: register local page scripts, inject cosmetic CSS and start the user-selected element picker.
- `alarms`: schedule the daily rules-data check.
- `webRequest`: observe blocked-request errors for local estimated counts; no blocking webRequest or uploads.
- `<all_urls>` host access: apply network/cosmetic filtering and per-site controls on websites the user visits.

## Privacy and remote-data disclosure

Use [PRIVACY.md](../PRIVACY.md) as the public policy. No telemetry, analytics, browsing-history collection or developer-operated backend. The automatic external request is the configured GitHub-hosted rules JSON, without credentials. The opt-in report link sends its prefilled URL/version values to GitHub when opened; the user reviews and submits the form themselves. Do not select disclosures that contradict that behavior.

The downloadable rules contain only validated paths, selectors, response-URL fragments, a version and bounded fallback numbers. All executable logic is in the package. Source license: GPL-3.0-only; preserve [third-party notices](../THIRD_PARTY_NOTICES.md).

## Owner publication checklist

- Configure `ADSHIELD_REPO`, publish the source and rules on `main`, and verify the raw rules URL and issue/notices links.
- Complete signed-out and separate-test-account acceptance; record video IDs, surfaces, ads, warnings, startup delays, seeking, comments and quality results.
- Capture final Light popup/screenshots using actual behavior; do not imply the zero Pop-ups category is a working feature.
- Build and inspect the ZIP, publish corresponding source and license notices, and provide the public privacy-policy URL.
- Enable repository Actions, allow its monthly filter-refresh PRs, and watch issues with email notifications for nightly breakage/upstream reports.
- The owner uploads and submits the store package. No automated push or store publication is performed by the developer.

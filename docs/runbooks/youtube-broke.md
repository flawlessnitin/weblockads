# Repairing YouTube blocking

Work on a branch. Keep the last working rules, capture actual evidence and use a failing fixture test to pin the change. An `upstream-youtube` issue is an early warning, not proof that this extension broke. A bot/sign-in wall is inconclusive.

1. **Reproduce.** Run `npm run build`, load `dist/` through `chrome://extensions`, and refresh YouTube. Reproduce the affected direct video and a related-video click. For signed-in checks, use only the dedicated test Google account; the owner logs in themselves. Check for actual ads, an anti-adblock warning, broken playback or a new startup delay. Compare with blocking off where needed. Never use the owner's main account.
2. **Capture new fixtures.** Run `npx tsx scripts/capture-youtube.ts <ids>` without the extension, using affected 11-character video IDs. For the local test account, use `npx tsx scripts/capture-youtube.ts --signed-in .cache/youtube-test-account <ids>`. A visible browser opens; the owner logs into the test account and presses Enter in the terminal. The tool captures initial player/next and API/related-navigation responses and scrubs tracking, credentials and URL parameters. Profiles stay in ignored `.cache/`. Never commit profiles, cookies or tokens, and never run signed-in checks in CI. Review scrubbed fixtures before staging; do not share raw responses.
3. **Run `npm test`.** The fixture tests reveal surviving ad keys and verify that playback fields remain unchanged. Add a regression case if a new response shape is needed. Confirm the failure before fixing it. Existing green tests do not rule out a browser hook, playback or timing problem.
4. **Compare.** Diff new fixtures against earlier captures and inspect uAssets commit links in the `upstream-youtube` issue. Identify the smallest relevant path, response URL, selector or fallback-data change. Preserve `streamingData`, `videoDetails` and `playabilityStatus`. Upstream filter syntax is a reference; do not download and execute a scriptlet or other remote code.
5. **Fix and verify.** Prefer a data-only fix in `rules/rules.json`, then increase its positive integer `version`. Run typecheck, all tests, build and the live check, then repeat the failed manual scenario. A published higher-version rules file reaches running installations on their next successful check, normally within about 24 hours; the user can check immediately in settings. Offline/sleeping browsers update later. If code must change, a new extension/store release is required. Data updates cannot add new executable behavior.
6. **Publish and close.** Only when the product owner explicitly authorizes publishing, push the fixed rules to the configured repository's `main` branch. Verify the configured raw JSON URL resolves with the new version. For code changes, the owner releases the rebuilt package to the store. Close the breakage issue with the fix, version, tested cases and remaining limits. Never publish credentials or test profiles. The developer must not push or create a repository under the current project instructions.

Local verification commands:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run e2e
npm.cmd run package
```

Read `test-results/youtube-result.json`. An inconclusive result needs a local follow-up; do not claim a pass. The nightly test is a signed-out smoke check, not the full release acceptance pass. Repeat roughly 20 varied videos, Shorts, live and third-party embeds, signed out and with the test account, and verify seeking, quality, comments and feed/masthead hiding. Record delays as well as ads.

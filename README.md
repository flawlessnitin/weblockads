# Browser ad blocker

A GPL-3.0-only Chrome Manifest V3 extension that blocks website ads and trackers, removes YouTube ad data and hides ad elements. The displayed product name is defined once in `src/shared/config.ts` as `PRODUCT_NAME`.

The toolbar has a per-site switch, local counters, a permanent element picker, a prefilled site-report link and settings. Estimated time saved uses 15 seconds when an ad's duration is unknown. Network counts are estimates and can include requests blocked by another extension.

Supported YouTube surfaces: desktop `youtube.com` / `www.youtube.com`, Shorts and `www.youtube-nocookie.com` embeds. Mobile YouTube, YouTube Music, Kids, TV and Hotstar are outside v1. Pop-up protection is a later plan; its counter remains zero in v1. No scriptlets or downloaded code run.

## Install from source

Use Node.js 24 or newer and npm. From this repository in PowerShell:

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, then select this repository's `dist` folder. Pin the extension if wanted. After every rebuild, click **Reload** on the extension and refresh already-open website tabs.

All four bundled filter lists are enabled when Chrome has enough shared static-rule capacity. The current generated snapshot contains 119,235 rules; Chrome's shared capacity can vary between installations. The conversion does not support every source-list filter. `filters/meta.json` records the snapshot and original-source hashes.

Before a public release, set the owner's real GitHub repository and rebuild:

```powershell
$env:ADSHIELD_REPO = 'YOUR_USERNAME/YOUR_REPOSITORY'
npm.cmd run build
npm.cmd run package
```

Rule updates and repository links default to `flawlessnitin/weblockads`; set `ADSHIELD_REPO=<owner>/<repo>` at build time to point a fork at its own repository. Online rule updates read `rules/rules.json` from that repository's `main` branch; until it exists there, the bundled rules are used.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check TypeScript |
| `npm test` | Unit and captured-fixture tests |
| `npm run build` | Bundle the unpacked extension into `dist/` |
| `npm run icons` | Rebuild PNG icons from the SVG |
| `npm run build:filters` | Download community lists and regenerate committed filters |
| `npx playwright install chromium` | Install the matching test browser |
| `npm run e2e` | Five signed-out YouTube checks; writes `test-results/youtube-result.json` |
| `npx tsx scripts/nightly/check-upstream.ts` | Read recent YouTube-related uAssets changes |
| `npm run package` | Zip built files into `release/adshield-0.1.0.zip` |

PowerShell users can use `npm.cmd` / `npx.cmd` if script execution policy blocks npm's PowerShell shim. Packaging uses Windows' built-in `Compress-Archive`; other systems need the `zip` command. Run build before package. A clean staging copy excludes Chrome-generated `_metadata` caches. The ZIP has `manifest.json` at its root and includes license, privacy and attribution documents.

## Project layout

- `src/background/`: Chrome wiring, site settings, cosmetic matching and local stats.
- `src/youtube/`: player-data pruning, browser hooks, bridge and fallback.
- `src/rules/`, `rules/rules.json`: validated, versioned YouTube configuration.
- `src/content/`, `src/popup/`, `src/options/`: page filtering, picker and extension screens.
- `scripts/`, `filters/`: build tools and generated filter snapshots.
- `tests/unit/`, `tests/fixtures/youtube/`, `tests/e2e/`: unit tests, scrubbed real responses and live checks.
- `.github/workflows/`: CI, nightly playback/upstream checks and monthly filter-refresh PRs.

Profiles, cookies, credentials, raw captures and test artifacts stay in ignored `.cache/` / `test-results/`; never add them to Git. Signed-in testing is local and uses only a separate owner-operated test account.

## Maintenance and release status

YouTube rules are checked on install/browser startup, daily and on request. Valid newer JSON replaces the stored rules; failed, malformed or older data leaves working rules in place. Code and network-list changes need a rebuilt extension/store release.

Nightly CI is signed out. An observed ad or anti-adblock warning fails the check; all bot/sign-in walls yield an inconclusive result without a breakage issue. The plan's classifier passes when any sample advances and none shows ads/warnings, so read every observation. Five short checks cannot prove every video is ad-free. Scheduled workflows start only after the owner publishes the repository and enables Actions; watch repository issues and enable email notifications. Enable GitHub Actions to create pull requests for the monthly filter refresh.

Development checks passed on 2026-10-21 (105 unit tests; the five-video live smoke check passed). The wider signed-out run attempted 20 cases: 19 advanced without observed ads or enforcement, including Shorts and a third-party embed. The live stream did not start in the test browser; the extension-off comparison timed out, so it is not an automated pass. The owner separately reported working live playback without ads, plus ad-free signed-in playback. No exact signed-in case count was supplied. Seeking and comments worked on three regular videos; 360p selection and continued playback were checked on two. These short observations are not a guarantee for every video, account, ad experiment or long mid-roll session.

The owner also reported slow home loading/scrolling. A regression fix removes repeated cosmetic CSS insertion: a controlled scroll probe dropped from 22 insertions to 2, with ads still hidden. Live home navigation rendered 106 cards and scrolled 8,000 px with no visible ad slots. The owner then reported improvement and noted the earlier slowdown might also have been the network; the extension is not claimed as its sole cause. Some earlier headless related-video checks showed 17–25 seconds of buffering; the cause remains unresolved.

Five news pages were visually checked with their content visible:

| Site | Visible headings | Matched ad elements hidden |
| --- | ---: | ---: |
| The Guardian | 176 | 38 |
| The Indian Express | 118 | 6 |
| Hindustan Times | 78 | 2 |
| CNN | 17 | 9 |
| BBC News | 54 | No ad slots observed in this visit |

Additional probes: NDTV returned HTTP 403 and is not counted as a successful visit. Times of India had ten matched ad elements hidden but retained a house-promotion banner, so it is not described as completely ad-free. CNBC loaded behind its normal consent banner. Source lists do not cover every promotion.

The owner supplied the deployment repository and the local release was rebuilt with it. At the final check the configured raw rules URL returned HTTP 404: online updates are not live until the owner publishes the rules file on `main`. Bundled version-2 rules remain usable. No repository creation, push or store submission was performed.

See the [approved design](docs/superpowers/specs/2026-10-20-ad-blocker-design.md), [implementation plan](docs/superpowers/plans/2026-10-20-adshield-v1.md), [YouTube repair runbook](docs/runbooks/youtube-broke.md), [privacy policy](PRIVACY.md), [third-party notices](THIRD_PARTY_NOTICES.md), [store listing draft](docs/store-listing.md) and [GPL-3.0 license](LICENSE).

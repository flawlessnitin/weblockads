# Ad Blocker Chrome Extension — Design

Date: 2026-10-20
Status: Draft, awaiting product-owner approval

## Roles

- **Product owner:** the user. Owns the product, the brand, the GitHub repo and the Chrome Web Store listing. Does not write code.
- **Developer:** Claude. Builds and maintains it, including fixes when YouTube changes its ads.

Anything marked *(developer's call)* was decided by the developer, not the product owner, and can still be changed.

## Intent

The product owner uses Chrome and is fed up with two things:

1. Several ads inside a single YouTube video, and ads on other streaming sites (Hotstar).
2. Websites that keep opening ad pop-ups, new tabs and overlays while browsing.

They want **their own** ad blocker. It should be an open-source product under their name, not a personal script and not a copy of an existing product. They were impressed that Brave's blocking stays consistent without constant browser updates, and want the same quality.

### What we learned from Brave (basis for the architecture)

- Brave's engine (adblock-rust) runs the **community filter lists**: EasyList, EasyPrivacy and uBlock Origin's lists. It runs uBlock-compatible **scriptlets** for YouTube.
- The product owner believed YouTube ads come from a separate server that can just be blocked. **This is false for YouTube.** Ad placement data comes inside YouTube's own player JSON (`adPlacements`, `playerAds`, `adSlots`, …). The ad video is served from the same `*.googlevideo.com` CDN as the real video. YouTube is also rolling out server-side ad insertion (SSAI), which stitches ads into the stream.
- Brave seems stable because **the engine is separate from the rules**. The lists are updated by volunteers, often within 6–24 h of a YouTube change. They are pushed to the browser in the background without a browser release.
- **We copy that split.** The extension code stays stable, and YouTube- and Hotstar-specific behaviour lives in **data** (a rules/config file) that the extension downloads from the product owner's GitHub repo.

## Goals

Priority order, as set by the product owner. This is also the release order.

1. **YouTube (v1, must be excellent).** No pre-roll, mid-roll or post-roll video ads. No in-feed, masthead or sidebar ads. YouTube's "ad blockers are not allowed" warning must not appear. Must work signed in and signed out.
2. **Pop-ups and general sites (v1 if ready, otherwise v1.1).** Ads and trackers blocked on all sites. Pop-up windows, pop-unders and click-hijacking overlays not opened by a genuine user click are stopped.
3. **Hotstar / JioHotstar (later release).** Block video ads wherever the ads are client-side. Where they are stitched into the stream (likely live sports), **mute the ad and cover it** with an "Ad break, back soon" screen until content resumes. Skipping isn't possible on live streams. The developer must investigate how Hotstar serves ads before building this part and report findings to the product owner.

### Release scope and permissions *(developer's call)*

- The product owner asked for blocking "on all the websites I open". So **v1's manifest requests all-sites host permissions from day one.** If permissions were widened in a later release, Chrome would disable the extension for every existing user until they re-approve it.
- **v1 ships:** the YouTube module, plus network and cosmetic blocking on all sites, since list-based blocking is cheap once the permission exists.
- **Pop-up protection** ships in v1 if ready, otherwise in v1.x. Either way it needs no permission change.
- **Hotstar** comes in a later release.

### YouTube surfaces *(developer's call)*

- **v1:** www.youtube.com, including Shorts, and YouTube embeds on other sites (`youtube.com/embed`, `youtube-nocookie.com`).
- **v1.x:** music.youtube.com (audio ads, different payloads) and m.youtube.com.
- **Out of scope:** YouTube Kids and YouTube TV.
- The success-criteria test set's "music" entry means **music videos on www.youtube.com**.

## Non-goals

- Firefox and Safari builds. It should still load in Chromium browsers (Edge, Brave), but that isn't tested.
- Mobile.
- Netflix, Prime and other streaming sites (not requested).
- Monetisation. There are no plans to charge, though GPL leaves that possible later.
- A full uBlock-style advanced dashboard (custom filter editor, logger, dynamic filtering matrix).

## Anti-goals (failure even if ads are blocked)

- Breaking sites, for example YouTube playback, comments, login, or checkout on shopping sites.
- Collecting any user data. No analytics, no telemetry, no servers of our own. Stats stay on the device.
- Downloading and running remote **code**. This is banned by Chrome Web Store policy and would get the listing pulled. Only **data** may be fetched remotely.
- Noticeably slowing page loads or video start.
- Getting the user's YouTube account flagged, or triggering YouTube's anti-adblock wall.

## Constraints

- **Chrome Manifest V3.** No blocking `webRequest`. Network blocking must use `declarativeNetRequest` (DNR), within Chrome's rule limits: static rulesets, a guaranteed minimum of 30k enabled static rules plus the shared global pool, and capped dynamic rules.
- **Chrome Web Store policies:** no remotely hosted code, a clear single purpose, and a privacy disclosure (we collect nothing).
- **License: GPL-3.0**, public GitHub repo. This allows reusing EasyList/EasyPrivacy (GPL-3.0 / CC BY-SA 3.0) and uBlock Origin's scriptlets and lists (GPL-3.0) with attribution. *(developer's call, accepted by product owner)*
- Remote rule updates are hosted on the product owner's GitHub (raw file or GitHub Pages). It's free and needs no server.

## How it gets made

### Stack *(developer's call)*

- TypeScript, bundled with esbuild. Plain TS and CSS for the popup, with no UI framework.
- Vitest for unit tests and Playwright for end-to-end runs with the unpacked extension.
- npm.
- **Reusing open-source libraries (product owner approved).** Use an existing GPL/MPL-compatible library for the hard, generic parts: converting filter lists to DNR rules, and parsing or applying cosmetic filters. Candidates are AdGuard's tsurlfilter / DNR converter (GPL-3.0) and Ghostery's adblocker library (MPL-2.0); the developer picks. Everything product-specific is written by us: the YouTube and Hotstar modules, pop-up protection, popup UI, settings, rules updater and stats. **Do not fork uBlock Origin Lite or any other complete extension.** That would be a copy, not our product.

### Components

1. **Network blocking (all sites).** A build-time script downloads EasyList, EasyPrivacy and selected uBlock Origin lists and converts them into DNR static rulesets. These rules update with store releases. A scheduled GitHub Action should rebuild them and open a PR periodically.
2. **Cosmetic filtering (all sites).** A content script hides ad elements using the lists' element-hiding rules, both generic and site-specific.
3. **Pop-up protection (all sites). Aggressive, as decided by the product owner.**
   - Block `window.open` and new tabs not triggered by a real user gesture.
   - Also block the "first click anywhere opens a new tab or pop-under" trick, even though it uses a real click. Use heuristics: the click wasn't on a link or button the user meant, the new window goes to a different domain or a list-known target, and similar signs.
   - Neutralise invisible full-page click-hijack overlays and block known pop-under domains through DNR.
   - **Occasionally blocking a legitimate pop-up is accepted.** For example a login (OAuth) or payment window. Each block shows a small in-page **"Pop-up blocked · Allow"** notice. Allow opens that pop-up and remembers the site.
4. **YouTube module (isolated, own folder).**
   - A main-world script injected at `document_start`.
   - It removes ad fields from player data before the player reads them. This covers `ytInitialPlayerResponse`, `JSON.parse` results, and `fetch`/XHR responses for `/youtubei/v1/player`, `/next` and similar.
   - It neutralises the anti-adblock enforcement message data.
   - It hides feed, masthead and sidebar ad elements.
   - **Which fields and URLs to prune, and which selectors to hide, are data in the remote rules file, not hard-coded.**
   - **Fallback when an ad still plays** (for example SSAI): detect ad state from the player, mute it, raise the playback rate as far as YouTube allows, and click Skip when it appears. Restore the user's volume and speed afterwards.
5. **Hotstar module (later, isolated, own folder).** Same pattern. Its design is finalised after the investigation in Goal 3.
6. **Remote rules updater.**
   - Once a day, and on browser start, fetch a versioned JSON rules file from the GitHub repo.
   - Validate it against a schema, keep the last good copy, and fall back to the copy bundled with the extension.
   - The popup's footer shows "Rules updated X ago".
7. **Stats.** Count blocked items per tab and in total, in three categories: video ads, ads and trackers, and pop-ups. Estimate "ads skipped" time from the removed video ads' durations where known, otherwise from an average. Store everything locally. Exact counting under DNR is constrained, so reasonable estimates are acceptable *(developer's call)*.
8. **Popup UI.** See below.
9. **Settings page.** Kept minimal: list of sites the user turned off, on/off toggles for the YouTube, pop-up and Hotstar features, a "Check for rule updates now" button, and about/license/attribution.

### Popup (chosen by product owner: "our own" design, light theme)

About 320 px wide, white with an indigo accent. From top to bottom:

- **Header:** logo and product name on the left. On the right, the current site's domain and an **on/off switch for this site**, which is remembered per site.
- **Hero:** a ring chart with **"N on this page"** in the centre. The legend beside it reads: Video ads · Ads & trackers · Pop-ups, with counts.
- **Two stat tiles:** "Blocked all time" and "of ads skipped" (time).
- **Tool row:**
  - **Hide element** is a picker: click anything on the page to hide it permanently on that site.
  - **Report site** opens a pre-filled GitHub issue ("ads still showing on <url>", plus extension and rules versions).
  - **Settings**.
- **Footer:** "● Rules updated X ago" and the version number.

The approved mockup is at `.superpowers/brainstorm/1721-1792509289/content/popup-own-v1.html` (the "Light" card).

### Maintenance (central to the product, not an afterthought)

- **Fixture tests:** the repo stores captured real YouTube player/next JSON responses. Unit tests check that pruning removes every ad field and leaves video data intact. When YouTube changes, a new capture plus a failing test shows exactly what changed.
- **Runbook `docs/runbooks/youtube-broke.md`:**
  1. Reproduce.
  2. Capture the new responses.
  3. Diff them against the fixtures.
  4. Update the remote rules file (preferred) or the code (needs a store release).
  5. Bump the rules version and push.
- **Breakage detection (product owner's choice): a scheduled GitHub Actions workflow.** It runs nightly and does two things:
  1. Runs the extension headless against a small YouTube test set (signed out) and checks for ad state or the anti-adblock warning.
  2. Checks the uBlock Origin / uAssets repo for new YouTube filter changes since the last run, as an early-warning signal and a reference for the fix.

  On a failure or a relevant upstream change, it **opens a GitHub issue**, de-duplicated so one breakage means one open issue. GitHub's notification **email** is the reminder to the product owner. Make sure repo notifications for issues are on.
- **Fix flow:** the product owner starts a new Claude session ("fix the open YouTube issue"), and the developer follows the runbook. There is no auto-fix agent, and nothing is published without the product owner asking for it in that session.
- **Signed-in testing:** uses a **dedicated test Google account** created by the product owner. It's used from India and never the owner's main account. Signed-in checks run locally or manually, never in CI, so the account's credentials never go into GitHub.
- **Release flow:** a store release is only needed for code changes or a network-list refresh. Rules-file changes reach all users within about 24 h of being pushed.

## Success criteria

- **YouTube:** across a fixed test set of about 20 videos (short, long, music, live, signed in and out), no video ad plays. Feed and masthead ads are hidden, the anti-adblock warning doesn't appear, and playback, seeking, comments and quality switching still work.
- **General sites:** on a test list of pop-up-heavy sites, no ad tab or window opens, including first-click pop-unders. Normal links work. When a login or payment pop-up is blocked, the "Allow" notice appears and works.
- **Hotstar:** to be defined after the investigation.
- **Store:** the extension passes Chrome Web Store review.

## Left to the developer

Folder layout, rules-file schema, exact DNR list selection within limits, how stats are counted, icon and visual polish within the approved design, CI setup, and test-site lists.

## Open items

- **Product name.** "AdShield" is a placeholder. The product owner picks the final name before the store listing. It doesn't block the build.

# PWA Store

A public catalog of installable [progressive web apps](https://web.dev/progressive-web-apps/). The store itself is a PWA. There are no native apps, no publisher login, and no open submission form. v1 is a curated list.

This is a functional spike on Rails 8 + Hotwire. Visual design is intentionally default.

## Run locally

Needs Ruby 3.2+ (the app targets Rails 8.1). SQLite is the only database.

```bash
bundle install
bin/rails db:prepare
bin/dev
```

`bin/dev` is `bin/rails server` (no CSS/JS bundler). Open:

- `/` — catalog index (name, short copy, category)
- `/apps/:slug` — listing detail + Install
- `/install-demo` (also `/spike`) — dumps `detectInstallContext()` as JSON

Tests:

```bash
bin/rails test
node --test test/javascript/install_guide.test.mjs
```

## Data model

Listings are YAML, not a CMS. Edit `config/listings.yml` and restart. Schema:

| Field | Meaning |
| --- | --- |
| `slug` | URL key (`/apps/:slug`) |
| `name` | Display name |
| `icon` | Icon URL (publisher origin / CDN) |
| `screenshots` | `[{src, alt}]` |
| `shortCopy` | One-line summary |
| `longCopy` | Short honest description |
| `category` | Closed set: `productivity` \| `media` \| `games` \| `social` \| `utilities` \| `other` |
| `originUrl` | The PWA's start URL |
| `publisher` | Who ships the app |
| `installability` | `{beforeInstallPrompt, iosA2HS, desktop, notes}` for **that** app |

`Listing` (`app/models/listing.rb`) loads the file. No auth, no writes, no ActiveRecord table for apps.

The seed catalog is 8 real PWAs, each checked on 2026-09-03 against a live HTML manifest link and the web app manifest (`display` standalone / fullscreen / minimal-ui, icons, `start_url`). Starbucks was skipped: its current manifest has icons but no `display` mode.

## How install detection works

`app/javascript/install_guide.js` is vanilla JS. A Stimulus controller (`install-guide`) only wires clicks and rendering.

Exports:

- `detectInstallContext()` → `{platform, canPrompt, alreadyInstalled, recommendedPath}`
- `startInstallGuide({originUrl, name, render, env})` — picks the path and returns steps/actions
- `promptInstall()` — calls a **captured** `beforeinstallprompt` event (never invents one)
- `listenForBeforeInstallPrompt()` / `captureBeforeInstallPrompt()` — `preventDefault` and defer

`recommendedPath` values:

| Path | When |
| --- | --- |
| `already-installed` | `navigator.standalone` or `display-mode: standalone` (also fullscreen / minimal-ui / window-controls-overlay) |
| `prompt` | A `beforeinstallprompt` event was captured on **this** origin |
| `ios-a2hs` | iOS Safari — Share → Add to Home Screen. No install API exists. |
| `browser-menu` | Chromium / Edge / Samsung (or Firefox Android) without a captured prompt |
| `open-in-browser` | iOS Chrome/Firefox/Edge, or an in-app webview |
| `unsupported` | Desktop Safari, desktop Firefox, and other non-installing browsers |

`beforeinstallprompt` is origin-scoped. Clicking Install on `/apps/squoosh` will not prompt-install Squoosh from this catalog. The guide says to open the listing's `originUrl`; the prompt, if any, appears there. Same-origin `/install-demo` can call `promptInstall()` for the store PWA itself.

## Known platform matrix

| Surface | What this spike does |
| --- | --- |
| **Chrome Android** | Capture `beforeinstallprompt` when the current origin is installable; otherwise menu → Install app. |
| **Chrome desktop** | Same as Chrome Android. |
| **Edge** (Chromium, including Android) | Same BIP + menu path as Chrome. |
| **Safari iOS** | No BIP. Step-by-step Share → Add to Home Screen. |
| **Safari macOS** | No BIP. Treated as `unsupported`. Recent Safari can Add to Dock from File / Share; we do not fake an API. |
| **Firefox desktop** | Cannot install PWAs. Offer Open / Copy URL. |
| **Firefox iOS** | WebKit, no A2HS in Firefox. Offer Open in Safari / Copy URL. |
| **Firefox Android** | No BIP in this module; `browser-menu` if Firefox exposes Install. |
| **Samsung Internet** | Treated like Chromium mobile (`prompt` if BIP fires, else menu). |
| **In-app webviews** | Instagram / Facebook / Android `wv` etc. → `open-in-browser`. |

The store registers Rails 8's PWA endpoints (`/manifest.json`, `/service-worker.js`) so it can be installed in browsers that support that.

## What this is not

No React, Next.js, TypeScript, Phoenix, or Node frontend. No Play Store / App Store branding. No publisher onboarding.
